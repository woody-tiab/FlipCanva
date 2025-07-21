import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flipbook, FlipbookStatus, FlipbookVisibility } from '../../entities/flipbook.entity';
import { Page } from '../../entities/page.entity';
import {
  CreateFlipbookDto,
  UpdateFlipbookDto,
  FlipbookQueryDto,
} from '../../dto/flipbook.dto';
import {
  CreatePageDto,
  UpdatePageDto,
} from '../../dto/page.dto';

@Injectable()
export class FlipbookService {
  constructor(
    @InjectRepository(Flipbook)
    private flipbookRepository: Repository<Flipbook>,
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
  ) {}

  // Simple test endpoint
  async getTestData(): Promise<any> {
    return {
      message: 'FlipCanva API is working!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'SQLite connected'
    };
  }

  // Basic flipbook operations
  async create(createFlipbookDto: CreateFlipbookDto): Promise<Flipbook> {
    try {
      const flipbook = this.flipbookRepository.create({
        title: createFlipbookDto.title,
        description: createFlipbookDto.description,
        canvaDesignId: createFlipbookDto.canvaDesignId,
        userId: createFlipbookDto.userId || 'test-user',
        status: FlipbookStatus.DRAFT,
        visibility: FlipbookVisibility.PRIVATE,
        viewCount: 0,
      });

      return await this.flipbookRepository.save(flipbook);
    } catch (error) {
      throw new BadRequestException('Failed to create flipbook');
    }
  }

  async findAll(): Promise<Flipbook[]> {
    return this.flipbookRepository.find({
      take: 10,
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string): Promise<Flipbook> {
    const flipbook = await this.flipbookRepository.findOne({
      where: { id },
      relations: ['pages'],
    });

    if (!flipbook) {
      throw new NotFoundException(`Flipbook with ID ${id} not found`);
    }

    return flipbook;
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.flipbookRepository.increment({ id }, 'viewCount', 1);
  }
}