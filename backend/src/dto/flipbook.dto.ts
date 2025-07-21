import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  IsBoolean,
  Length,
  Min,
  Max,
} from 'class-validator';
import { FlipbookStatus, FlipbookVisibility } from '../entities/flipbook.entity';

export class CreateFlipbookDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  title: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsNotEmpty()
  @IsString()
  canvaDesignId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpdateFlipbookDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsEnum(FlipbookStatus)
  status?: FlipbookStatus;

  @IsOptional()
  @IsEnum(FlipbookVisibility)
  visibility?: FlipbookVisibility;
}

export class FlipbookQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsEnum(FlipbookStatus)
  status?: FlipbookStatus;

  @IsOptional()
  @IsEnum(FlipbookVisibility)
  visibility?: FlipbookVisibility;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}