import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Flipbook } from '../entities/flipbook.entity';
import { Page } from '../entities/page.entity';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'sqlite',
  database: process.env.DB_PATH || 'database.sqlite',
  entities: [Flipbook, Page],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  autoLoadEntities: true,
}));