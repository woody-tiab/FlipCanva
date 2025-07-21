import { useState, useCallback } from 'react';
import { AppError, ErrorState, ProcessingState, ProcessingStatus } from '../types/error';
import { createAppError } from '../utils/errorMessages';

interface UseErrorHandlerConfig {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: AppError) => void;
  onRetry?: (retryCount: number) => void;
  onSuccess?: () => void;
}

export const useErrorHandler = (config: UseErrorHandlerConfig = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetry,
    onSuccess
  } = config;

  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    retryCount: 0,
    maxRetries,
    isRetrying: false,
  });

  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    retryCount: 0,
  });

  const setError = useCallback((error: AppError | string | Error) => {
    let appError: AppError;
    
    if (typeof error === 'string') {
      appError = createAppError('UNKNOWN_ERROR', error);
    } else if (error instanceof Error) {
      appError = createAppError('UNKNOWN_ERROR', error.message);
    } else {
      appError = error;
    }

    const newErrorState: ErrorState = {
      hasError: true,
      error: appError,
      retryCount: errorState.retryCount,
      maxRetries,
      isRetrying: false,
    };

    setErrorState(newErrorState);
    setProcessingState(prev => ({
      ...prev,
      status: 'error',
      error: appError,
    }));

    onError?.(appError);
  }, [errorState.retryCount, maxRetries, onError]);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      retryCount: 0,
      maxRetries,
      isRetrying: false,
    });
    
    setProcessingState(prev => ({
      ...prev,
      status: 'idle',
      error: undefined,
      retryCount: 0,
    }));
  }, [maxRetries]);

  const setStatus = useCallback((status: ProcessingStatus, options?: {
    progress?: number;
    currentStep?: string;
  }) => {
    setProcessingState(prev => ({
      ...prev,
      status,
      progress: options?.progress,
      currentStep: options?.currentStep,
    }));

    if (status === 'success') {
      clearError();
      onSuccess?.();
    }
  }, [clearError, onSuccess]);

  const retry = useCallback(async (retryFunction: () => Promise<any>) => {
    if (!errorState.error?.retryable || errorState.retryCount >= maxRetries) {
      return;
    }

    const newRetryCount = errorState.retryCount + 1;
    
    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: newRetryCount,
    }));

    setProcessingState(prev => ({
      ...prev,
      status: 'retrying',
      retryCount: newRetryCount,
    }));

    onRetry?.(newRetryCount);

    try {
      // Add exponential backoff delay
      const delay = retryDelay * Math.pow(2, newRetryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      const result = await retryFunction();
      
      // Success - clear error state
      clearError();
      setProcessingState(prev => ({
        ...prev,
        status: 'success',
      }));

      return result;
    } catch (error) {
      // Retry failed - update error
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
      }));

      if (newRetryCount >= maxRetries) {
        // Max retries reached
        const maxRetriesError = createAppError(
          'UNKNOWN_ERROR',
          '최대 재시도 횟수에 도달했습니다. 고객센터로 문의해 주세요.'
        );
        setError(maxRetriesError);
      } else {
        // Set the new error for next retry
        setError(error as Error);
      }
      
      throw error;
    }
  }, [errorState, maxRetries, retryDelay, onRetry, clearError, setError]);

  const executeWithErrorHandling = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
    }
  ): Promise<T | null> => {
    try {
      setStatus('loading', { currentStep: options?.loadingMessage });
      clearError();

      const result = await asyncFunction();
      
      setStatus('success', { currentStep: options?.successMessage });
      return result;
    } catch (error) {
      setError(error as Error);
      return null;
    }
  }, [setStatus, clearError, setError]);

  return {
    // State
    errorState,
    processingState,
    hasError: errorState.hasError,
    isLoading: processingState.status === 'loading',
    isRetrying: errorState.isRetrying,
    canRetry: errorState.error?.retryable && errorState.retryCount < maxRetries,
    
    // Actions
    setError,
    clearError,
    setStatus,
    retry,
    executeWithErrorHandling,
    
    // Helper getters
    currentError: errorState.error,
    retryCount: errorState.retryCount,
    maxRetries: errorState.maxRetries,
    processingStatus: processingState.status,
    progress: processingState.progress,
    currentStep: processingState.currentStep,
  };
};