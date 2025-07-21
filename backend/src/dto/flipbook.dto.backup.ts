import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUrl,
  IsArray,
  ValidateNested,
  IsString,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsDateString,
  ArrayMinSize,
  ArrayMaxSize,
  Length,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { FlipbookStatus, FlipbookVisibility } from '../entities/flipbook.entity';
import { PageDto, CreatePageDto } from './page.dto';

export class CreateFlipbookDto {
  @IsNotEmpty({ message: '제목은 필수입니다.' })
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @Length(1, 200, { message: '제목은 1~200자 사이여야 합니다.' })
  title: string;

  @IsOptional()
  @IsString({ message: '설명은 문자열이어야 합니다.' })
  @Length(0, 1000, { message: '설명은 최대 1000자까지 가능합니다.' })
  description?: string;

  @IsOptional()
  @IsString({ message: '사용자 ID는 문자열이어야 합니다.' })
  @Length(1, 100, { message: '사용자 ID는 1~100자 사이여야 합니다.' })
  userId?: string;

  @IsNotEmpty({ message: 'Canva 디자인 ID는 필수입니다.' })
  @IsString({ message: 'Canva 디자인 ID는 문자열이어야 합니다.' })
  @Length(1, 100, { message: 'Canva 디자인 ID는 1~100자 사이여야 합니다.' })
  canvaDesignId: string;

  @IsOptional()
  @IsUrl({}, { message: '올바른 Canva 디자인 URL이어야 합니다.' })
  canvaDesignUrl?: string;

  @IsOptional()
  @IsEnum(FlipbookVisibility, { message: '유효한 공개 설정이어야 합니다.' })
  visibility?: FlipbookVisibility;

  @IsOptional()
  @IsUrl({}, { message: '올바른 커버 이미지 URL이어야 합니다.' })
  coverImageUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FlipbookSettingsDto)
  settings?: FlipbookSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FlipbookMetadataDto)
  metadata?: FlipbookMetadataDto;

  @IsOptional()
  @IsDateString({}, { message: '올바른 만료 날짜 형식이어야 합니다.' })
  expiresAt?: string;

  @IsArray({ message: '페이지는 배열이어야 합니다.' })
  @ArrayMinSize(1, { message: '최소 1개의 페이지가 필요합니다.' })
  @ArrayMaxSize(500, { message: '최대 500개의 페이지까지 가능합니다.' })
  @ValidateNested({ each: true })
  @Type(() => CreatePageDto)
  pages: CreatePageDto[];
}

export class UpdateFlipbookDto {
  @IsOptional()
  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @Length(1, 200, { message: '제목은 1~200자 사이여야 합니다.' })
  title?: string;

  @IsOptional()
  @IsString({ message: '설명은 문자열이어야 합니다.' })
  @Length(0, 1000, { message: '설명은 최대 1000자까지 가능합니다.' })
  description?: string;

  @IsOptional()
  @IsEnum(FlipbookStatus, { message: '유효한 상태값이어야 합니다.' })
  status?: FlipbookStatus;

  @IsOptional()
  @IsEnum(FlipbookVisibility, { message: '유효한 공개 설정이어야 합니다.' })
  visibility?: FlipbookVisibility;

  @IsOptional()
  @IsUrl({}, { message: '올바른 커버 이미지 URL이어야 합니다.' })
  coverImageUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: '올바른 썸네일 URL이어야 합니다.' })
  thumbnailUrl?: string;

  @IsOptional()
  @IsBoolean({ message: '추천 여부는 불린값이어야 합니다.' })
  isFeatured?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => FlipbookSettingsDto)
  settings?: FlipbookSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FlipbookMetadataDto)
  metadata?: FlipbookMetadataDto;

  @IsOptional()
  @IsDateString({}, { message: '올바른 게시 날짜 형식이어야 합니다.' })
  publishedAt?: string;

  @IsOptional()
  @IsDateString({}, { message: '올바른 만료 날짜 형식이어야 합니다.' })
  expiresAt?: string;
}

export class FlipbookSettingsDto {
  @IsOptional()
  @IsBoolean({ message: '자동 재생은 불린값이어야 합니다.' })
  autoPlay?: boolean;

