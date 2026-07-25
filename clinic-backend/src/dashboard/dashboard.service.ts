import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Call } from '../entities/call.entity';
import { Appointment } from '../entities/appointment.entity';
import { Action } from '../entities/action.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Action)
    private readonly actionRepository: Repository<Action>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async getSummaryDashboard(dto?: any, user?: any) {
    let callDateFilter: any = {};
    let appointmentDateFilter: any = {};
    let actionDateFilter: any = {};

    if (dto?.startDate && dto?.endDate) {
      callDateFilter.created_at = Between(new Date(dto.startDate), new Date(dto.endDate));
      appointmentDateFilter.created_at = Between(new Date(dto.startDate), new Date(dto.endDate));
      actionDateFilter.created_at = Between(new Date(dto.startDate), new Date(dto.endDate));
    } else if (dto?.startDate) {
      callDateFilter.created_at = MoreThanOrEqual(new Date(dto.startDate));
      appointmentDateFilter.created_at = MoreThanOrEqual(new Date(dto.startDate));
      actionDateFilter.created_at = MoreThanOrEqual(new Date(dto.startDate));
    } else if (dto?.endDate) {
      callDateFilter.created_at = LessThanOrEqual(new Date(dto.endDate));
      appointmentDateFilter.created_at = LessThanOrEqual(new Date(dto.endDate));
      actionDateFilter.created_at = LessThanOrEqual(new Date(dto.endDate));
    }

    const totalCalls = await this.callRepository.count({ where: callDateFilter });
    const inboundCalls = await this.callRepository.count({ where: { call_direction: 'inbound', ...callDateFilter } });
    const outboundCalls = totalCalls - inboundCalls;

    // Average duration
    const calls = await this.callRepository.find({ select: ['call_duration_ms'], where: callDateFilter });
    const totalDurationSeconds = calls.reduce((sum, c) => sum + (c.call_duration_ms ? c.call_duration_ms / 1000 : 0), 0);
    const avgDurationSeconds = totalCalls > 0 ? Math.floor(totalDurationSeconds / totalCalls) : 0;

    const totalReservations = await this.appointmentRepository.count({ where: appointmentDateFilter });
    const conversionRate = totalCalls > 0 ? (totalReservations / totalCalls) * 100 : 0;

    // Fetch all calls with analysis to compute accurate outcomes
    const callsWithAnalysis = await this.callRepository.find({ relations: ['callAnalysis'], where: callDateFilter });
    const callsWithActions = await this.actionRepository.find({ select: ['call_id'], where: { status: 'Open', ...actionDateFilter } });
    const actionCallIds = new Set(callsWithActions.map(a => Number(a.call_id)));

    let urgent = 0;
    let inquiry = 0;
    let general = 0;
    const urgentIds: string[] = [];
    const inquiryIds: string[] = [];
    const generalIds: string[] = [];

    for (const call of callsWithAnalysis) {
      const cat = call.category;
      if (cat === 'Emergency' || call.transfer_to_human) {
        urgent++;
        urgentIds.push(call.id.toString());
      } else if (actionCallIds.has(Number(call.id))) {
        // Skip, handled independently
      } else if (call.appointment_created) {
        // Skip, handled independently
      } else if (cat === 'Cancellation') {
        // Skip, handled independently
      } else if (cat === 'Rescheduling') {
        // Skip, handled independently
      } else if (cat === 'Inquiry') {
        inquiry++;
        inquiryIds.push(call.id.toString());
      } else {
        general++;
        generalIds.push(call.id.toString());
      }
    }

    const openActions = await this.actionRepository.find({ where: { status: 'Open', ...actionDateFilter } });
    const actionReqIds = openActions.map(a => a.call_id?.toString()).filter(Boolean);

    const bookedApts = await this.appointmentRepository.find({ where: { status: 'booked', ...appointmentDateFilter } });
    const bookedIds = bookedApts.map(a => a.created_from_call_id?.toString()).filter(Boolean);

    const cancelledApts = await this.appointmentRepository.find({ where: { status: 'cancelled', ...appointmentDateFilter } });
    const cancelledIds = cancelledApts.map(a => a.created_from_call_id?.toString()).filter(Boolean);

    const rescheduledApts = await this.appointmentRepository.find({ where: { status: 'rescheduled', ...appointmentDateFilter } });
    const rescheduledIds = rescheduledApts.map(a => a.created_from_call_id?.toString()).filter(Boolean);

    const actionReq = actionReqIds.length;
    const booked = bookedApts.length;
    const cancelled = cancelledApts.length;
    const rescheduled = rescheduledApts.length;

    const outcomeBarDataArray = [
      { name: 'Urgent Case', count: urgent, callIds: urgentIds },
      { name: 'Action Required', count: urgentIds.length > 0 ? actionReq - urgentIds.length : actionReq, callIds: actionReqIds.filter(id => !urgentIds.includes(id)) }, // Prevent double counting actions that are already in Emergency calls
      { name: 'Appointment Booked', count: booked, callIds: bookedIds },
      { name: 'Booking Cancelled', count: cancelled, callIds: cancelledIds },
      { name: 'Reschedule Requested', count: rescheduled, callIds: rescheduledIds },
      { name: 'Enquiry Handled', count: inquiry, callIds: inquiryIds },
      { name: 'General Assistance', count: general, callIds: generalIds },
    ];

    let totalSentiment = 0;
    const categoryCounts: Record<string, number> = {};
    const bookingCategoryCounts: Record<string, number> = {};
    let rescheduleCount = 0;

    for (const call of callsWithAnalysis) {
      const sentimentStr = call.callAnalysis?.user_sentiment?.toLowerCase();
      if (sentimentStr === 'positive') totalSentiment += 1;
      else if (sentimentStr === 'negative') totalSentiment -= 1;

      const cat = call.category || 'Inquiry';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      if (cat === 'Rescheduling') {
        rescheduleCount++;
      }

      if (call.appointment_created) {
        bookingCategoryCounts[cat] = (bookingCategoryCounts[cat] || 0) + 1;
      }
    }
    
    const avgSentimentScore = totalCalls > 0 ? totalSentiment / totalCalls : 0;
    const avgSentimentPercentage = Math.round(((avgSentimentScore + 1) / 2) * 100);

    let topAskClass = 'Booking';
    if (Object.keys(categoryCounts).length > 0) {
      topAskClass = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0];
    }

    let maxBookingCategory = 'General Checkup';
    if (Object.keys(bookingCategoryCounts).length > 0) {
      maxBookingCategory = Object.entries(bookingCategoryCounts).sort((a, b) => b[1] - a[1])[0][0];
    }

    return {
      totalCalls,
      inboundCalls,
      outboundCalls,
      aht: avgDurationSeconds,
      avgSentimentScore,
      avgSentimentPercent: `${avgSentimentPercentage}%`,
      avgSentimentPercentage,
      topAskClass,
      maxBookingCategory,
      rescheduleCount,
      conversionRate,
      depositCaptureRate: 0,
      outcomeBarData: outcomeBarDataArray,
      volumeTrend: await (async () => {
        const callsVolume = await this.callRepository.find({ select: ['created_at'], where: callDateFilter });
        const volumeByDay: Record<string, number> = {};
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        days.forEach(day => volumeByDay[day] = 0);
        
        callsVolume.forEach(call => {
          if (call.created_at) {
            const date = new Date(call.created_at);
            const dayName = days[date.getDay()];
            volumeByDay[dayName]++;
          }
        });

        // Optional: you can order this to start from Mon to Sun
        return [
          { label: 'Mon', value: volumeByDay['Mon'] },
          { label: 'Tue', value: volumeByDay['Tue'] },
          { label: 'Wed', value: volumeByDay['Wed'] },
          { label: 'Thu', value: volumeByDay['Thu'] },
          { label: 'Fri', value: volumeByDay['Fri'] },
          { label: 'Sat', value: volumeByDay['Sat'] },
          { label: 'Sun', value: volumeByDay['Sun'] },
        ];
      })(),
      conversionFunnel: [
        { stage: 'Calls Handled', count: totalCalls, pct: 100 },
        { stage: 'Action Required', count: actionReq, pct: 50 },
        { stage: 'Appointments', count: totalReservations, pct: conversionRate },
      ],
      trendingTopics: [
        { code: 'booking', label: 'Book Appointment', count: totalReservations },
        { code: 'reschedule', label: 'Reschedule', count: rescheduleCount },
      ],
      heatmapData: {},
      leaderboardData: [],
    };
  }

  async getReservationDashboard(dto?: any, user?: any) {
    const summary = await this.getSummaryDashboard(dto, user);

    let callDateFilter: any = {};
    let appointmentDateFilter: any = {};

    if (dto?.startDate && dto?.endDate) {
      callDateFilter.created_at = Between(new Date(dto.startDate), new Date(dto.endDate));
      appointmentDateFilter.created_at = Between(new Date(dto.startDate), new Date(dto.endDate));
    } else if (dto?.startDate) {
      callDateFilter.created_at = MoreThanOrEqual(new Date(dto.startDate));
      appointmentDateFilter.created_at = MoreThanOrEqual(new Date(dto.startDate));
    } else if (dto?.endDate) {
      callDateFilter.created_at = LessThanOrEqual(new Date(dto.endDate));
      appointmentDateFilter.created_at = LessThanOrEqual(new Date(dto.endDate));
    }

    // Top Doctors (Using SQL Query Builder)
    const qb = this.appointmentRepository.createQueryBuilder('a')
      .select('a.doctor_id', 'id')
      .addSelect('d.name', 'name')
      .addSelect('d.specialization', 'specialization')
      .addSelect('COUNT(a.id)', 'patientCount')
      .leftJoin('a.doctor', 'd')
      .where('a.doctor_id IS NOT NULL');

    if (dto?.startDate && dto?.endDate) {
      qb.andWhere('a.created_at BETWEEN :start AND :end', { start: new Date(dto.startDate), end: new Date(dto.endDate) });
    } else if (dto?.startDate) {
      qb.andWhere('a.created_at >= :start', { start: new Date(dto.startDate) });
    } else if (dto?.endDate) {
      qb.andWhere('a.created_at <= :end', { end: new Date(dto.endDate) });
    }

    const topDoctorsQuery = await qb
      .groupBy('a.doctor_id, d.name, d.specialization')
      .orderBy('"patientCount"', 'DESC')
      .limit(5)
      .getRawMany();

    require('fs').writeFileSync('top_doctors_debug.json', JSON.stringify(topDoctorsQuery, null, 2));

    const topDoctors = topDoctorsQuery.map(row => ({
      name: row.name || 'Unknown Doctor',
      specialization: row.specialization || 'General',
      patientCount: parseInt(row.patientcount || row.patientCount, 10) || 0
    }));

    // Top Diseases (Mapped from Doctor specialization counts for now)
    const diseasesMap: Record<string, number> = {};
    topDoctorsQuery.forEach(row => {
      let spec = row.specialization || 'General Illness';
      let disease = spec;
      if (spec.toLowerCase().includes('cardio')) disease = 'Heart Conditions';
      else if (spec.toLowerCase().includes('derm')) disease = 'Skin Issues';
      else if (spec.toLowerCase().includes('ped')) disease = 'Pediatric Care';
      else if (spec.toLowerCase().includes('orth')) disease = 'Joint & Bone Pain';
      else if (spec.toLowerCase().includes('neuro')) disease = 'Neurological Issues';
      else if (spec.toLowerCase().includes('physician')) disease = 'Viral Fever & Flu';
      else disease = 'General Illness';

      diseasesMap[disease] = (diseasesMap[disease] || 0) + (parseInt(row.patientcount || row.patientCount, 10) || 0);
    });

    // Fallback data if DB is empty
    if (Object.keys(diseasesMap).length === 0) {
      diseasesMap['Viral Fever & Flu'] = 45;
      diseasesMap['Joint & Bone Pain'] = 32;
      diseasesMap['Skin Issues'] = 28;
      diseasesMap['Heart Conditions'] = 15;
    }

    const topDiseases = Object.entries(diseasesMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCalls: summary.totalCalls,
      outcomeBarData: summary.outcomeBarData,
      avgSentimentPercentage: summary.avgSentimentPercentage,
      last7DaysCallCount: {},
      locationWiseCallCount: topDoctors.map(doc => ({ location: doc.name, count: doc.patientCount })),
      reservationCategories: [],
      timingDistribution: await (async () => {
        const calls = await this.callRepository.find({ select: ['created_at'], where: callDateFilter });
        const hoursMap: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hoursMap[i] = 0;
        
        calls.forEach(call => {
            if (call.created_at) {
                const h = new Date(call.created_at).getHours();
                hoursMap[h]++;
            }
        });
        
        return Object.entries(hoursMap).map(([hour, count]) => {
            const h = Number(hour);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hr12 = h % 12 || 12;
            return { label: `${hr12} ${ampm}`, value: count };
        });
      })(),
      topAskClass: summary.topAskClass,
      maxBookingCategory: summary.maxBookingCategory,
      topQueriesToday: await (async () => {
        const callsWithAnalysis = await this.callRepository.find({ relations: ['callAnalysis'], order: { created_at: 'DESC' }, where: callDateFilter });
        const queries = callsWithAnalysis
            .filter(c => c.callAnalysis?.call_summary)
            .map(c => ({ query: (c.callAnalysis.call_summary || '').substring(0, 50) + '...', count: 1 }))
            .slice(0, 5);
        return queries;
      })(),
      totalBookingsCaptured: await (async () => {
        const urgentCount = summary.outcomeBarData?.find(item => item.name === 'Urgent Case')?.count || 0;
        const bookingsCount = await this.appointmentRepository.count({ where: appointmentDateFilter });
        return bookingsCount + urgentCount;
      })(),
      totalBookingsBreakdown: [],
      avgTime: summary.aht,
      totalCovers: await (async () => {
        const urgentCount = summary.outcomeBarData?.find(item => item.name === 'Urgent Case')?.count || 0;
        const bookingsCount = await this.appointmentRepository.count({ where: appointmentDateFilter });
        return bookingsCount + urgentCount;
      })(),
      confirmedPercentage: await (async () => {
        if (summary.totalCalls <= 0) return 0;
        const urgentCount = summary.outcomeBarData?.find(item => item.name === 'Urgent Case')?.count || 0;
        const bookingsCount = await this.appointmentRepository.count({ where: appointmentDateFilter });
        return Number((((bookingsCount + urgentCount) / summary.totalCalls) * 100).toFixed(1));
      })(),
      topSpecialRequests: await (async () => {
        const appointments = await this.appointmentRepository.find({ select: ['notes'], where: appointmentDateFilter });
        const notesMap: Record<string, number> = {};
        appointments.forEach(apt => {
            if (apt.notes && apt.notes.trim()) {
                notesMap[apt.notes.trim()] = (notesMap[apt.notes.trim()] || 0) + 1;
            }
        });
        return Object.entries(notesMap)
            .map(([request, count]) => ({ request, count }))
            .sort((a,b) => b.count - a.count)
            .slice(0, 5);
      })(),
      volumeTrend: summary.volumeTrend,
      conversionFunnel: summary.conversionFunnel,
      trendingTopics: summary.trendingTopics,
      topDoctors,
      topDiseases,
      dailyBookings: await (async () => {
        const allAppointments = await this.appointmentRepository.find({ select: ['created_at', 'date'], where: appointmentDateFilter });
        const byDateBookedMap: Record<string, number> = {};
        const byVisitDateMap: Record<string, number> = {};

        allAppointments.forEach(apt => {
          if (apt.created_at) {
            const dateStr = new Date(apt.created_at).toISOString().split('T')[0];
            byDateBookedMap[dateStr] = (byDateBookedMap[dateStr] || 0) + 1;
          }
          if (apt.date) {
            const visitStr = new Date(apt.date).toISOString().split('T')[0];
            byVisitDateMap[visitStr] = (byVisitDateMap[visitStr] || 0) + 1;
          }
        });

        const sortMap = (map: Record<string, number>) => Object.entries(map)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
          byDateBooked: sortMap(byDateBookedMap),
          byVisitDate: sortMap(byVisitDateMap),
        };
      })(),
      afterHoursStats: await (async () => {
        const OPENING_HOUR = 9;
        const CLOSING_HOUR = 17;

        const allCalls = await this.callRepository.find({ select: ['id', 'created_at'], where: callDateFilter });
        const afterHoursCallIds = new Set<number>();
        let callsAfterHours = 0;

        allCalls.forEach(call => {
            if (call.created_at) {
                const callDate = new Date(call.created_at);
                const hour = callDate.getHours();
                if (hour < OPENING_HOUR || hour >= CLOSING_HOUR) {
                    callsAfterHours++;
                    afterHoursCallIds.add(Number(call.id));
                }
            }
        });

        const allAppointments = await this.appointmentRepository.find({ select: ['id', 'duration_minutes', 'created_from_call_id'], where: appointmentDateFilter });
        
        let bookingsDoneAfterHours = 0;
        let durationGeneratedAfterHours = 0;

        allAppointments.forEach(apt => {
            if (apt.created_from_call_id && afterHoursCallIds.has(Number(apt.created_from_call_id))) {
                bookingsDoneAfterHours++;
                durationGeneratedAfterHours += (apt.duration_minutes || 0);
            }
        });

        return {
            callsAfterHours,
            bookingsDoneAfterHours,
            durationGeneratedAfterHours,
            callIds: Array.from(afterHoursCallIds).map(String),
        };
      })(),
      reservationSeparation: await (async () => {
        const allAppointments = await this.appointmentRepository.find({
          relations: ['created_from_call'],
          where: appointmentDateFilter
        });
        let generalCount = 0; let generalDuration = 0; const generalIds: string[] = [];
        let urgentCount = 0; let urgentDuration = 0; const urgentIds: string[] = [];

        // If no appointments exist for the range, return zeros
        if (!allAppointments || allAppointments.length === 0) {
            return {
              totalReservationCalls: summary.totalCalls,
              securedBookings: { count: 0, duration: 0, callIds: [] },
              urgentBookings: { count: 0, duration: 0, callIds: [] },
              largePartyBookings: { count: 0, duration: 0, callIds: [] },
              promotionalBookings: { count: 0, duration: 0, callIds: [] },
            };
        }

        allAppointments.forEach(apt => {
          const duration = apt.duration_minutes || 30;
          generalCount++; 
          generalDuration += duration; 
          generalIds.push(apt.id.toString());
        });

        // Fetch urgent cases from the summary of call outcomes
        const urgentItem = summary.outcomeBarData?.find(item => item.name === 'Urgent Case');
        const urgentCasesCount = urgentItem?.count || 0;
        const urgentCasesCallIds = urgentItem?.callIds || [];

        const avgDuration = generalCount > 0 ? Math.round(generalDuration / generalCount) : 30;

        urgentCount = urgentCasesCount;
        urgentDuration = urgentCasesCount * avgDuration;
        urgentIds.push(...urgentCasesCallIds);

        return {
          totalReservationCalls: summary.totalCalls,
          securedBookings: { count: generalCount, duration: generalDuration, callIds: generalIds },
          urgentBookings: { count: urgentCount, duration: urgentDuration, callIds: urgentIds },
          largePartyBookings: { count: 0, duration: 0, callIds: [] },
          promotionalBookings: { count: 0, duration: 0, callIds: [] },
        };
      })()
    };
  }

  async getAnalyticsInsights(dto?: any) {
    return {
      trendingTopics: [],
      topQueries: [],
      topSpecialRequests: [],
      summary: { totalCalls: await this.callRepository.count(), dateRange: { start: '', end: '' } },
    };
  }

  async getStats(dto?: any): Promise<any> {
    return this.getSummaryDashboard(dto);
  }

  async getRecentActivity(): Promise<any> {
    const recentCalls = await this.callRepository.find({
      order: { created_at: 'DESC' },
      take: 5,
    });

    const recentAppointments = await this.appointmentRepository.find({
      order: { created_at: 'DESC' },
      take: 5,
      relations: ['doctor'],
    });

    return {
      calls: recentCalls,
      appointments: recentAppointments,
    };
  }
}
