import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInteraction } from '../entities/user-interaction.entity';
import { InteractionType } from '../entities/interaction-type.entity';
import { CreateUserInteractionDto } from './dto/create-user-interaction.dto';
import { UpdateUserInteractionDto } from './dto/update-user-interaction.dto';
import { GetUserInteractionsDto } from './dto/get-user-interactions.dto';

@Injectable()
export class UserInteractionService {
  private readonly logger = new Logger(UserInteractionService.name);

  constructor(
    @InjectRepository(UserInteraction)
    private readonly userInteractionRepository: Repository<UserInteraction>,
    @InjectRepository(InteractionType)
    private readonly interactionTypeRepository: Repository<InteractionType>,
  ) {}

  async create(userId: number, createDto: CreateUserInteractionDto) {
    // Verify interaction type exists
    const interactionType = await this.interactionTypeRepository.findOne({
      where: { id: createDto.interaction_type_id },
    });

    if (!interactionType) {
      throw new NotFoundException('Interaction type not found');
    }

    if (!interactionType.is_active) {
      throw new NotFoundException('Interaction type is not active');
    }

    const interaction = this.userInteractionRepository.create({
      user_id: userId,
      interaction_type_id: createDto.interaction_type_id,
      status: createDto.status || 'active',
    });

    const savedInteraction =
      await this.userInteractionRepository.save(interaction);

    return this.userInteractionRepository.findOne({
      where: { id: savedInteraction.id },
      relations: ['interaction_type'],
    });
  }

  async findAll(userId: number, dto: GetUserInteractionsDto) {
    const { page = 1, limit = 10, interaction_type_id, status } = dto;
    const skip = (page - 1) * limit;

    const qb = this.userInteractionRepository
      .createQueryBuilder('i')
      .select(['i.id', 'i.interaction_type_id', 'i.status', 'i.created_at'])
      .addSelect((subQuery) => {
        return subQuery
          .select('t.name')
          .from('interaction_types', 't')
          .where('t.id = i.interaction_type_id');
      }, 'interaction_type_name')
      .where('i.user_id = :userId', { userId })
      .orderBy('i.created_at', 'DESC');

    if (interaction_type_id)
      qb.andWhere('i.interaction_type_id = :interaction_type_id', {
        interaction_type_id,
      });
    if (status) qb.andWhere('i.status = :status', { status });

    const data = await qb.skip(skip).take(limit).getRawMany();
    const total = await qb.getCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: number, userId: number) {
    const interaction = await this.userInteractionRepository.findOne({
      where: { id },
      relations: ['interaction_type'],
    });

    if (!interaction) {
      throw new NotFoundException('User interaction not found');
    }

    if (interaction.user_id !== userId) {
      throw new ForbiddenException(
        'You do not have access to this interaction',
      );
    }

    return interaction;
  }

  async update(
    id: number,
    userId: number,
    updateDto: UpdateUserInteractionDto,
  ) {
    const interaction = await this.userInteractionRepository.findOne({
      where: { id },
    });

    if (!interaction) {
      throw new NotFoundException('User interaction not found');
    }

    if (interaction.user_id !== userId) {
      throw new ForbiddenException(
        'You do not have access to this interaction',
      );
    }

    // Verify interaction type exists if being updated
    if (updateDto.interaction_type_id) {
      const interactionType = await this.interactionTypeRepository.findOne({
        where: { id: updateDto.interaction_type_id },
      });

      if (!interactionType) {
        throw new NotFoundException('Interaction type not found');
      }

      if (!interactionType.is_active) {
        throw new NotFoundException('Interaction type is not active');
      }

      interaction.interaction_type_id = updateDto.interaction_type_id;
    }

    if (updateDto.status !== undefined) {
      interaction.status = updateDto.status;
    }

    const updatedInteraction =
      await this.userInteractionRepository.save(interaction);

    return this.userInteractionRepository.findOne({
      where: { id: updatedInteraction.id },
      relations: ['interaction_type'],
    });
  }

  async remove(id: number, userId: number) {
    const interaction = await this.userInteractionRepository.findOne({
      where: { id },
    });

    if (!interaction) {
      throw new NotFoundException('User interaction not found');
    }

    if (interaction.user_id !== userId) {
      throw new ForbiddenException(
        'You do not have access to this interaction',
      );
    }

    await this.userInteractionRepository.remove(interaction);

    return { message: 'User interaction deleted successfully' };
  }

  async getInteractionTypes() {
    return this.interactionTypeRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }
}
