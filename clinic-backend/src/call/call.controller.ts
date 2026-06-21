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

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('ingest')
  @UseGuards(BotApiKeyGuard)
  async ingestCall(@Body() body: any) {
    return this.callService.ingestCall(body);
  }

  @Post()
  async getCalls(@Body() body: any) {
    return this.callService.getAllCalls(body);
  }

  @Post('export/csv')
  async exportCalls(@Body() body: any) {
    return this.callService.exportCallsToCSV(body);
  }

  @Get(':id')
  async getCallById(@Param('id') id: string) {
    return this.callService.getCallById(parseInt(id, 10));
  }
}
