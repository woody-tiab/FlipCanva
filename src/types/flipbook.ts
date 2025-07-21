export interface FlipbookMetadata {
  id: string;
  title: string;
  description?: string;
  userId?: string;
  canvaDesignId: string;
  canvaDesignUrl?: string;
  status: FlipbookStatus;
  visibility: FlipbookVisibility;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  pageCount: number;
  totalSize: number;
  viewCount: number;
  isFeatured: boolean;
  settings?: FlipbookSettings;
  metadata?: FlipbookExtraMetadata;
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  pages?: PageMetadata[];
  isPublished: boolean;
  isExpired: boolean;
  slug: string;
}

export interface PageMetadata {
  id: string;
  flipbookId: string;
  pageIndex: number;
  title?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  originalWidth: number;
  originalHeight: number;
  displayWidth?: number;
  displayHeight?: number;
  fileSize: number;
  mimeType: string;
  transitionType: PageTransitionType;
  transitionDuration: number;
  orientation: PageOrientation;
  backgroundColor?: string;
  hasTransparency: boolean;
  qualityScore?: number;
  processingTime?: number;
  storageKey?: string;
  cdnUrl?: string;
  isProcessed: boolean;
  errorMessage?: string;
  metadata?: PageExtraMetadata;
  animations?: PageAnimations;
  createdAt: string;
  updatedAt: string;
  aspectRatio: number;
  isLandscape: boolean;
  isPortrait: boolean;
  displayAspectRatio: number;
  fileSizeInMB: number;
  hasCustomDimensions: boolean;
}

export enum FlipbookStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export enum FlipbookVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  UNLISTED = 'unlisted',
}

export enum PageTransitionType {
  SLIDE = 'slide',
  FADE = 'fade',
  FLIP = 'flip',
  CURL = 'curl',
  ZOOM = 'zoom',
  NONE = 'none',
}

export enum PageOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  SQUARE = 'square',
}

export interface FlipbookSettings {
  autoPlay?: boolean;
  loopPages?: boolean;
  showNavigation?: boolean;
  enableSound?: boolean;
  flipSpeed?: number;
  backgroundMusic?: string;
  theme?: string;
}

export interface FlipbookExtraMetadata {
  originalFormat?: string;
  processingTime?: number;
  exportedAt?: string;
  quality?: string;
  tags?: string[];
  category?: string;
}

export interface PageExtraMetadata {
  canvaPageId?: string;
  extractedAt?: string;
  aiProcessed?: boolean;
  tags?: string[];
  textContent?: string;
  colorPalette?: string[];
  dominantColor?: string;
  complexity?: number;
}

export interface PageAnimations {
  entrance?: AnimationConfig;
  exit?: AnimationConfig;
  pageSpecific?: any[];
}

export interface AnimationConfig {
  type: string;
  duration: number;
  delay: number;
}

export interface CreateFlipbookRequest {
  title: string;
  description?: string;
  userId?: string;
  canvaDesignId: string;
  canvaDesignUrl?: string;
  visibility?: FlipbookVisibility;
  coverImageUrl?: string;
  settings?: FlipbookSettings;
  metadata?: FlipbookExtraMetadata;
  expiresAt?: string;
  pages: CreatePageRequest[];
}

export interface CreatePageRequest {
  pageIndex: number;
  title?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  originalWidth: number;
  originalHeight: number;
  displayWidth?: number;
  displayHeight?: number;
  fileSize: number;
  mimeType: string;
  transitionType?: PageTransitionType;
  transitionDuration?: number;
  orientation?: PageOrientation;
  backgroundColor?: string;
  hasTransparency?: boolean;
  qualityScore?: number;
  storageKey?: string;
  cdnUrl?: string;
  metadata?: PageExtraMetadata;
  animations?: PageAnimations;
}

export interface UpdateFlipbookRequest {
  title?: string;
  description?: string;
  status?: FlipbookStatus;
  visibility?: FlipbookVisibility;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  isFeatured?: boolean;
  settings?: FlipbookSettings;
  metadata?: FlipbookExtraMetadata;
  publishedAt?: string;
  expiresAt?: string;
}

export interface FlipbookListResponse {
  flipbooks: FlipbookMetadata[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FlipbookQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: FlipbookStatus;
  visibility?: FlipbookVisibility;
  userId?: string;
  isFeatured?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}