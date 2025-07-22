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
      // Netlify Functions를 통한 토큰 교환
      const response = await fetch('/.netlify/functions/canva-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          code_verifier: sessionStorage.getItem('canva_code_verifier')
        }),
      });

      const data = await response.json();

      if (data.success && data.access_token) {
        // 토큰을 localStorage에 저장
        localStorage.setItem('canva_access_token', data.access_token);
        localStorage.setItem('canva_token_expires', Date.now() + (data.expires_in * 1000));
        
        onAuthSuccess(data.access_token);
        
        // URL 정리
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 성공 메시지 - 더 눈에 띄게
        setTimeout(() => {
          alert('🎉 Canva 인증 완료!\n\n✅ 실제 Canva 디자인을 사용할 수 있습니다.\n✅ 상단에 "Canva 연동됨" 표시를 확인하세요.\n\n이제 Canva 링크를 입력하여 플립북을 만들어보세요!');
        }, 500);
      } else {
        throw new Error(data.error?.message || '토큰 교환 실패');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      onAuthError(error instanceof Error ? error.message : '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const initiateAuth = async () => {
    try {
      console.log('🔗 Canva 인증 시작...');
      setIsAuthenticating(true);
      
      const url = await canvaApiService.generateAuthUrl();
      console.log('✅ 인증 URL 생성 성공:', url.substring(0, 50) + '...');
      setAuthUrl(url);
      
      // 사용자에게 리다이렉트 안내
      alert('🔗 Canva 인증 페이지로 이동합니다. 인증 완료 후 자동으로 돌아옵니다.');
      
      // 현재 창에서 직접 이동 (더 안정적)
      window.location.href = url;
      
    } catch (error) {
      console.error('❌ Canva 인증 URL 생성 실패:', error);
      setIsAuthenticating(false);
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