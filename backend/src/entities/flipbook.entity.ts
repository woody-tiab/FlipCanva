import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FlipbookStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum FlipbookVisibility {
  PRIVATE = 'private',
  UNLISTED = 'unlisted', 
  PUBLIC = 'public',
}

@Entity('flipbooks')
export class Flipbook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'canva_design_id', length: 100 })
  canvaDesignId: string;

  @Column({ name: 'user_id', length: 100 })
  userId: string;

  @Column({ type: 'varchar', default: FlipbookStatus.DRAFT })
  status: FlipbookStatus;

  @Column({ type: 'varchar', default: FlipbookVisibility.PRIVATE })
  visibility: FlipbookVisibility;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}