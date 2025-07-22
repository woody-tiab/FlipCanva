import React, { useState, useEffect } from 'react';
import { canvaApiService } from '../services/canvaApi';

interface CanvaAuthProps {
  onAuthSuccess: (accessToken: string) => void;
  onAuthError: (error: string) => void;
}

export const CanvaAuth: React.FC<CanvaAuthProps> = ({
  onAuthSuccess,
  onAuthError
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    // URL에서 인증 코드 확인 (callback에서)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      onAuthError(`Canva 인증 오류: ${error}`);
      return;
    }

    if (code) {
      handleAuthCallback(code);
    }
  }, []);

  const handleAuthCallback = async (code: string) => {
    setIsAuthenticating(true);
    
    try {
      // 실제로는 백엔드에서 토큰 교환 처리
      const response = await fetch('/api/canva/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          code_verifier: sessionStorage.getItem('canva_code_verifier')
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onAuthSuccess(data.access_token);
        
        // URL 정리
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        throw new Error('토큰 교환 실패');
      }
    } catch (error) {
      onAuthError(error instanceof Error ? error.message : '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const initiateAuth = () => {
    try {
      const url = canvaApiService.generateAuthUrl();
      setAuthUrl(url);
      
      // 새 창에서 인증 페이지 열기
      const authWindow = window.open(url, 'canva-auth', 'width=500,height=600');
      
      // 인증 완료 확인을 위한 polling
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          // 페이지 새로고침하여 URL 파라미터 확인
          window.location.reload();
        }
      }, 1000);
      
    } catch (error) {
      onAuthError(error instanceof Error ? error.message : 'Canva 인증 URL 생성 실패');
    }
  };

  if (isAuthenticating) {
    return (
      <div className="canva-auth">
        <div className="auth-loading">
          <div className="spinner"></div>
          <p>Canva 인증 처리 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="canva-auth">
      <div className="auth-container">
        <h3>🎨 Canva 연동</h3>
        <p>실제 Canva 디자인을 가져오려면 Canva 계정 인증이 필요합니다.</p>
        
        <div className="auth-info">
          <h4>인증 후 가능한 기능:</h4>
          <ul>
            <li>✅ 실제 Canva 디자인 불러오기</li>
            <li>✅ 고품질 페이지 이미지 내보내기</li>
            <li>✅ 원본 해상도 플립북 생성</li>
            <li>✅ 다중 페이지 디자인 지원</li>
          </ul>
        </div>

        <div className="auth-actions">
          <button 
            className="auth-button"
            onClick={initiateAuth}
          >
            🔗 Canva 계정 연결하기
          </button>
          
          <button 
            className="skip-button"
            onClick={() => onAuthError('인증을 건너뛰고 Mock 데이터를 사용합니다.')}
          >
            건너뛰기 (Mock 데이터 사용)
          </button>
        </div>

        <div className="auth-note">
          <p><small>
            ⚠️ 인증 없이는 샘플 이미지만 사용됩니다.<br/>
            실제 Canva 디자인을 사용하려면 Canva 개발자 계정이 필요합니다.
          </small></p>
        </div>
      </div>
    </div>
  );
};