  @IsOptional()
  @IsBoolean({ message: '페이지 반복은 불린값이어야 합니다.' })
  loopPages?: boolean;

  @IsOptional()
  @IsBoolean({ message: '네비게이션 표시는 불린값이어야 합니다.' })
  showNavigation?: boolean;

  @IsOptional()
  @IsBoolean({ message: '사운드 활성화는 불린값이어야 합니다.' })
  enableSound?: boolean;

  @IsOptional()
  @IsInt({ message: '페이지 넘김 속도는 정수여야 합니다.' })
  @Min(100, { message: '페이지 넘김 속도는 최소 100ms여야 합니다.' })
  @Max(3000, { message: '페이지 넘김 속도는 최대 3초여야 합니다.' })
  flipSpeed?: number;

  @IsOptional()
  @IsUrl({}, { message: '올바른 배경 음악 URL이어야 합니다.' })
  backgroundMusic?: string;

  @IsOptional()
  @IsString({ message: '테마는 문자열이어야 합니다.' })
  @Length(1, 50, { message: '테마는 1~50자 사이여야 합니다.' })
  theme?: string;
}

export class FlipbookMetadataDto {
  @IsOptional()
  @IsString({ message: '원본 형식은 문자열이어야 합니다.' })
  originalFormat?: string;

  @IsOptional()
  @IsInt({ message: '처리 시간은 정수여야 합니다.' })
  @Min(0, { message: '처리 시간은 0 이상이어야 합니다.' })
  processingTime?: number;

  @IsOptional()
  @IsDateString({}, { message: '올바른 내보내기 날짜 형식이어야 합니다.' })
  exportedAt?: string;

  @IsOptional()
  @IsString({ message: '품질은 문자열이어야 합니다.' })
  quality?: string;

  @IsOptional()
  @IsArray({ message: '태그는 배열이어야 합니다.' })
  @IsString({ each: true, message: '각 태그는 문자열이어야 합니다.' })
  @ArrayMaxSize(20, { message: '태그는 최대 20개까지 가능합니다.' })
  tags?: string[];

  @IsOptional()
  @IsString({ message: '카테고리는 문자열이어야 합니다.' })
  @Length(1, 50, { message: '카테고리는 1~50자 사이여야 합니다.' })
  category?: string;
}

export class FlipbookResponseDto {
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
  settings?: FlipbookSettingsDto;
  metadata?: FlipbookMetadataDto;
  publishedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  pages?: PageDto[];

  // Virtual fields
  isPublished: boolean;
  isExpired: boolean;
  slug: string;
}

export class FlipbookListResponseDto {
  flipbooks: FlipbookResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class FlipbookQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '페이지는 정수여야 합니다.' })
  @Min(1, { message: '페이지는 1 이상이어야 합니다.' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: '제한값은 정수여야 합니다.' })
  @Min(1, { message: '제한값은 1 이상이어야 합니다.' })
  @Max(100, { message: '제한값은 100 이하여야 합니다.' })
  limit?: number = 20;

  @IsOptional()
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  @Length(1, 100, { message: '검색어는 1~100자 사이여야 합니다.' })
  search?: string;

  @IsOptional()
  @IsEnum(FlipbookStatus, { message: '유효한 상태값이어야 합니다.' })
  status?: FlipbookStatus;

  @IsOptional()
  @IsEnum(FlipbookVisibility, { message: '유효한 공개 설정이어야 합니다.' })
  visibility?: FlipbookVisibility;

  @IsOptional()
  @IsString({ message: '사용자 ID는 문자열이어야 합니다.' })
  userId?: string;

  @IsOptional()
  @IsBoolean({ message: '추천 여부는 불린값이어야 합니다.' })
  @Transform(({ value }) => value === 'true')
  isFeatured?: boolean;

  @IsOptional()
  @IsString({ message: '정렬 기준은 문자열이어야 합니다.' })
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'title' = 'createdAt';

  @IsOptional()
  @IsString({ message: '정렬 방향은 문자열이어야 합니다.' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}