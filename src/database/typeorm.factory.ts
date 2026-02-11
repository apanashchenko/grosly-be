import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const getTypeOrmConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST') || 'localhost',
    port: config.get<number>('DB_PORT') || 5432,
    username: config.get<string>('DB_USERNAME') || 'postgres',
    password: config.get<string>('DB_PASSWORD') || '',
    database: config.get<string>('DB_NAME') || 'grosly',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
    // logging: !isProduction,
    namingStrategy: new SnakeNamingStrategy(),
  };
};
