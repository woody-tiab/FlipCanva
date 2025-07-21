import React from 'react';
import { ImageLoadState } from '../hooks/useLazyImageLoader';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  width = '100%', 
  height = '100%', 
  className = '' 
}) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] ${className}`}
    style={{ width, height }}
  >
    <div className="w-full h-full bg-gray-200 rounded-lg"></div>
  </div>
);

interface ProgressSpinnerProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const ProgressSpinner: React.FC<ProgressSpinnerProps> = ({
  progress,
  size = 40,
  strokeWidth = 3,
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-300"
        />
        {/* 진행률 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="text-blue-500 transition-all duration-300 ease-out"
          strokeLinecap="round"
        />
      </svg>
      {/* 중앙 텍스트 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-gray-600">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message = '이미지를 불러올 수 없습니다',
  onRetry,
  className = ''
}) => (
  <div className={`flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
    <div className="flex items-center justify-center w-12 h-12 mb-3 bg-red-100 rounded-full">
      <svg
        className="w-6 h-6 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </div>
    
    <p className="text-sm text-gray-600 text-center mb-3">
      {message}
    </p>
    
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        다시 시도
      </button>
    )}
  </div>
);

interface PlaceholderImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

const PlaceholderImage: React.FC<PlaceholderImageProps> = ({
  src,
  alt = 'placeholder',
  className = ''
}) => {
  if (!src) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`filter blur-sm opacity-60 transition-opacity duration-300 ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

interface ImageLoadingUIProps {
  imageState: ImageLoadState;
  onRetry?: () => void;
  showProgress?: boolean;
  showPlaceholder?: boolean;
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const ImageLoadingUI: React.FC<ImageLoadingUIProps> = ({
  imageState,
  onRetry,
  showProgress = true,
  showPlaceholder = true,
  className = '',
  width = '100%',
  height = '200px'
}) => {
  const { status, progress, placeholder } = imageState;

  switch (status) {
    case 'idle':
      return (
        <SkeletonLoader
          width={width}
          height={height}
          className={className}
        />
      );

    case 'loading':
      return (
        <div className={`relative ${className}`} style={{ width, height }}>
          {/* 플레이스홀더 배경 */}
          {showPlaceholder && placeholder ? (
            <PlaceholderImage
              src={placeholder}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <SkeletonLoader className="absolute inset-0" />
          )}
          
          {/* 로딩 오버레이 */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
            {showProgress ? (
              <ProgressSpinner progress={progress} />
            ) : (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            )}
          </div>
        </div>
      );

    case 'error':
      return (
        <ErrorDisplay
          message="페이지를 불러올 수 없습니다"
          onRetry={onRetry}
          className={className}
        />
      );

    case 'loaded':
      return null; // 로딩 완료 시 UI 숨김

    default:
      return (
        <SkeletonLoader
          width={width}
          height={height}
          className={className}
        />
      );
  }
};

// 전체 플립북 로딩 상태를 보여주는 컴포넌트
interface FlipbookLoadingOverlayProps {
  totalProgress: number;
  loadedCount: number;
  totalCount: number;
  isVisible: boolean;
  onCancel?: () => void;
}

export const FlipbookLoadingOverlay: React.FC<FlipbookLoadingOverlayProps> = ({
  totalProgress,
  loadedCount,
  totalCount,
  isVisible,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="mb-4">
            <ProgressSpinner 
              progress={totalProgress} 
              size={60} 
              strokeWidth={4}
            />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            플립북 로딩 중
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            {loadedCount} / {totalCount} 페이지 완료
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            ></div>
          </div>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 개별 페이지 로딩 인디케이터
interface PageLoadingIndicatorProps {
  isLoading: boolean;
  hasError: boolean;
  progress: number;
  onRetry?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const PageLoadingIndicator: React.FC<PageLoadingIndicatorProps> = ({
  isLoading,
  hasError,
  progress,
  onRetry,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const spinnerSizes = {
    sm: 20,
    md: 24,
    lg: 32
  };

  if (hasError) {
    return (
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={onRetry}
          className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1 transition-colors"
          title="다시 시도"
        >
          <svg className={sizeClasses[size]} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute top-2 right-2 z-10">
        <ProgressSpinner 
          progress={progress} 
          size={spinnerSizes[size]}
          strokeWidth={2}
        />
      </div>
    );
  }

  return null;
};

export default ImageLoadingUI;