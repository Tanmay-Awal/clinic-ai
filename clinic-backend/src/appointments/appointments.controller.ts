import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@Controller('appointments')
// @UseGuards(JwtAuthGuard) // Can be enabled once auth is fully tested
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('doctors')
  getDoctors() {
    return this.appointmentsService.getDoctors();
  }

  @Get('context')
  getClinicContext(
    @Query('date') date?: string,
    @Query('daysAhead') daysAhead?: string,
  ) {
    return this.appointmentsService.getClinicContext(
      date,
      daysAhead ? parseInt(daysAhead, 10) : 3,
    );
  }

  @Post('doctors')
  createDoctor(@Body() data: any) {
    return this.appointmentsService.createDoctor(data);
  }

  @Put('doctors/:id')
  updateDoctor(@Param('id') id: string, @Body() data: any) {
    return this.appointmentsService.updateDoctor(parseInt(id, 10), data);
  }

  @Get()
  getAppointments() {
    return this.appointmentsService.getAppointments();
  }

  @Post()
  createAppointment(@Body() data: any) {
    return this.appointmentsService.createAppointment(data);
  }

  @Put(':id')
  updateAppointment(@Param('id') id: string, @Body() data: any) {
    return this.appointmentsService.updateAppointment(parseInt(id, 10), data);
  }

  @Get('slots')
  getAvailableSlots(
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailableSlots(parseInt(doctorId, 10), date);
  }
}
