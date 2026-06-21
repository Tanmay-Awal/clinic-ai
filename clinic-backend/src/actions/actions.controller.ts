import { Controller, Get, Post, Put, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ActionsService } from './actions.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@Controller('actions')
// @UseGuards(JwtAuthGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  async getActions(@Query() query: any) {
    return this.actionsService.getActions(query);
  }

  @Post('list')
  async postActionsList(@Body() body: any) {
    return this.actionsService.getActions(body);
  }

  @Get(':id')
  async getActionById(@Param('id') id: string) {
    return this.actionsService.getActionById(parseInt(id, 10));
  }

  @Put(':id')
  async updateAction(
    @Param('id') id: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    const userId = req.user?.userId;
    return this.actionsService.updateAction(parseInt(id, 10), data, userId);
  }
}
