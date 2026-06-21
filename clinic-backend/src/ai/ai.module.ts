import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { Call } from '../entities/call.entity';
import { Action } from '../entities/action.entity';
import { CallAnalysis } from '../entities/call-analysis.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Call, Action, CallAnalysis])],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
