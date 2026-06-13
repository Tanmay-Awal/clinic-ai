import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { Call } from '../entities/call.entity';
import { Appointment } from '../entities/appointment.entity';
import { AiModule } from '../ai/ai.module';
import { ActionsModule } from '../actions/actions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Call, Appointment]), AiModule, ActionsModule],
  controllers: [CallController],
  providers: [CallService],
  exports: [CallService],
})
export class CallModule {}
