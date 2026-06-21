import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CallService } from './call.service';
import { BotApiKeyGuard } from '../common/guards/bot-api-key.guard';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('ingest')
  // Exempt ingest from JwtAuthGuard since it uses BotApiKeyGuard
  @UseGuards(BotApiKeyGuard)
  async ingestCall(@Body() body: any) {
    return this.callService.ingestCall(body);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async getCalls(@Body() body: any) {
    return this.callService.getAllCalls(body);
  }

  @Get('csv')
  @UseGuards(JwtAuthGuard)
  async getCallsCsv(@Query() query: any) {
    return this.callService.exportCallsToCSV(query);
  }

  @Post('export/csv')
  @UseGuards(JwtAuthGuard)
  async exportCalls(@Body() body: any) {
    return this.callService.exportCallsToCSV(body);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getCallById(@Param('id') id: string) {
    return this.callService.getCallById(parseInt(id, 10));
  }
}
