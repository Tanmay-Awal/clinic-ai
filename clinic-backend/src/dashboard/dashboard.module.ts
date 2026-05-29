import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Call } from '../entities/call.entity';
import { Appointment } from '../entities/appointment.entity';
import { Action } from '../entities/action.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Call, Appointment, Action])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
