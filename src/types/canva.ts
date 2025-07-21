export interface CanvaDesignInfo {
  designId: string;
  url: string;
  isValid: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  designId?: string;
  errorType?: 'INVALID_FORMAT' | 'INVALID_ID' | 'DESIGN_NOT_FOUND' | 'API_ERROR';
  errorMessage?: string;
}

export type CanvaUrlType = 
  | 'DESIGN_VIEW'     // https://www.canva.com/design/DAF.../view
  | 'DESIGN_EDIT'     // https://www.canva.com/design/DAF.../edit
  | 'DESIGN_TEMPLATE' // https://www.canva.com/design/DAF.../template
  | 'DESIGN_ID_ONLY'  // DAF...
  | 'UNKNOWN';

export interface CanvaLinkPattern {
  pattern: RegExp;
  type: CanvaUrlType;
  extractDesignId: (match: RegExpMatchArray) => string;
}