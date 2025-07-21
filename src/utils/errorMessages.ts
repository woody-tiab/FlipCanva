import { ErrorCode, ErrorMessages } from '../types/error';

export const errorMessages: ErrorMessages = {
  [ErrorCode.CANVA_TIMEOUT]: {
    title: '연결 시간 초과',
    message: 'Canva 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.',
    actionText: '다시 시도',
    retryable: true,
    severity: 'medium',
  },
  
  [ErrorCode.CANVA_ACCESS_DENIED]: {
    title: '접근 권한 없음',
    message: 'Canva 디자인에 접근할 권한이 없어요. 디자인이 공개되어 있는지 확인해 주세요.',
    actionText: '다시 확인',
    retryable: true,
    severity: 'medium',
  },
  
  [ErrorCode.CANVA_DESIGN_NOT_FOUND]: {
    title: '디자인을 찾을 수 없음',
    message: '해당 Canva 디자인을 찾을 수 없어요. 링크가 올바른지 확인해 주세요.',
    actionText: '링크 재확인',
    retryable: false,
    severity: 'medium',
  },
  
  [ErrorCode.CANVA_RATE_LIMITED]: {
    title: '요청 한도 초과',
    message: '잠시 너무 많은 요청이 있었어요. 5분 후 다시 시도해 주세요.',
    actionText: '5분 후 재시도',
    retryable: true,
    severity: 'low',
  },
  
  [ErrorCode.CANVA_INVALID_TOKEN]: {
    title: '인증 만료',
    message: 'Canva 인증이 만료되었어요. 다시 로그인해 주세요.',
    actionText: '다시 로그인',
    retryable: false,
    severity: 'high',
  },
  
  [ErrorCode.INSUFFICIENT_PAGES]: {
    title: '페이지 수 부족',
    message: '플립북을 만들기 위해선 최소 2페이지 이상의 디자인이 필요해요.',
    actionText: '디자인 수정',
    retryable: false,
    severity: 'medium',
  },
  
  [ErrorCode.INVALID_DESIGN_FORMAT]: {
    title: '지원하지 않는 형식',
    message: '이 디자인 형식은 플립북으로 변환할 수 없어요. 다른 디자인을 사용해 주세요.',
    actionText: '다른 디자인 선택',
    retryable: false,
    severity: 'medium',
  },
  
  [ErrorCode.DESIGN_TOO_LARGE]: {
    title: '디자인 크기 초과',
    message: '디자인이 너무 커서 처리할 수 없어요. 더 작은 크기의 디자인을 사용해 주세요.',
    actionText: '디자인 축소',
    retryable: false,
    severity: 'medium',
  },
  
  [ErrorCode.UNSUPPORTED_CONTENT]: {
    title: '지원하지 않는 콘텐츠',
    message: '일부 콘텐츠가 플립북에서 지원되지 않아요. 기본 이미지와 텍스트만 사용해 주세요.',
    actionText: '콘텐츠 수정',
    retryable: false,
    severity: 'medium',
  },
  
  [ErrorCode.UPLOAD_FAILED]: {
    title: '업로드 실패',
    message: '파일 업로드 중 오류가 발생했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
    actionText: '다시 업로드',
    retryable: true,
    severity: 'medium',
  },
  
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: {
    title: '저장 공간 부족',
    message: '저장 공간이 부족해요. 이전 플립북을 삭제하거나 업그레이드를 고려해 주세요.',
    actionText: '공간 정리',
    retryable: false,
    severity: 'high',
  },
  
  [ErrorCode.FILE_TOO_LARGE]: {
    title: '파일 크기 초과',
    message: '파일이 너무 커서 업로드할 수 없어요. 더 작은 이미지를 사용해 주세요.',
    actionText: '이미지 압축',
    retryable: false,
    severity: 'medium',
  },
  
  [ErrorCode.STORAGE_UNAVAILABLE]: {
    title: '저장소 사용 불가',
    message: '파일 저장소에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.',
    actionText: '잠시 후 재시도',
    retryable: true,
    severity: 'high',
  },
  
  [ErrorCode.NETWORK_ERROR]: {
    title: '네트워크 오류',
    message: '인터넷 연결에 문제가 있어요. 연결 상태를 확인하고 다시 시도해 주세요.',
    actionText: '연결 확인 후 재시도',
    retryable: true,
    severity: 'medium',
  },
  
  [ErrorCode.CONNECTION_TIMEOUT]: {
    title: '연결 시간 초과',
    message: '서버 연결이 너무 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.',
    actionText: '다시 시도',
    retryable: true,
    severity: 'medium',
  },
  
  [ErrorCode.SERVER_UNAVAILABLE]: {
    title: '서버 사용 불가',
    message: '서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.',
    actionText: '잠시 후 재시도',
    retryable: true,
    severity: 'high',
  },
  
  [ErrorCode.UNKNOWN_ERROR]: {
    title: '알 수 없는 오류',
    message: '알 수 없는 오류가 발생했어요. 문제가 지속되면 고객센터로 문의해 주세요.',
    actionText: '고객센터 문의',
    retryable: true,
    severity: 'high',
  },
  
  [ErrorCode.VALIDATION_ERROR]: {
    title: '입력 오류',
    message: '입력하신 정보에 문제가 있어요. 다시 확인해 주세요.',
    actionText: '다시 입력',
    retryable: false,
    severity: 'low',
  },
  
  [ErrorCode.PERMISSION_DENIED]: {
    title: '권한 없음',
    message: '이 작업을 수행할 권한이 없어요. 로그인 상태를 확인해 주세요.',
    actionText: '로그인 확인',
    retryable: false,
    severity: 'medium',
  },
  
  [ErrorCode.SERVICE_MAINTENANCE]: {
    title: '서비스 점검 중',
    message: '현재 서비스 점검 중이에요. 점검 완료 후 다시 이용해 주세요.',
    actionText: '나중에 다시 시도',
    retryable: false,
    severity: 'high',
  },
};

export function getErrorMessage(code: string): ErrorMessages[string] {
  return errorMessages[code] || errorMessages[ErrorCode.UNKNOWN_ERROR];
}

export function createAppError(
  code: string, 
  customMessage?: string,
  details?: string
): import('../types/error').AppError {
  const errorInfo = getErrorMessage(code);
  
  return {
    code,
    message: customMessage || errorInfo.message,
    details,
    timestamp: new Date().toISOString(),
    retryable: errorInfo.retryable,
    severity: errorInfo.severity,
  };
}