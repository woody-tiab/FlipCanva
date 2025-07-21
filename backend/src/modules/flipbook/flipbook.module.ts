import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlipbookController } from './flipbook.controller';
import { FlipbookService } from './flipbook.service';
import { Flipbook } from '../../entities/flipbook.entity';
import { Page } from '../../entities/page.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Flipbook, Page])],
  controllers: [FlipbookController],
  providers: [FlipbookService],
  exports: [FlipbookService],
})
export class FlipbookModule {}