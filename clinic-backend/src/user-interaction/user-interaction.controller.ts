import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { UserInteractionService } from './user-interaction.service';
import { CreateUserInteractionDto } from './dto/create-user-interaction.dto';
import { UpdateUserInteractionDto } from './dto/update-user-interaction.dto';
import { GetUserInteractionsDto } from './dto/get-user-interactions.dto';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@Controller('user-interactions')
@UseGuards(JwtAuthGuard)
export class UserInteractionController {
  constructor(
    private readonly userInteractionService: UserInteractionService,
  ) {}

  @Post()
  create(@Request() req, @Body() createDto: CreateUserInteractionDto) {
    return this.userInteractionService.create(req.user.userId, createDto);
  }

  @Get()
  findAll(@Request() req, @Query() getDto: GetUserInteractionsDto) {
    return this.userInteractionService.findAll(req.user.userId, getDto);
  }

  @Get('types')
  getInteractionTypes() {
    return this.userInteractionService.getInteractionTypes();
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.userInteractionService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserInteractionDto,
  ) {
    return this.userInteractionService.update(id, req.user.userId, updateDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.userInteractionService.remove(id, req.user.userId);
  }
}
