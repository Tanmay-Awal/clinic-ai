'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import KPITile from '@/components/KPITile';
import OutcomeBar from '@/components/OutcomeBar';
import FeedbackOutcomeBar from '@/components/FeedbackOutcomeBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DashboardHeader from '@/components/DashboardHeader';
import { useAuthStore, hasActionsOnlyRole } from '@/store/authStore';
import HeatmapCard from '@/components/HeatmapCard';
import ForecastCard from '@/components/ForecastCard';
import AspectBarsBW from '@/components/AspectBarsBW';
import LeaderboardTableBW from '@/components/LeaderboardTableBW';
import FunnelChartBW from '@/components/FunnelChartBW';
import DonutChartBW from '@/components/DonutChartBW';
import WordCloudBW from '@/components/WordCloudBW';
import HistogramChartBW from '@/components/HistogramChartBW';
import MiniTableBW from '@/components/MiniTableBW';
import InsightBlockBW from '@/components/InsightBlockBW';
import VolumeTrendChart from '@/components/VolumeTrendChart';
import AppLayout from '@/components/Layouts/AppLayout';
import { FunnelAnalyticsChart } from '@/components/FunnelAnalyticsChart';
import TrendingTopics from '@/components/TrendingTopics';
import TopQueries from '@/components/TopQueries';
import TopSpecialRequests from '@/components/TopSpecialRequests';
import FeedbackTypeChart from '@/components/FeedbackTypeChart';
import RebookingFunnel from '@/components/RebookingFunnel';
import FeedbackThemes from '@/components/FeedbackThemes';
import { useReservationDashboard, useUserInteractions, useHousekeepingDashboard, useFeedbackDashboard, useSummaryDashboard, useAnalyticsInsights } from '@/hooks/use-dashboard';
import type { UserInteraction, TimingDistribution, TopQuery, TrendingTopicItem } from '@/types';
import { cn } from '@/lib/utils';
import {
  dashboardKPIs,
  volumeTrend,
  channelMix,
  reservationFunnel,
  cancellationReasons,
  salesPipeline,
  leadSources,
  intentScoreDistribution,
  complaintTopics,
  feedbackWords,
  issueCategories,
  resolutionTimeDistribution,
  unresolvedCases,
  enquiryTopics,
  repeatQueries
} from '@/lib/mockData';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { useCallsList } from '@/hooks/use-calls';
import { useActionsList } from '@/hooks/use-actions';
import { callsApi } from '@/lib/api/resources';
import { useOrganisationSettings } from '@/hooks/useOrganisationSettings';
import {
  CALL_IDS_URL_THRESHOLD,
  FEEDBACK_METRICS,
  RESERVATION_OUTCOMES,
  normalizeFeedbackMetricFilter,
  normalizeReservationOutcomeFilter,
} from '@/lib/constants';
import {
  DEFAULT_DISPLAY_TIMEZONE,
  endOfDayInTimezoneUtc,
  formatDateInTimezone,
  getDatePartsInTimezone,
  getDateKeyInTimezone,
  parseDateOnlyAsUtc,
  parseTimestampAsUtc,
  startOfDayInTimezoneUtc,
} from '@/lib/timezone';

const grayscaleChannels = channelMix.map((item, i) => ({
  ...item,
  color: `hsl(0 0% ${20 + i * 20}%)`
}));

const dateRangeLabels: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  last_month: 'Last Month',
  '90d': 'Last 90 Days',
  custom: 'Selected Range',
  // Legacy support just in case
  week: 'This Week',
  month: 'This Month',
  year: 'This Year'
};

// JUSTIFICATION: We have now passed the 30-day mark since introducing feedback forms, 
// so trends for '30d' and 'last_month' are now reliable. We keep '90d' restricted 
// until enough historical data exists to prevent stale/misleading arrows.
const LONG_DATE_RANGES = ['90d'];

