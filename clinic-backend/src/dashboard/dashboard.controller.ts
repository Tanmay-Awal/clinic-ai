import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@Controller('dashboard')
// @UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Post('reservation')
  async getReservationDashboard(@Body() body: any) {
    return this.dashboardService.getReservationDashboard(body);
  }

  @Post('analytics-insights')
  async getAnalyticsInsights(@Body() body: any) {
    return this.dashboardService.getAnalyticsInsights(body);
  }

  @Get('activity')
  async getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }
}
