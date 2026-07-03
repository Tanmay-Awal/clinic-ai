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
    const {
      call_id,
      caller_phone,
      start_time,
      end_time,
      transcript,
      recording_url,
      call_summary,
      conversation_state,
      telemetry,
      intent,
      context_snapshot,
      booking_result,
      fallback_reason,
      call_status,
      needs_ai_processing,
      appointment_id,
      to_number,
    } = payload || {};
    
    // Determine the actual client number
    // Bot uses a +1 number, so if caller_phone starts with +1, the client is to_number
    let actual_caller_phone = caller_phone;
    if (caller_phone && caller_phone.startsWith('+1') && to_number) {
      actual_caller_phone = to_number;
    } else if (to_number && to_number.startsWith('+1') && caller_phone) {
      actual_caller_phone = caller_phone;
    }

    // Calculate duration in seconds
    let duration_seconds = 0;
    if (start_time && end_time) {
      const start = new Date(start_time);
      const end = new Date(end_time);
      duration_seconds = Math.round((end.getTime() - start.getTime()) / 1000);
    }

    const newCall = this.callRepository.create({
      call_id,
      from_number: actual_caller_phone,
      to_number: to_number,
      call_start_time: start_time ? new Date(start_time) : new Date(),
      call_end_time: end_time ? new Date(end_time) : new Date(),
      call_duration_ms: duration_seconds * 1000,
      transcript,
      recording_url,
      call_source: 'pipecat',
      call_direction: 'inbound',
      call_status: call_status || 'ended',
      needs_ai_processing: needs_ai_processing !== undefined ? needs_ai_processing : true,
      appointment_created: Boolean(appointment_id || booking_result?.appointment_id),
      appointment_id: appointment_id || booking_result?.appointment_id || null,
      tool_calls_made: {
        call_summary: call_summary || null,
        conversation_state: conversation_state || null,
        telemetry: telemetry || null,
        intent: intent || null,
        context_snapshot: context_snapshot || null,
        booking_result: booking_result || null,
        fallback_reason: fallback_reason || null,
      },
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
    const query = this.callRepository.createQueryBuilder('call')
      .leftJoinAndSelect('call.callAnalysis', 'callAnalysis');

    if (category) {
      query.andWhere('call.category = :category', { category });
    }

    if (search) {
      query.andWhere('(call.caller_phone ILIKE :search OR call.call_id ILIKE :search)', { search: `%${search}%` });
    }

    // Default sorting
    const validSortColumns = ['created_at', 'call_start_time', 'call_duration_ms'];
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
        time: call.call_start_time,
        contact_number: call.from_number,
        duration: call.call_duration_ms ? call.call_duration_ms / 1000 : 0,
        sentiment: call.callAnalysis?.user_sentiment || 'Neutral',
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
      relations: ['callAnalysis'],
    });

    if (!call) {
      throw new NotFoundException(`Call with ID ${id} not found`);
    }

    return {
      id: call.id,
      retell_call_id: call.call_id,
      call_direction: call.call_direction,
      from_number: call.from_number,
      to_number: 'Clinic',
      call_duration_ms: call.call_duration_ms || 0,
      call_start_time: call.call_start_time,
      call_end_time: call.call_end_time,
      category: call.category,
      recording_url: call.recording_url,
      created_at: call.created_at,
      transcripts: call.transcript || [],
      analysis: {
        call_summary: call.callAnalysis?.call_summary || '',
        user_sentiment: call.callAnalysis?.user_sentiment || '',
        category: call.category,
        sub_category: call.sub_category,
        key_insights: [], // Still missing from entity, leave empty array for now
      },
      linked_actions: await this.actionsService.getActionsByCallId(id),
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
