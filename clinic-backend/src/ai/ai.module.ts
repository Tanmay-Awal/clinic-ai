import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { Call } from '../entities/call.entity';
import { Action } from '../entities/action.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Call, Action])],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
