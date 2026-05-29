'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PhoneIncoming, PhoneOutgoing, Search, Filter, Loader2, Download, CalendarIcon, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCallsList } from '@/hooks/use-calls';
import { CallsListParams } from '@/types/calls';
import { callsApi, CallsExportParams } from '@/lib/api/resources';
import { cn } from '@/lib/utils';
import {
  CALL_IDS_URL_THRESHOLD,
  FEEDBACK_METRICS,
  RESERVATION_OUTCOMES,
  normalizeFeedbackMetricFilter,
  normalizeReservationOutcomeFilter,
} from '@/lib/constants';
import {
  DEFAULT_DISPLAY_TIMEZONE,
  formatDateInTimezone,
  formatDateWithFallbackYear,
  getDateKeyInTimezone,
  parseTimestampAsUtc,
} from '@/lib/timezone';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO, isValid } from 'date-fns';

function formatDateBadgeValue(dStr?: string) {
  if (!dStr) return '';
  try {
    const d = parseISO(dStr);
    if (!isValid(d)) return dStr;
    return format(d, 'MMM d, yyyy');
  } catch {
    return dStr;
  }
}

function getDateRangeBadgeText(startDateFilter?: string, endDateFilter?: string) {
  if (startDateFilter && endDateFilter) {
    return `${formatDateBadgeValue(startDateFilter)} to ${formatDateBadgeValue(endDateFilter)}`;
  }
  if (startDateFilter) return `From ${formatDateBadgeValue(startDateFilter)}`;
  if (endDateFilter) return `To ${formatDateBadgeValue(endDateFilter)}`;
  return '';
}

