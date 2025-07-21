import React from 'react';
import { ProcessingStatus } from '../types/error';

interface LoadingSpinnerProps {
  status: ProcessingStatus;
  message?: string;
  progress?: number;
  currentStep?: string;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  status,
  message,
  progress,
  currentStep,
  size = 'medium',
  showProgress = false,
  className = ''
}) => {
  if (status === 'idle' || status === 'success') {
    return null;
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return message || '처리 중...';
      case 'retrying':
        return '재시도 중...';
      case 'error':
        return '오류가 발생했습니다';
      default:
        return '처리 중...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return '#7c3aed'; // purple
      case 'retrying':
        return '#d97706'; // amber
      case 'error':
        return '#dc2626'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'loading-small';
      case 'large':
        return 'loading-large';
      default:
        return 'loading-medium';
    }
  };

  return (
    <div className={`loading-container ${getSizeClass()} ${className}`}>
      <div className="loading-content">
        {/* Spinner */}
        <div 
          className={`loading-spinner ${status}`}
          style={{ borderTopColor: getStatusColor() }}
        >
          {status === 'retrying' && (
            <div className="retry-indicator">
              ↻
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="loading-message">
          {getStatusMessage()}
        </div>

        {/* Current Step */}
        {currentStep && (
          <div className="loading-step">
            {currentStep}
          </div>
        )}

        {/* Progress Bar */}
        {showProgress && typeof progress === 'number' && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor: getStatusColor()
                }}
              />
            </div>
            <div className="progress-text">
              {Math.round(progress)}%
            </div>
          </div>
        )}

        {/* Pulse Animation for Loading */}
        {status === 'loading' && (
          <div className="loading-pulse">
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
          </div>
        )}
      </div>
    </div>
  );
};