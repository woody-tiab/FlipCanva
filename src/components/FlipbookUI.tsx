import React, { useState, useCallback, useEffect } from 'react';
import { FlipbookMetadata, PageTransitionType } from '../types/flipbook';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import AudioControl from './AudioControl';

interface FlipbookUIProps {
  flipbook: FlipbookMetadata;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  loadingProgress: number;
  onPageChange: (page: number) => void;
  onTransitionChange: (type: PageTransitionType) => void;
  onSettingsOpen: () => void;
  onFullscreenToggle: () => void;
  onZoomChange: (zoom: number) => void;
  isFullscreen?: boolean;
  currentZoom?: number;
  className?: string;
}

interface NavigationButtonProps {
  direction: 'prev' | 'next';
  onClick: () => void;
  disabled: boolean;
  size: 'sm' | 'md' | 'lg';
  position: 'left' | 'right';
}

const NavigationButton: React.FC<NavigationButtonProps> = ({
  direction,
  onClick,
  disabled,
  size,
  position
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const positionClasses = {
    left: 'left-4',
    right: 'right-4'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        fixed top-1/2 transform -translate-y-1/2 ${positionClasses[position]}
        ${sizeClasses[size]}
        bg-white/90 backdrop-blur-sm shadow-lg rounded-full
        flex items-center justify-center
        hover:bg-white hover:shadow-xl
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-all duration-200 z-30
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
      aria-label={direction === 'prev' ? '이전 페이지' : '다음 페이지'}
    >
      {direction === 'prev' ? (
        <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      ) : (
        <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
};

interface ProgressBarProps {
  current: number;
  total: number;
  onPageSelect: (page: number) => void;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  onPageSelect,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPage, setHoverPage] = useState<number | null>(null);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const targetPage = Math.round(percentage * (total - 1));
    onPageSelect(Math.max(0, Math.min(total - 1, targetPage)));
  }, [total, onPageSelect]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = x / rect.width;
      const page = Math.round(percentage * (total - 1));
      setHoverPage(Math.max(0, Math.min(total - 1, page)));
    }
  }, [isDragging, total]);

  return (
    <div className={`relative ${className}`}>
      <div
        className="h-2 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPage(null)}
      >
        {/* 진행률 바 */}
        <div
          className="h-full bg-blue-500 transition-all duration-300 rounded-full"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
        
        {/* 호버 표시 */}
        {hoverPage !== null && (
          <div
            className="absolute top-0 h-full w-1 bg-blue-300 transition-all duration-100"
            style={{ left: `${(hoverPage / (total - 1)) * 100}%` }}
          />
        )}
      </div>
      
      {/* 페이지 정보 */}
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>1</span>
        <span className="font-medium">{current + 1} / {total}</span>
        <span>{total}</span>
      </div>
      
      {/* 호버 툴팁 */}
      {hoverPage !== null && (
        <div
          className="absolute -top-8 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded"
          style={{ left: `${(hoverPage / (total - 1)) * 100}%` }}
        >
          {hoverPage + 1}
        </div>
      )}
    </div>
  );
};

interface TopControlsProps {
  onSettingsOpen: () => void;
  onFullscreenToggle: () => void;
  isFullscreen: boolean;
  size: 'sm' | 'md' | 'lg';
}

