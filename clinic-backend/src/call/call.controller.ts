import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CallService } from './call.service';

@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('ingest')
  async ingestCall(@Body() body: any) {
    return this.callService.ingestCall(body);
  }

  @Get()
  async getCalls(@Query() query: any) {
    return this.callService.getAllCalls(query);
  }

  @Get(':id')
  async getCallById(@Param('id') id: string) {
    return this.callService.getCallById(parseInt(id, 10));
  }
}
