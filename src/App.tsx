import { useState } from 'react';
import { CanvaLinkInput } from './components/CanvaLinkInput';
import { FlipbookProcessor } from './components/FlipbookProcessor';
import { CanvaAuth } from './components/CanvaAuth';
import { canvaApiService } from './services/canvaApi';
import './components/CanvaLinkInput.css';
import './components/FlipbookProcessor.css';
import './components/CanvaAuth.css';
import './App.css';

function App() {
  const [validatedDesignId, setValidatedDesignId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const handleValidDesignId = (designId: string) => {
    setValidatedDesignId(designId);
    console.log('유효한 디자인 ID:', designId);
  };

  const handleValidationError = (error: string) => {
    setValidatedDesignId(null);
    console.error('검증 오류:', error);
  };

  const handleAuthSuccess = (accessToken: string) => {
    canvaApiService.setAccessToken(accessToken);
    setIsAuthenticated(true);
    setShowAuth(false);
    setAuthError(null);
    console.log('✅ Canva 인증 성공! 실제 API 사용 가능');
  };

  const handleAuthError = (error: string) => {
    setAuthError(error);
    setIsAuthenticated(false);
    console.log('⚠️ Canva 인증 실패 또는 건너뛰기:', error);
  };

  const handleShowAuth = () => {
    setShowAuth(true);
    setAuthError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>FlipCanva</h1>
        <p>캔바 디자인을 플립북으로 변환하세요</p>
        
        {/* Canva 인증 상태 표시 */}
        <div className="auth-status">
          {isAuthenticated ? (
            <span className="auth-success">✅ Canva 연동됨 (실제 API)</span>
          ) : (
            <div className="auth-actions-header">
              <span className="auth-warning">⚠️ Mock 데이터 사용 중</span>
              <button 
                className="auth-connect-btn"
                onClick={handleShowAuth}
              >
                🔗 Canva 연결하기
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {/* Canva 인증 모달 */}
        {showAuth && (
          <section className="auth-section">
            <CanvaAuth
              onAuthSuccess={handleAuthSuccess}
              onAuthError={handleAuthError}
            />
            <button 
              className="close-auth-btn"
              onClick={() => setShowAuth(false)}
            >
              ✕ 닫기
            </button>
          </section>
        )}

        {/* 인증 오류/건너뛰기 메시지 */}
        {authError && (
          <section className="auth-message">
            <div className="message-content">
              <p>{authError}</p>
              <small>Mock 데이터로 계속 진행합니다. 언제든지 상단에서 Canva를 연결할 수 있습니다.</small>
            </div>
          </section>
        )}

        <section className="input-section">
          <CanvaLinkInput
            onValidDesignId={handleValidDesignId}
            onValidationError={handleValidationError}
          />
        </section>

        {validatedDesignId && (
          <section className="result-section">
            <FlipbookProcessor
              designId={validatedDesignId}
              onSuccess={(result) => {
                console.log('Flipbook created successfully:', result);
                // TODO: Navigate to flipbook viewer
              }}
              onCancel={() => {
                setValidatedDesignId(null);
              }}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 FlipCanva. 교육용 플립북 제작 도구</p>
      </footer>
    </div>
  );
}

export default App;