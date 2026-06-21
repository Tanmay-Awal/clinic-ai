import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Action } from '../entities/action.entity';

@Injectable()
export class ActionsService {
  constructor(
    @InjectRepository(Action)
    private readonly actionRepository: Repository<Action>,
  ) {}

  async getActions(filters?: any): Promise<{data: Action[]; pagination: {page: number; limit: number; total: number; totalPages: number}}> {
    const query = this.actionRepository.createQueryBuilder('action')
      .leftJoinAndSelect('action.call', 'call');

    if (filters?.status) {
      query.andWhere('action.status = :status', { status: filters.status });
    }

    const page = filters?.page ? Number(filters.page) : 1;
    const limit = filters?.limit ? Number(filters.limit) : 100;

    query.orderBy('action.created_at', 'DESC');
    const [data, total] = await query.skip((page - 1) * limit).take(limit).getManyAndCount();
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async getActionById(id: number): Promise<Action> {
    const action = await this.actionRepository.findOne({
      where: { id },
      relations: ['call', 'resolved_by'],
    });
    if (!action) throw new NotFoundException('Action not found');
    return action;
  }

  async updateAction(id: number, data: Partial<Action>, userId?: number): Promise<Action> {
    const action = await this.getActionById(id);
    
    if (data.status === 'Resolved' && action.status !== 'Resolved') {
      data.resolved_at = new Date();
      if (userId) data.resolved_by_id = userId;
    }

    await this.actionRepository.update(id, data);
    return this.getActionById(id);
  }
}
