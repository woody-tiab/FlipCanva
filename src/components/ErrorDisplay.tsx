import React from 'react';
import { AppError } from '../types/error';
import { getErrorMessage } from '../utils/errorMessages';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  showAsModal?: boolean;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  showAsModal = false,
  className = ''
}) => {
  const errorInfo = getErrorMessage(error.code);
  const canRetry = error.retryable && retryCount < maxRetries && onRetry;
  const showRetryLimit = retryCount >= maxRetries && error.retryable;

  const getSeverityIcon = () => {
    switch (error.severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  const getSeverityColor = () => {
    switch (error.severity) {
      case 'critical':
        return '#dc2626'; // red-600
      case 'high':
        return '#ea580c'; // orange-600
      case 'medium':
        return '#d97706'; // amber-600
      case 'low':
        return '#2563eb'; // blue-600
      default:
        return '#6b7280'; // gray-500
    }
  };

  const ErrorContent = () => (
    <div className={`error-content ${error.severity}`}>
      <div className="error-header">
        <div className="error-icon" style={{ color: getSeverityColor() }}>
          {getSeverityIcon()}
        </div>
        <div className="error-title">
          {errorInfo.title}
        </div>
        {onDismiss && (
          <button 
            className="dismiss-button"
            onClick={onDismiss}
            aria-label="오류 메시지 닫기"
          >
            ✕
          </button>
        )}
      </div>

      <div className="error-body">
        <p className="error-message">
          {error.message}
        </p>
        
        {error.details && (
          <details className="error-details">
            <summary>자세한 정보</summary>
            <p>{error.details}</p>
          </details>
        )}

        {showRetryLimit && (
          <div className="retry-limit-notice">
            <p>계속 실패하고 있어요. 고객센터로 문의해 주세요.</p>
          </div>
        )}

        {retryCount > 0 && !showRetryLimit && (
          <div className="retry-count">
            재시도 {retryCount}/{maxRetries}
          </div>
        )}
      </div>

      <div className="error-actions">
        {canRetry && (
          <button
            className={`retry-button ${isRetrying ? 'retrying' : ''}`}
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <span className="retry-spinner"></span>
                재시도 중...
              </>
            ) : (
              errorInfo.actionText || '다시 시도'
            )}
          </button>
        )}

        {showRetryLimit && (
          <button
            className="contact-button"
            onClick={() => window.open('mailto:support@flipcanva.com', '_blank')}
          >
            고객센터 문의
          </button>
        )}

        {!error.retryable && errorInfo.actionText && (
          <button
            className="action-button"
            onClick={onDismiss}
          >
            {errorInfo.actionText}
          </button>
        )}
      </div>

      <div className="error-timestamp">
        {new Date(error.timestamp).toLocaleString('ko-KR')}
      </div>
    </div>
  );

  if (showAsModal) {
    return (
      <div className={`error-modal-overlay ${className}`}>
        <div className="error-modal">
          <ErrorContent />
        </div>
      </div>
    );
  }

  return (
    <div className={`error-inline ${className}`}>
      <ErrorContent />
    </div>
  );
};