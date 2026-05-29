import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async getSummaryDashboard(dto?: any, user?: any) {
    const totalCalls = await this.callRepository.count();
    const inboundCalls = await this.callRepository.count({ where: { direction: 'inbound' } });
    const outboundCalls = totalCalls - inboundCalls;
    
    // Average duration
    const calls = await this.callRepository.find({ select: ['duration_seconds'] });
    const totalDurationSeconds = calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
    const avgDurationSeconds = totalCalls > 0 ? Math.floor(totalDurationSeconds / totalCalls) : 0;

    const totalReservations = await this.appointmentRepository.count();
    const conversionRate = totalCalls > 0 ? (totalReservations / totalCalls) * 100 : 0;

    return {
      totalCalls,
      inboundCalls,
      outboundCalls,
      aht: avgDurationSeconds,
      avgSentimentScore: 0.8,
      avgSentimentPercent: '80%',
      conversionRate,
      depositCaptureRate: 0,
      kpiTrends: {
        totalCalls: { current: totalCalls, previous: 0, changePct: 0, rag: 'green' },
        conversionRate: { current: conversionRate, previous: 0, changePct: 0, rag: 'green' },
      },
      outcomeBarData: [
        { name: 'Appointment Booked', count: totalReservations },
        { name: 'Enquiry Handled', count: totalCalls - totalReservations },
      ],
      volumeTrend: [
        { label: 'Mon', value: 10 },
        { label: 'Tue', value: 15 },
        { label: 'Wed', value: totalCalls },
      ],
      conversionFunnel: [
        { stage: 'Calls Handled', count: totalCalls, pct: 100 },
        { stage: 'Action Required', count: await this.actionRepository.count(), pct: 50 },
        { stage: 'Appointments', count: totalReservations, pct: conversionRate },
      ],
      trendingTopics: [
        { code: 'booking', label: 'Book Appointment', count: totalReservations },
        { code: 'reschedule', label: 'Reschedule', count: 0 },
      ],
      heatmapData: {},
      leaderboardData: [],
    };
  }

  async getReservationDashboard(dto?: any, user?: any) {
    const summary = await this.getSummaryDashboard(dto, user);
    return {
      totalCalls: summary.totalCalls,
      avgSentimentPercentage: 80,
      last7DaysCallCount: {},
      locationWiseCallCount: [],
      reservationCategories: [],
      timingDistribution: [],
      topAskClass: 'Booking',
      maxBookingCategory: 'General Checkup',
      topQueriesToday: [],
      totalBookingsCaptured: await this.appointmentRepository.count(),
      totalBookingsBreakdown: [],
      avgTime: summary.aht,
      totalCovers: await this.appointmentRepository.count(),
      confirmedPercentage: 100,
      avgPartySize: 1,
      topSpecialRequests: [],
      volumeTrend: summary.volumeTrend,
      conversionFunnel: summary.conversionFunnel,
      trendingTopics: summary.trendingTopics,
      dailyBookings: {
        byDateBooked: [],
        byVisitDate: [],
      }
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
