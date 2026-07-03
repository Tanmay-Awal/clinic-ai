import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Appointment } from '../entities/appointment.entity';
import { Action } from '../entities/action.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Action])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
