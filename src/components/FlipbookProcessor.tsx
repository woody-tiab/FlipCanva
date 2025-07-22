import React from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { ErrorDisplay } from './ErrorDisplay';
import { LoadingSpinner } from './LoadingSpinner';
import FlipbookViewer from './FlipbookViewer';
import { createAppError } from '../utils/errorMessages';
import { ErrorCode } from '../types/error';
import { canvaApiService } from '../services/canvaApi';
import { flipbookApiService } from '../services/flipbookApi';
import { FlipbookMetadata, PageMetadata } from '../types/flipbook';
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
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [completedResult, setCompletedResult] = React.useState<any>(null);
  const [showViewer, setShowViewer] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(0);

  // Mock 플립북 데이터를 실제 뷰어에서 사용할 수 있는 형태로 변환
  const createViewerFlipbook = (result: any): FlipbookMetadata => {
    console.log('🔥 createViewerFlipbook input:', result);
    
    const exportData = result.exportData;
    const flipbookData = result.flipbook;
    
    console.log('🔥 exportData:', exportData);
    console.log('🔥 flipbookData:', flipbookData);
    
    let pages: PageMetadata[] = exportData?.pages?.map((page: any, index: number) => ({
      id: page.id || `page_${index}`,
      pageNumber: index + 1,
      imageUrl: page.url,
      aspectRatio: page.width && page.height ? page.width / page.height : 1.0,
      hasTransparency: false,
      title: `페이지 ${index + 1}`,
      description: `${flipbookData?.title || '플립북'}의 ${index + 1}번째 페이지`
    })) || [];

    // 💥 FORCE FALLBACK: 페이지가 없으면 무조건 Mock 페이지 생성
    if (!pages || pages.length === 0) {
      console.log('🔥 NO PAGES FOUND! Creating forced fallback pages');
      pages = [
        {
          id: `${result.designId}_page_1`,
          pageNumber: 1,
          imageUrl: `https://via.placeholder.com/800x1200/4A90E2/FFFFFF?text=Page+1+${result.designId}`,
          aspectRatio: 800 / 1200,
          hasTransparency: false,
          title: '페이지 1',
          description: `${flipbookData?.title || '플립북'}의 1번째 페이지`
        },
        {
          id: `${result.designId}_page_2`,
          pageNumber: 2,
          imageUrl: `https://via.placeholder.com/800x1200/50C878/FFFFFF?text=Page+2+${result.designId}`,
          aspectRatio: 800 / 1200,
          hasTransparency: false,
          title: '페이지 2',
          description: `${flipbookData?.title || '플립북'}의 2번째 페이지`
        },
        {
          id: `${result.designId}_page_3`,
          pageNumber: 3,
          imageUrl: `https://via.placeholder.com/800x1200/FF6B6B/FFFFFF?text=Page+3+${result.designId}`,
          aspectRatio: 800 / 1200,
          hasTransparency: false,
          title: '페이지 3',
          description: `${flipbookData?.title || '플립북'}의 3번째 페이지`
        }
      ];
    }

    console.log('🔥 Generated pages:', pages);

    const flipbook = {
      id: flipbookData?.id || 'mock-flipbook',
      title: flipbookData?.title || 'Mock 플립북',
      description: flipbookData?.description || 'Mock 데이터로 생성된 플립북',
      canvaDesignId: result.designId,
      userId: flipbookData?.userId || 'demo-user',
      status: 'published' as any,
      visibility: 'private' as any,
      pageCount: pages.length,
      pages: pages,
      createdAt: flipbookData?.createdAt || new Date().toISOString(),
      updatedAt: flipbookData?.updatedAt || new Date().toISOString(),
      viewCount: flipbookData?.viewCount || 0,
      isFeatured: false,
      tags: [],
      categories: []
    };

    console.log('🔥 Final flipbook metadata:', flipbook);
    return flipbook;
  };

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
    
    console.log('🔥 Raw exportResult:', exportResult);
    
    if (!exportResult.success) {
      throw createAppError(
        ErrorCode.CANVA_TIMEOUT,
        exportResult.error?.message || 'Canva 이미지 내보내기에 실패했습니다.',
        `Design ID: ${designId}`
      );
    }

    // 임시: exportResult가 올바르지 않다면 Mock 데이터를 직접 생성
    let actualExportData = exportResult.data;
    if (!actualExportData?.pages) {
      console.log('🔥 Export result has no pages, creating mock data');
      actualExportData = {
        designId,
        format: 'PNG',
        pages: [
          {
            id: `${designId}_page_1`,
            url: `https://via.placeholder.com/800x1200/4A90E2/FFFFFF?text=Page+1`,
            width: 800,
            height: 1200,
          },
          {
            id: `${designId}_page_2`,
            url: `https://via.placeholder.com/800x1200/50C878/FFFFFF?text=Page+2`,
            width: 800,
            height: 1200,
          },
          {
            id: `${designId}_page_3`,
            url: `https://via.placeholder.com/800x1200/FF6B6B/FFFFFF?text=Page+3`,
            width: 800,
            height: 1200,
          }
        ],
        totalPages: 3,
        exportedAt: new Date().toISOString()
      };
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

    console.log('🔥 processCanvaDesign results:');
    console.log('🔥 validationResult.data:', validationResult.data);
    console.log('🔥 actualExportData:', actualExportData);
    console.log('🔥 flipbookResult.data:', flipbookResult.data);

    return {
      designId,
      flipbook: flipbookResult.data,
      exportData: actualExportData,
      validationData: validationResult.data
    };
  };

  const handleProcess = async () => {
    setIsCompleted(false);
    setCompletedResult(null);
    
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
      console.log('🎯 Setting isCompleted to true');
      
      setIsCompleted(true);
      setCompletedResult(result);
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
  const isSuccess = isCompleted && !hasError;

  // 디버깅용 로그
  console.log('🔍 FlipbookProcessor render:', {
    isProcessing,
    isSuccess,
    isCompleted,
    processingStatus,
    hasError,
    currentError,
    completedResult
  });

  // 플립북 뷰어가 열려있는 경우
  if (showViewer && completedResult) {
    const viewerFlipbook = createViewerFlipbook(completedResult);
    
    return (
      <div className="flipbook-viewer-container">
        <div className="viewer-header">
          <button
            className="back-button"
            onClick={() => setShowViewer(false)}
          >
            ← 뒤로 가기
          </button>
          <h3>{viewerFlipbook.title}</h3>
          <div className="viewer-info">
            <span>디자인 ID: {designId}</span>
            <span>|</span>
            <span>{viewerFlipbook.pageCount}페이지</span>
          </div>
        </div>
        <div className="viewer-content">
          <FlipbookViewer
            flipbook={viewerFlipbook}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            autoPlay={false}
            controls={true}
          />
        </div>
      </div>
    );
  }

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
            {completedResult && (
              <div className="flipbook-details">
                <h5>생성된 플립북 정보:</h5>
                <ul>
                  <li><strong>플립북 ID:</strong> {completedResult.flipbook?.id}</li>
                  <li><strong>제목:</strong> {completedResult.flipbook?.title}</li>
                  <li><strong>페이지 수:</strong> {completedResult.exportData?.totalPages || 0}개</li>
                  <li><strong>생성 시간:</strong> {completedResult.flipbook?.createdAt ? new Date(completedResult.flipbook.createdAt).toLocaleString('ko-KR') : 'N/A'}</li>
                </ul>
              </div>
            )}
            <div className="success-actions">
              <button 
                className="view-flipbook-button"
                onClick={() => {
                  if (completedResult) {
                    setCurrentPage(0);
                    setShowViewer(true);
                  }
                }}
              >
                📖 플립북 보기
              </button>
              <button 
                className="new-flipbook-button"
                onClick={() => {
                  setIsCompleted(false);
                  setCompletedResult(null);
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