// Skeleton loader component for calls table
function CallsTableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-premium-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-secondary/30 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Call Start Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Caller
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sentiment
              </th>
              {/* <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Confidence
              </th> */}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 10 }).map((_, index) => (
              <tr key={index}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-12" />
                </td>
                <td className="px-4 py-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                {/* <td className="px-4 py-4">
                  <Skeleton className="h-4 w-20" />
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Calls Table Component
function CallsTable({ calls, onCallClick, categoryFilter }: { calls: any[]; onCallClick: (id: string) => void; categoryFilter?: string }) {
  // Check if housekeeping category is selected
  const [unmaskedNumbers, setUnmaskedNumbers] = useState<Record<string, string>>({});
  const [unmaskingLoading, setUnmaskingLoading] = useState<Record<string, boolean>>({});

  const handleToggleUnmask = async (e: React.MouseEvent, callId: string) => {
    e.stopPropagation(); // Prevent row click
    if (unmaskedNumbers[callId]) {
      // If already unmasked, hide it (remove from state)
      const newState = { ...unmaskedNumbers };
      delete newState[callId];
      setUnmaskedNumbers(newState);
      return;
    }

    // Otherwise, fetch it
    setUnmaskingLoading(prev => ({ ...prev, [callId]: true }));
    try {
      const { decryptedNumber } = await callsApi.decryptNumber(callId);
      if (decryptedNumber) {
        setUnmaskedNumbers(prev => ({ ...prev, [callId]: decryptedNumber }));
      } else {
        toast.error('Could not decrypt phone number');
      }
    } catch (error) {
      toast.error('Failed to view phone number');
    } finally {
      setUnmaskingLoading(prev => ({ ...prev, [callId]: false }));
    }
  };

  const formatPhoneNumber = (phoneNumber: string | null | undefined) => {
    if (!phoneNumber) return 'N/A';
    // Remove patterns like "******2+1+", country codes (+91, +44), braces, dashes, and spaces
    return phoneNumber
      .replace(/\*{2,}\d+\+\d+\+/g, '') // Remove patterns like "******2+1+"
      .replace(/\+91\s*/g, '')
      .replace(/\+44\s*/g, '')
      .replace(/[()]/g, '')
      .replace(/-/g, '')
      .replace(/\s+/g, '') // Remove all spaces
      .trim();
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseTimestampAsUtc(dateString);
      if (Number.isNaN(date.getTime())) return 'N/A';
      const now = new Date();

      const todayKey = getDateKeyInTimezone(now);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayKey = getDateKeyInTimezone(yesterday);
      const dateKey = getDateKeyInTimezone(date);
      const isToday = dateKey === todayKey;
      const isYesterday = dateKey === yesterdayKey;

      if (isToday) {
        return formatDateInTimezone(date, {
          hour: '2-digit',
          minute: '2-digit',
        }, DEFAULT_DISPLAY_TIMEZONE);
      } else if (isYesterday) {
        return `Yesterday ${formatDateInTimezone(date, {
          hour: '2-digit',
          minute: '2-digit',
        }, DEFAULT_DISPLAY_TIMEZONE)}`;
      } else {
        return formatDateWithFallbackYear(date, now, DEFAULT_DISPLAY_TIMEZONE);
      }
    } catch {
      return 'N/A';
    }
  };

  const getSentimentLabel = (sentiment: number | string | null | undefined, userSentiment: string | null | undefined) => {
    let label: string = 'N/A';

    // Check if sentiment is already a string label (like "Positive", "Neutral", etc.)
    if (typeof sentiment === 'string' && sentiment !== '') {
      label = sentiment;
    }
    // Use user_sentiment from API if available
    else if (userSentiment && userSentiment !== '') {
      label = userSentiment;
    }
    // Fall back to calculating from numeric score
    else if (sentiment !== null && sentiment !== undefined) {
      const numScore = typeof sentiment === 'string' ? parseFloat(sentiment) : sentiment;
      if (!isNaN(numScore)) {
        // Convert numeric score to label (same logic as AIInsightsCard)
        if (numScore > 0.7) label = 'Positive';
        else if (numScore > 0.3) label = 'Neutral';
        else label = 'Negative';
      }
    }

    // Replace "Unknown" with "N/A"
    return label === 'Unknown' ? 'N/A' : label;
  };

  const getSentimentColor = (sentiment: number | string | null | undefined, userSentiment: string | null | undefined) => {
    const label = getSentimentLabel(sentiment, userSentiment);

    // Use standard Tailwind colors for badges
    if (label === 'Positive') return 'border-green-500/50 text-green-500 bg-green-500/10';
    if (label === 'Negative') return 'border-red-500/50 text-red-500 bg-red-500/10';
    if (label === 'Neutral') return 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10';
    // N/A or Unknown
    return 'border-gray-500/50 text-gray-500 bg-gray-500/10';
  };

  const formatSentiment = (sentiment: number | string | null | undefined, userSentiment: string | null | undefined) => {
    return getSentimentLabel(sentiment, userSentiment);
  };

  const formatConfidence = (confidence: number | null | undefined | string) => {
    if (confidence === null || confidence === undefined || confidence === '') return 0;
    // Convert to number if it's a string
    const numConfidence = typeof confidence === 'string' ? parseFloat(confidence) : confidence;
    if (isNaN(numConfidence)) return 0;
    // If confidence is already a percentage (0-100), return as is, otherwise convert from 0-1 scale
    return numConfidence > 1 ? Math.round(numConfidence) : Math.round(numConfidence * 100);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-premium-sm flex flex-col flex-1 min-h-0">
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full">
          <thead className="border-b border-border bg-secondary/30 sticky top-0 z-10 rounded-t-xl">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground bg-secondary">
                Call Start Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground bg-secondary">
                Caller
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground bg-secondary">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground bg-secondary">
                Sub Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground bg-secondary">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground bg-secondary">
                Sentiment
              </th>
              {/* <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground bg-secondary">
                Confidence
              </th> */}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {calls.map((call) => {
              return (
                <tr
                  key={call.id}
                  onClick={() => onCallClick(call.id)}
                  className="cursor-pointer transition-colors hover:bg-secondary/30"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <PhoneIncoming className="h-4 w-4 text-success" />
                      <span className="text-sm">{formatDate(call.time)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium">{(!call.name || call.name === 'null') ? 'Not Provided' : call.name}</p>
                      {call.display_mobile_number ? (
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {unmaskedNumbers[call.id]
                              ? formatPhoneNumber(unmaskedNumbers[call.id])
                              : formatPhoneNumber(call.display_mobile_number)}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-transparent"
                            onClick={(e) => handleToggleUnmask(e, call.id)}
                            disabled={unmaskingLoading[call.id]}
                          >
                            {unmaskingLoading[call.id] ? (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            ) : unmaskedNumbers[call.id] ? (
                              <EyeOff className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">N/A</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {call.category ? (
                      <Badge variant="outline" className="w-fit text-xs">
                        {call.category}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit text-xs text-muted-foreground border-muted-foreground/30">
                        N/A
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {/* Display Sub Category only */}
                    {call.sub_category ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit text-xs",
                          String(call.sub_category).toLowerCase().includes('cancellation')
                            ? "border-red-500/30 text-red-400 bg-red-500/5"
                            : "border-blue-500/30 text-blue-400 bg-blue-500/5"
                        )}
                      >
                        {call.sub_category}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-mono">
                      {formatDuration(call.duration)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getSentimentColor(call.sentiment, call.user_sentiment))}
                    >
                      {formatSentiment(call.sentiment, call.user_sentiment)}
                    </Badge>
                  </td>
                  {/* <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${formatConfidence(call.confidence || call.asr_confidence)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatConfidence(call.confidence || call.asr_confidence)}%
                      </span>
                    </div>
                  </td> */}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Export Dialog Component
function ExportDialog({
  open,
  onOpenChange,
  availableCategories,
  onExport
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCategories: string[];
  onExport: (params: CallsExportParams) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [category, setCategory] = useState<string>('all');
  const [callDirection, setCallDirection] = useState<string>('all');
  const [callStatus, setCallStatus] = useState<string>('ended');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (startDate > endDate) {
      toast.error('Start date must be before end date');
      return;
    }

    setIsExporting(true);
    try {
      const params: CallsExportParams = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        ...(category && category !== 'all' ? { category } : {}),
        ...(callDirection && callDirection !== 'all' ? { call_direction: callDirection as 'inbound' | 'outbound' } : {}),
        ...(callStatus && callStatus !== 'all' ? { call_status: callStatus } : {}),
      };

      await onExport(params);
      onOpenChange(false);
    } catch (error) {
      // Error is handled in onExport
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Calls</DialogTitle>
          <DialogDescription>
            Select filters to export calls data as CSV
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date *</Label>
            <div className="relative">
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select start date"
                customInput={
                  <Input
                    id="start-date"
                    className="pr-10"
                    readOnly
                  />
                }
                wrapperClassName="w-full"
                calendarClassName="!bg-card !border-border"
                popperClassName="!z-50"
              />
              <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date *</Label>
            <div className="relative">
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select end date"
                minDate={startDate || undefined}
                customInput={
                  <Input
                    id="end-date"
                    className="pr-10"
                    readOnly
                  />
                }
                wrapperClassName="w-full"
                calendarClassName="!bg-card !border-border"
                popperClassName="!z-50"
              />
              <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category || 'all'} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Call Direction */}
          <div className="space-y-2">
            <Label htmlFor="call-direction">Call Direction</Label>
            <Select value={callDirection || 'all'} onValueChange={setCallDirection}>
              <SelectTrigger id="call-direction">
                <SelectValue placeholder="All Directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Call Status */}
          <div className="space-y-2">
            <Label htmlFor="call-status">Call Status</Label>
            <Select value={callStatus} onValueChange={setCallStatus}>
              <SelectTrigger id="call-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !startDate || !endDate}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Header Component
function CallsHeader({
  isLoading,
  isFetching,
  pagination,
  onRefresh,
  onFilterClick,
  onResetFilters,
  hasActiveFilters,
  onExportClick
}: {
  isLoading: boolean;
  isFetching: boolean;
  pagination: any;
  onRefresh: () => void;
  onFilterClick: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  onExportClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-background pb-4 pt-2">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">All Calls</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading ? 'Loading calls...' : pagination ? `${pagination.total} calls found` : 'No calls'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isFetching && !isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Reset Filters
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-2" onClick={onExportClick}>
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
        {/* <Button size="sm" className="gap-2" onClick={onFilterClick}>
          <Filter className="h-4 w-4" />
          Filters
        </Button> */}
      </div>
    </div>
  );
}

// Filters Component
function CallsFilters({
  searchQuery,
  categoryFilter,
  outcomeFilter,
  feedbackMetricFilter,
  directionFilter,
  startDateFilter,
  endDateFilter,
  sortBy,
  sortOrder,
  availableCategories,
  onSearchChange,
  onCategoryChange,
  onOutcomeChange,
  onFeedbackMetricChange,
  onDirectionChange,
  onSortByChange,
  onSortOrderChange,
  onClearDateRange,
}: {
  searchQuery: string;
  categoryFilter: string;
  outcomeFilter: string;
  feedbackMetricFilter: string;
  directionFilter: string;
  startDateFilter?: string;
  endDateFilter?: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  availableCategories: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onOutcomeChange: (value: string) => void;
  onFeedbackMetricChange: (value: string) => void;
  onDirectionChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortOrderChange: (value: 'ASC' | 'DESC') => void;
  onClearDateRange: () => void;
}) {
  const dateRangeBadgeText = getDateRangeBadgeText(startDateFilter, endDateFilter);
  return (
    <div className="flex gap-4 items-center bg-background pb-4 flex-wrap">
      {/* Date Range Badge (if active from URL) */}
      {(startDateFilter || endDateFilter) && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary cursor-default">
          <CalendarIcon className="h-3 w-3" />
          <span>{dateRangeBadgeText}</span>
          <button
            type="button"
            onClick={onClearDateRange}
            className="ml-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-primary/20"
            aria-label="Clear date range filter"
            title="Clear date filter"
          >
            Clear
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search calls by number, site, or category..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 pl-10"
        />
      </div>

      {/* Category Filter */}
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm min-w-[140px]"
      >
        <option value="">All Categories</option>
        {availableCategories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      {/* Reservation Outcome Filter - Only visible when category is Reservation */}
      {categoryFilter === 'Reservation' && (
        <select
          value={outcomeFilter}
          onChange={(e) => onOutcomeChange(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm min-w-[180px]"
        >
          <option value="">All Reservation Outcomes</option>
          {RESERVATION_OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome}>
              {outcome}
            </option>
          ))}
        </select>
      )}

      {/* Feedback Metric Filter - Only visible when category is Feedback */}
      {categoryFilter === 'Feedback' && (
        <select
          value={feedbackMetricFilter}
          onChange={(e) => onFeedbackMetricChange(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm min-w-[220px]"
        >
          <option value="">All Feedback Metrics</option>
          {FEEDBACK_METRICS.map((metric) => (
            <option key={metric} value={metric}>
              {metric}
            </option>
          ))}
        </select>
      )}

      {/* Direction Filter */}
      <select
        value={directionFilter}
        onChange={(e) => onDirectionChange(e.target.value)}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm min-w-[140px]"
      >
        <option value="">All Directions</option>
        <option value="inbound">Inbound</option>
        <option value="outbound">Outbound</option>
      </select>

      {/* Sort By */}
      <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
      <select
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm min-w-[160px]"
      >
        <option value="call_start_time">Call Date</option>
        {/* <option value="duration">Duration</option>
        <option value="sentiment">Sentiment</option> */}
      </select>

      {/* Sort Order */}
      <select
        value={sortOrder}
        onChange={(e) => onSortOrderChange(e.target.value as 'ASC' | 'DESC')}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm min-w-[120px]"
      >
        <option value="DESC">Descending</option>
        <option value="ASC">Ascending</option>
      </select>
    </div>
  );
}


const parseCallIdsParam = (value: string | null): number[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
};

export default function CallsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(() => searchParams.get('category') || '');
  const [outcomeFilter, setOutcomeFilter] = useState<string>(() => searchParams.get('outcome') || '');
  const [feedbackMetricFilter, setFeedbackMetricFilter] = useState<string>(() => searchParams.get('feedback_metric') || '');
  const [feedbackThemeFilter, setFeedbackThemeFilter] = useState<string>(() => searchParams.get('feedback_theme') || '');
  const [feedbackThemeKindFilter, setFeedbackThemeKindFilter] = useState<string>(() => searchParams.get('feedback_theme_kind') || '');
  const [startDateFilter, setStartDateFilter] = useState<string>(() => searchParams.get('startDate') || '');
  const [endDateFilter, setEndDateFilter] = useState<string>(() => searchParams.get('endDate') || '');
  const [directionFilter, setDirectionFilter] = useState<string>(() => searchParams.get('call_direction') || searchParams.get('direction') || '');
  const [callIdsFilter, setCallIdsFilter] = useState<number[]>(() => parseCallIdsParam(searchParams.get('call_ids')));
  const [sortBy, setSortBy] = useState<string>(() => searchParams.get('sort_by') || 'call_start_time');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(() => (searchParams.get('sort_order') as 'ASC' | 'DESC') || 'DESC');
  const [drilldownId, setDrilldownId] = useState<string | null>(() => searchParams.get('drilldown_id'));
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Recovery logic for large drill-down ID sets via sessionStorage.
  // Only process once per drilldown_id to survive back/forward navigation.
  const processedDrilldownRef = useRef<string | null>(null);
  useEffect(() => {
    const urlDrilldownId = searchParams.get('drilldown_id');
    if (urlDrilldownId && processedDrilldownRef.current !== urlDrilldownId) {
      try {
        const storedIds = sessionStorage.getItem(`drilldown_${urlDrilldownId}`);
        if (storedIds) {
          const parsedIds = JSON.parse(storedIds);
          if (Array.isArray(parsedIds) && parsedIds.length > 0) {
            setCallIdsFilter(parsedIds.map(id => Number(id)));
            setDrilldownId(urlDrilldownId);
            processedDrilldownRef.current = urlDrilldownId;
            return; // success — nothing else to do
          }
        }
      } catch (e) {
        console.error('Failed to parse drilldown IDs from sessionStorage', e);
      }
      // sessionStorage miss (cleared in incognito / stale bookmark): strip the ID so
      // the user sees the unfiltered list instead of a permanently broken URL.
      setDrilldownId(null);
      processedDrilldownRef.current = urlDrilldownId; // prevent re-triggering
      const params = new URLSearchParams(searchParams.toString());
      params.delete('drilldown_id');
      const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchParams]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (categoryFilter) params.set('category', categoryFilter);
    if (outcomeFilter) params.set('outcome', outcomeFilter);
    if (feedbackMetricFilter) params.set('feedback_metric', feedbackMetricFilter);
    if (feedbackThemeFilter) params.set('feedback_theme', feedbackThemeFilter);
    if (feedbackThemeKindFilter) params.set('feedback_theme_kind', feedbackThemeKindFilter);
    if (startDateFilter) params.set('startDate', startDateFilter);
    if (endDateFilter) params.set('endDate', endDateFilter);
    if (directionFilter) params.set('call_direction', directionFilter);
    
    // Sync call IDs or drilldown ID to URL
    if (callIdsFilter.length > 0) {
      if (callIdsFilter.length <= CALL_IDS_URL_THRESHOLD) {
        params.set('call_ids', callIdsFilter.join(','));
      } else if (drilldownId) {
        params.set('drilldown_id', drilldownId);
      }
    } else if (drilldownId) {
      // If we have a drilldownId but IDs aren't loaded yet, preserve the ID in URL
      params.set('drilldown_id', drilldownId);
    }
    if (sortBy !== 'call_start_time') params.set('sort_by', sortBy);
    if (sortOrder !== 'DESC') params.set('sort_order', sortOrder);

    const queryString = params.toString();
    const currentQueryString = searchParams.toString();

    // Only update if state actually differs from URL to prevent accidental resets on mount
    if (queryString !== currentQueryString) {
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
    // pathname, router, and searchParams are stable references in Next.js, and including them
    // would cause unnecessary effect re-runs when only their internal state has changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, categoryFilter, outcomeFilter, feedbackMetricFilter, feedbackThemeFilter, feedbackThemeKindFilter, startDateFilter, endDateFilter, directionFilter, callIdsFilter, drilldownId, sortBy, sortOrder]);

  // Sync URL to state (for browser back/forward and initial mount)
  useEffect(() => {
    const urlPage = Number(searchParams.get('page')) || 1;
    const urlSearch = searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || '';
    const urlOutcome = searchParams.get('outcome') || '';
    const urlFeedbackMetric = searchParams.get('feedback_metric') || '';
    const urlFeedbackTheme = searchParams.get('feedback_theme') || '';
    const urlFeedbackThemeKind = searchParams.get('feedback_theme_kind') || '';
    const urlStartDate = searchParams.get('startDate') || '';
    const urlEndDate = searchParams.get('endDate') || '';
    const urlDirection = searchParams.get('call_direction') || searchParams.get('direction') || '';
    const urlCallIds = parseCallIdsParam(searchParams.get('call_ids'));
    const urlDrilldownId = searchParams.get('drilldown_id');
    const urlSortBy = searchParams.get('sort_by') || 'call_start_time';
    const urlSortOrder = (searchParams.get('sort_order') as 'ASC' | 'DESC') || 'DESC';

    if (page !== urlPage) setPage(urlPage);
    if (searchQuery !== urlSearch) setSearchQuery(urlSearch);
    if (categoryFilter !== urlCategory) setCategoryFilter(urlCategory);
    if (outcomeFilter !== urlOutcome) setOutcomeFilter(urlOutcome);
    if (feedbackMetricFilter !== urlFeedbackMetric) setFeedbackMetricFilter(urlFeedbackMetric);
    if (feedbackThemeFilter !== urlFeedbackTheme) setFeedbackThemeFilter(urlFeedbackTheme);
    if (feedbackThemeKindFilter !== urlFeedbackThemeKind) setFeedbackThemeKindFilter(urlFeedbackThemeKind);
    if (startDateFilter !== urlStartDate) setStartDateFilter(urlStartDate);
    if (endDateFilter !== urlEndDate) setEndDateFilter(urlEndDate);
    if (directionFilter !== urlDirection) setDirectionFilter(urlDirection);
    
    // Only sync callIdsFilter from URL if call_ids is present OR we're not in a drilldown
    // This prevents clearing IDs loaded from sessionStorage when drilldown_id is active
    const shouldSyncCallIds = searchParams.has('call_ids') || !urlDrilldownId;
    if (shouldSyncCallIds && callIdsFilter.join(',') !== urlCallIds.join(',')) {
      setCallIdsFilter(urlCallIds);
    }
    
    if (drilldownId !== urlDrilldownId) setDrilldownId(urlDrilldownId);
    if (sortBy !== urlSortBy) setSortBy(urlSortBy);
    if (sortOrder !== urlSortOrder) setSortOrder(urlSortOrder);
  }, [searchParams]);

  // Build query params - ensure all params are included for proper query key generation
  const queryParams: CallsListParams = useMemo(() => {
    const params: CallsListParams = {
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    };

    // Add search if provided
    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }

    // Add category filter if provided (empty string means "all", so don't send it)
    if (categoryFilter && categoryFilter.trim() !== '') {
      const filterValue = categoryFilter.trim();
      if (filterValue.includes(' - ')) {
        const [cat, sub] = filterValue.split(' - ');
        params.category = cat;

        // Special handling for Reservation types vs Sub-categories
        // If category is Reservation, assume the second part is reservation_type
        if (cat === 'Reservation') {
          params.reservation_type = sub;
        } else {
          params.sub_category = sub;
        }
      } else {
        params.category = filterValue;
      }
    }

    if (outcomeFilter && outcomeFilter.trim() !== '') {
      params.outcome = outcomeFilter.trim();
    }
    if (feedbackMetricFilter && feedbackMetricFilter.trim() !== '') {
      params.feedback_metric = feedbackMetricFilter.trim();
    }
    if (feedbackThemeFilter && feedbackThemeFilter.trim() !== '') {
      params.feedback_theme = feedbackThemeFilter.trim();
      if (
        feedbackThemeKindFilter === 'positive' ||
        feedbackThemeKindFilter === 'negative'
      ) {
        params.feedback_theme_kind = feedbackThemeKindFilter as
          | 'positive'
          | 'negative';
      }
    }

    if (startDateFilter && startDateFilter.trim() !== '') {
      params.startDate = startDateFilter.trim();
    }
    if (endDateFilter && endDateFilter.trim() !== '') {
      params.endDate = endDateFilter.trim();
    }

    // Add direction filter if provided
    if (directionFilter && directionFilter.trim() !== '' && directionFilter !== 'All Directions') {
      if (directionFilter === 'inbound' || directionFilter === 'outbound') {
        params.call_direction = directionFilter as 'inbound' | 'outbound';
        params.direction = directionFilter as 'inbound' | 'outbound';
      }
    }

    if (callIdsFilter.length > 0) {
      params.call_ids = callIdsFilter;
    }

    return params;
  }, [page, limit, searchQuery, categoryFilter, outcomeFilter, feedbackMetricFilter, feedbackThemeFilter, feedbackThemeKindFilter, startDateFilter, endDateFilter, directionFilter, callIdsFilter, sortBy, sortOrder]);

  const { data: calls, pagination, isLoading, isFetching, isError, error, refetch } = useCallsList(queryParams);

  // Fetch all calls without category filter to get all available categories
  // This fetches a larger set to extract all unique categories from the table
  const categoryFetchParams: CallsListParams = useMemo(() => ({
    page: 1,
    limit: 100, // Fetch enough to get most categories
    sort_by: 'call_start_time',
    sort_order: 'DESC',
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
    ...(directionFilter && directionFilter.trim() !== '' && directionFilter !== 'All Directions'
      ? { call_direction: directionFilter as 'inbound' | 'outbound', direction: directionFilter as 'inbound' | 'outbound' }
      : {}),
    // Don't include category filter so we get all categories
  }), [searchQuery, directionFilter]);

  const { data: allCallsData } = useCallsList(categoryFetchParams);

  // Extract unique categories from calls data
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();

    // Add categories from current calls
    if (calls) {
      calls.forEach((call) => {
        if (call.category && call.category.trim() !== '') {
          categories.add(call.category.trim());
        }
      });
    }

    // Add categories from all calls data (to get complete list of categories from table)
    if (allCallsData) {
      allCallsData.forEach((call) => {
        if (call.category && call.category.trim() !== '') {
          categories.add(call.category.trim());
        }
      });
    }

    // Sort categories alphabetically
    const sortedCategories = Array.from(categories).sort();

    // Ensure currently selected filter is ALWAYS in the options to prevent reset
    if (categoryFilter && !sortedCategories.includes(categoryFilter)) {
      sortedCategories.unshift(categoryFilter);
    }

    return sortedCategories;
  }, [calls, allCallsData, categoryFilter]);

  // Show error toast if there's an error (useEffect to avoid render-time side effects)
  useEffect(() => {
    if (isError && error) {
      toast.error(error.message || 'Failed to load calls');
    }
  }, [isError, error]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page on new search
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    if (value !== 'Reservation' && outcomeFilter) {
      setOutcomeFilter('');
    }
    if (value !== 'Feedback' && feedbackMetricFilter) {
      setFeedbackMetricFilter('');
    }
    if (value !== 'Feedback' && feedbackThemeFilter) {
      setFeedbackThemeFilter('');
      setFeedbackThemeKindFilter('');
    }
    setPage(1); // Reset to first page on filter change
  };

  const handleDirectionChange = (value: string) => {
    setDirectionFilter(value as 'inbound' | 'outbound' | '');
    setPage(1); // Reset to first page on filter change
  };

  const handleOutcomeChange = (value: string) => {
    setOutcomeFilter(normalizeReservationOutcomeFilter(value));
    if (value) {
      setCategoryFilter('Reservation');
      if (feedbackMetricFilter) setFeedbackMetricFilter('');
    }
    setPage(1);
  };

  const handleFeedbackMetricChange = (value: string) => {
    setFeedbackMetricFilter(normalizeFeedbackMetricFilter(value));
    if (value) {
      setCategoryFilter('Feedback');
      if (outcomeFilter) setOutcomeFilter('');
      if (feedbackThemeFilter) {
        setFeedbackThemeFilter('');
        setFeedbackThemeKindFilter('');
      }
    }
    setPage(1);
  };

  const handleSortByChange = (value: string) => {
    setSortBy(value);
    setPage(1); // Reset to first page on sort change
  };

  const handleSortOrderChange = (value: 'ASC' | 'DESC') => {
    setSortOrder(value);
    setPage(1); // Reset to first page on sort change
  };

  const handleCallClick = (id: string) => {
    router.push(`/calls/${id}`);
  };

  const handleFilterClick = () => {
    // TODO: Implement filter modal/drawer
    toast('Filter options coming soon', { icon: 'ℹ️' });
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setOutcomeFilter('');
    setFeedbackMetricFilter('');
    setFeedbackThemeFilter('');
    setFeedbackThemeKindFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setDirectionFilter('');
    setCallIdsFilter([]);
    setDrilldownId(null);
    setSortBy('call_start_time');
    setSortOrder('DESC');
    setPage(1);

    // Also clear any drilldown state from URL
    if (searchParams.get('drilldown_id')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('drilldown_id');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const handleClearDateRange = () => {
    setStartDateFilter('');
    setEndDateFilter('');
    setPage(1);
  };

  // Handle export
  const handleExport = async (params: CallsExportParams) => {
    try {
      const blob = await callsApi.exportCsv(params);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename with date range
      const filename = `calls_export_${params.startDate}_to_${params.endDate}.csv`;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Calls exported successfully!');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to export calls';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      searchQuery.trim() ||
      categoryFilter.trim() ||
      outcomeFilter.trim() ||
      feedbackMetricFilter.trim() ||
      startDateFilter.trim() ||
      endDateFilter.trim() ||
      directionFilter.trim() ||
      sortBy !== 'call_start_time' ||
      sortOrder !== 'DESC'
    );
  }, [searchQuery, categoryFilter, outcomeFilter, feedbackMetricFilter, feedbackThemeFilter, feedbackThemeKindFilter, startDateFilter, endDateFilter, directionFilter, sortBy, sortOrder]);

  return (
    <div className="flex flex-col min-h-0 p-6">
      <div className="flex flex-col min-h-0 space-y-4 animate-fade-in">
        {/* Sticky Header */}
        <CallsHeader
          isLoading={isLoading}
          isFetching={isFetching}
          pagination={pagination}
          onRefresh={() => refetch()}
          onFilterClick={handleFilterClick}
          onResetFilters={handleClearAllFilters}
          hasActiveFilters={hasActiveFilters}
          onExportClick={() => setExportDialogOpen(true)}
        />

        {/* Export Dialog */}
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          availableCategories={availableCategories}
          onExport={handleExport}
        />

        {/* Sticky Filters */}
        <CallsFilters
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          outcomeFilter={outcomeFilter}
          feedbackMetricFilter={feedbackMetricFilter}
          directionFilter={directionFilter}
          startDateFilter={startDateFilter}
          endDateFilter={endDateFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          availableCategories={availableCategories}
          onSearchChange={handleSearch}
          onCategoryChange={handleCategoryChange}
          onOutcomeChange={handleOutcomeChange}
          onFeedbackMetricChange={handleFeedbackMetricChange}
          onDirectionChange={handleDirectionChange}
          onSortByChange={handleSortByChange}
          onSortOrderChange={handleSortOrderChange}
          onClearDateRange={handleClearDateRange}
        />

        {/* Content Area - Scrollable Table */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Initial Loading - Show Skeleton */}
          {isLoading && <CallsTableSkeleton />}

          {/* Error State */}
          {isError && !isLoading && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="text-sm text-destructive">
                {error?.message || 'Failed to load calls. Please try again.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Calls Table with Scroll */}
          {!isLoading && calls && calls.length > 0 && (
            <>
              <CallsTable calls={calls} onCallClick={handleCallClick} categoryFilter={categoryFilter} />

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4 flex-shrink-0">
                  <PaginationControls
                    pagination={pagination}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!isLoading && !isError && calls && calls.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-12 text-center flex-1 flex items-center justify-center">
              <div>
                <p className="text-sm text-muted-foreground">No calls found</p>
                {searchQuery || categoryFilter || outcomeFilter || feedbackMetricFilter || feedbackThemeFilter || directionFilter ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('');
                      setOutcomeFilter('');
                      setFeedbackMetricFilter('');
                      setFeedbackThemeFilter('');
                      setFeedbackThemeKindFilter('');
                      setStartDateFilter('');
                      setEndDateFilter('');
                      setDirectionFilter('');
                      setPage(1);
                    }}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
