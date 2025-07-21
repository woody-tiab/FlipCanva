import { CanvaLinkPattern, ValidationResult } from '../types/canva';

const CANVA_LINK_PATTERNS: CanvaLinkPattern[] = [
  {
    type: 'DESIGN_VIEW',
    pattern: /^https?:\/\/(?:www\.)?canva\.com\/design\/([A-Za-z0-9_-]+)\/[A-Za-z0-9_-]+\/view(?:\?.*)?$/,
    extractDesignId: (match) => match[1]
  },
  {
    type: 'DESIGN_EDIT',
    pattern: /^https?:\/\/(?:www\.)?canva\.com\/design\/([A-Za-z0-9_-]+)\/[A-Za-z0-9_-]+\/edit(?:\?.*)?$/,
    extractDesignId: (match) => match[1]
  },
  {
    type: 'DESIGN_TEMPLATE',
    pattern: /^https?:\/\/(?:www\.)?canva\.com\/design\/([A-Za-z0-9_-]+)\/[A-Za-z0-9_-]+\/template(?:\?.*)?$/,
    extractDesignId: (match) => match[1]
  },
  {
    type: 'DESIGN_VIEW',
    pattern: /^https?:\/\/(?:www\.)?canva\.com\/design\/([A-Za-z0-9_-]+)\/view(?:\?.*)?$/,
    extractDesignId: (match) => match[1]
  },
  {
    type: 'DESIGN_EDIT',
    pattern: /^https?:\/\/(?:www\.)?canva\.com\/design\/([A-Za-z0-9_-]+)\/edit(?:\?.*)?$/,
    extractDesignId: (match) => match[1]
  },
  {
    type: 'DESIGN_ID_ONLY',
    pattern: /^([A-Za-z0-9_-]{10,})$/,
    extractDesignId: (match) => match[1]
  }
];

const CANVA_DESIGN_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

export function validateCanvaDesignId(designId: string): boolean {
  if (!designId || typeof designId !== 'string') {
    return false;
  }
  
  return CANVA_DESIGN_ID_PATTERN.test(designId.trim());
}

export function extractDesignIdFromUrl(input: string): ValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      errorType: 'INVALID_FORMAT',
      errorMessage: '입력값이 유효하지 않습니다.'
    };
  }

  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    return {
      isValid: false,
      errorType: 'INVALID_FORMAT',
      errorMessage: '캔바 링크 또는 디자인 ID를 입력해주세요.'
    };
  }

  for (const linkPattern of CANVA_LINK_PATTERNS) {
    const match = trimmedInput.match(linkPattern.pattern);
    if (match) {
      const designId = linkPattern.extractDesignId(match);
      
      if (!validateCanvaDesignId(designId)) {
        return {
          isValid: false,
          errorType: 'INVALID_ID',
          errorMessage: '추출된 디자인 ID가 유효하지 않습니다.'
        };
      }
      
      return {
        isValid: true,
        designId
      };
    }
  }

  return {
    isValid: false,
    errorType: 'INVALID_FORMAT',
    errorMessage: '올바른 캔바 디자인 링크 또는 ID를 입력해주세요. 링크는 \'canva.com/design/...\' 형식이어야 합니다.'
  };
}

export function getSupportedUrlFormats(): string[] {
  return [
    'https://www.canva.com/design/[디자인ID]/[해시]/view',
    'https://www.canva.com/design/[디자인ID]/[해시]/edit', 
    'https://www.canva.com/design/[디자인ID]/[해시]/template',
    'https://www.canva.com/design/[디자인ID]/view (구형)',
    'https://www.canva.com/design/[디자인ID]/edit (구형)',
    '[디자인ID만 입력] (예: DAGh8bZ9l9E)'
  ];
}

export function getErrorMessage(errorType: ValidationResult['errorType']): string {
  switch (errorType) {
    case 'INVALID_FORMAT':
      return '올바른 캔바 디자인 링크 또는 ID를 입력해주세요. 링크는 \'canva.com/design/...\' 형식이어야 합니다.';
    case 'INVALID_ID':
      return '디자인 ID 형식이 올바르지 않습니다. 10자 이상의 영문, 숫자, 하이픈, 언더스코어 조합이어야 합니다.';
    case 'DESIGN_NOT_FOUND':
      return '해당 디자인을 찾을 수 없습니다. 디자인이 공개되어 있고 올바른 링크인지 확인해주세요.';
    case 'API_ERROR':
      return '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    default:
      return '알 수 없는 오류가 발생했습니다.';
  }
}