const TopControls: React.FC<TopControlsProps> = ({
  onSettingsOpen,
  onFullscreenToggle,
  isFullscreen,
  size
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-9 h-9 text-lg'
  };

  return (
    <div className="fixed top-4 left-4 flex items-center space-x-2 z-40">
      {/* 설정 버튼 */}
      <button
        onClick={onSettingsOpen}
        className={`
          ${sizeClasses[size]}
          bg-white/90 backdrop-blur-sm shadow-lg rounded-full
          flex items-center justify-center
          hover:bg-white hover:shadow-xl
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-label="설정"
      >
        <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* 전체화면 버튼 */}
      <button
        onClick={onFullscreenToggle}
        className={`
          ${sizeClasses[size]}
          bg-white/90 backdrop-blur-sm shadow-lg rounded-full
          flex items-center justify-center
          hover:bg-white hover:shadow-xl
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-label={isFullscreen ? '전체화면 해제' : '전체화면'}
      >
        {isFullscreen ? (
          <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
    </div>
  );
};

interface BottomControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onTransitionChange: (type: PageTransitionType) => void;
  currentTransition: PageTransitionType;
  className?: string;
}

const BottomControls: React.FC<BottomControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onTransitionChange,
  currentTransition,
  className = ''
}) => {
  const [showTransitions, setShowTransitions] = useState(false);

  const transitions = [
    { type: PageTransitionType.FLIP, label: '플립', icon: '📖' },
    { type: PageTransitionType.SLIDE, label: '슬라이드', icon: '➡️' },
    { type: PageTransitionType.FADE, label: '페이드', icon: '🌫️' },
    { type: PageTransitionType.CURL, label: '컬', icon: '📜' },
    { type: PageTransitionType.ZOOM, label: '줌', icon: '🔍' }
  ];

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 ${className}`}>
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-4 min-w-[320px]">
        {/* 진행률 바 */}
        <ProgressBar
          current={currentPage}
          total={totalPages}
          onPageSelect={onPageChange}
          className="mb-4"
        />
        
        {/* 하단 컨트롤 */}
        <div className="flex items-center justify-between">
          {/* 이전 페이지 버튼 */}
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="이전 페이지"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 전환 효과 선택 */}
          <div className="relative">
            <button
              onClick={() => setShowTransitions(!showTransitions)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="전환 효과 선택"
            >
              <span className="text-sm">
                {transitions.find(t => t.type === currentTransition)?.icon}
              </span>
              <span className="text-xs text-gray-600">
                {transitions.find(t => t.type === currentTransition)?.label}
              </span>
              <svg className={`w-4 h-4 transition-transform ${showTransitions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 전환 효과 드롭다운 */}
            {showTransitions && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white shadow-xl rounded-lg border py-1 min-w-[120px]">
                {transitions.map((transition) => (
                  <button
                    key={transition.type}
                    onClick={() => {
                      onTransitionChange(transition.type);
                      setShowTransitions(false);
                    }}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2
                      ${currentTransition === transition.type ? 'bg-blue-50 text-blue-600' : ''}
                    `}
                  >
                    <span>{transition.icon}</span>
                    <span>{transition.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 다음 페이지 버튼 */}
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="다음 페이지"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const FlipbookUI: React.FC<FlipbookUIProps> = ({
  flipbook,
  currentPage,
  totalPages,
  isLoading,
  loadingProgress,
  onPageChange,
  onTransitionChange,
  onSettingsOpen,
  onFullscreenToggle,
  onZoomChange,
  isFullscreen = false,
  currentZoom = 1,
  className = ''
}) => {
  const { deviceInfo, layoutConfig } = useResponsiveLayout();
  const [currentTransition, setCurrentTransition] = useState<PageTransitionType>(PageTransitionType.FLIP);

  const handleTransitionChange = useCallback((type: PageTransitionType) => {
    setCurrentTransition(type);
    onTransitionChange(type);
  }, [onTransitionChange]);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      onPageChange(page);
    }
  }, [totalPages, onPageChange]);

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // 입력 필드에서는 무시
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          handlePageChange(currentPage - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          event.preventDefault();
          handlePageChange(currentPage + 1);
          break;
        case 'Home':
          event.preventDefault();
          handlePageChange(0);
          break;
        case 'End':
          event.preventDefault();
          handlePageChange(totalPages - 1);
          break;
        case 'f':
        case 'F':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            onFullscreenToggle();
          }
          break;
        case 'Escape':
          if (isFullscreen) {
            event.preventDefault();
            onFullscreenToggle();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, isFullscreen, handlePageChange, onFullscreenToggle]);

  return (
    <div className={`flipbook-ui ${className}`}>
      {/* 상단 컨트롤 */}
      <TopControls
        onSettingsOpen={onSettingsOpen}
        onFullscreenToggle={onFullscreenToggle}
        isFullscreen={isFullscreen}
        size={layoutConfig.controlsSize}
      />

      {/* 오디오 컨트롤 */}
      <AudioControl
        size={layoutConfig.controlsSize}
        position="top-right"
        showTooltip={!deviceInfo.hasTouch}
      />

      {/* 네비게이션 버튼 (데스크톱에서만) */}
      {deviceInfo.type === 'desktop' && (
        <>
          <NavigationButton
            direction="prev"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            size={layoutConfig.navigationSize}
            position="left"
          />
          <NavigationButton
            direction="next"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            size={layoutConfig.navigationSize}
            position="right"
          />
        </>
      )}

      {/* 하단 컨트롤 */}
      <BottomControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onTransitionChange={handleTransitionChange}
        currentTransition={currentTransition}
        className={deviceInfo.isKeyboardVisible ? 'hidden' : ''}
      />

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  플립북 로딩 중...
                </p>
                <p className="text-xs text-gray-500">
                  {Math.round(loadingProgress)}% 완료
                </p>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* 접근성 정보 */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        현재 {currentPage + 1}페이지, 총 {totalPages}페이지 중
      </div>
    </div>
  );
};

export default FlipbookUI;