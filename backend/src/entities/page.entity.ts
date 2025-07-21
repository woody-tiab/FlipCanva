import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Flipbook } from './flipbook.entity';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'flipbook_id' })
  flipbookId: string;

  @ManyToOne(() => Flipbook)
  @JoinColumn({ name: 'flipbook_id' })
  flipbook: Flipbook;

  @Column({ name: 'page_index', type: 'int' })
  pageIndex: number;

  @Column({ length: 200 })
  title: string;

  @Column({ name: 'image_url', length: 500 })
  imageUrl: string;

  @Column({ name: 'original_width', type: 'int' })
  originalWidth: number;

  @Column({ name: 'original_height', type: 'int' })
  originalHeight: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}