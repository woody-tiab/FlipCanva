import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsEnum, IsUrl, IsDateString } from 'class-validator';
import { Page } from './page.entity';

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

@Entity('flipbooks')
@Index(['userId', 'createdAt'])
@Index(['status', 'visibility'])
export class Flipbook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  @IsNotEmpty({ message: '제목은 필수입니다.' })
  title: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  description?: string;

  @Column({ name: 'user_id', length: 100, nullable: true })
  @IsOptional()
  userId?: string;

  @Column({ name: 'canva_design_id', length: 100 })
  @IsNotEmpty({ message: 'Canva 디자인 ID는 필수입니다.' })
  canvaDesignId: string;

  @Column({ name: 'canva_design_url', length: 500, nullable: true })
  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식이어야 합니다.' })
  canvaDesignUrl?: string;

  @Column({
    type: 'varchar',
    default: FlipbookStatus.DRAFT,
  })
  @IsEnum(FlipbookStatus, { message: '유효한 상태값이어야 합니다.' })
  status: FlipbookStatus;

  @Column({
    type: 'varchar',
    default: FlipbookVisibility.PRIVATE,
  })
  @IsEnum(FlipbookVisibility, { message: '유효한 공개 설정이어야 합니다.' })
  visibility: FlipbookVisibility;

  @Column({ name: 'cover_image_url', length: 500, nullable: true })
  @IsOptional()
  @IsUrl({}, { message: '올바른 커버 이미지 URL이어야 합니다.' })
  coverImageUrl?: string;

  @Column({ name: 'thumbnail_url', length: 500, nullable: true })
  @IsOptional()
  @IsUrl({}, { message: '올바른 썸네일 URL이어야 합니다.' })
  thumbnailUrl?: string;

  @Column({ name: 'page_count', type: 'int', default: 0 })
  pageCount: number;

  @Column({ name: 'total_size', type: 'bigint', default: 0 })
  totalSize: number;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'text', nullable: true })
  settings?: {
    autoPlay?: boolean;
    loopPages?: boolean;
    showNavigation?: boolean;
    enableSound?: boolean;
    flipSpeed?: number;
    backgroundMusic?: string;
    theme?: string;
  };

  @Column({ type: 'text', nullable: true })
  metadata?: {
    originalFormat?: string;
    processingTime?: number;
    exportedAt?: string;
    quality?: string;
    tags?: string[];
    category?: string;
  };

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식이어야 합니다.' })
  publishedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDateString({}, { message: '올바른 만료 날짜 형식이어야 합니다.' })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => Page, (page) => page.flipbook, {
    cascade: true,
    eager: false,
  })
  pages: Page[];

  // Virtual fields
  get isPublished(): boolean {
    return this.status === FlipbookStatus.PUBLISHED;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get slug(): string {
    return `${this.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${this.id.slice(0, 8)}`;
  }
}