import React from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { ErrorDisplay } from './ErrorDisplay';
import { LoadingSpinner } from './LoadingSpinner';
import { createAppError } from '../utils/errorMessages';
import { ErrorCode } from '../types/error';
import { canvaApiService } from '../services/canvaApi';
import { flipbookApiService } from '../services/flipbookApi';
import './ErrorDisplay.css';
import './LoadingSpinner.css';

interface FlipbookProcessorProps {
  designId: string;
  onSuccess?: (result: any) => void;
  onCancel?: () => void;
}

export const FlipbookProcessor: React.FC<FlipbookProcessorProps> = ({
  designId,
  onSuccess,
  onCancel
}) => {
  const {
    hasError,
    isLoading,
    isRetrying,
    canRetry,
    currentError,
    retryCount,
    maxRetries,
    processingStatus,
    progress,
    currentStep,
    setError,
    clearError,
    setStatus,
    retry,
    executeWithErrorHandling
  } = useErrorHandler({
    maxRetries: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Flipbook processing error:', error);
    },
    onRetry: (count) => {
      console.log(`Retrying... attempt ${count}`);
    },
    onSuccess: () => {
      console.log('Flipbook processing completed successfully');
    }
  });

  const processCanvaDesign = async () => {
    // Step 1: Validate Design
    setStatus('loading', { currentStep: 'Canva 디자인 검증 중...', progress: 10 });
    const validationResult = await canvaApiService.validateDesign(designId);
    
    if (!validationResult.success) {
      throw createAppError(
        ErrorCode.CANVA_TIMEOUT,
        validationResult.error?.message || 'Canva 디자인 검증에 실패했습니다.',
        `Design ID: ${designId}`
      );
    }

    // Step 2: Export Design to Images
    setStatus('loading', { currentStep: '페이지 이미지 내보내는 중...', progress: 40 });
    const exportResult = await canvaApiService.exportDesign(designId, 'PNG');
    
    if (!exportResult.success) {
      throw createAppError(
        ErrorCode.CANVA_TIMEOUT,
        exportResult.error?.message || 'Canva 이미지 내보내기에 실패했습니다.',
        `Design ID: ${designId}`
      );
    }

    // Step 3: Create Flipbook
    setStatus('loading', { currentStep: '플립북 생성 중...', progress: 70 });
    const flipbookData = {
      title: validationResult.data?.designInfo?.title || `Flipbook ${designId}`,
      description: `Canva 디자인 ${designId}에서 생성된 플립북`,
      canvaDesignId: designId,
      userId: 'demo-user' // TODO: 실제 사용자 ID 사용
    };

    const flipbookResult = await flipbookApiService.createFlipbook(flipbookData);
    
    if (!flipbookResult.success) {
      throw createAppError(
        ErrorCode.UPLOAD_FAILED,
        flipbookResult.error?.message || '플립북 생성에 실패했습니다.',
        `Design ID: ${designId}`
      );
    }

    setStatus('loading', { currentStep: '완료!', progress: 100 });

    return {
      designId,
      flipbook: flipbookResult.data,
      exportData: exportResult.data,
      validationData: validationResult.data
    };
  };

  const handleProcess = async () => {
    const result = await executeWithErrorHandling(
      processCanvaDesign,
      {
        loadingMessage: '플립북 처리를 시작합니다...',
        successMessage: '플립북이 성공적으로 생성되었습니다!'
      }
    );

    if (result) {
      console.log('🎉 Process completed with result:', result);
      console.log('🎯 Current processingStatus:', processingStatus);
      console.log('🎯 isSuccess check:', processingStatus === 'success');
      setStatus('success', { currentStep: '플립북이 성공적으로 생성되었습니다!' });
      onSuccess?.(result);
    }
  };

  const handleRetry = async () => {
    try {
      const result = await retry(processCanvaDesign);
      if (result) {
        onSuccess?.(result);
      }
    } catch (error) {
      // Error is already handled by the retry function
    }
  };

  const handleDismissError = () => {
    clearError();
  };

  const isProcessing = isLoading || isRetrying;
  const isSuccess = processingStatus === 'success';

  // 디버깅용 로그
  console.log('🔍 FlipbookProcessor render:', {
    isProcessing,
    isSuccess,
    processingStatus,
    hasError,
    currentError
  });

  return (
    <div className="flipbook-processor">
      <div className="processor-header">
        <h3>플립북 생성</h3>
        <p>디자인 ID: <code>{designId}</code></p>
      </div>

      {/* Loading State */}
      {isProcessing && (
        <div className="processor-loading">
          <LoadingSpinner
            status={processingStatus}
            progress={progress}
            currentStep={currentStep}
            size="large"
            showProgress={true}
          />
        </div>
      )}

      {/* Success State */}
      {isSuccess && (
        <div className="processor-success">
          <div className="success-message">
            <h4>✅ 플립북이 성공적으로 생성되었습니다!</h4>
            <p>디자인 ID: <code>{designId}</code>로부터 플립북을 생성했습니다.</p>
            <div className="success-actions">
              <button 
                className="new-flipbook-button"
                onClick={() => {
                  clearError();
                  setStatus('idle');
                }}
              >
                새 플립북 만들기
              </button>
              {onCancel && (
                <button
                  className="done-button"
                  onClick={onCancel}
                >
                  완료
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && currentError && (
        <div className="processor-error">
          <ErrorDisplay
            error={currentError}
            onRetry={canRetry ? handleRetry : undefined}
            onDismiss={handleDismissError}
            isRetrying={isRetrying}
            retryCount={retryCount}
            maxRetries={maxRetries}
            showAsModal={false}
          />
        </div>
      )}

      {/* Action Buttons */}
      {!hasError && !isProcessing && !isSuccess && (
        <div className="processor-actions">
          <button
            className="process-button"
            onClick={handleProcess}
          >
            플립북 생성 시작
          </button>
          
          {onCancel && (
            <button
              className="cancel-button"
              onClick={onCancel}
            >
              취소
            </button>
          )}
        </div>
      )}

      {/* Demo Error Buttons (for testing) */}
      <div className="demo-controls">
        <h4>테스트용 에러 시뮬레이션</h4>
        <div className="demo-buttons">
          <button onClick={() => setError(createAppError(ErrorCode.CANVA_TIMEOUT))}>
            타임아웃 에러
          </button>
          <button onClick={() => setError(createAppError(ErrorCode.INSUFFICIENT_PAGES))}>
            페이지 부족 에러
          </button>
          <button onClick={() => setError(createAppError(ErrorCode.UPLOAD_FAILED))}>
            업로드 실패 에러
          </button>
          <button onClick={() => setError(createAppError(ErrorCode.UNKNOWN_ERROR))}>
            알 수 없는 에러
          </button>
        </div>
      </div>
    </div>
  );
};