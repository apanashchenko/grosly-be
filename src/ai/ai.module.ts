import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiClientService } from './ai-client.service';
import { AiService } from './ai.service';
import { AiRequestLogService } from './ai-request-log.service';
import { AiRequestLog } from '../entities/ai-request-log.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([AiRequestLog])],
  providers: [AiClientService, AiService, AiRequestLogService],
  exports: [AiService, AiRequestLogService],
})
export class AiModule {}
