import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUrl,
  IsInt,
  Min,
  Max,
  IsPositive,
  IsString,
  IsBoolean,
  ValidateNested,
  IsArray,
  Length,
  IsHexColor,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
// 간단한 enum 정의
enum PageTransitionType {
  SLIDE = 'slide',
  FADE = 'fade',
  FLIP = 'flip',
}

enum PageOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
}

// 먼저 기본 DTO들을 정의
export class PageMetadataDto {
  @IsOptional()
  @IsString()
  canvaPageId?: string;

  @IsOptional()
  @IsString()
  extractedAt?: string;

  @IsOptional()
  @IsBoolean()
  aiProcessed?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsArray()
  @IsHexColor({ each: true })
  colorPalette?: string[];
}

export class PageAnimationsDto {
  @IsOptional()
  @IsEnum(PageTransitionType)
  inTransition?: PageTransitionType;

  @IsOptional()
  @IsEnum(PageTransitionType)
  outTransition?: PageTransitionType;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5)
  duration?: number;

  @IsOptional()
  @IsString()
  easing?: string;
}

export class CreatePageDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  title: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  pageNumber: number;

  @IsNotEmpty()
  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  width: number;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  height: number;

  @IsOptional()
  @IsEnum(PageOrientation)
  orientation?: PageOrientation;

  @IsOptional()
  @IsEnum(PageTransitionType)
  transitionType?: PageTransitionType;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5)
  transitionDuration?: number;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsUrl()
  cdnUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PageMetadataDto)
  metadata?: PageMetadataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PageAnimationsDto)
  animations?: PageAnimationsDto;
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  pageNumber?: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  width?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  height?: number;

  @IsOptional()
  @IsEnum(PageOrientation)
  orientation?: PageOrientation;

  @IsOptional()
  @IsEnum(PageTransitionType)
  transitionType?: PageTransitionType;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5)
  transitionDuration?: number;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsUrl()
  cdnUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PageMetadataDto)
  metadata?: PageMetadataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PageAnimationsDto)
  animations?: PageAnimationsDto;
}

export class PageDto {
  id: string;
  title: string;
  description?: string;
  pageNumber: number;
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  orientation?: PageOrientation;
  transitionType?: PageTransitionType;
  transitionDuration?: number;
  storageKey?: string;
  cdnUrl?: string;
  metadata?: PageMetadataDto;
  animations?: PageAnimationsDto;
  createdAt: Date;
  updatedAt: Date;
}

export class PageReorderDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  pageIds: string[];
}

export class PageBatchUpdateDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePageDto)
  pages: UpdatePageDto[];
}