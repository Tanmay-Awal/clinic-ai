import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInteractionService } from './user-interaction.service';
import { UserInteractionController } from './user-interaction.controller';
import { UserInteraction } from '../entities/user-interaction.entity';
import { InteractionType } from '../entities/interaction-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserInteraction, InteractionType])],
  controllers: [UserInteractionController],
  providers: [UserInteractionService],
  exports: [UserInteractionService],
})
export class UserInteractionModule {}
