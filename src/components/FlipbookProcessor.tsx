import React from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { ErrorDisplay } from './ErrorDisplay';
import { LoadingSpinner } from './LoadingSpinner';
import FlipbookViewer from './FlipbookViewer';
import { createAppError } from '../utils/errorMessages';
import { ErrorCode } from '../types/error';
import { canvaApiService } from '../services/canvaApi';
import { CanvaConnectionStatus } from './CanvaConnectionStatus';
import { CanvaDesignTester } from './CanvaDesignTester';
import { flipbookApiService } from '../services/flipbookApi';
import { FlipbookMetadata, PageMetadata } from '../types/flipbook';
import './ErrorDisplay.css';
import './LoadingSpinner.css';

interface FlipbookProcessorProps {
  designId?: string;
  onSuccess?: (result: any) => void;
  onCancel?: () => void;
  onDesignIdChange?: (designId: string) => void;
}

export const FlipbookProcessor: React.FC<FlipbookProcessorProps> = React.memo(({
  designId: initialDesignId,
  onSuccess,
  onCancel,
  onDesignIdChange
}) => {
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [completedResult, setCompletedResult] = React.useState<any>(null);
  const [showViewer, setShowViewer] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [processCache, setProcessCache] = React.useState<Map<string, any>>(new Map());
  const [isCanvaConnected, setIsCanvaConnected] = React.useState<boolean>(false);
  const [currentDesignId, setCurrentDesignId] = React.useState<string>(initialDesignId || '');

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

    // 💥 OPTIMIZED FALLBACK: 페이지가 없으면 효율적인 Mock 페이지 생성
    if (!pages || pages.length === 0) {
      console.log('🔥 NO PAGES FOUND! Creating optimized fallback pages');
      const baseUrl = 'https://placehold.co/800x1200';
      const colors = ['667eea', '764ba2', 'a8e6cf'];
      
      pages = colors.map((color, index) => ({
        id: `${currentDesignId}_page_${index + 1}`,
        pageNumber: index + 1,
        imageUrl: `${baseUrl}/${color}/ffffff/png?text=Page+${index + 1}`,
        aspectRatio: 800 / 1200,
        hasTransparency: false,
        title: `페이지 ${index + 1}`,
        description: `${flipbookData?.title || '플립북'}의 ${index + 1}번째 페이지`
      }));
    }

    console.log('🔥 Generated pages:', pages);

    const flipbook = {
      id: flipbookData?.id || 'mock-flipbook',
      title: flipbookData?.title || 'Mock 플립북',
      description: flipbookData?.description || 'Mock 데이터로 생성된 플립북',
      canvaDesignId: currentDesignId,
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
    // Check cache first
    if (processCache.has(currentDesignId)) {
      console.log('🎯 Using cached result for design:', currentDesignId);
      return processCache.get(currentDesignId);
    }
    
    console.log('🚀 Starting process with Canva connection status:', isCanvaConnected);
    
    // Step 1: Validate Design
    setStatus('loading', { currentStep: 'Canva 디자인 검증 중...', progress: 10 });
    const validationResult = await canvaApiService.validateDesign(currentDesignId);
    
    if (!validationResult.success) {
      throw createAppError(
        ErrorCode.CANVA_TIMEOUT,
        validationResult.error?.message || 'Canva 디자인 검증에 실패했습니다.',
        `Design ID: ${currentDesignId}`
      );
    }

    // Step 2: Export Design to Images
    setStatus('loading', { currentStep: '페이지 이미지 내보내는 중...', progress: 40 });
    const exportResult = await canvaApiService.exportDesign(currentDesignId, 'PNG');
    
    console.log('🔥 Raw exportResult:', exportResult);
    
    if (!exportResult.success) {
      throw createAppError(
        ErrorCode.CANVA_TIMEOUT,
        exportResult.error?.message || 'Canva 이미지 내보내기에 실패했습니다.',
        `Design ID: ${currentDesignId}`
      );
    }

    // 연결 상태에 따른 데이터 처리
    let actualExportData = exportResult.data;
    if (!actualExportData?.pages) {
      const dataType = isCanvaConnected ? 'API 결과가 비어 있어' : 'Mock 모드이므로';
      console.log(`🔥 ${dataType} fallback 데이터를 생성합니다.`);
      actualExportData = {
        designId: currentDesignId,
        format: 'PNG',
        pages: [
          {
            id: `${currentDesignId}_page_1`,
            url: `https://placehold.co/800x1200/667eea/ffffff/png?text=Page+1`,
            width: 800,
            height: 1200,
          },
          {
            id: `${currentDesignId}_page_2`,
            url: `https://placehold.co/800x1200/764ba2/ffffff/png?text=Page+2`,
            width: 800,
            height: 1200,
          },
          {
            id: `${currentDesignId}_page_3`,
            url: `https://placehold.co/800x1200/a8e6cf/ffffff/png?text=Page+3`,
            width: 800,
            height: 1200,
          }
        ],
        totalPages: 3,
        exportedAt: new Date().toISOString()
      };
    }

    // Step 3: Create Flipbook
    setStatus('loading', { 
      currentStep: '플립북 데이터베이스에 저장 중...', 
      progress: 70 
    });
    const flipbookData = {
      title: validationResult.data?.designInfo?.title || `${isCanvaConnected ? 'Canva' : 'Mock'} Flipbook ${currentDesignId}`,
      description: `${isCanvaConnected ? 'Canva API' : 'Mock 데이터'}로 생성된 플립북 (${currentDesignId})`,
      canvaDesignId: currentDesignId,
      userId: 'demo-user'
    };

    const flipbookResult = await flipbookApiService.createFlipbook(flipbookData);
    
    if (!flipbookResult.success) {
      throw createAppError(
        ErrorCode.UPLOAD_FAILED,
        flipbookResult.error?.message || '플립북 생성에 실패했습니다.',
        `Design ID: ${currentDesignId}`
      );
    }

    setStatus('loading', { currentStep: '완료!', progress: 100 });

    const result = {
      designId: currentDesignId,
      flipbook: flipbookResult.data,
      exportData: actualExportData,
      validationData: validationResult.data
    };
    
    // Cache the result
    setProcessCache(prev => new Map(prev.set(currentDesignId, result)));
    console.log('🎯 Cached result for design:', currentDesignId);

    return result;
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

  // 성능 최적화: 디버깅 로그를 조건부로만 출력
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 FlipbookProcessor state change:', {
        isProcessing,
        isSuccess,
        isCompleted,
        processingStatus,
        hasError,
        cacheSize: processCache.size
      });
    }
  }, [isProcessing, isSuccess, isCompleted, processingStatus, hasError, processCache.size]);

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
            <span>디자인 ID: {currentDesignId}</span>
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
        {currentDesignId && (
          <p>디자인 ID: <code>{currentDesignId}</code></p>
        )}
        
        {/* Canva Connection Status */}
        <div style={{ marginTop: '16px' }}>
          <CanvaConnectionStatus 
            onConnectionChange={setIsCanvaConnected}
          />
        </div>
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
            <p>디자인 ID: <code>{currentDesignId}</code>로부터 플립북을 생성했습니다.</p>
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
});

FlipbookProcessor.displayName = 'FlipbookProcessor';