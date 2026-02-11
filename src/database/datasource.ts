import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
// import * as dotenv from 'dotenv';
import { getTypeOrmConfig } from './typeorm.factory';

// // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
// (dotenv as any).config();

const config = new ConfigService();
const options = getTypeOrmConfig(config);

export default new DataSource({
  ...(options as DataSourceOptions),
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
});
