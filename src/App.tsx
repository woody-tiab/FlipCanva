import { useState } from 'react';
import { CanvaLinkInput } from './components/CanvaLinkInput';
import { FlipbookProcessor } from './components/FlipbookProcessor';
import './components/CanvaLinkInput.css';
import './components/FlipbookProcessor.css';
import './App.css';

function App() {
  const [validatedDesignId, setValidatedDesignId] = useState<string | null>(null);

  const handleValidDesignId = (designId: string) => {
    setValidatedDesignId(designId);
    console.log('유효한 디자인 ID:', designId);
  };

  const handleValidationError = (error: string) => {
    setValidatedDesignId(null);
    console.error('검증 오류:', error);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>FlipCanva</h1>
        <p>캔바 디자인을 플립북으로 변환하세요</p>
      </header>

      <main className="app-main">
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