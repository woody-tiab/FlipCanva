import React, { useState } from 'react';
import { extractDesignIdFromUrl, getErrorMessage, getSupportedUrlFormats } from '../utils/canvaValidator';
import { ValidationResult } from '../types/canva';

interface CanvaLinkInputProps {
  onValidDesignId?: (designId: string) => void;
  onValidationError?: (error: string) => void;
}

export const CanvaLinkInput: React.FC<CanvaLinkInputProps> = ({
  onValidDesignId,
  onValidationError
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showFormats, setShowFormats] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (validationResult && !validationResult.isValid) {
      setValidationResult(null);
    }
  };

  const handleValidation = async () => {
    if (!inputValue.trim()) {
      const error = '캔바 링크 또는 디자인 ID를 입력해주세요.';
      setValidationResult({
        isValid: false,
        errorType: 'INVALID_FORMAT',
        errorMessage: error
      });
      onValidationError?.(error);
      return;
    }

    setIsValidating(true);
    
    try {
      // 먼저 URL 형식 검증
      const urlValidation = extractDesignIdFromUrl(inputValue);
      
      if (!urlValidation.isValid) {
        setValidationResult(urlValidation);
        const errorMsg = urlValidation.errorMessage || getErrorMessage(urlValidation.errorType);
        onValidationError?.(errorMsg);
        return;
      }

      // 백엔드 API로 실제 디자인 검증 (추후 구현 예정)
      // const apiResult = await canvaApiService.validateDesign(urlValidation.designId!);
      
      // 현재는 URL 검증만 수행
      setValidationResult(urlValidation);
      onValidDesignId?.(urlValidation.designId!);
      
    } catch (error) {
      const errorMsg = 'API 호출 중 오류가 발생했습니다.';
      setValidationResult({
        isValid: false,
        errorType: 'API_ERROR',
        errorMessage: errorMsg
      });
      onValidationError?.(errorMsg);
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidation();
    }
  };

  const supportedFormats = getSupportedUrlFormats();

  return (
    <div className="canva-link-input">
      <div className="input-section">
        <label htmlFor="canva-input" className="input-label">
          캔바 디자인 링크 또는 ID 입력
        </label>
        
        <div className="input-wrapper">
          <input
            id="canva-input"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="https://www.canva.com/design/DAGh8bZ9l9E/6CESpszvVlTFIEL6J2pf7w/edit"
            className={`input-field ${validationResult?.isValid === false ? 'error' : ''} ${validationResult?.isValid === true ? 'success' : ''}`}
            disabled={isValidating}
          />
          
          <button
            type="button"
            onClick={handleValidation}
            disabled={isValidating || !inputValue.trim()}
            className="validate-button"
          >
            {isValidating ? '검증 중...' : '검증'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFormats(!showFormats)}
          className="format-help-button"
        >
          {showFormats ? '형식 숨기기' : '지원하는 형식 보기'}
        </button>
      </div>

      {showFormats && (
        <div className="supported-formats">
          <h4>지원하는 캔바 링크 형식:</h4>
          <ul>
            {supportedFormats.map((format, index) => (
              <li key={index}>{format}</li>
            ))}
          </ul>
        </div>
      )}

      {validationResult && (
        <div className={`validation-result ${validationResult.isValid ? 'success' : 'error'}`}>
          {validationResult.isValid ? (
            <div className="success-message">
              <span className="icon">✅</span>
              <div>
                <p>유효한 캔바 디자인입니다!</p>
                <p className="design-id">디자인 ID: {validationResult.designId}</p>
              </div>
            </div>
          ) : (
            <div className="error-message">
              <span className="icon">❌</span>
              <div>
                <p>{validationResult.errorMessage}</p>
                <button 
                  type="button" 
                  onClick={handleValidation}
                  className="retry-button"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isValidating && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>캔바 디자인을 검증하고 있습니다...</span>
        </div>
      )}
    </div>
  );
};