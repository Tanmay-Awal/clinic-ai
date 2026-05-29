import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from '../entities/call.entity';
import { Appointment } from '../entities/appointment.entity';
import { Action } from '../entities/action.entity';
import { AiService } from '../ai/ai.service';
import { ActionsService } from '../actions/actions.service';

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);

  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly aiService: AiService,
    private readonly actionsService: ActionsService,
  ) {}

  async ingestCall(payload: any) {
    const { call_id, caller_phone, start_time, end_time, transcript, recording_url } = payload;
    
    // Calculate duration in seconds
    let duration_seconds = 0;
    if (start_time && end_time) {
      const start = new Date(start_time);
      const end = new Date(end_time);
      duration_seconds = Math.round((end.getTime() - start.getTime()) / 1000);
    }

    const newCall = this.callRepository.create({
      call_id,
      caller_phone,
      start_time: start_time ? new Date(start_time) : new Date(),
      end_time: end_time ? new Date(end_time) : new Date(),
      duration_seconds,
      transcript,
      recording_url,
      direction: 'inbound',
    });

    const savedCall = await this.callRepository.save(newCall);
    this.logger.log(`Call ${savedCall.id} ingested. Triggering AI analysis...`);

    // Fire & forget analysis
    this.aiService.analyzeCall(savedCall.id).catch((err) => {
      this.logger.error(`Error analyzing call ${savedCall.id}`, err.stack);
    });

    return savedCall;
  }

  async getAllCalls(dto: any = {}) {
    const { page = 1, limit = 10, search, category, sort_by = 'created_at', sort_order = 'DESC' } = dto;
    const query = this.callRepository.createQueryBuilder('call');

    if (category) {
      query.andWhere('call.category = :category', { category });
    }

    if (search) {
      query.andWhere('(call.caller_phone ILIKE :search OR call.call_id ILIKE :search)', { search: `%${search}%` });
    }

    // Default sorting
    const validSortColumns = ['created_at', 'start_time', 'duration_seconds'];
    const orderBy = validSortColumns.includes(sort_by) ? `call.${sort_by}` : 'call.created_at';
    const orderDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query.orderBy(orderBy, orderDir);

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map(call => ({
        id: call.id,
        call_id: call.call_id,
        time: call.start_time,
        contact_number: call.caller_phone,
        duration: call.duration_seconds,
        sentiment: call.sentiment,
        category: call.category,
        sub_category: call.sub_category,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getCallById(id: number) {
    const call = await this.callRepository.findOne({
      where: { id },
    });

    if (!call) {
      throw new NotFoundException(`Call with ID ${id} not found`);
    }

    return {
      id: call.id,
      retell_call_id: call.call_id,
      call_direction: call.direction,
      from_number: call.caller_phone,
      to_number: 'Clinic',
      call_duration_ms: (call.duration_seconds || 0) * 1000,
      call_start_time: call.start_time,
      call_end_time: call.end_time,
      category: call.category,
      recording_url: call.recording_url,
      created_at: call.created_at,
      transcripts: call.transcript || [],
      analysis: {
        call_summary: call.summary,
        user_sentiment: call.sentiment,
        category: call.category,
        sub_category: call.sub_category,
        key_insights: call.key_insights,
      },
      linked_actions: [],
    };
  }

  async exportCallsToCSV(dto: any) {
    const calls = await this.getAllCalls({ ...dto, limit: 10000 });
    
    if (calls.data.length === 0) {
      return 'ID,Time,Phone,Duration,Category,Sentiment\n';
    }

    let csv = 'ID,Time,Phone,Duration,Category,Sentiment\n';
    calls.data.forEach(c => {
      csv += `${c.id},${c.time},${c.contact_number},${c.duration},${c.category},${c.sentiment}\n`;
    });
    
    return csv;
  }
}
