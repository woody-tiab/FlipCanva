import { useState, useCallback, useEffect } from 'react';
import { FlipbookVisibility } from '../types/flipbook';

export interface AccessToken {
  token: string;
  flipbookId: string;
  userId?: string;
  expiresAt: number;
  permissions: AccessPermission[];
}

export interface AccessPermission {
  action: 'view' | 'edit' | 'share' | 'delete';
  granted: boolean;
}

export interface AccessValidationResult {
  hasAccess: boolean;
  reason?: 'unauthorized' | 'forbidden' | 'expired' | 'not_found';
  requiredAuth?: boolean;
  ownerAccess?: boolean;
}

interface SessionInfo {
  userId?: string;
  sessionToken?: string;
  isAuthenticated: boolean;
  expiresAt?: number;
}

interface UseAccessControlOptions {
  flipbookId: string;
  visibility: FlipbookVisibility;
  ownerId?: string;
  enableOwnerBypass?: boolean;
  sessionStorageKey?: string;
  onAccessDenied?: (reason: string) => void;
  onAuthRequired?: () => void;
}

export const useAccessControl = ({
  flipbookId,
  visibility,
  ownerId,
  enableOwnerBypass = true,
  sessionStorageKey = 'flipbook-session',
  onAccessDenied,
  onAuthRequired
}: UseAccessControlOptions) => {
  const [session, setSession] = useState<SessionInfo>({
    isAuthenticated: false
  });
  const [accessToken, setAccessToken] = useState<AccessToken | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<AccessValidationResult | null>(null);

  // 세션 정보 로드
  const loadSession = useCallback(() => {
    try {
      const savedSession = localStorage.getItem(sessionStorageKey);
      if (savedSession) {
        const parsed: SessionInfo = JSON.parse(savedSession);
        
        // 세션 만료 확인
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(sessionStorageKey);
          setSession({ isAuthenticated: false });
        } else {
          setSession(parsed);
        }
      }
    } catch (error) {
      console.error('세션 로드 실패:', error);
      setSession({ isAuthenticated: false });
    }
  }, [sessionStorageKey]);

  // 세션 저장
  const saveSession = useCallback((sessionInfo: SessionInfo) => {
    try {
      localStorage.setItem(sessionStorageKey, JSON.stringify(sessionInfo));
      setSession(sessionInfo);
    } catch (error) {
      console.error('세션 저장 실패:', error);
    }
  }, [sessionStorageKey]);

  // 접근 권한 검증
  const validateAccess = useCallback(async (
    action: AccessPermission['action'] = 'view'
  ): Promise<AccessValidationResult> => {
    setIsValidating(true);
    
    try {
      // 1. 소유자 확인 (우선순위 최고)
      if (enableOwnerBypass && session.userId && session.userId === ownerId) {
        const result: AccessValidationResult = {
          hasAccess: true,
          ownerAccess: true
        };
        setLastValidation(result);
        return result;
      }

      // 2. 공개 상태 확인
      if (visibility === FlipbookVisibility.PUBLIC) {
        const result: AccessValidationResult = { hasAccess: true };
        setLastValidation(result);
        return result;
      }

      // 3. 링크 공유 상태 확인 (인증 불필요)
      if (visibility === FlipbookVisibility.UNLISTED) {
        const result: AccessValidationResult = { hasAccess: true };
        setLastValidation(result);
        return result;
      }

      // 4. 비공개 상태 - 인증 필요
      if (visibility === FlipbookVisibility.PRIVATE) {
        if (!session.isAuthenticated) {
          const result: AccessValidationResult = {
            hasAccess: false,
            reason: 'unauthorized',
            requiredAuth: true
          };
          setLastValidation(result);
          onAuthRequired?.();
          return result;
        }

        // 서버 API 호출로 권한 확인
        const response = await fetch(`/api/flipbooks/${flipbookId}/access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.sessionToken}`
          },
          body: JSON.stringify({
            action,
            userId: session.userId
          })
        });

        if (response.status === 401) {
          const result: AccessValidationResult = {
            hasAccess: false,
            reason: 'unauthorized',
            requiredAuth: true
          };
          setLastValidation(result);
          onAuthRequired?.();
          return result;
        }

        if (response.status === 403) {
          const result: AccessValidationResult = {
            hasAccess: false,
            reason: 'forbidden'
          };
          setLastValidation(result);
          onAccessDenied?.('이 플립북에 접근할 권한이 없습니다.');
          return result;
        }

        if (response.status === 404) {
          const result: AccessValidationResult = {
            hasAccess: false,
            reason: 'not_found'
          };
          setLastValidation(result);
          onAccessDenied?.('플립북을 찾을 수 없습니다.');
          return result;
        }

        if (response.ok) {
          const accessData = await response.json();
          setAccessToken(accessData.token);
          
          const result: AccessValidationResult = { hasAccess: true };
          setLastValidation(result);
          return result;
        }
      }

      // 기본적으로 접근 거부
      const result: AccessValidationResult = {
        hasAccess: false,
        reason: 'forbidden'
      };
      setLastValidation(result);
      onAccessDenied?.('접근 권한이 없습니다.');
      return result;

    } catch (error) {
      console.error('접근 권한 검증 실패:', error);
      const result: AccessValidationResult = {
        hasAccess: false,
        reason: 'unauthorized'
      };
      setLastValidation(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [
    session, 
    visibility, 
    flipbookId, 
    ownerId, 
    enableOwnerBypass,
    onAccessDenied,
    onAuthRequired
  ]);

  // 사용자 인증
  const authenticate = useCallback(async (credentials: {
    email?: string;
    password?: string;
    token?: string; // 소셜 로그인 등
  }): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const authData = await response.json();
        const sessionInfo: SessionInfo = {
          userId: authData.user.id,
          sessionToken: authData.token,
          isAuthenticated: true,
          expiresAt: Date.now() + (authData.expiresIn * 1000)
        };
        
        saveSession(sessionInfo);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('인증 실패:', error);
      return false;
    }
  }, [saveSession]);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      if (session.sessionToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.sessionToken}`
          }
        });
      }
    } catch (error) {
      console.error('로그아웃 요청 실패:', error);
    }
    
    localStorage.removeItem(sessionStorageKey);
    setSession({ isAuthenticated: false });
    setAccessToken(null);
  }, [session.sessionToken, sessionStorageKey]);

  // 특정 액션 권한 확인
  const hasPermission = useCallback((action: AccessPermission['action']): boolean => {
    // 소유자는 모든 권한
    if (session.userId === ownerId) {
      return true;
    }

    // 액세스 토큰이 있는 경우 권한 확인
    if (accessToken) {
      const permission = accessToken.permissions.find(p => p.action === action);
      return permission?.granted || false;
    }

    // 공개/링크 공유인 경우 읽기 권한만
    if (visibility !== FlipbookVisibility.PRIVATE && action === 'view') {
      return true;
    }

    return false;
  }, [session.userId, ownerId, accessToken, visibility]);

  // 조회수 증가 (권한 있는 접근시에만)
  const incrementViewCount = useCallback(async (): Promise<boolean> => {
    if (!lastValidation?.hasAccess) {
      return false;
    }

    // 소유자 본인은 조회수에 포함하지 않음
    if (session.userId === ownerId) {
      return false;
    }

    try {
      const response = await fetch(`/api/flipbooks/${flipbookId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.sessionToken && {
            'Authorization': `Bearer ${session.sessionToken}`
          })
        },
        body: JSON.stringify({
          userId: session.userId,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        })
      });

      return response.ok;
    } catch (error) {
      console.error('조회수 증가 실패:', error);
      return false;
    }
  }, [lastValidation, session, ownerId, flipbookId]);

  // 접근 로그 기록
  const logAccess = useCallback(async (
    action: string,
    result: 'success' | 'denied',
    metadata?: Record<string, any>
  ) => {
    try {
      await fetch(`/api/flipbooks/${flipbookId}/access-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.sessionToken && {
            'Authorization': `Bearer ${session.sessionToken}`
          })
        },
        body: JSON.stringify({
          action,
          result,
          userId: session.userId,
          timestamp: Date.now(),
          metadata: {
            userAgent: navigator.userAgent,
            visibility,
            ...metadata
          }
        })
      });
    } catch (error) {
      console.error('접근 로그 기록 실패:', error);
    }
  }, [flipbookId, session, visibility]);

  // 세션 갱신
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!session.sessionToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.sessionToken}`
        }
      });

      if (response.ok) {
        const refreshData = await response.json();
        const updatedSession: SessionInfo = {
          ...session,
          sessionToken: refreshData.token,
          expiresAt: Date.now() + (refreshData.expiresIn * 1000)
        };
        
        saveSession(updatedSession);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('세션 갱신 실패:', error);
      return false;
    }
  }, [session, saveSession]);

  // 초기 세션 로드
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // 세션 만료 자동 갱신
  useEffect(() => {
    if (!session.expiresAt || !session.sessionToken) return;

    const timeUntilExpiry = session.expiresAt - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0); // 5분 전에 갱신

    const timeout = setTimeout(() => {
      refreshSession();
    }, refreshTime);

    return () => clearTimeout(timeout);
  }, [session.expiresAt, session.sessionToken, refreshSession]);

  return {
    // 상태
    session,
    accessToken,
    isValidating,
    lastValidation,
    
    // 기본 인증
    authenticate,
    logout,
    refreshSession,
    
    // 접근 제어
    validateAccess,
    hasPermission,
    incrementViewCount,
    logAccess,
    
    // 편의 함수
    isOwner: session.userId === ownerId,
    isAuthenticated: session.isAuthenticated,
    canView: hasPermission('view'),
    canEdit: hasPermission('edit'),
    canShare: hasPermission('share'),
    canDelete: hasPermission('delete'),
    
    // 접근 가능 여부 (캐시된 결과)
    hasAccess: lastValidation?.hasAccess || false,
    accessReason: lastValidation?.reason,
    
    // 유틸리티
    getVisibilityLabel: (vis: FlipbookVisibility) => {
      switch (vis) {
        case FlipbookVisibility.PUBLIC: return '공개';
        case FlipbookVisibility.UNLISTED: return '링크 공유';
        case FlipbookVisibility.PRIVATE: return '비공개';
        default: return '알 수 없음';
      }
    }
  };
};