export default function Dashboard() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState('7d');
  const [category, setCategory] = useState('reservation');
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [bookingsToggle, setBookingsToggle] = useState<'date_booked' | 'visit_date'>('date_booked');

  const { settings: orgSettings } = useOrganisationSettings();
  const DASHBOARD_TIMEZONE = orgSettings?.default_timezone || DEFAULT_DISPLAY_TIMEZONE;

  // Fetch user interactions to get dynamic categories
  const { data: interactionsData, isLoading: isLoadingInteractions } = useUserInteractions();

  // Fetch last 10 calls for notifications
  const { data: notificationCalls } = useCallsList({
    page: 1,
    limit: 10,
    sort_by: 'call_start_time',
    sort_order: 'DESC',
  });

  // Fetch last 10 actions for notifications
  const { data: notificationActionsData } = useActionsList({
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const notificationActions = notificationActionsData?.data;

  // Load read notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('readNotifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let hasLegacyIds = false;
        const migrated = Array.isArray(parsed)
          ? parsed.flatMap((id) => {
            if (typeof id !== 'string') {
              return [];
            }
            if (id.startsWith('call_') || id.startsWith('action_')) {
              return [id];
            }
            hasLegacyIds = true;
            return [`call_${id}`];
          })
          : [];

        setReadNotifications(new Set(migrated));
        if (hasLegacyIds) {
          localStorage.setItem('readNotifications', JSON.stringify(migrated));
        }
      } catch (error) {
        console.warn('Failed to parse readNotifications from localStorage', error);
        setReadNotifications(new Set());
      }
    }
  }, []);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    let count = 0;
    if (notificationCalls) {
      count += notificationCalls.filter(call => !readNotifications.has(`call_${call.id}`)).length;
    }
    if (notificationActions) {
      count += notificationActions.filter(action => !readNotifications.has(`action_${action.id}`)).length;
    }
    return count;
  }, [notificationCalls, notificationActions, readNotifications]);

  const handleReservationOutcomeClick = (outcomeName: string, callIds?: string[]) => {
    if (category !== 'reservation' && category !== 'all') return;

    const params = new URLSearchParams();

    // Check if we have too many IDs for a URL
    if (callIds && callIds.length > 0) {
      if (callIds.length > CALL_IDS_URL_THRESHOLD) {
        // Use sessionStorage to pass large ID sets to avoid URL length limits
        try {
          const drilldownId = crypto.randomUUID().slice(0, 8);
          sessionStorage.setItem(`drilldown_${drilldownId}`, JSON.stringify(callIds));
          params.set('drilldown_id', drilldownId);
        } catch (e) {
          console.error('Failed to store drilldown IDs in sessionStorage', e);
          // Fallback to labels if storage fails
          params.set('category', 'Reservation');
          params.set('outcome', normalizeReservationOutcomeFilter(outcomeName));
        }
      } else {
        params.set('call_ids', callIds.join(','));
      }
    } else {
      params.set('category', 'Reservation');
      params.set('outcome', normalizeReservationOutcomeFilter(outcomeName));
    }

    if (drilldownDateParams.startDate) params.set('startDate', drilldownDateParams.startDate);
    if (drilldownDateParams.endDate) params.set('endDate', drilldownDateParams.endDate);
    router.push(`/calls?${params.toString()}`);
  };

  const getFeedbackMetricCallIds = (metricName: string) => {
    const normalized = normalizeFeedbackMetricFilter(metricName).toLowerCase();
    const metricCallIds = feedbackData?.metricCallIds;
    if (!metricCallIds) return [];

    switch (normalized) {
      case 'meaningful feedback given':
        return metricCallIds.meaningful;
      case 'non meaningful':
        return metricCallIds.nonMeaningful;
      case 'voicemail':
        return metricCallIds.voicemail;
      case 'failed/unanswered':
        return metricCallIds.unanswered;
      case 'positive':
        return metricCallIds.positive;
      case 'negative':
        return metricCallIds.negative;
      case 'compliment':
        return metricCallIds.compliment;
      case 'complaint':
        return metricCallIds.complaint;
      case 'mixed':
        return metricCallIds.mixed;
      case 'neutral':
        return metricCallIds.neutral;
      default:
        return [];
    }
  };

  const handleFeedbackMetricClick = (
    metricName: string,
    direction?: 'inbound' | 'outbound',
  ) => {
    if (category !== 'feedback') return;

    const params = new URLSearchParams();
    const normalizedMetric = normalizeFeedbackMetricFilter(metricName);
    const metricCallIds = getFeedbackMetricCallIds(normalizedMetric);

    if (metricCallIds.length > 0) {
      if (metricCallIds.length > CALL_IDS_URL_THRESHOLD) {
        // Use sessionStorage for large ID sets
        try {
          const drilldownId = crypto.randomUUID().slice(0, 8);
          sessionStorage.setItem(`drilldown_${drilldownId}`, JSON.stringify(metricCallIds));
          params.set('drilldown_id', drilldownId);
        } catch (e) {
          console.error('Failed to store drilldown IDs in sessionStorage', e);
          params.set('feedback_metric', normalizedMetric);
        }
      } else {
        params.set('call_ids', metricCallIds.join(','));
      }
    } else {
      params.set('feedback_metric', normalizedMetric);
    }

    if (direction) params.set('call_direction', direction);
    if (drilldownDateParams.startDate) params.set('startDate', drilldownDateParams.startDate);
    if (drilldownDateParams.endDate) params.set('endDate', drilldownDateParams.endDate);
    router.push(`/calls?${params.toString()}`);
  };

  const handleFeedbackThemeClick = (callId: number) => {
    if (category !== 'feedback' || !(typeof callId === 'number' && callId > 0)) return;
    router.push(`/calls/${callId}`);
  };

  const handleFeedbackThemeMetricClick = (
    theme: string,
    kind: 'positive' | 'negative',
    callIds?: number[]
  ) => {
    if (category !== 'feedback' || !theme?.trim()) return;
    const params = new URLSearchParams();

    if (callIds && callIds.length > 0) {
      params.set('call_ids', callIds.join(','));
    } else {
      params.set('feedback_theme', theme.trim());
      params.set('feedback_theme_kind', kind);
    }

    if (drilldownDateParams.startDate) params.set('startDate', drilldownDateParams.startDate);
    if (drilldownDateParams.endDate) params.set('endDate', drilldownDateParams.endDate);
    router.push(`/calls?${params.toString()}`);
  };

  const handleMarkAllRead = useCallback(() => {
    const allIds = new Set<string>();
    if (notificationCalls) {
      notificationCalls.forEach(call => allIds.add(`call_${call.id}`));
    }
    if (notificationActions) {
      notificationActions.forEach(action => allIds.add(`action_${action.id}`));
    }

    setReadNotifications(allIds);
    localStorage.setItem('readNotifications', JSON.stringify(Array.from(allIds)));
  }, [notificationCalls, notificationActions]);

  const handleNotificationRead = useCallback((itemId: string) => {
    setReadNotifications(prev => {
      const updated = new Set([...prev, itemId]);
      localStorage.setItem('readNotifications', JSON.stringify(Array.from(updated)));
      return updated;
    });
  }, []);

  // Generate dynamic categories from interactions
  const user = useAuthStore((state) => state.user);

  // Redirect actions-only users away from dashboard
  useEffect(() => {
    if (hasActionsOnlyRole(user)) {
      router.replace('/actions');
    }
  }, [user, router]);

  const dynamicCategories = useMemo(() => {
    // Filter to only show specific categories as requested
    const allowedCategories = ['reservation', 'feedback'];

    // Special allowance for contact@humanai.co.uk to see housekeeping
    if (user?.email === 'contact@humanai.co.uk') {
      allowedCategories.push('housekeeping');
      allowedCategories.push('house keeping');
    }

    const categories: string[] = [];
    const categoryLabels: Record<string, string> = {};
    const categoryIds: Record<string, string> = {};

    if (interactionsData && interactionsData.data) {
      interactionsData.data.forEach((interaction: UserInteraction) => {
        const categoryKey = interaction.interaction_type_name.toLowerCase();
        // Check if category is allowed (either standard allowed or enabled for specific user)
        const isAllowed = allowedCategories.includes(categoryKey);

        if (isAllowed && !categories.includes(categoryKey)) {
          categories.push(categoryKey);
          categoryLabels[categoryKey] = interaction.interaction_type_name;
          categoryIds[categoryKey] = interaction.i_interaction_type_id;
        }
      });

      // Explicitly add Housekeeping if authorized but not in interactionsData (fallback)
      if (user?.email === 'contact@humanai.co.uk' && !categories.includes('housekeeping') && !categories.includes('house keeping')) {
        categories.push('housekeeping');
        categoryLabels['housekeeping'] = 'Housekeeping';
        // No ID for fallback, or we might need one if backend requires it. 
        // Usually if it's not in interactions, we have a problem filtering by interaction_id.
        // But the backend `getReservationDashboard` filters by category name logic or separate endpoint.
        // housekeeping uses `useHousekeepingDashboard` which usually hits a separate endpoint `/dashboard/housekeeping` 
        // so interaction_id might not be strictly required for that specific hook to work?
        // Let's check `use-dashboard.ts` if needed, but for now assuming it works like other fallbacks.
      }

      // Explicitly add Reservation for bangaloreexpress email if not present
      if (user?.email && (user.email === 'bangaloreexpress@huemanai.co.uk' || user.email === 'bangaloreexpress.huemanai.co.uk' || user.email.includes('bangaloreexpress')) && !categories.includes('reservation')) {
        categories.push('reservation');
        categoryLabels['reservation'] = 'Reservation';
      }

    } else {
      // Fallback to default categories if API fails
      const defaults = ['reservation'];
      defaults.forEach(cat => {
        categories.push(cat);
        categoryLabels[cat] = 'Reservation';
        categoryIds[cat] = ''; // No ID for fallback categories
      });
    }

    return { categories, categoryLabels, categoryIds };
  }, [interactionsData, user]);

  // Calculate shared date params with useMemo to prevent creating new object references
  // on every render, which causes infinite refetch loops in React Query
  const dateParams = useMemo(() => {
    let startDate: string | undefined;
    let endDate: string | undefined;
    const now = new Date(); // Use a stable "now" for this calculation cycle

    let computedRange = dateRange;

    if (dateRange.startsWith('custom|')) {
      const parts = dateRange.split('|');
      // expected format: custom|YYYY-MM-DD|YYYY-MM-DD
      if (parts.length === 3) {
        const start = parseDateOnlyAsUtc(parts[1]);
        const end = parseDateOnlyAsUtc(parts[2]);
        if (start && end) {
          startDate = startOfDayInTimezoneUtc(start, DASHBOARD_TIMEZONE).toISOString();
          endDate = endOfDayInTimezoneUtc(end, DASHBOARD_TIMEZONE).toISOString();
        }
        computedRange = 'custom';
      }
    } else if (dateRange === 'today') {
      startDate = startOfDayInTimezoneUtc(now, DASHBOARD_TIMEZONE).toISOString();
    } else if (dateRange === 'yesterday') {
      const past = new Date(now);
      past.setDate(past.getDate() - 1);
      startDate = startOfDayInTimezoneUtc(past, DASHBOARD_TIMEZONE).toISOString();
    } else if (dateRange === '7d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      startDate = startOfDayInTimezoneUtc(past, DASHBOARD_TIMEZONE).toISOString();
    } else if (dateRange === '30d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      startDate = startOfDayInTimezoneUtc(past, DASHBOARD_TIMEZONE).toISOString();
    } else if (dateRange === 'last_month') {
      const { year, month } = getDatePartsInTimezone(now, DASHBOARD_TIMEZONE);
      // month is 1-based from getDatePartsInTimezone.
      // We want the start of the previous month.
      const prevMonth = month - 1;
      const monthStart = new Date(Date.UTC(year, prevMonth - 1, 1)); // UTC month is 0-based
      const monthEnd = new Date(Date.UTC(year, prevMonth, 0)); // Day 0 of current month is last day of prev month
      startDate = startOfDayInTimezoneUtc(monthStart, DASHBOARD_TIMEZONE).toISOString();
      endDate = endOfDayInTimezoneUtc(monthEnd, DASHBOARD_TIMEZONE).toISOString();
    } else if (dateRange === '90d') {
      const past = new Date(now);
      past.setDate(past.getDate() - 90);
      startDate = startOfDayInTimezoneUtc(past, DASHBOARD_TIMEZONE).toISOString();
    }

    return {
      startDate,
      endDate,
      dateRange: computedRange
    };
  }, [dateRange]);

  const drilldownDateParams = useMemo(() => {
    const end = dateParams.endDate ? parseTimestampAsUtc(dateParams.endDate) : new Date();
    const normalizedEnd = endOfDayInTimezoneUtc(end, DASHBOARD_TIMEZONE);

    const start = dateParams.startDate
      ? parseTimestampAsUtc(dateParams.startDate)
      : new Date(normalizedEnd);
    if (!dateParams.startDate) {
      start.setDate(start.getDate() - 7);
    }
    const normalizedStart = startOfDayInTimezoneUtc(start, DASHBOARD_TIMEZONE);

    return {
      startDate: normalizedStart.toISOString(),
      endDate: normalizedEnd.toISOString(),
      dateRange: dateParams.dateRange,
    };
  }, [dateParams]);

  const getDateRangeLabel = (range: string) => {
    if (range.startsWith('custom|')) {
      const parts = range.split('|');
      return parts.length === 3 ? `${parts[1]} to ${parts[2]}` : 'Custom Range';
    }
    return dateRangeLabels[range] || 'Last 7 Days';
  };

  // Fetch total reservation calls using the same calls API used on the Calls page
  // This is used to align the "Total Calls" KPI with the Calls list reservation filter
  const reservationCallsParams = useMemo(() => {
    if (category !== 'reservation') return undefined;

    const reservationLabel = dynamicCategories.categoryLabels?.['reservation'] || 'Reservation';

    return {
      page: 1,
      limit: 1,
      category: reservationLabel,
      sort_by: 'call_start_time',
      sort_order: 'DESC' as const,
      ...dateParams,
    };
  }, [category, dynamicCategories.categoryLabels, dateParams]);

  const formatCSVValue = (val: unknown) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportReservation = () => {
    try {
      setIsExporting(true);
      if (!reservationKPIs || !reservationData) {
        toast.error('No reservation data to export');
        setIsExporting(false);
        return;
      }

      const rows: string[][] = [];
      const dateLabel = getDateRangeLabel(dateRange);

      // ── Section 1: Summary ──
      rows.push(['RESERVATION DASHBOARD EXPORT'].map(formatCSVValue));
      rows.push(['Date Filter', dateLabel].map(formatCSVValue));
      rows.push(['Exported At', formatDateInTimezone(new Date(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }, DASHBOARD_TIMEZONE)].map(formatCSVValue));
      rows.push([]);

      // ── Section 2: Call Outcomes ──
      const outcomeData = reservationData?.outcomeBarData;
      rows.push(['--- CALL OUTCOMES ---'].map(formatCSVValue));
      rows.push(['Total Calls', String(reservationKPIs.totalCalls)].map(formatCSVValue));
      if (outcomeData && Array.isArray(outcomeData)) {
        outcomeData.forEach((o: { name: string; count: number }) => {
          const pct = reservationKPIs.totalCalls > 0
            ? ((o.count / reservationKPIs.totalCalls) * 100).toFixed(1) + '%'
            : '0%';
          rows.push([o.name, String(o.count), pct].map(formatCSVValue));
        });
      }
      rows.push([]);

      // ── Section 3: KPI Tiles ──
      rows.push(['--- KEY METRICS ---'].map(formatCSVValue));
      rows.push(['Metric', 'Value'].map(formatCSVValue));
      rows.push(['Total Bookings Captured', String(reservationKPIs.totalBookingsCaptured)].map(formatCSVValue));
      rows.push(['Reservations %', reservationKPIs.confirmedPercentage + '%'].map(formatCSVValue));
      const mins = Math.floor(reservationKPIs.avgTime / 60);
      const secs = reservationKPIs.avgTime % 60;
      rows.push(['Avg Time', `${mins}:${secs.toString().padStart(2, '0')}`].map(formatCSVValue));
      rows.push(['Avg Party Size', String(reservationKPIs.avgPartySize)].map(formatCSVValue));
      rows.push([]);

      // ── Section 4: Upsell Performance ──
      if (reservationKPIs.upsellStats) {
        const u = reservationKPIs.upsellStats;
        rows.push(['--- UPSELL PERFORMANCE ---'].map(formatCSVValue));
        rows.push(['Total Revenue (£)', u.totalRevenue.toFixed(2)].map(formatCSVValue));
        rows.push(['Total Successful Upsells', String(u.totalUpsells)].map(formatCSVValue));
        rows.push(['Prosecco', String(u.breakdown?.prosecco || 0)].map(formatCSVValue));
        rows.push(['Wine', String(u.breakdown?.wine || 0)].map(formatCSVValue));
        rows.push(['Other', String(u.breakdown?.other || 0)].map(formatCSVValue));
        rows.push([]);
      }

      // ── Section 5: After-Hours Stats ──
      if (reservationKPIs.afterHoursStats) {
        const a = reservationKPIs.afterHoursStats;
        rows.push(['--- AFTER-HOURS STATS ---'].map(formatCSVValue));
        rows.push(['Calls After Hours', String(a.callsAfterHours)].map(formatCSVValue));
        rows.push(['Bookings After Hours', String(a.bookingsDoneAfterHours)].map(formatCSVValue));
        rows.push(['Covers After Hours', String(a.durationGeneratedAfterHours)].map(formatCSVValue));
        rows.push([]);
      }

      // ── Section 6: Reservation Separation ──
      if (reservationKPIs.reservationSeparation) {
        const s = reservationKPIs.reservationSeparation;
        const sb = s.securedBookings || { count: 0, duration: 0 };
        const lb = s.largeGroup || s.largePartyBookings || { count: 0, duration: 0 };
        const pb = s.promotions || s.promotionalBookings || { count: 0, duration: 0 };
        rows.push(['--- RESERVATION SEPARATION ---'].map(formatCSVValue));
        rows.push(['Total Reservation Calls', String(s.totalReservationCalls)].map(formatCSVValue));
        rows.push(['Secured Bookings Count', String(sb.count)].map(formatCSVValue));
        rows.push(['Secured Bookings Covers', String(sb.duration)].map(formatCSVValue));
        rows.push(['Large Party Bookings Count', String(lb.count)].map(formatCSVValue));
        rows.push(['Large Party Bookings Covers', String(lb.duration)].map(formatCSVValue));
        rows.push(['Promotional Bookings Count', String(pb.count)].map(formatCSVValue));
        rows.push(['Promotional Bookings Covers', String(pb.duration)].map(formatCSVValue));
        rows.push([]);
      }

      // ── Section 7: Volume Trend ──
      if (reservationKPIs.volumeTrend && reservationKPIs.volumeTrend.length > 0) {
        rows.push(['--- VOLUME TREND ---'].map(formatCSVValue));
        rows.push(['Date/Hour', 'Calls'].map(formatCSVValue));
        reservationKPIs.volumeTrend.forEach((v: { label: string; value: number }) => {
          rows.push([v.label, String(v.value)].map(formatCSVValue));
        });
        rows.push([]);
      }

      // ── Section 8: Reservation Time Per Slot ──
      if (reservationKPIs.timingDistribution && reservationKPIs.timingDistribution.length > 0) {
        rows.push(['--- RESERVATION TIME PER SLOT ---'].map(formatCSVValue));
        rows.push(['Hour', 'Reservations'].map(formatCSVValue));
        reservationKPIs.timingDistribution.forEach((t: TimingDistribution) => {
          rows.push([t.label, String(t.value)].map(formatCSVValue));
        });
        rows.push([]);
      }

      // ── Section 9: Conversion Funnel ──
      if (reservationKPIs.conversionFunnel && reservationKPIs.conversionFunnel.length > 0) {
        rows.push(['--- CONVERSION FUNNEL ---'].map(formatCSVValue));
        rows.push(['Stage', 'Count', 'Percentage'].map(formatCSVValue));
        reservationKPIs.conversionFunnel.forEach((f: { stage: string; count: number; pct: number }) => {
          rows.push([f.stage, String(f.count), f.pct + '%'].map(formatCSVValue));
        });
        rows.push([]);
      }

      // ── Section 10: Top Queries ──
      if (reservationKPIs.topQueriesToday && reservationKPIs.topQueriesToday.length > 0) {
        rows.push(['--- TOP QUERIES ---'].map(formatCSVValue));
        rows.push(['Query', 'Count'].map(formatCSVValue));
        reservationKPIs.topQueriesToday.forEach((q: TopQuery) => {
          rows.push([q.query, String(q.count)].map(formatCSVValue));
        });
        rows.push([]);
      }

      // ── Section 11: Top Special Requests ──
      if (reservationKPIs.topSpecialRequests && reservationKPIs.topSpecialRequests.length > 0) {
        rows.push(['--- TOP SPECIAL REQUESTS ---'].map(formatCSVValue));
        rows.push(['Request', 'Count'].map(formatCSVValue));
        reservationKPIs.topSpecialRequests.forEach((r: { request: string; count: number }) => {
          rows.push([r.request, String(r.count)].map(formatCSVValue));
        });
        rows.push([]);
      }

      // Build CSV string
      const csvContent = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reservation_dashboard_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success('Dashboard exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export dashboard data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportFeedback = () => {
    try {
      setIsExporting(true);
      if (!feedbackData) {
        toast.error('No feedback data to export');
        setIsExporting(false);
        return;
      }

      const rows: string[][] = [];
      const dateLabel = getDateRangeLabel(dateRange);

      // ── Section 1: Summary ──
      rows.push(['FEEDBACK DASHBOARD EXPORT'].map(formatCSVValue));
      rows.push(['Date Filter', dateLabel].map(formatCSVValue));
      rows.push(['Exported At', formatDateInTimezone(new Date(), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }, DASHBOARD_TIMEZONE)].map(formatCSVValue));
      rows.push([]);

      // ── Section 2: Call Outcomes ──
      if (feedbackData.outcomeBar) {
        const o = feedbackData.outcomeBar;
        rows.push(['--- CALL OUTCOMES ---'].map(formatCSVValue));
        rows.push(['Total Attempted', String(o.totalAttempted)].map(formatCSVValue));
        rows.push(['Meaningful Feedback Given', String(o.meaningful)].map(formatCSVValue));
        rows.push(['Non-Meaningful Conversations', String(o.nonMeaningful)].map(formatCSVValue));
        rows.push(['Voicemail', String(o.voicemail)].map(formatCSVValue));
        rows.push(['Feedback Given %', o.feedbackGivenPct.toFixed(1) + '%'].map(formatCSVValue));
        rows.push([]);
      }

      // ── Section 3: Key Metrics ──
      rows.push(['--- KEY METRICS ---'].map(formatCSVValue));
      rows.push(['Metric', 'Value'].map(formatCSVValue));
      rows.push(['Positive %', (feedbackData.positivePercentage || 0) + '%'].map(formatCSVValue));
      rows.push(['Negative %', (feedbackData.negativePercentage || 0) + '%'].map(formatCSVValue));
      rows.push(['Coupons Provided', String(feedbackData.couponsProvided || 0)].map(formatCSVValue));
      rows.push(['Total Feedback Count', String(feedbackData.totalFeedback || 0)].map(formatCSVValue));
      if (feedbackData.nps) {
        rows.push(['NPS Score', String(feedbackData.nps.score)].map(formatCSVValue));
        rows.push(['NPS Classification', feedbackData.nps.classification].map(formatCSVValue));
      }
      rows.push([]);


      if (feedbackData.feedbackTypeBreakdown && feedbackData.feedbackTypeBreakdown.length > 0) {
        rows.push(['--- FEEDBACK TYPE BREAKDOWN ---'].map(formatCSVValue));
        rows.push(['Category', 'Count', 'Percentage'].map(formatCSVValue));
        const breakdownData = feedbackData.feedbackTypeBreakdown || [];
        breakdownData.forEach((f) => {
          rows.push([f.type, String(f.count), f.percentage + '%'].map(formatCSVValue));
        });
        rows.push([]);
      }

      // ── Section 6: Themes ──
      if (feedbackData.topPositiveThemes && feedbackData.topPositiveThemes.length > 0) {
        rows.push(['--- TOP POSITIVE THEMES ---'].map(formatCSVValue));
        rows.push(['Theme', 'Count'].map(formatCSVValue));
        feedbackData.topPositiveThemes.forEach((t) => {
          rows.push([t.comment_preview, String(t.count)].map(formatCSVValue));
        });
        rows.push([]);
      }
      if (feedbackData.topNegativeThemes && feedbackData.topNegativeThemes.length > 0) {
        rows.push(['--- TOP NEGATIVE THEMES ---'].map(formatCSVValue));
        rows.push(['Theme', 'Count'].map(formatCSVValue));
        feedbackData.topNegativeThemes.forEach((t) => {
          rows.push([t.comment_preview, String(t.count)].map(formatCSVValue));
        });
        rows.push([]);
      }

      // ── Section 7: Rebooking Stats ──
      if (feedbackData.rebookingStats) {
        const r = feedbackData.rebookingStats;
        rows.push(['--- REBOOKING STATS ---'].map(formatCSVValue));
        rows.push(['Offered', String(r.offered)].map(formatCSVValue));
        rows.push(['Accepted', String(r.accepted)].map(formatCSVValue));
        rows.push(['Acceptance Rate', r.conversionRate + '%'].map(formatCSVValue));
        rows.push([]);
      }

      // Build CSV string
      const csvContent = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `feedback_dashboard_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success('Feedback dashboard exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export feedback data');
    } finally {
      setIsExporting(false);
    }
  };

  const {
    pagination: reservationCallsPagination,
  } = useCallsList(reservationCallsParams, {
    enabled: !!reservationCallsParams,
  });

  // Validate and load saved category from localStorage - only use if available for current user
  useEffect(() => {
    // Wait for categories to be loaded
    if (dynamicCategories.categories.length === 0) return;

    const saved = localStorage.getItem('dashboardCategory');

    // Check if saved category is valid for current user
    if (saved && dynamicCategories.categories.includes(saved)) {
      // Only update if different from current category to avoid unnecessary updates
      if (category !== saved) {
        setCategory(saved);
      }
    } else {
      // If saved category doesn't exist in available categories, default to the first one
      const defaultCat = dynamicCategories.categories[0] || 'reservation';
      if (category !== defaultCat) {
        setCategory(defaultCat);
      }
      // Update localStorage to default if saved category was invalid
      if (saved && !dynamicCategories.categories.includes(saved)) {
        localStorage.setItem('dashboardCategory', defaultCat);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicCategories.categories]); // Only run when categories change (new user login)

  // Save category to localStorage
  useEffect(() => {
    localStorage.setItem('dashboardCategory', category);
  }, [category]);

  // Get interaction_type_id for current category
  const currentCategoryId = useMemo(() => {
    if (category === 'all') return undefined;
    return dynamicCategories.categoryIds[category];
  }, [category, dynamicCategories.categoryIds]);




  // Fetch dashboard data for selected category
  const isHousekeeping = category === 'house keeping' || category === 'housekeeping';
  const isReservation = category === 'reservation';

  const { data: reservationData, isLoading: isLoadingReservation, isFetching: isFetchingReservation } = useReservationDashboard({
    params: isReservation ? {
      interaction_type_id: currentCategoryId || undefined,
      includeIds: true,
      ...dateParams
    } : undefined,
    enabled: isReservation,
  });

  const { data: analyticsData, isLoading: isAnalyticsLoading } = useAnalyticsInsights({
    params: dateParams,
    enabled: isReservation,
  });

  // Debug: log raw reservation dashboard payload from API (for investigating total calls mismatch)
  if (typeof window !== 'undefined' && isReservation && reservationData) {
    // eslint-disable-next-line no-console
    console.log('[Reservation API raw]', reservationData);
  }

  // Calculate date range for housekeeping (default to current month)
  const housekeepingDateRange = useMemo(() => {
    if (!isHousekeeping) return undefined;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Start date: First day of current month
    const startDate = new Date(year, month, 1);
    // End date: Last day of current month
    const endDate = new Date(year, month + 1, 0);

    return {
      startDate: startDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
      endDate: endDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
    };
  }, [isHousekeeping]);

  // Fetch housekeeping dashboard data
  const { data: housekeepingData, isLoading: isLoadingHousekeeping } = useHousekeepingDashboard({
    params: isHousekeeping ? housekeepingDateRange : undefined,
    enabled: isHousekeeping,
  });

  // Fetch feedback dashboard data


  // Fetch feedback dashboard data
  const { data: feedbackData, isLoading: isLoadingFeedback } = useFeedbackDashboard({
    enabled: category === 'feedback',
    params: { ...dateParams, includeIds: true }
  });

  // Fetch summary dashboard data
  const { data: summaryData, isLoading: isLoadingSummary, isFetching: isFetchingSummary } = useSummaryDashboard({
    enabled: category === 'all',
    params: dateParams
  });

  // Transform reservation API data for components
  const reservationKPIs = useMemo(() => {
    if (!reservationData) return null;

    // Generate timing distribution from API data
    const generateTimingData = (data: typeof reservationData) => {
      // First priority: Use timingDistribution if available
      if (data?.timingDistribution && Array.isArray(data.timingDistribution) && data.timingDistribution.length > 0) {
        return data.timingDistribution;
      }

      // Second priority: Generate from last7DaysCallCount heatmap data
      if (data?.last7DaysCallCount && typeof data.last7DaysCallCount === 'object' && Object.keys(data.last7DaysCallCount).length > 0) {
        const timingCounts: { [key: number]: number } = {};

        // Aggregate all hours from all days
        Object.values(data.last7DaysCallCount).forEach((dayData) => {
          if (dayData && typeof dayData === 'object') {
            Object.entries(dayData).forEach(([hour, count]) => {
              const hourNum = parseInt(hour, 10);
              if (!isNaN(hourNum) && hourNum >= 0 && hourNum < 24) {
                timingCounts[hourNum] = (timingCounts[hourNum] || 0) + (typeof count === 'number' ? count : 0);
              }
            });
          }
        });

        // Create array for all 24 hours, ensuring all hours are represented
        const hours = Array.from({ length: 24 }, (_, i) => ({
          label: `${i.toString().padStart(2, '0')}:00`,
          value: timingCounts[i] || 0
        }));

        return hours;
      }

      // Return empty array if no data (no dummy data)
      return [];
    };

    const timingData = generateTimingData(reservationData);

    // Calculate totals from timing data if missing from API
    const calculatedTotalReservations = timingData.reduce((sum: number, item: TimingDistribution) => sum + item.value, 0);
    const calculatedTotalCalls = calculatedTotalReservations;

    // Reservation separation data handling
    const separation = reservationData?.reservationSeparation;
    // Pinned down property names: .count and .duration
    const separationSecured = separation?.securedBookings || { count: 0, duration: 0 };
    const separationLarge = separation?.largePartyBookings || separation?.largeGroup || { count: 0, duration: 0 };
    const separationPromo = separation?.promotionalBookings || separation?.promotions || { count: 0, duration: 0 };

    const breakdownBookingsTotal = separationSecured.count + separationLarge.count + separationPromo.count;
    const breakdownCoversTotal = separationSecured.duration + separationLarge.duration + separationPromo.duration;

    // Debug: log how totals are being derived for the reservation KPIs
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[Reservation KPI calc]', {
        rawTotalCalls: reservationData?.totalCalls,
        rawTotalBookingsCaptured: reservationData?.totalBookingsCaptured,
        calculatedTotalCalls,
        calculatedTotalReservations,
        finalTotalCalls: reservationData?.totalCalls || calculatedTotalCalls,
        finalTotalBookingsCaptured: reservationData?.totalBookingsCaptured || calculatedTotalReservations,
      });
    }

    const transformed = {
      totalCalls: reservationData?.totalCalls || calculatedTotalCalls,
      avgSentiment: (reservationData?.avgSentimentPercentage || 0) / 100,
      avgSentimentPercentage: reservationData?.avgSentimentPercentage || 0,
      locationData: reservationData?.locationWiseCallCount || [],
      heatmapData: reservationData?.last7DaysCallCount || {},
      timingDistribution: timingData,
      reservationCategories: reservationData?.reservationCategories || [],
      topAskClass: reservationData?.topAskClass || null,
      maxBookingCategory: reservationData?.maxBookingCategory || null,
      topQueriesToday: reservationData?.topQueriesToday || [],
      totalBookingsCaptured:
        reservationData?.totalBookingsCaptured ?? breakdownBookingsTotal,
      totalBookingsBreakdown: reservationData?.totalBookingsBreakdown || [],
      avgTime: reservationData?.avgTime || 0,
      totalCovers: reservationData?.totalCovers ?? breakdownCoversTotal,
      confirmedPercentage: reservationData?.confirmedPercentage ?? 0,
      avgPartySize: reservationData?.avgPartySize || 0,
      topSpecialRequests: reservationData?.topSpecialRequests || [],
      volumeTrend: reservationData?.volumeTrend || [],
      conversionFunnel: reservationData?.conversionFunnel || [],
      volumeComparison: reservationData?.volumeComparison || null,
      trendingTopics: reservationData?.trendingTopics || [],
      afterHoursStats: reservationData?.afterHoursStats || null,
      reservationSeparation: reservationData?.reservationSeparation || null,
      upsellStats: reservationData?.upsellStats || null,
    };

    return transformed;
  }, [reservationData]);

  // Generate workload trend data for housekeeping (moved outside conditional to fix hooks order)
  const housekeepingWorkloadTrendData = useMemo(() => {
    if (category !== 'house keeping' && category !== 'housekeeping') {
      return [];
    }

    if (!reservationKPIs?.heatmapData || typeof reservationKPIs.heatmapData !== 'object') {
      // Fallback data
      const fallbackDates: Array<{ name: string; tasks: number; target: number }> = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const month = formatDateInTimezone(
          date,
          { month: 'short' },
          DASHBOARD_TIMEZONE,
        );
        const day = date.getDate();
        fallbackDates.push({
          name: `${month} ${day}`,
          tasks: Math.floor(Math.random() * 40) + 100,
          target: Math.floor(Math.random() * 30) + 80
        });
      }
      return fallbackDates;
    }

    const dayOrder: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    const days = Object.entries(reservationKPIs.heatmapData)
      .map(([day, dayData]) => {
        const total = typeof dayData === 'object' && dayData !== null
          ? Object.values(dayData).reduce((sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0), 0)
          : 0;
        return { day, total, order: dayOrder[day] || 99 };
      })
      .sort((a, b) => a.order - b.order);

    // Generate dates for last 7 days
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    // Map days to dates
    return days.map((d, idx) => {
      const date = dates[idx] || new Date();
      const month = formatDateInTimezone(
        date,
        { month: 'short' },
        DASHBOARD_TIMEZONE,
      );
      const day = date.getDate();
      return {
        name: `${month} ${day}`,
        tasks: d.total || Math.floor(Math.random() * 40) + 100,
        target: Math.floor(Math.random() * 30) + 80
      };
    });
  }, [category, reservationKPIs?.heatmapData]);

  // Get KPI tiles based on category - use API data when available
  const renderKPITiles = () => {
    // Show loading state when fetching data for reservation category
    if (category === 'reservation' && (isLoadingReservation || isFetchingReservation)) {
      return (
        <>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </>
      );
    }

    // Use API data only for reservation category
    if (category === 'reservation' && reservationKPIs) {
      const categoryLabel = dynamicCategories.categoryLabels[category] || category;
      // Prefer total from calls list API (aligns with Calls page reservation filter)
      const effectiveTotalCalls = reservationKPIs.totalCalls;
      const hideTrends = LONG_DATE_RANGES.includes(dateRange);
      const trends = hideTrends ? undefined : reservationData?.kpiTrends;
      const outcomeData = reservationData?.outcomeBarData;

      return (
        <>
          {outcomeData ? (
            <div className="col-span-full">
              <OutcomeBar
                data={outcomeData}
                totalCalls={effectiveTotalCalls}
                onSegmentClick={handleReservationOutcomeClick}
              />
            </div>
          ) : (
            <KPITile
              label="Total Calls"
              value={effectiveTotalCalls}
              trend={trends?.totalCalls}
            />
          )}

          {reservationKPIs.totalBookingsCaptured !== undefined && (
            <KPITile
              label="Total Bookings Captured"
              value={reservationKPIs.totalBookingsCaptured}
              trend={trends?.totalBookingsCaptured}
              breakdown={reservationKPIs.totalBookingsBreakdown}
            />
          )}
          {reservationKPIs.totalCovers !== undefined && reservationKPIs.totalCovers > 0 && (
            <KPITile
              label="Total Covers"
              value={reservationKPIs.totalCovers}
            />
          )}
          {reservationKPIs.confirmedPercentage !== undefined && reservationKPIs.confirmedPercentage > 0 && (
            <KPITile
              label="Reservations %"
              value={reservationKPIs.confirmedPercentage}
              format="percent"
              trend={trends?.confirmedPercentage}
            />
          )}
          {reservationKPIs.avgTime !== undefined && reservationKPIs.avgTime > 0 && (
            <KPITile
              label="Avg Time"
              value={reservationKPIs.avgTime}
              format="duration"
              trend={trends?.avgTime}
            />
          )}
        </>
      );
    }

    // Fallback to static data for 'all' or when API data is not available
    switch (category) {
      case 'feedback': {
        // Use feedback API data if available
        const totalFeedback = feedbackData?.totalFeedback || 0;
        const positivePct = feedbackData?.positivePercentage || 0;
        const negativePct = feedbackData?.negativePercentage || 0;
        const couponsProvided = feedbackData?.couponsProvided || 0;
        const fbTrends = feedbackData?.kpiTrends;

        const outcomeBar = feedbackData?.outcomeBar;
        // Conditions to hide new feedback KPIs for longer periods
        const isLongRange = LONG_DATE_RANGES.includes(dateRange);

        return (
          <>
            {outcomeBar && outcomeBar.inbound && outcomeBar.outbound && (
              <FeedbackOutcomeBar data={outcomeBar} onSegmentClick={handleFeedbackMetricClick} />
            )}
            <KPITile
              label="Positive %"
              value={positivePct}
              format="percent"
              trend={fbTrends?.positivePercentage}
              onClick={() => handleFeedbackMetricClick('Positive')}
            />
            <KPITile
              label="Negative %"
              value={negativePct}
              format="percent"
              trend={fbTrends?.negativePercentage}
              onClick={() => handleFeedbackMetricClick('Negative')}
            />
            <KPITile label="Coupons Provided" value={couponsProvided} trend={fbTrends?.couponsProvided} />

            {!isLongRange && (
              <>
                <KPITile
                  label="Feedback Form Candidates"
                  value={feedbackData?.feedbackFormSent || 0}
                  trend={fbTrends?.feedbackFormSent}
                />
                <KPITile
                  label="Form Submission %"
                  value={feedbackData?.formSubmissionPct || 0}
                  format="percent"
                  trend={fbTrends?.formSubmissionPct}
                />
              </>
            )}
          </>
        );
      }

      case 'sales':
        return (
          <>
            <KPITile label="Total Leads" value={0} />
            <KPITile label="Qualified %" value={0} format="percent" />
            <KPITile label="Won Deals %" value={0} format="percent" />
            <KPITile label="Revenue Booked" value="£0" />
            <KPITile label="Avg Call Duration" value={0} format="duration" />
            <KPITile label="Positive %" value={0} format="percent" />
          </>
        );

      case 'support':
        return (
          <>
            <KPITile label="Total Support Calls" value={0} />
            <KPITile label="FCR %" value={0} format="percent" />
            <KPITile label="SLA Breach %" value={0} format="percent" />
            <KPITile label="Avg Resolution Time" value={0} format="duration" />
            <KPITile label="Escalation %" value={0} format="percent" />
            <KPITile label="Satisfaction Score" value={0} format="score" />
          </>
        );
      case 'enquiry':
        return (
          <>
            <KPITile label="Total Enquiries" value={0} />
            <KPITile label="Info Provided %" value={0} format="percent" />
            <KPITile label="Handoff to Human %" value={0} format="percent" />
            <KPITile label="Avg Duration" value={0} format="duration" />
            <KPITile label="Repeat Query %" value={0} format="percent" />
            <KPITile label="Sentiment %" value={0} format="percent" />
          </>
        );
      case 'house keeping':
      case 'housekeeping':
        // Use housekeeping data from API
        const totalRequests = housekeepingData?.totalRequests || 0;
        const pendingCount = housekeepingData?.pendingCount || 0;
        const completedCount = housekeepingData?.completedCount || 0;
        const inProgressCount = housekeepingData?.inProgressCount || 0;
        const cancelledCount = housekeepingData?.cancelledCount || 0;
        const completionPercentage = housekeepingData?.completionPercentage || 0;
        const satisfactionScore = housekeepingData?.avgSentimentPercentage ? (housekeepingData.avgSentimentPercentage / 20).toFixed(2) : '0.00';

        return (
          <>
            <KPITile label="Total Requests" value={totalRequests} />
            <KPITile label="Pending" value={pendingCount} />
            <KPITile label="In Progress" value={inProgressCount} />
            <KPITile label="Completed" value={completedCount} />
            <KPITile label="Cancelled" value={cancelledCount} />
            <KPITile label="Completion %" value={completionPercentage} format="percent" />
          </>
        );
      case 'reservation':
        // Fallback for reservation when not loading but no data to prevent mock data leak
        return (
          <>
            <KPITile label="Total Calls" value={0} />
            <KPITile label="Avg Sentiment" value={0} format="score" />
            <KPITile label="Total Bookings Captured" value={0} />
            <KPITile label="Total Covers" value={0} />
            <KPITile label="Reservations %" value={0} format="percent" />
            <KPITile label="Avg Time" value={0} format="duration" />
          </>
        );

      default:
        // Show loading skeletons for Summary view
        if (category === 'all' && (isLoadingSummary || isFetchingSummary)) {
          return (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </>
          );
        }

        // Use summary data if available
        if (summaryData) {
          const trends = summaryData.kpiTrends;
          const outcomeData = summaryData.outcomeBarData;

          return (
            <>
              {outcomeData ? (
                <div className="col-span-full">
                  <OutcomeBar
                    data={outcomeData}
                    totalCalls={summaryData.totalCalls}
                    onSegmentClick={(name, ids) => handleReservationOutcomeClick(name, ids)}
                  />
                </div>
              ) : (
                <KPITile label="Total Calls" value={summaryData.totalCalls} trend={trends?.totalCalls} />
              )}
              <KPITile label="Inbound/Outbound" value={`${summaryData.inboundCalls}/${summaryData.outboundCalls}`} />
              <KPITile label="AHT" value={summaryData.aht} format="duration" trend={trends?.aht} />
              <KPITile label="Avg Sentiment" value={summaryData.avgSentimentScore} format="score" trend={trends?.avgSentiment} />
              <KPITile label="Conversion %" value={summaryData.conversionRate} trend={trends?.conversionRate} />
              <KPITile label="Deposit Capture %" value={summaryData.depositCaptureRate} trend={trends?.depositCaptureRate} />
            </>
          );
        }

        // Fallback for Summary when not loading but no data (return zeros instead of mock data)
        if (category === 'all') {
          return (
            <>
              <KPITile label="Total Calls" value={0} />
              <KPITile label="Inbound/Outbound" value="0/0" />
              <KPITile label="AHT" value={0} format="duration" />
              <KPITile label="Avg Sentiment" value={0} format="score" />
              <KPITile label="Conversion %" value={0} format="percent" />
              <KPITile label="Deposit Capture %" value={0} format="percent" />
            </>
          );
        }

        return null;
    }
  };

  const renderCategoryDashboard = () => {
    // House Keeping specific dashboard - Check FIRST before generic category view
    if (category === 'house keeping' || category === 'housekeeping') {
      if (isLoadingHousekeeping) {
        return (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="col-span-12 lg:col-span-6">
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ))}
          </>
        );
      }

      if (!housekeepingData) {
        return (
          <div className="col-span-12">
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">No house keeping data available</p>
            </div>
          </div>
        );
      }

      // Use housekeeping API data
      const totalTasks = housekeepingData.totalRequests || 0;
      const completedToday = housekeepingData.completedCount || 0;
      const pendingTasks = housekeepingData.pendingCount || 0;
      const inProgressTasks = housekeepingData.inProgressCount || 0;
      const completionPercentage = housekeepingData.completionPercentage || 0;

      // Task status distribution data from API - aggregate from completionStatusDistribution
      const statusMap: Record<string, number> = {
        'Pending': 0,
        'In Progress': 0,
        'Completed': 0
      };

      // Aggregate from completionStatusDistribution if available
      if (housekeepingData.completionStatusDistribution && Array.isArray(housekeepingData.completionStatusDistribution)) {
        housekeepingData.completionStatusDistribution.forEach((item: { status: string; count: number }) => {
          const statusKey = item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase();
          // Normalize status names
          let normalizedStatus = 'Pending';
          if (statusKey.toLowerCase().includes('progress') || statusKey.toLowerCase().includes('in progress')) {
            normalizedStatus = 'In Progress';
          } else if (statusKey.toLowerCase().includes('complete') || statusKey.toLowerCase().includes('done')) {
            normalizedStatus = 'Completed';
          } else if (statusKey.toLowerCase().includes('pending') || statusKey.toLowerCase().includes('wait')) {
            normalizedStatus = 'Pending';
          }

          if (statusMap[normalizedStatus] !== undefined) {
            statusMap[normalizedStatus] += item.count || 0;
          }
        });
      } else {
        // Fallback to individual count fields
        statusMap['Pending'] = pendingTasks;
        statusMap['In Progress'] = inProgressTasks;
        statusMap['Completed'] = completedToday;
      }

      const taskStatusData = [
        { name: 'Pending', value: statusMap['Pending'] },
        { name: 'In Progress', value: statusMap['In Progress'] },
        { name: 'Completed', value: statusMap['Completed'] }
      ];

      // Recalculate total from actual status data to ensure accuracy
      const calculatedTotal = taskStatusData.reduce((sum, status) => sum + status.value, 0);
      const displayTotal = calculatedTotal > 0 ? calculatedTotal : totalTasks;

      // Generate workload trend from last7DaysCallCount - always show 7 days
      const dayOrder: { [key: string]: number } = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };

      // Generate dates for last 7 days
      const dates: Date[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date);
      }

      // Get day names for the last 7 days
      const dayNames = dates.map(date =>
        formatDateInTimezone(date, { weekday: 'long' }, DASHBOARD_TIMEZONE),
      );

      // Process API data if available
      const apiDayData: Record<string, number> = {};
      if (housekeepingData.last7DaysCallCount && typeof housekeepingData.last7DaysCallCount === 'object') {
        Object.entries(housekeepingData.last7DaysCallCount).forEach(([day, dayData]) => {
          const total = typeof dayData === 'object' && dayData !== null
            ? Object.values(dayData).reduce((sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0), 0)
            : 0;
          apiDayData[day] = total;
        });
      }

      // Map days to dates - always show 7 days, fill missing with 0
      const workloadTrendData = dayNames.map((dayName, idx) => {
        const date = dates[idx] || new Date();
        const month = formatDateInTimezone(
          date,
          { month: 'short' },
          DASHBOARD_TIMEZONE,
        );
        const day = date.getDate();
        const tasks = apiDayData[dayName] || 0;
        return {
          name: `${month} ${day}`,
          tasks: tasks,
          target: Math.max(1, Math.floor(tasks * 0.8))
        };
      });

      // Prepare all distribution data from API - always return array, even if empty
      const requestTypeData = (housekeepingData.requestTypeDistribution || []).map((item: { requestType: string; count: number }) => ({
        name: item.requestType || 'Unknown',
        value: item.count || 0
      }));

      // Priority Level Distribution - aggregate and normalize
      const priorityMap: Record<string, number> = {};
      if (housekeepingData.priorityLevelDistribution && Array.isArray(housekeepingData.priorityLevelDistribution)) {
        housekeepingData.priorityLevelDistribution.forEach((item: { priority: string; count: number }) => {
          const priorityKey = item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase();
          priorityMap[priorityKey] = (priorityMap[priorityKey] || 0) + (item.count || 0);
        });
      }
      const priorityData = Object.entries(priorityMap).map(([name, value]) => ({ name, value }));

      // Urgency Distribution - aggregate and normalize
      const urgencyMap: Record<string, number> = {};
      if (housekeepingData.urgencyDistribution && Array.isArray(housekeepingData.urgencyDistribution)) {
        housekeepingData.urgencyDistribution.forEach((item: { urgency: string; count: number }) => {
          const urgencyKey = item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1).toLowerCase();
          urgencyMap[urgencyKey] = (urgencyMap[urgencyKey] || 0) + (item.count || 0);
        });
      }
      const urgencyData = Object.entries(urgencyMap).map(([name, value]) => ({ name, value }));

      // Room Wise Stats - always return array
      const roomWiseData = (housekeepingData.roomWiseStats || []).map((item: { roomNumber: string; count: number }) => ({
        name: item.roomNumber || 'Unknown',
        value: item.count || 0
      }));

      // Staff Assignment Stats - always return array
      const staffData = (housekeepingData.staffAssignmentStats || []).map((item: { staff: string; count: number }) => ({
        name: item.staff || 'Unknown',
        value: item.count || 0
      }));

      // Timing Distribution (24-hour timeline) - ensure all 24 hours are present
      const allHours = Array.from({ length: 24 }, (_, i) => {
        const hour = String(i).padStart(2, '0');
        return `${hour}:00`;
      });

      const timingMap: Record<string, number> = {};
      if (housekeepingData.timingDistribution && Array.isArray(housekeepingData.timingDistribution)) {
        housekeepingData.timingDistribution.forEach((item: TimingDistribution) => {
          timingMap[item.label] = item.value || 0;
        });
      }

      // Always show all 24 hours, fill missing with 0
      const timingData = allHours.map(label => ({
        label: label,
        value: timingMap[label] || 0
      }));

      // Top Queries - always return array
      const topQueriesData = (housekeepingData.topQueries || []).slice(0, 5).map((item: TopQuery, idx: number) => ({
        name: (item.query || '').length > 40 ? (item.query || '').substring(0, 40) + '...' : (item.query || ''),
        value: item.count || 0,
        fullQuery: item.query || ''
      }));

      return (
        <>
          {/* Workload Trend & Task Status Distribution - One Row */}
          <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Trend Chart */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                  WORKLOAD TREND
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Cleaning tasks over time
                </p>
              </div>
              {workloadTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={workloadTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 'dataMax + 20']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="tasks"
                      stroke="hsl(var(--foreground))"
                      strokeWidth={2}
                      name="Tasks"
                      dot={{ fill: 'hsl(var(--foreground))', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Target"
                      dot={{ fill: 'hsl(var(--muted-foreground))', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-center">
                  <p className="text-sm text-muted-foreground">Loading workload data...</p>
                </div>
              )}
            </div>

            {/* Task Status Distribution Chart */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                  TASK STATUS DISTRIBUTION
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Current status of cleaning tasks
                </p>
              </div>
              {/* Total Display at Top */}
              <div className="mb-4">
                <div className="text-3xl font-semibold text-foreground">{displayTotal}</div>
                <div className="text-xs text-muted-foreground uppercase">Total</div>
              </div>
              <DonutChartBW
                data={taskStatusData}
                title=""
              />
              <div className="mt-4 space-y-2">
                {taskStatusData.map((status, idx) => {
                  const percentage = displayTotal > 0 ? ((status.value / displayTotal) * 100).toFixed(1) : '0.0';
                  const grays = ['#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333'];
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded"
                          style={{
                            backgroundColor: grays[idx % grays.length]
                          }}
                        />
                        <span className="text-foreground font-medium">{status.name}:</span>
                      </div>
                      <span className="text-muted-foreground">
                        {status.value} tasks ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Request Types & Priority Distribution */}
          <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Types */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                  REQUEST TYPES
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Distribution by request type
                </p>
              </div>
              {requestTypeData.length > 0 ? (
                <div className="space-y-2">
                  {requestTypeData
                    .sort((a, b) => b.value - a.value)
                    .map((item, idx) => {
                      const total = requestTypeData.reduce((sum, d) => sum + d.value, 0);
                      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-card/70 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded bg-muted text-xs font-semibold text-foreground">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{percentage}% of total</p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-4 text-right">
                            <div className="text-lg font-semibold text-foreground">{item.value}</div>
                            <div className="text-xs text-muted-foreground">requests</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No request type data available</p>
                </div>
              )}
            </div>

            {/* Priority Level Distribution */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                  PRIORITY LEVEL DISTRIBUTION
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tasks by priority level
                </p>
              </div>
              {priorityData.length > 0 ? (
                <DonutChartBW
                  data={priorityData}
                  title=""
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-center">
                  <p className="text-sm text-muted-foreground">No priority data available</p>
                </div>
              )}
            </div>
          </div>


          {/* Room Statistics & Top Queries */}
          <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Room Statistics */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                  ROOM STATISTICS
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Requests by room number
                </p>
              </div>
              {roomWiseData.length > 0 ? (
                <div className="space-y-2">
                  {roomWiseData.slice(0, 8).map((room, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                      <span className="text-sm font-medium text-foreground">Room {room.name}</span>
                      <span className="text-sm font-semibold text-muted-foreground">{room.value} requests</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No room data available</p>
                </div>
              )}
            </div>

            {/* Top Queries */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                  TOP QUERIES
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Most common housekeeping requests
                </p>
              </div>
              {topQueriesData.length > 0 ? (
                <div className="space-y-3">
                  {topQueriesData.map((query, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 rounded-lg border border-border bg-background/50">
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{query.fullQuery || query.name}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{query.value}</span>
                        <span className="text-xs text-muted-foreground">requests</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No queries data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Urgency & Timing Distribution */}
          <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgency Distribution */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                  URGENCY DISTRIBUTION
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tasks by urgency level
                </p>
              </div>
              {urgencyData.length > 0 ? (
                <DonutChartBW
                  data={urgencyData}
                  title=""
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-center">
                  <p className="text-sm text-muted-foreground">No urgency data available</p>
                </div>
              )}
            </div>

            {/* Timing Distribution (24-hour) */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                  REQUEST TIMING DISTRIBUTION
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Requests by hour of day
                </p>
              </div>
              {timingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--foreground))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-center">
                  <p className="text-sm text-muted-foreground">No timing data available</p>
                </div>
              )}
            </div>
          </div>
        </>
      );
    }

    // Skip generic view for reservation - it has its own specific layout in the switch statement
    // Use API data for other categories that have data (but not housekeeping - already handled above)
    if (category !== 'all' && category !== 'reservation' && category !== 'house keeping' && category !== 'housekeeping' && reservationKPIs) {
      const categoryLabel = dynamicCategories.categoryLabels[category] || category;

      if (isLoadingReservation) {
        return (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="col-span-12 lg:col-span-6">
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ))}
          </>
        );
      }

      return (
        <>
          {/* Timing Distribution Histogram - Full Width with KPIs */}
          <div className="col-span-12 mb-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                  {categoryLabel} Timing Distribution
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Activity patterns by hour of day
                </p>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg border border-border bg-card/50">
                  <div className="text-xs text-muted-foreground mb-1">Total Calls</div>
                  <div className="text-2xl font-semibold text-foreground">
                    {reservationKPIs.totalCalls}
                  </div>
                </div>
                {reservationKPIs.totalBookingsCaptured !== undefined && (
                  <div className="p-4 rounded-lg border border-border bg-card/50">
                    <div className="text-xs text-muted-foreground mb-1">Total Bookings Captured</div>
                    <div className="text-2xl font-semibold text-foreground">
                      {reservationKPIs.totalBookingsCaptured}
                    </div>
                  </div>
                )}
                {reservationKPIs.avgTime !== undefined && reservationKPIs.avgTime > 0 && (
                  <div className="p-4 rounded-lg border border-border bg-card/50">
                    <div className="text-xs text-muted-foreground mb-1">Avg Time</div>
                    <div className="text-2xl font-semibold text-foreground">
                      {Math.floor(reservationKPIs.avgTime / 60)}:{(reservationKPIs.avgTime % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Breakdown - Calls per Day */}
              {reservationKPIs.heatmapData && typeof reservationKPIs.heatmapData === 'object' && Object.keys(reservationKPIs.heatmapData).length > 0 && (
                <div className="mb-6 p-4 rounded-lg border border-border bg-card/30">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-foreground mb-1">Calls per Day</h4>
                    <p className="text-xs text-muted-foreground">Total calls for each day of the week</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                    {(() => {
                      const dayOrder: { [key: string]: number } = {
                        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                        'Thursday': 4, 'Friday': 5, 'Saturday': 6
                      };

                      const dailyTotals: { day: string; total: number; hours: number }[] = [];

                      Object.entries(reservationKPIs.heatmapData).forEach(([day, dayData]) => {
                        if (dayData && typeof dayData === 'object') {
                          let dayTotal = 0;
                          let activeHours = 0;
                          Object.values(dayData).forEach((count) => {
                            if (typeof count === 'number' && count > 0) {
                              dayTotal += count;
                              activeHours++;
                            }
                          });
                          dailyTotals.push({ day, total: dayTotal, hours: activeHours });
                        }
                      });

                      // Sort by day order
                      dailyTotals.sort((a, b) => (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99));

                      return dailyTotals.map(({ day, total, hours }) => (
                        <div key={day} className="p-3 rounded-lg border border-border bg-card/50">
                          <div className="text-xs text-muted-foreground mb-1">{day}</div>
                          <div className="text-xl font-semibold text-foreground mb-1">{total}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {hours} {hours === 1 ? 'hour' : 'hours'} active
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Histogram Chart */}
              {reservationKPIs.timingDistribution && Array.isArray(reservationKPIs.timingDistribution) && reservationKPIs.timingDistribution.length > 0 && (
                <div className="mt-4">
                  <div className="w-full">
                    {(() => {
                      const values = reservationKPIs.timingDistribution.map(d => d.value);
                      const maxValue = Math.max(...values, 1);
                      const peakHour = reservationKPIs.timingDistribution.find(d => d.value === maxValue);

                      return (
                        <>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <div className="text-muted-foreground">
                              Max Value: <span className="font-semibold text-foreground">{maxValue}</span> calls
                              {peakHour && (
                                <span className="ml-2">at {peakHour.label}</span>
                              )}
                            </div>
                          </div>

                          <ResponsiveContainer width="100%" height={200}>
                            <HistogramChartBW
                              data={reservationKPIs.timingDistribution}
                              title={`${categoryLabel} Timing Distribution`}
                            />
                          </ResponsiveContainer>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Heatmap Card */}
          {reservationKPIs.heatmapData && typeof reservationKPIs.heatmapData === 'object' && Object.keys(reservationKPIs.heatmapData).length > 0 && (
            <div className="col-span-12 lg:col-span-6">
              <HeatmapCard
                data={reservationKPIs.heatmapData}
                direction="inbound"
              />
            </div>
          )}

          {/* Location Chart */}
          {reservationKPIs.locationData && Array.isArray(reservationKPIs.locationData) && reservationKPIs.locationData.length > 0 && (
            <div className="col-span-12 lg:col-span-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                    Location Distribution
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Calls by location
                  </p>
                </div>
                <DonutChartBW
                  data={reservationKPIs.locationData.map(loc => ({ name: loc.location, value: loc.count }))}
                  title=""
                />
              </div>
            </div>
          )}

          {/* Top Queries */}
          {reservationKPIs.topQueriesToday && Array.isArray(reservationKPIs.topQueriesToday) && reservationKPIs.topQueriesToday.length > 0 && (
            <div className="col-span-12 lg:col-span-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
                    Top Queries
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Most common queries for {categoryLabel}
                  </p>
                </div>
                <div className="space-y-2">
                  {reservationKPIs.topQueriesToday.slice(0, 5).map((query, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                      <span className="text-sm text-foreground">{query.query}</span>
                      <span className="text-xs font-semibold text-muted-foreground">{query.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Additional Charts */}
          <>
            <div className="col-span-12 md:col-span-6 lg:col-span-4">
              <AspectBarsBW />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <LeaderboardTableBW category={category} />
            </div>
          </>
        </>
      );
    }

    // Fallback to specific category views or default
    switch (category) {
      case 'reservation':
        if (isLoadingReservation || isFetchingReservation) {
          return (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="col-span-12 lg:col-span-6">
                  <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
              ))}
            </>
          );
        }

        if (!reservationKPIs) {
          return (
            <div className="col-span-12">
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">No reservation data available</p>
              </div>
            </div>
          );
        }

        return (
          <>
            {/* After-Hours & Reservation Breakdown Row (moved up) */}
            {/* After-Hours Reservations Card */}
            {reservationKPIs.afterHoursStats && (() => {
              const ah = reservationKPIs.afterHoursStats;
              const conversionRate = ah.callsAfterHours > 0
                ? ((ah.bookingsDoneAfterHours / ah.callsAfterHours) * 100).toFixed(1)
                : '0.0';

              const breakdownItems: { label: string; count: number; duration?: number; color: string; trackColor: string; outcome: string; callIds?: string[] }[] = [];
              if (ah.breakdown) {
                if (ah.breakdown.secured && ah.breakdown.secured.count > 0) {
                  breakdownItems.push({ label: 'Secured Bookings', count: ah.breakdown.secured.count, duration: ah.breakdown.secured.duration, color: 'bg-emerald-400', trackColor: 'bg-emerald-400/15', outcome: 'After Hours Secured', callIds: ah.breakdown.secured.callIds });
                }
                if (ah.breakdown.largeGroup && ah.breakdown.largeGroup.count > 0) {
                  breakdownItems.push({ label: 'Large Party', count: ah.breakdown.largeGroup.count, duration: ah.breakdown.largeGroup.duration, color: 'bg-sky-400', trackColor: 'bg-sky-400/15', outcome: 'After Hours Large Party', callIds: ah.breakdown.largeGroup.callIds });
                }
                if (ah.breakdown.promotional && ah.breakdown.promotional.count > 0) {
                  breakdownItems.push({ label: 'Promotional', count: ah.breakdown.promotional.count, duration: ah.breakdown.promotional.duration, color: 'bg-amber-400', trackColor: 'bg-amber-400/15', outcome: 'After Hours Promotional', callIds: ah.breakdown.promotional.callIds });
                }
                if (ah.breakdown.table && ah.breakdown.table.count > 0) {
                  breakdownItems.push({ label: 'Appointment', count: ah.breakdown.table.count, duration: ah.breakdown.table.duration, color: 'bg-violet-400', trackColor: 'bg-violet-400/15', outcome: 'After Hours Table', callIds: ah.breakdown.table.callIds });
                }
                if (ah.breakdown.room && ah.breakdown.room.count > 0) {
                  breakdownItems.push({ label: 'Room Booking', count: ah.breakdown.room.count, duration: ah.breakdown.room.duration, color: 'bg-fuchsia-400', trackColor: 'bg-fuchsia-400/15', outcome: 'After Hours Room', callIds: ah.breakdown.room.callIds });
                }
              }
              const totalBreakdown = breakdownItems.reduce((sum, item) => sum + item.count, 0);

              const hasBookings = ah.bookingsDoneAfterHours > 0;

              return (
                <div className="col-span-12 lg:col-span-6 mb-6">
                  <div className="group rounded-2xl border border-border bg-card p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-border/80 card-glow card-shine">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                          {hasBookings ? 'Non-Working Hours Breakdown' : 'Non-Working Hours Activity'}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Activity recorded outside your typical opening times
                        </p>
                      </div>
                      {/* Live pulse indicator */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-500/30 bg-violet-500/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">After Hours</span>
                      </div>
                    </div>

                    {hasBookings ? (
                      <>
                        {/* Expanded layout: Big Total - Calls, Bookings & Covers */}
                        <div className="flex items-end gap-3 mb-5">
                          <button
                            type="button"
                            onClick={() => handleReservationOutcomeClick('Calls After Hours')}
                            className="flex items-baseline gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <span className="text-[46px] leading-none font-bold tracking-tighter text-foreground transition-transform duration-300 group-hover:scale-[1.03]">
                              {ah.callsAfterHours}
                            </span>
                            <span className="text-sm text-muted-foreground">calls</span>
                          </button>
                          <span className="text-lg font-semibold text-muted-foreground">•</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-[32px] leading-none font-bold tracking-tighter text-emerald-400">
                              {ah.bookingsDoneAfterHours}
                            </span>
                            <span className="text-xs text-muted-foreground mb-0.5">bookings</span>
                          </div>
                          <span className="text-lg font-semibold text-muted-foreground">•</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-[32px] leading-none font-bold tracking-tighter text-sky-400">
                              {ah.durationGeneratedAfterHours}
                            </span>
                            <span className="text-xs text-muted-foreground mb-0.5">duration</span>
                          </div>
                        </div>

                        {/* Stacked mini-bar visual */}
                        {breakdownItems.length > 0 && (
                          <div className="flex w-full h-2 rounded-full overflow-hidden mb-5 gap-0.5">
                            {breakdownItems.map((item) => {
                              const pct = totalBreakdown > 0 ? (item.count / totalBreakdown) * 100 : 0;
                              return (
                                <div
                                  key={item.label}
                                  className={`${item.color} rounded-full transition-all duration-500`}
                                  style={{ width: `${Math.max(pct, item.count > 0 ? 3 : 0)}%` }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Individual breakdown rows */}
                        {breakdownItems.length > 0 && (
                          <div className="space-y-3 mb-5">
                            {breakdownItems.map((item) => {
                              const pct = totalBreakdown > 0 ? (item.count / totalBreakdown) * 100 : 0;
                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => handleReservationOutcomeClick(item.outcome, item.callIds)}
                                  className="group/row p-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card hover:border-border/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm w-full text-left cursor-pointer"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                      <span className="text-[13px] font-medium text-muted-foreground group-hover/row:text-foreground transition-colors">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                                      <span className="text-sm font-bold text-foreground tabular-nums">{item.count}</span>
                                      {item.duration !== undefined && (
                                        <>
                                          <span className="text-xs text-muted-foreground">|</span>
                                          <span className="text-sm font-bold text-sky-400 tabular-nums">{item.duration}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {/* Progress bar */}
                                  <div className={`w-full h-1.5 rounded-full ${item.trackColor}`}>
                                    <div
                                      className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Compact layout: Big call count + metric tiles */}
                        <button
                          type="button"
                          onClick={() => handleReservationOutcomeClick('Calls After Hours')}
                          className="flex items-end gap-3 mb-5 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <span className="text-[46px] leading-none font-bold tracking-tighter text-foreground transition-transform duration-300 group-hover:scale-[1.03]">
                            {ah.callsAfterHours}
                          </span>
                          <span className="text-sm text-muted-foreground mb-1.5">calls after hours</span>
                        </button>

                        {/* Metric Cards Row */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {/* Bookings Card */}
                          <div className="group/tile relative p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80">Bookings</span>
                            </div>
                            <span className="text-3xl font-bold text-foreground tabular-nums">{ah.bookingsDoneAfterHours}</span>
                            <p className="text-[11px] text-muted-foreground mt-1">confirmed bookings</p>
                          </div>

                          {/* Covers Card */}
                          <div className="group/tile relative p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-sky-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-sky-400" />
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400/80">Covers</span>
                            </div>
                            <span className="text-3xl font-bold text-foreground tabular-nums">{ah.durationGeneratedAfterHours}</span>
                            <p className="text-[11px] text-muted-foreground mt-1">guests seated</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Conversion Rate Bar */}
                    <div className="p-3 rounded-xl border border-border/40 bg-card/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-medium text-muted-foreground">After-Hours Conversion Rate</span>
                        <span className="text-sm font-bold text-foreground tabular-nums">{conversionRate}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-violet-400/15">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(parseFloat(conversionRate), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {reservationKPIs.reservationSeparation && (() => {
              const sep = reservationKPIs.reservationSeparation;
              // Cleaned up property fallbacks - assuming stabilized API uses .count and .duration
              const sb = sep.securedBookings || { count: 0, duration: 0, callIds: [] };
              const lb = sep.largePartyBookings || sep.largeGroup || { count: 0, duration: 0, callIds: [] };
              const pb = sep.promotionalBookings || sep.promotions || { count: 0, duration: 0, callIds: [] };
              const total = sb.count + lb.count + pb.count;
              const totalCovers = sb.duration + lb.duration + pb.duration;
              const pctSecured = total > 0 ? ((sb.count / total) * 100) : 0;
              const pctLarge = total > 0 ? ((lb.count / total) * 100) : 0;
              const pctPromo = total > 0 ? ((pb.count / total) * 100) : 0;

              const items = [
                { label: 'Secured Bookings', count: sb.count, duration: sb.duration, pct: pctSecured, color: 'bg-emerald-400', trackColor: 'bg-emerald-400/15', outcome: 'Booking Secured', callIds: sb.callIds, agentBreakdown: sb.agentBreakdown },
                { label: 'Large Party Bookings', count: lb.count, duration: lb.duration, pct: pctLarge, color: 'bg-sky-400', trackColor: 'bg-sky-400/15', outcome: 'Large Party Bookings', callIds: lb.callIds, agentBreakdown: lb.agentBreakdown },
                { label: 'Promotional / Offer', count: pb.count, duration: pb.duration, pct: pctPromo, color: 'bg-amber-400', trackColor: 'bg-amber-400/15', outcome: 'Promotional / Offer', callIds: pb.callIds, agentBreakdown: pb.agentBreakdown },
              ];

              return (
                <div className="col-span-12 lg:col-span-6 mb-6">
                  <div className="group rounded-2xl border border-border bg-card p-5 h-full relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-border/80 cursor-default card-glow card-shine">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                          Reservation Breakdown
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Distribution of reservation types with duration
                        </p>
                      </div>
                    </div>

                    {/* Big Total - Bookings & Covers */}
                    <div className="flex items-end gap-3 mb-5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[46px] leading-none font-bold tracking-tighter text-foreground transition-transform duration-300 group-hover:scale-[1.03]">
                          {total}
                        </span>
                        <span className="text-sm text-muted-foreground">bookings</span>
                      </div>
                      <span className="text-lg font-semibold text-muted-foreground">•</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[32px] leading-none font-bold tracking-tighter text-sky-400">
                          {totalCovers}
                        </span>
                        <span className="text-xs text-muted-foreground mb-0.5">duration</span>
                      </div>
                    </div>

                    {/* Stacked mini-bar visual */}
                    <div className="flex w-full h-2 rounded-full overflow-hidden mb-5 gap-0.5">
                      {items.map((item) => (
                        <div
                          key={item.label}
                          className={`${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(item.pct, item.count > 0 ? 3 : 0)}%` }}
                        />
                      ))}
                    </div>

                    {/* Individual breakdowns */}
                    <div className="space-y-3">
                      {items.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleReservationOutcomeClick(item.outcome, item.callIds)}
                          className="group/row p-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card hover:border-border/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm w-full text-left cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${item.color}`} />
                              <span className="text-[13px] font-medium text-muted-foreground group-hover/row:text-foreground transition-colors">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground tabular-nums">{item.pct.toFixed(1)}%</span>
                              <span className="text-sm font-bold text-foreground tabular-nums">{item.count}</span>
                              <span className="text-xs text-muted-foreground">|</span>
                              <span className="text-sm font-bold text-sky-400 tabular-nums">{item.duration}</span>
                            </div>
                          </div>

                          {/* Agent breakdown details */}
                          {item.agentBreakdown && item.agentBreakdown.length > 0 && (
                            <div className="mb-3 pl-4 space-y-1 border-l border-border/40">
                              {item.agentBreakdown.map((agent) => (
                                <div key={agent.name} className="flex justify-between items-center text-[10px]">
                                  <span className="text-muted-foreground transition-colors group-hover/row:text-foreground/70">{agent.name}</span>
                                  <span className="font-bold text-foreground/80 tabular-nums">{agent.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Progress bar */}
                          <div className={`w-full h-1.5 rounded-full ${item.trackColor}`}>
                            <div
                              className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Daily Bookings Breakdown Card */}
            {reservationData?.dailyBookings && (reservationData.dailyBookings.byDateBooked.length > 0 || reservationData.dailyBookings.byVisitDate.length > 0) && (
              <div className="col-span-12 mb-6">
                <div className="rounded-2xl border border-border bg-card p-6 card-glow card-shine relative overflow-hidden">
                  {/* Background accents */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500/[0.07] to-sky-500/[0.07] blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-gradient-to-tr from-violet-500/[0.05] to-fuchsia-500/[0.05] blur-3xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-6 relative">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                        Bookings Breakdown
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {bookingsToggle === 'date_booked' ? 'When bookings were created' : 'When guests are visiting'}
                      </p>
                    </div>
                    <div className="flex items-center rounded-xl border border-border/50 bg-background/50 p-1 backdrop-blur-sm shadow-sm">
                      <button
                        onClick={() => setBookingsToggle('date_booked')}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${bookingsToggle === 'date_booked'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/25'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        Date Booked
                      </button>
                      <button
                        onClick={() => setBookingsToggle('visit_date')}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${bookingsToggle === 'visit_date'
                          ? 'bg-gradient-to-r from-violet-500 to-purple-400 text-white shadow-lg shadow-violet-500/25'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        Visit Date
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const data = bookingsToggle === 'date_booked'
                      ? reservationData.dailyBookings.byDateBooked
                      : reservationData.dailyBookings.byVisitDate;

                    if (!data || data.length === 0) {
                      return (
                        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                          No data available
                        </div>
                      );
                    }

                    // Process data based on toggle mode
                    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const filledData: { date: string; count: number; dayLabel: string; dateLabel: string }[] = (() => {
                      if (bookingsToggle === 'date_booked') {
                        // Aggregate by day of week: Mon–Sun, exactly 7 cards
                        const weekCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon=0 ... Sun=6
                        const weekDates: string[][] = [[], [], [], [], [], [], []]; // collect actual dates per dow
                        data.forEach(d => {
                          const dt = parseTimestampAsUtc(`${d.date}T00:00:00`);
                          // Use locale-independent arithmetic: get YYYY-MM-DD in target timezone,
                          // derive UTC date from that, then use getUTCDay() (Sun=0 → Mon=0..Sun=6).
                          const dateKey = getDateKeyInTimezone(dt, DASHBOARD_TIMEZONE);
                          const utcDate = new Date(`${dateKey}T00:00:00Z`);
                          const dow = (utcDate.getUTCDay() + 6) % 7; // Sun=0 → Mon=0
                          weekCounts[dow] += d.count;
                          if (d.count > 0) {
                            weekDates[dow].push(
                              formatDateInTimezone(
                                dt,
                                { day: 'numeric', month: 'short' },
                                DASHBOARD_TIMEZONE,
                              ),
                            );
                          }
                        });
                        return dayNames.map((name, i) => ({
                          date: name,
                          count: weekCounts[i],
                          dayLabel: name,
                          dateLabel:
                            weekDates[i].length > 1
                              ? `${weekDates[i][0]} - ${weekDates[i][weekDates[i].length - 1]}`
                              : weekDates[i][0] || '',
                        }));
                      } else {
                        // Visit Date: fill gaps chronologically, show actual dates
                        if (data.length <= 1) {
                          return data.map(d => {
                            const dt = parseTimestampAsUtc(`${d.date}T00:00:00`);
                            return {
                              date: d.date,
                              count: d.count,
                              dayLabel: formatDateInTimezone(
                                dt,
                                { weekday: 'short' },
                                DASHBOARD_TIMEZONE,
                              ),
                              dateLabel: formatDateInTimezone(
                                dt,
                                { day: 'numeric', month: 'short' },
                                DASHBOARD_TIMEZONE,
                              ),
                            };
                          });
                        }
                        const dateMap = new Map(data.map(d => [d.date, d.count]));
                        const dates = data.map(d =>
                          parseTimestampAsUtc(`${d.date}T00:00:00`),
                        );
                        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                        const filled: { date: string; count: number; dayLabel: string; dateLabel: string }[] = [];
                        const cur = new Date(minDate);
                        while (cur <= maxDate) {
                          const key = getDateKeyInTimezone(cur, DASHBOARD_TIMEZONE);
                          filled.push({
                            date: key,
                            count: dateMap.get(key) || 0,
                            dayLabel: formatDateInTimezone(
                              cur,
                              { weekday: 'short' },
                              DASHBOARD_TIMEZONE,
                            ),
                            dateLabel: formatDateInTimezone(
                              cur,
                              { day: 'numeric', month: 'short' },
                              DASHBOARD_TIMEZONE,
                            ),
                          });
                          cur.setDate(cur.getDate() + 1);
                        }
                        return filled;
                      }
                    })();

                    const totalCount = filledData.reduce((sum, d) => sum + d.count, 0);
                    const maxCount = Math.max(...filledData.map(d => d.count), 1);

                    const cardThemes = [
                      { gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent', border: 'border-emerald-500/30 hover:border-emerald-400/60', text: 'text-emerald-400', bar: 'from-emerald-500 to-emerald-400', glow: 'bg-emerald-500', shadow: 'hover:shadow-emerald-500/15', badge: 'from-emerald-500 to-emerald-400' },
                      { gradient: 'from-sky-500/20 via-sky-500/5 to-transparent', border: 'border-sky-500/30 hover:border-sky-400/60', text: 'text-sky-400', bar: 'from-sky-500 to-sky-400', glow: 'bg-sky-500', shadow: 'hover:shadow-sky-500/15', badge: 'from-sky-500 to-sky-400' },
                      { gradient: 'from-violet-500/20 via-violet-500/5 to-transparent', border: 'border-violet-500/30 hover:border-violet-400/60', text: 'text-violet-400', bar: 'from-violet-500 to-violet-400', glow: 'bg-violet-500', shadow: 'hover:shadow-violet-500/15', badge: 'from-violet-500 to-violet-400' },
                      { gradient: 'from-amber-500/20 via-amber-500/5 to-transparent', border: 'border-amber-500/30 hover:border-amber-400/60', text: 'text-amber-400', bar: 'from-amber-500 to-amber-400', glow: 'bg-amber-500', shadow: 'hover:shadow-amber-500/15', badge: 'from-amber-500 to-amber-400' },
                      { gradient: 'from-rose-500/20 via-rose-500/5 to-transparent', border: 'border-rose-500/30 hover:border-rose-400/60', text: 'text-rose-400', bar: 'from-rose-500 to-rose-400', glow: 'bg-rose-500', shadow: 'hover:shadow-rose-500/15', badge: 'from-rose-500 to-rose-400' },
                      { gradient: 'from-fuchsia-500/20 via-fuchsia-500/5 to-transparent', border: 'border-fuchsia-500/30 hover:border-fuchsia-400/60', text: 'text-fuchsia-400', bar: 'from-fuchsia-500 to-fuchsia-400', glow: 'bg-fuchsia-500', shadow: 'hover:shadow-fuchsia-500/15', badge: 'from-fuchsia-500 to-fuchsia-400' },
                      { gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent', border: 'border-cyan-500/30 hover:border-cyan-400/60', text: 'text-cyan-400', bar: 'from-cyan-500 to-cyan-400', glow: 'bg-cyan-500', shadow: 'hover:shadow-cyan-500/15', badge: 'from-cyan-500 to-cyan-400' },
                    ];
                    const displayData = bookingsToggle === 'visit_date' ? filledData.filter(d => d.count > 0) : filledData;

                    return (
                      <div className="relative">
                        <div className="flex items-end gap-3 mb-6">
                          <span className="text-[42px] font-bold tracking-tighter text-foreground tabular-nums leading-none">{totalCount}</span>
                          <span className="text-sm text-muted-foreground mb-1.5 font-medium">total bookings</span>
                        </div>

                        {/* Stacked bar summary */}
                        <div className="flex w-full h-2 rounded-full overflow-hidden mb-8 gap-0.5">
                          {filledData.map((item, idx) => {
                            const theme = cardThemes[idx % cardThemes.length];
                            if (item.count === 0) return null;
                            return (
                              <motion.div
                                key={item.date}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max((item.count / (totalCount || 1)) * 100, 2)}%` }}
                                transition={{ duration: 0.6, delay: 0.2 + idx * 0.05 }}
                                className={`rounded-full bg-gradient-to-r ${theme.bar}`}
                              />
                            );
                          })}
                        </div>

                        {/* Chart Summary */}
                        <div className="mb-6 flex items-center justify-between text-[13px]">
                          <div className="text-muted-foreground/80 font-medium tracking-wide">
                            Max Value: <span className="font-extrabold text-foreground tabular-nums">{maxCount}</span> bookings
                            {(() => {
                              const peakItem = filledData.find(d => d.count === maxCount);
                              return peakItem ? (
                                <span className="ml-1.5 opacity-90">
                                  {bookingsToggle === 'date_booked' ? `on ${peakItem.dayLabel}` : `on ${peakItem.dayLabel} ${peakItem.dateLabel}`}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>

                        {/* Vertical Bar Chart Container */}
                        <div className="relative pt-2 pb-2">
                          <div className={`flex items-end ${displayData.length > 14 ? 'gap-1' : displayData.length <= 7 ? 'gap-4' : 'gap-3'} h-72 mb-8 px-1`}>
                            {displayData.map((item, idx) => {
                              const theme = cardThemes[idx % cardThemes.length];
                              const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                              const finalHeight = item.count > 0 ? Math.max(heightPercent, 4) : 0;
                              const isPeak = item.count === maxCount && item.count > 0;
                              const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;

                              return (
                                <div
                                  key={`${bookingsToggle}-${item.date}`}
                                  className={`flex flex-col items-center justify-end h-full group relative ${displayData.length > 14 ? 'min-w-[8px] flex-1' : 'flex-1'}`}
                                >
                                  <div className="relative w-full h-full flex items-end justify-center">
                                    {/* Tooltip Wrapper - Anchored to Bar Top */}
                                    <div
                                      className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center"
                                      style={{ bottom: `${finalHeight}%`, marginBottom: '8px' }}
                                    >
                                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 translate-y-2 group-hover:translate-y-0">
                                        <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl px-3 py-2.5 shadow-2xl shadow-black/50 whitespace-nowrap min-w-[124px]">
                                          <div className="flex items-center gap-2.5 mb-1.5">
                                            <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${theme.bar} shadow-sm shadow-black/20`} />
                                            <span className="text-[13px] font-bold text-foreground tabular-nums">{item.count} Bookings</span>
                                          </div>
                                          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex flex-col gap-0.5">
                                            <span>{pct}% of total period</span>
                                            <span className="text-foreground/70">{item.dayLabel} {item.dateLabel}</span>
                                          </div>
                                        </div>
                                        <div className="mx-auto w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-border/60"></div>
                                      </div>
                                    </div>

                                    {/* The Bar */}
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: `${finalHeight}%`, opacity: 0.8 }}
                                      whileHover={{ opacity: 1, scaleX: 1.02, transition: { duration: 0.2 } }}
                                      transition={{
                                        height: { duration: 0.8, delay: idx * (displayData.length > 14 ? 0.01 : 0.04), ease: [0.34, 1.56, 0.64, 1] },
                                        opacity: { duration: 0.4, delay: idx * (displayData.length > 14 ? 0.01 : 0.04) }
                                      }}
                                      className={`w-full ${displayData.length > 14 ? 'max-w-none' : displayData.length <= 7 ? 'max-w-[110px]' : 'max-w-[56px]'} rounded-t-xl cursor-pointer relative overflow-hidden bg-gradient-to-b ${theme.bar} shadow-2xl ${theme.shadow}`}
                                    >
                                      {isPeak && (
                                        <div className="absolute top-2 left-0 right-0 flex justify-center">
                                          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_white] animate-pulse" />
                                        </div>
                                      )}
                                      <div className="absolute inset-x-0 top-0 h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </motion.div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Labels Row */}
                          <div className={`flex ${displayData.length > 14 ? 'gap-1' : displayData.length <= 6 ? 'gap-6' : 'gap-4'}`}>
                            {displayData.map((item, idx) => {
                              const theme = cardThemes[idx % cardThemes.length];
                              const isPeak = item.count === maxCount && item.count > 0;
                              const isVisitDate = bookingsToggle === 'visit_date';

                              // Refined logic to prevent overlap
                              // Visit Date labels are larger, so we skip more aggressively
                              const skipThreshold = isVisitDate ? 6 : 14;
                              const skipLogic = displayData.length > skipThreshold;
                              const step = Math.ceil(displayData.length / (isVisitDate ? 4 : 8));

                              const showLabel = !skipLogic ||
                                idx === 0 ||
                                idx === displayData.length - 1 ||
                                idx % step === 0 ||
                                isPeak;

                              return (
                                <div
                                  key={`label-${idx}`}
                                  className={cn(
                                    "flex-1 flex flex-col items-center relative",
                                    !skipLogic && (isVisitDate ? "min-w-[60px]" : "min-w-[45px]")
                                  )}
                                >
                                  {showLabel && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.5 + (idx * 0.02) }}
                                      className="text-center whitespace-nowrap px-2"
                                    >
                                      {/* Day Label - Primary for Date Booked, Secondary for Visit Date */}
                                      {!isVisitDate ? (
                                        <div className={`text-[13px] font-black uppercase tracking-[0.08em] mb-1 ${item.count > 0 ? theme.text : 'text-muted-foreground/30'}`}>
                                          {item.dayLabel}
                                        </div>
                                      ) : (
                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">
                                          {item.dayLabel}
                                        </div>
                                      )}

                                      {/* Date Label - Main focus for Visit Date */}
                                      {item.dateLabel && (
                                        <div className={cn(
                                          "tabular-nums whitespace-nowrap",
                                          isVisitDate
                                            ? `text-[15px] font-black tracking-tight ${theme.text}`
                                            : "text-[11px] text-muted-foreground/60 font-bold"
                                        )}>
                                          {item.dateLabel}
                                        </div>
                                      )}

                                      {isPeak && (
                                        <div className={`mt-2 inline-block px-2 py-0.5 rounded-full bg-gradient-to-r ${theme.badge} text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-black/30`}>
                                          Peak
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}



                </div>
              </div>
            )}

            {/* Top Row: Volume Trend & Upsell Performance */}
            <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              {/* Volume Trend Graph */}
              {reservationKPIs.volumeTrend && (
                <div className="col-span-1 lg:col-span-8">
                  <VolumeTrendChart
                    data={reservationKPIs.volumeTrend}
                    comparisonData={(reservationKPIs.volumeComparison?.previousTrend || []).map((d: any) => ({
                      label: d?.date || d?.label || '',
                      value: d?.volume || d?.value || 0
                    }))}
                    title={dateRange === 'today' ? "Calls Per Hour" : "Calls Per Day"}
                    description={`Calls trend for ${dateRangeLabels[dateRange]} (Current Period)`}
                  />
                </div>
              )}

              {/* Upsell Performance Card */}
              {reservationKPIs.upsellStats && (
                <div className="col-span-1 lg:col-span-4">
                  <button
                    type="button"
                    onClick={() => handleReservationOutcomeClick('Successful Upsells', reservationKPIs.upsellStats?.callIds)}
                    className="group rounded-2xl border border-border bg-card p-5 h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-border/80 card-glow card-shine text-left w-full"
                  >
                    <div className="w-full flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                          Upsell Performance
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Extra revenue generated from calls
                        </p>
                      </div>
                    </div>

                    {/* Revenue with gradient accent */}
                    <div className="flex flex-col items-center justify-center flex-grow mb-4 relative">
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 blur-2xl" />
                      </div>
                      <span className="text-[42px] leading-none font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400 transition-transform duration-300 group-hover:scale-[1.03]">
                        £{reservationKPIs.upsellStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="w-full space-y-2">
                      {/* Total Upsells */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                          <span className="text-[13px] font-medium text-foreground">Total Successful Upsells</span>
                        </div>
                        <span className="text-lg font-bold text-emerald-400 tabular-nums">{reservationKPIs.upsellStats.totalUpsells}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {/* Prosecco */}
                        {(reservationKPIs.upsellStats.breakdown?.prosecco ?? 0) > 0 && (
                          <div className="relative p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span className="text-[11px] text-amber-400/80 font-semibold uppercase tracking-wider">Prosecco</span>
                            </div>
                            <span className="text-xl font-bold text-foreground tabular-nums">{reservationKPIs.upsellStats.breakdown?.prosecco}</span>
                          </div>
                        )}
                        {/* Wine */}
                        {(reservationKPIs.upsellStats.breakdown?.wine ?? 0) > 0 && (
                          <div className="relative p-3 rounded-xl border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              <span className="text-[11px] text-rose-400/80 font-semibold uppercase tracking-wider">Wine</span>
                            </div>
                            <span className="text-xl font-bold text-foreground tabular-nums">{reservationKPIs.upsellStats.breakdown?.wine}</span>
                          </div>
                        )}
                        {/* Other */}
                        {(reservationKPIs.upsellStats.breakdown?.other ?? 0) > 0 && (
                          <div className="relative p-3 rounded-xl border border-border/25 bg-muted/5 hover:bg-muted/10 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Other</span>
                            </div>
                            <span className="text-xl font-bold text-foreground tabular-nums">{reservationKPIs.upsellStats.breakdown?.other}</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </button>
                </div>
              )}
            </div>

            {/* Conversion Funnel & Trending Topics Row */}
            <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <FunnelAnalyticsChart
                title="Conversion Funnel"
                description="Guest journey from initial call to confirmed booking"
                data={reservationKPIs.conversionFunnel.map((f: any) => ({
                  stage: f.stage,
                  count: f.count,
                  conversion: f.pct
                }))}
              />
              <TrendingTopics
                topics={!isAnalyticsLoading && analyticsData?.trendingTopics?.length
                  ? analyticsData.trendingTopics.map(t => ({ label: t.label, code: t.code, count: t.count }))
                  : reservationKPIs.trendingTopics}
                description="Top reservation themes and their WoW change"
              />
            </div>

            {/* Top Queries and Top Special Requests Row - Component based with extracted components */}
            <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TopQueries
                queries={!isAnalyticsLoading && analyticsData?.topQueries?.length
                  ? analyticsData.topQueries
                  : (reservationKPIs.topQueriesToday || []).map((q) => ({ code: 'legacy', label: q.query, count: q.count, sampleVerbatim: null }))}
                dateRangeLabel={dateRangeLabels[dateRange] || 'Today'}
              />
              <TopSpecialRequests
                requests={!isAnalyticsLoading && analyticsData?.topSpecialRequests?.length
                  ? analyticsData.topSpecialRequests
                  : (reservationKPIs.topSpecialRequests || []).map((r) => ({ code: 'legacy', label: r.request, count: r.count, category: 'Other', sampleDetail: null }))}
                dateRangeLabel={dateRangeLabels[dateRange] || 'Today'}
              />
            </div>

            {/* Timing Distribution - Premium Redesign */}
            <div className="col-span-12 mb-6">
              <div className="rounded-2xl border border-border bg-card p-6 card-glow card-shine">
                <div className="mb-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Reservation Timing Distribution
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Booking patterns by hour of day
                  </p>
                </div>

                {/* Daily Breakdown Cards */}
                {dateRange === 'today' ? (
                  <div className="mb-6 p-5 rounded-xl border border-border bg-card/30">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Calls For Today</h4>
                    <div className="flex items-center justify-center py-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-foreground mb-1 tabular-nums">
                          {reservationKPIs.totalCalls || 0}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Calls Received</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  reservationKPIs.heatmapData && typeof reservationKPIs.heatmapData === 'object' && Object.keys(reservationKPIs.heatmapData).length > 0 && (
                    <div className="mb-6 p-5 rounded-xl border border-border/60 bg-gradient-to-b from-white/[0.02] to-transparent">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Calls for {dateRangeLabels[dateRange] || 'Selected Range'}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {(() => {
                          const dayOrder: { [key: string]: number } = {
                            'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
                            'Friday': 4, 'Saturday': 5, 'Sunday': 6
                          };
                          const dailyTotals: { day: string; total: number; hours: number }[] = [];
                          Object.entries(reservationKPIs.heatmapData).forEach(([day, dayData]) => {
                            if (dayData && typeof dayData === 'object') {
                              let dayTotal = 0;
                              let activeHours = 0;
                              Object.values(dayData).forEach((count) => {
                                if (typeof count === 'number' && count > 0) {
                                  dayTotal += count;
                                  activeHours++;
                                }
                              });
                              dailyTotals.push({ day, total: dayTotal, hours: activeHours });
                            }
                          });
                          dailyTotals.sort((a, b) => (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99));
                          const dayThemes: { [key: string]: { label: string; border: string; shadow: string } } = {
                            'Monday': { label: 'text-emerald-400', border: 'border-emerald-500/40', shadow: 'shadow-emerald-500/10' },
                            'Tuesday': { label: 'text-sky-400', border: 'border-sky-500/40', shadow: 'shadow-sky-500/10' },
                            'Wednesday': { label: 'text-violet-400', border: 'border-violet-500/40', shadow: 'shadow-violet-500/10' },
                            'Thursday': { label: 'text-amber-400', border: 'border-amber-500/40', shadow: 'shadow-amber-500/10' },
                            'Friday': { label: 'text-rose-400', border: 'border-rose-500/40', shadow: 'shadow-rose-500/10' },
                            'Saturday': { label: 'text-fuchsia-400', border: 'border-fuchsia-500/40', shadow: 'shadow-fuchsia-500/10' },
                            'Sunday': { label: 'text-cyan-400', border: 'border-cyan-500/40', shadow: 'shadow-cyan-500/10' },
                          };
                          return dailyTotals.map(({ day, total, hours }, idx) => {
                            const dt = dayThemes[day] || { label: 'text-muted-foreground', border: 'border-border', shadow: '' };
                            return (
                              <motion.div
                                key={day}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`relative rounded-xl border ${dt.border} bg-gradient-to-b from-white/[0.03] to-transparent p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${dt.shadow} cursor-default`}
                              >
                                <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${dt.label}`}>
                                  {day}
                                </div>
                                <div className="text-3xl font-bold text-foreground tabular-nums leading-none mb-1.5">
                                  {total}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                  {hours} hours active
                                </div>
                              </motion.div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )
                )}

                {/* Histogram Chart */}
                <div>
                  {reservationKPIs.timingDistribution && Array.isArray(reservationKPIs.timingDistribution) && reservationKPIs.timingDistribution.length > 0 ? (
                    <div className="w-full">
                      {(() => {
                        const values = reservationKPIs.timingDistribution.map((d: any) => d.value);
                        const maxValue = Math.max(...values, 1);
                        const peakHour = reservationKPIs.timingDistribution.find((d: any) => d.value === maxValue);
                        return (
                          <>
                            <div className="mb-4">
                              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                                Reservation Time Per Slot
                              </h3>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Max Value: <span className="font-bold text-foreground">{maxValue} reservations</span>
                                {peakHour && <span> at {peakHour.label}</span>}
                              </p>
                            </div>
                            <div className="relative pt-8 pb-2">
                              <div className="flex items-end gap-[3px] h-56">
                                {reservationKPIs.timingDistribution.map((item: any, index: number) => {
                                  const heightPercent = maxValue > 0 && item.value > 0 ? (item.value / maxValue) * 100 : 0;
                                  const finalHeight = item.value > 0 ? Math.max(heightPercent, 3) : 0;
                                  return (
                                    <div
                                      key={`timing-${index}-${item.label}`}
                                      className="flex flex-col items-center justify-end flex-1 min-w-0 h-full group relative"
                                    >
                                      <div className="relative w-full h-full flex items-end justify-center">
                                        {item.value > 0 && (
                                          <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${finalHeight}%` }}
                                            transition={{ duration: 0.5, delay: index * 0.02, ease: 'easeOut' }}
                                            className="w-full rounded-t-sm cursor-pointer transition-opacity hover:opacity-80 bg-cyan-400"
                                            style={{ minHeight: '3px' }}
                                          >
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                                              <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap">
                                                <div className="text-xs font-bold text-foreground tabular-nums">{item.value}</div>
                                                <div className="text-[10px] text-muted-foreground text-center">{item.label}</div>
                                              </div>
                                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-border"></div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex gap-[3px] mt-2">
                                {reservationKPIs.timingDistribution.map((item: any, index: number) => (
                                  <div key={`label-${index}`} className="flex-1 min-w-0 text-center">
                                    <span className="text-[10px] text-muted-foreground tabular-nums">{item.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="w-full text-center text-sm text-muted-foreground py-8">
                      No timing data available
                    </div>
                  )}
                </div>
              </div>
            </div >





          </>
        );

      case 'sales':
        return (
          <>
            <div className="col-span-12 lg:col-span-8">
              <FunnelChartBW
                stages={salesPipeline}
                title="Sales Pipeline"
                description="Lead progression through stages"
              />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <InsightBlockBW
                title="This Week's Highlights"
                insights={[
                  { type: 'positive', text: 'Outbound leads from Campaign B up 22%' },
                  { type: 'positive', text: 'Avg conversion time reduced by 1.3 days' },
                  { type: 'neutral', text: 'Qualified rate holding steady at 56%' }
                ]}
              />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <DonutChartBW
                data={leadSources}
                title="Lead Source Mix"
                description="Where leads are coming from"
              />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <HistogramChartBW
                data={intentScoreDistribution}
                title="Intent Score Distribution"
                description="AI-scored lead quality"
              />
            </div>
            <div className="col-span-12">
              <LeaderboardTableBW category={category} />
            </div>
          </>
        );



      case 'feedback':
        if (isLoadingFeedback) {
          return (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="col-span-12 lg:col-span-6">
                  <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
              ))}
            </>
          );
        }
        return (
          <>
            {/* Feedback Type Chart */}
            <div className="col-span-12 lg:col-span-6">
              <FeedbackTypeChart
                data={feedbackData?.feedbackTypeBreakdown}
                onTypeClick={(type) => handleFeedbackMetricClick(type)}
              />
            </div>

            {/* Rebooking Funnel */}
            <div className="col-span-12 lg:col-span-6">
              <RebookingFunnel
                stats={feedbackData?.rebookingStats}
              />
            </div>

            {/* Feedback Themes (Positive/Negative) */}
            <div className="col-span-12">
              <FeedbackThemes
                positiveThemes={feedbackData?.topPositiveThemes}
                negativeThemes={feedbackData?.topNegativeThemes}
                onThemeClick={handleFeedbackThemeClick}
                onThemeMetricClick={handleFeedbackThemeMetricClick}
              />
            </div>

            {/* Volume Trend Graph - Moved to bottom */}
            <div className="col-span-12 mb-6">
              {feedbackData?.volumeTrend && (
                <VolumeTrendChart
                  data={feedbackData.volumeTrend}
                  title={dateRange === 'today' ? "Hourly Feedback Volume" : "Daily Feedback Volume"}
                  description={`Volume trend for ${getDateRangeLabel(dateRange)}`}
                  color="#34d399"
                />
              )}
            </div>
          </>
        );

      case 'support':
        return (
          <>
            <div className="col-span-12 lg:col-span-6">
              <ForecastCard dateRangeLabel={getDateRangeLabel(dateRange)} />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <DonutChartBW
                data={issueCategories}
                title="Issue Category Distribution"
                description="Breakdown by issue type"
              />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <HeatmapCard direction="inbound" />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <HistogramChartBW
                data={resolutionTimeDistribution}
                title="Resolution Time Distribution"
                description="Time to resolve support cases"
              />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <MiniTableBW
                title="Unresolved Cases (Last 24h)"
                columns={['Issue', 'Age', 'Severity']}
                data={unresolvedCases}
              />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <LeaderboardTableBW category={category} />
            </div>
          </>
        );

      case 'enquiry':
        return (
          <>
            <div className="col-span-12 lg:col-span-6">
              <DonutChartBW
                data={enquiryTopics}
                title="Topic Distribution"
                description="What guests are asking about"
              />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <ForecastCard dateRangeLabel={getDateRangeLabel(dateRange)} />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <HeatmapCard direction="inbound" />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <HistogramChartBW
                data={[
                  { label: '<1m', value: 412 },
                  { label: '1-3m', value: 587 },
                  { label: '3-5m', value: 178 },
                  { label: '>5m', value: 68 }
                ]}
                title="Duration Histogram"
                description="Call length distribution"
              />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <MiniTableBW
                title="Repeat Query Analysis"
                columns={['Topic', 'Calls', 'Info %', 'Sentiment']}
                data={repeatQueries.map(q => ({
                  topic: q.topic,
                  calls: q.calls,
                  'info_%': `${q.info_provided}%`,
                  sentiment: q.sentiment.toFixed(2)
                }))}
              />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <InsightBlockBW
                title="Quick FAQ Gaps"
                insights={[
                  { type: 'alert', text: 'Guests asked about parking 12 times this week' },
                  { type: 'alert', text: 'Private dining room availability queried 8 times' }
                ]}
              />
            </div>
            <div className="col-span-12">
              <LeaderboardTableBW category={category} />
            </div>
          </>
        );

      default:
        if (category === 'all' && (isLoadingSummary || isFetchingSummary)) {
          return (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="col-span-12 lg:col-span-6">
                  <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
              ))}
            </>
          );
        }

        return (
          <>
            {/* Volume Trend Graph - Injected for Summary (All) */}
            <div className="col-span-12 mb-6">
              {summaryData?.volumeTrend && (
                <VolumeTrendChart
                  // Map date/volume (from backend fix) to label/value (expected by component)
                  data={summaryData.volumeTrend.map((d: any) => ({
                    label: d.date || d.label,
                    value: d.volume || d.value
                  }))}
                  comparisonData={(summaryData?.volumeComparison?.previousTrend || []).map((d: any) => ({
                    label: d?.date || d?.label || '',
                    value: d?.volume || d?.value || 0
                  }))}
                  title={dateRange === 'today' ? "Calls Per Hour" : "Calls Per Day"}
                  description={`Calls trend for ${getDateRangeLabel(dateRange)} (Current Period)`}
                />
              )}
            </div>

            {/* Conversion Funnel & Trending Topics for Summary */}
            <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <FunnelAnalyticsChart
                title="General Conversion Funnel"
                description="Overall call-to-booking journey across all categories"
                data={(summaryData?.conversionFunnel || []).map(f => ({
                  stage: f.stage,
                  count: f.count,
                  conversion: f.pct
                }))}
              />
              <TrendingTopics
                topics={summaryData?.trendingTopics || []}
              />
            </div>

            <div className="col-span-12 lg:col-span-6">
              <HeatmapCard direction="inbound" data={summaryData?.heatmapData || {}} />
            </div>
            <div className="col-span-12 lg:col-span-6 space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 h-full card-glow card-shine">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                      Volume & Sentiment Over Time
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{getDateRangeLabel(dateRange)} activity overview</p>
                  </div>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summaryData?.volumeTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} strokeOpacity={0.5} />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.8 }}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.8 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.8 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          fontSize: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey={summaryData ? "volume" : "calls"}
                        stroke="hsl(var(--foreground))"
                        strokeWidth={2.5}
                        dot={{ r: 0, strokeWidth: 2 }}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        name="Calls"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="sentiment"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Sentiment"
                        opacity={0.6}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {summaryData?.leaderboardData && summaryData.leaderboardData.length > 0 && (
              <div className="col-span-12 lg:col-span-4">
                <LeaderboardTableBW category={category} data={summaryData.leaderboardData} />
              </div>
            )}
          </>
        );
    }
  };

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-1 flex-col"
      >
        <DashboardHeader
          category={category}
          onCategoryChange={setCategory}
          categories={dynamicCategories.categories}
          categoryLabels={dynamicCategories.categoryLabels}
          isLoadingCategories={isLoadingInteractions}
          onNotificationClick={() => setNotificationDrawerOpen(true)}
          unreadCount={unreadCount}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          showExport={category === 'reservation' || category === 'feedback'}
          onExportClick={category === 'reservation' ? handleExportReservation : handleExportFeedback}
          isExporting={isExporting}
        />

        {/* Dashboard Grid */}
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-12 gap-6 auto-rows-min"
          >
            {/* KPI Tiles Row */}
            <div className="col-span-12">
              <div className={
                category === 'reservation'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
                  : 'grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4'
              }>
                {renderKPITiles()}
              </div>
            </div>

            {/* Category-specific Dashboard */}
            {renderCategoryDashboard()}
          </motion.div>
        </main>
      </motion.div>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        onMarkAllRead={handleMarkAllRead}
        readNotifications={readNotifications}
        onNotificationRead={handleNotificationRead}
      />
    </AppLayout>
  );
}
