import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiClientService } from './ai-client.service';
import { AiService } from './ai.service';

@Module({
  imports: [ConfigModule],
  providers: [AiClientService, AiService],
  exports: [AiService],
})
export class AiModule {}
