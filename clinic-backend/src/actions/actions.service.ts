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

  private mapActionWithDueAt(action: Action): any {
    let addHours = 24;
    const priority = (action.priority || '').toLowerCase();
    if (priority === 'high' || priority === 'urgent') addHours = 2;
    else if (priority === 'low') addHours = 48;

    const createdTime = new Date(action.created_at).getTime();
    const due_at = new Date(createdTime + addHours * 60 * 60 * 1000).toISOString();
    
    const guest_name = action.call?.appointment?.patient_name || action.call?.callAnalysis?.name || null;
    
    return {
      ...action,
      due_at,
      guest_name,
      is_overdue: action.status !== 'Resolved' && new Date() > new Date(due_at)
    };
  }

  async getActions(filters?: any): Promise<{data: any[]; pagination: {page: number; limit: number; total: number; totalPages: number}}> {
    const query = this.actionRepository.createQueryBuilder('action')
      .leftJoinAndSelect('action.call', 'call')
      .leftJoinAndSelect('call.callAnalysis', 'callAnalysis')
      .leftJoinAndSelect('call.appointment', 'appointment');

    if (filters?.status && filters.status !== 'all') {
      query.andWhere('action.status ILIKE :status', { status: filters.status });
    }

    if (filters?.priority && filters.priority !== 'all') {
      query.andWhere('action.priority ILIKE :priority', { priority: filters.priority });
    }

    if (filters?.request_type && filters.request_type !== 'all') {
      query.andWhere('action.type ILIKE :request_type', { request_type: filters.request_type });
    }

    if (filters?.search) {
      query.andWhere('(action.caller_phone ILIKE :search OR action.description ILIKE :search OR action.type ILIKE :search)', { search: `%${filters.search}%` });
    }

    const page = filters?.page ? Number(filters.page) : 1;
    const limit = filters?.limit ? Number(filters.limit) : 100;

    const sortOrder = filters?.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    if (filters?.sortBy === 'priority') {
      query.orderBy("CASE WHEN LOWER(action.priority) = 'urgent' THEN 1 WHEN LOWER(action.priority) = 'high' THEN 2 WHEN LOWER(action.priority) = 'medium' THEN 3 ELSE 4 END", sortOrder);
    } else if (filters?.sortBy === 'status') {
      query.orderBy('action.status', sortOrder);
    } else if (filters?.sortBy === 'type' || filters?.sortBy === 'request_type') {
      query.orderBy('action.type', sortOrder);
    } else {
      query.orderBy('action.created_at', sortOrder);
    }
    
    const [data, total] = await query.skip((page - 1) * limit).take(limit).getManyAndCount();
    
    return {
      data: data.map(a => this.mapActionWithDueAt(a)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async getStats(filters?: any): Promise<any> {
    const allActions = await this.actionRepository.find();
    let openCount = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;
    const typesCount: Record<string, number> = {};

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (const action of allActions) {
      const mapped = this.mapActionWithDueAt(action);
      
      if (mapped.status !== 'Resolved' && mapped.status !== 'resolved') {
        openCount++;
      }

      const dueAtDate = new Date(mapped.due_at);
      const dueStr = dueAtDate.toISOString().split('T')[0];
      
      if (mapped.status !== 'Resolved' && mapped.status !== 'resolved' && dueStr === todayStr) {
        dueTodayCount++;
      }

      if (mapped.is_overdue) {
        overdueCount++;
      }

      const t = mapped.type || 'other';
      typesCount[t] = (typesCount[t] || 0) + 1;
    }

    const topTypes = Object.entries(typesCount)
      .map(([type, count]) => ({
        request_type: type,
        label: type.replace(/_/g, ' '),
        count,
        change_pct: 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      open_actions: { count: openCount, change_pct: 0 },
      due_today: { count: dueTodayCount, change_pct: 0 },
      overdue: { count: overdueCount, change_pct: 0 },
      top_types: topTypes
    };
  }

  async getActionById(id: number): Promise<any> {
    const action = await this.actionRepository.findOne({
      where: { id },
      relations: ['call', 'call.callAnalysis', 'call.appointment', 'resolved_by'],
    });
    if (!action) throw new NotFoundException('Action not found');
    const mapped: any = this.mapActionWithDueAt(action);

    if (action.call) {
      mapped.linked_calls = [{
        call_id: action.call.id,
        call_summary: action.call.callAnalysis?.call_summary || 'No summary available',
        call_start_time: action.call.call_start_time || action.call.created_at,
        call_duration_ms: action.call.call_duration_ms || 0
      }];
    } else {
      mapped.linked_calls = [];
    }

    return mapped;
  }

  async getActionsByCallId(callId: number): Promise<any[]> {
    const actions = await this.actionRepository.find({
      where: { call_id: callId },
      relations: ['call', 'call.callAnalysis', 'call.appointment'],
      order: { created_at: 'DESC' }
    });
    return actions.map(a => this.mapActionWithDueAt(a));
  }

  async updateAction(id: number, data: Partial<Action>, userId?: number): Promise<Action> {
    const action = await this.getActionById(id);
    
    if (data.status === 'Resolved' && action.status !== 'Resolved') {
      data.resolved_at = new Date();
      if (userId) data.resolved_by_id = userId;
    }

    if (data.comments !== undefined && data.comments !== action.comments) {
      data.comments_updated_at = new Date();
    }

    await this.actionRepository.update(id, data);
    return this.getActionById(id);
  }
}
