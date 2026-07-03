import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':reportType/metadata')
  async getMetadata(@Param('reportType') reportType: string) {
    return this.reportsService.getMetadata(reportType);
  }

  @Get(':reportType/suggestions')
  async getSuggestions(
    @Param('reportType') reportType: string,
    @Query('column') column: string,
    @Query('search') search: string,
  ) {
    return this.reportsService.getSuggestions(reportType, column, search);
  }

  @Post(':reportType/generate')
  async generateReport(
    @Param('reportType') reportType: string,
    @Body() request: any,
  ) {
    return this.reportsService.generateReport(reportType, request);
  }
}
