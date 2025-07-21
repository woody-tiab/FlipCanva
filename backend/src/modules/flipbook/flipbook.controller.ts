import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FlipbookService } from './flipbook.service';
import {
  CreateFlipbookDto,
  UpdateFlipbookDto,
  FlipbookQueryDto,
} from '../../dto/flipbook.dto';

@Controller('flipbooks')
export class FlipbookController {
  constructor(private readonly flipbookService: FlipbookService) {}

  // Test endpoint
  @Get('test')
  async test() {
    return this.flipbookService.getTestData();
  }

  // Basic CRUD operations
  @Post()
  async create(@Body() createFlipbookDto: CreateFlipbookDto) {
    return this.flipbookService.create(createFlipbookDto);
  }

  @Get()
  async findAll() {
    return this.flipbookService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.flipbookService.findOne(id);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async incrementViewCount(@Param('id') id: string) {
    await this.flipbookService.incrementViewCount(id);
  }
}