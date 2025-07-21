export interface AppError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorState {
  hasError: boolean;
  error: AppError | null;
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
}

export enum ErrorCode {
  // Canva API 관련 오류
  CANVA_TIMEOUT = 'CANVA_TIMEOUT',
  CANVA_ACCESS_DENIED = 'CANVA_ACCESS_DENIED',
  CANVA_DESIGN_NOT_FOUND = 'CANVA_DESIGN_NOT_FOUND',
  CANVA_RATE_LIMITED = 'CANVA_RATE_LIMITED',
  CANVA_INVALID_TOKEN = 'CANVA_INVALID_TOKEN',
  
  // 디자인 유효성 관련 오류
  INSUFFICIENT_PAGES = 'INSUFFICIENT_PAGES',
  INVALID_DESIGN_FORMAT = 'INVALID_DESIGN_FORMAT',
  DESIGN_TOO_LARGE = 'DESIGN_TOO_LARGE',
  UNSUPPORTED_CONTENT = 'UNSUPPORTED_CONTENT',
  
  // 업로드/스토리지 관련 오류
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  
  // 네트워크 관련 오류
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  SERVER_UNAVAILABLE = 'SERVER_UNAVAILABLE',
  
  // 일반 오류
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SERVICE_MAINTENANCE = 'SERVICE_MAINTENANCE',
}

export interface ErrorMessages {
  [key: string]: {
    title: string;
    message: string;
    actionText?: string;
    retryable: boolean;
    severity: AppError['severity'];
  };
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
}

export type ProcessingStatus = 'idle' | 'loading' | 'success' | 'error' | 'retrying';

export interface ProcessingState {
  status: ProcessingStatus;
  progress?: number;
  currentStep?: string;
  error?: AppError;
  retryCount: number;
}