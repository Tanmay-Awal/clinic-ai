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
    const { page = 1, limit = 10, search, category, sort_by = 'created_at', sort_order = 'DESC', call_ids } = dto;
    const query = this.callRepository.createQueryBuilder('call')
      .leftJoinAndSelect('call.callAnalysis', 'callAnalysis')
      .leftJoinAndSelect('call.appointment', 'appointment');

    if (category && category !== 'Reservation' && category !== 'Feedback') {
      query.andWhere('call.category = :category', { category });
    }

    if (dto.startDate) {
      query.andWhere('call.call_start_time >= :startDate', { startDate: new Date(dto.startDate) });
    }
    if (dto.endDate) {
      query.andWhere('call.call_start_time <= :endDate', { endDate: new Date(dto.endDate) });
    }

    if (call_ids && Array.isArray(call_ids) && call_ids.length > 0) {
      query.andWhere('call.id IN (:...call_ids)', { call_ids: call_ids.map(Number) });
    } else if (call_ids && typeof call_ids === 'string') {
      const idsArray = call_ids.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
      if (idsArray.length > 0) {
        query.andWhere('call.id IN (:...call_ids)', { call_ids: idsArray });
      }
    } else if (dto.outcome) {
      const normalizedOutcome = dto.outcome.trim().toLowerCase();
      if (normalizedOutcome === 'urgent case' || normalizedOutcome === 'urgent') {
        query.andWhere('(call.category = :emergencyCat OR call.transfer_to_human = :transfer)', {
          emergencyCat: 'Emergency',
          transfer: true
        });
      } else if (normalizedOutcome === 'action required' || normalizedOutcome === 'action') {
        query.andWhere(qb => {
          const subQuery = qb.subQuery()
            .select('action.call_id')
            .from(Action, 'action')
            .where("action.status = 'Open'")
            .getQuery();
          return `call.id IN ${subQuery}`;
        });
      } else if (normalizedOutcome === 'appointment booked' || normalizedOutcome === 'booked') {
        query.andWhere('call.appointment_created = :created', { created: true });
      } else if (normalizedOutcome === 'booking cancelled' || normalizedOutcome === 'cancelled') {
        query.andWhere('call.category = :cancelCat', { cancelCat: 'Cancellation' });
      } else if (normalizedOutcome === 'reschedule requested' || normalizedOutcome === 'rescheduled') {
        query.andWhere('call.category = :rescheduleCat', { rescheduleCat: 'Rescheduling' });
      } else if (normalizedOutcome === 'enquiry handled' || normalizedOutcome === 'inquiry') {
        query.andWhere('call.category = :inquiryCat', { inquiryCat: 'Inquiry' });
      } else if (normalizedOutcome === 'general assistance' || normalizedOutcome === 'general') {
        query.andWhere('call.category NOT IN (:...excludeCats)', { excludeCats: ['Emergency', 'Cancellation', 'Rescheduling', 'Inquiry'] })
             .andWhere('call.appointment_created = :createdFalse', { createdFalse: false })
             .andWhere('call.transfer_to_human = :transferFalse', { transferFalse: false })
             .andWhere(qb => {
               const subQuery = qb.subQuery()
                 .select('action.call_id')
                 .from(Action, 'action')
                 .where("action.status = 'Open'")
                 .getQuery();
               return `call.id NOT IN ${subQuery}`;
             });
      }
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
        name: call.appointment?.patient_name || call.callAnalysis?.name || null,
        display_mobile_number: call.from_number || call.callAnalysis?.contact_number || null,
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
      relations: ['callAnalysis', 'appointment'],
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
      display_mobile_number: call.from_number || call.callAnalysis?.contact_number || null,
      call_duration_ms: call.call_duration_ms || 0,
      call_start_time: call.call_start_time,
      call_end_time: call.call_end_time,
      category: call.category,
      recording_url: call.recording_url,
      created_at: call.created_at,
      transcripts: call.transcript || [],
      analysis: {
        id: call.callAnalysis?.id?.toString() || '',
        call_id: call.id?.toString(),
        call_summary: call.callAnalysis?.call_summary || '',
        user_sentiment: call.callAnalysis?.user_sentiment || '',
        call_successful: call.callAnalysis?.call_successful || false,
        name: call.appointment?.patient_name || call.callAnalysis?.name || null,
        location: call.callAnalysis?.location || null,
        contact_number: call.from_number || call.callAnalysis?.contact_number || null,
        sentiment_percentage: call.callAnalysis?.sentiment_percentage || null,
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
