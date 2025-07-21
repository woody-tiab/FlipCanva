import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CanvaController } from './canva.controller';
import { CanvaService } from './canva.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [CanvaController],
  providers: [CanvaService],
  exports: [CanvaService],
})
export class CanvaModule {}