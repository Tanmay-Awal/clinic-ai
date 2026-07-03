'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Loader2, AlertTriangle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ActionStatusBadge } from './ActionStatusBadge';
import { ActionPriorityBadge } from './ActionPriorityBadge';
import { useActionsList, useUpdateAction, useActionHotels } from '@/hooks/use-actions';
import { actionsApi } from '@/lib/api/actions';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import toast from 'react-hot-toast';
import type {
    ActionListRequest,
    ActionStatus,
    ActionPriority,
    ActionRequestType,
} from '@/types/actions';
import {
    ACTION_REQUEST_TYPE_LABELS,
    ACTION_STATUS_LABELS,
} from '@/types/actions';
import {
    DEFAULT_DISPLAY_TIMEZONE,
    formatDateInTimezone,
    getDateKeyInTimezone,
    parseTimestampAsUtc,
} from '@/lib/timezone';

// ── Skeleton ──

function ActionTableSkeleton() {
    return (
        <>
            {/* Mobile Skeleton */}
            <div className="space-y-3 md:hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-24" />
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full rounded-md mt-2 opacity-30" />
                    </div>
                ))}
            </div>

            {/* Desktop Skeleton */}
            <div className="hidden md:block rounded-xl border border-border bg-card shadow-premium-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-border bg-secondary/30">
                            <tr>
                                {['Created', 'Guest', 'Phone', 'Issue Type', 'Priority', 'Status', 'Due', 'Comments'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-4"><Skeleton className="h-4 w-16" /></td>
                                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                                    <td className="px-4 py-4"><Skeleton className="h-5 w-24 rounded-full" /></td>
                                    <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                    <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

// ── Filters ──

interface ActionFiltersProps {
    searchQuery: string;
    statusFilter: string;
    typeFilter: string;
    priorityFilter: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    channelFilter: string;
    showChannelFilter: boolean;
    showHotelFilter: boolean;
    hotelFilter: string;
    hotelOptions: string[];
    onSearchChange: (v: string) => void;
    onStatusChange: (v: string) => void;
    onTypeChange: (v: string) => void;
    onPriorityChange: (v: string) => void;
    onSortByChange: (v: string) => void;
    onSortOrderChange: (v: 'asc' | 'desc') => void;
    onChannelChange: (v: string) => void;
    onHotelChange: (v: string) => void;
}

function ActionFilters(props: ActionFiltersProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by guest name or phone..."
                    value={props.searchQuery}
                    onChange={(e) => props.onSearchChange(e.target.value)}
                    className="h-10 pl-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary/40 focus:shadow-[0_0_10px_rgba(var(--primary),0.1)] transition-all"
                />
            </div>

            {/* Filter dropdowns - grid on mobile, inline on desktop */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
                {/* Channel segmented toggle — only visible when whatsapp is enabled */}
                {props.showChannelFilter && (
                    <ToggleGroup
                        type="single"
                        value={props.channelFilter || 'all'}
                        onValueChange={(v) => { if (v) props.onChannelChange(v === 'all' ? '' : v); }}
                        className="col-span-2 sm:col-span-1 h-9 sm:h-10 rounded-lg border border-border bg-background p-0.5 gap-0"
                    >
                        <ToggleGroupItem value="all" className="h-full flex-1 sm:flex-none sm:px-3 rounded-md text-xs sm:text-sm font-normal data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">All</ToggleGroupItem>
                        <ToggleGroupItem value="voice" className="h-full flex-1 sm:flex-none sm:px-3 rounded-md text-xs sm:text-sm font-normal data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Voice</ToggleGroupItem>
                        <ToggleGroupItem value="whatsapp" className="h-full flex-1 sm:flex-none sm:px-3 rounded-md text-xs sm:text-sm font-normal data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">WhatsApp</ToggleGroupItem>
                    </ToggleGroup>
                )}

                {/* Hotel Filter */}
                {props.showHotelFilter && (
                    <Select
                        value={props.hotelFilter || 'all'}
                        onValueChange={(v) => props.onHotelChange(v === 'all' ? '' : v)}
                    >
                        <SelectTrigger className="h-9 sm:h-10 sm:w-[160px] bg-background border-border rounded-lg text-xs sm:text-sm">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {props.hotelOptions.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Status */}
                <Select
                    value={props.statusFilter || 'all'}
                    onValueChange={(v) => props.onStatusChange(v === 'all' ? '' : v)}
                >
                    <SelectTrigger className="h-9 sm:h-10 sm:w-[140px] bg-background border-border rounded-lg text-xs sm:text-sm">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {(Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{ACTION_STATUS_LABELS[s]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Type */}
                <Select
                    value={props.typeFilter || 'all'}
                    onValueChange={(v) => props.onTypeChange(v === 'all' ? '' : v)}
                >
                    <SelectTrigger className="h-9 sm:h-10 sm:w-[140px] bg-background border-border rounded-lg text-xs sm:text-sm">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {(Object.keys(ACTION_REQUEST_TYPE_LABELS) as ActionRequestType[]).map((t) => (
                            <SelectItem key={t} value={t}>{ACTION_REQUEST_TYPE_LABELS[t]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Priority */}
                <Select
                    value={props.priorityFilter || 'all'}
                    onValueChange={(v) => props.onPriorityChange(v === 'all' ? '' : v)}
                >
                    <SelectTrigger className="h-9 sm:h-10 sm:w-[120px] bg-background border-border rounded-lg text-xs sm:text-sm">
                        <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>

                {/* Sort */}
                <span className="hidden sm:inline text-sm text-muted-foreground whitespace-nowrap">Sort:</span>
                <Select
                    value={props.sortBy}
                    onValueChange={(v) => props.onSortByChange(v)}
                >
                    <SelectTrigger className="h-9 sm:h-10 sm:w-[120px] bg-background border-border rounded-lg text-xs sm:text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="due_at">Due Date</SelectItem>
                        <SelectItem value="created_at">Created</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={props.sortOrder}
                    onValueChange={(v) => props.onSortOrderChange(v as 'asc' | 'desc')}
                >
                    <SelectTrigger className="h-9 sm:h-10 sm:w-[120px] bg-background border-border rounded-lg text-xs sm:text-sm col-span-2 sm:col-span-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

// ── Helpers ──

function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A';
    try {
        const date = parseTimestampAsUtc(dateString);
        const now = new Date();
        const isToday = getDateKeyInTimezone(date) === getDateKeyInTimezone(now);
        if (isToday) {
            return formatDateInTimezone(date, { hour: '2-digit', minute: '2-digit' }, DEFAULT_DISPLAY_TIMEZONE);
        }
        return formatDateInTimezone(date, { month: 'short', day: 'numeric' }, DEFAULT_DISPLAY_TIMEZONE) +
            ' ' + formatDateInTimezone(date, { hour: '2-digit', minute: '2-digit' }, DEFAULT_DISPLAY_TIMEZONE);
    } catch {
        return 'N/A';
    }
}

function formatDueDate(dateString: string | null, isOverdue: boolean) {
    if (!dateString) return 'N/A';
    try {
        const date = parseTimestampAsUtc(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));

        if (isOverdue) {
            const overdueMins = Math.round(-diffMs / (1000 * 60));
            if (overdueMins < 60) return `${overdueMins}m overdue`;
            const overdueHours = Math.round(overdueMins / 60);
            if (overdueHours < 24) return `${overdueHours}h overdue`;
            return `${Math.round(overdueHours / 24)}d overdue`;
        }

        if (diffHours < 1) return 'Due soon';
        if (diffHours < 24) return `In ${diffHours}h`;
        return formatDateInTimezone(date, { month: 'short', day: 'numeric' }, DEFAULT_DISPLAY_TIMEZONE);
    } catch {
        return 'N/A';
    }
}

// ── Constants ──

const PAGE_SIZE = 20;

// ── Main Component ──

interface ActionTableProps {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    onRefreshNeeded?: () => void;
}

export function ActionTable({ dateRange, startDate, endDate, onRefreshNeeded }: ActionTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuthStore();
    const showChannelFilter = user?.whatsapp_bot_enabled === true;

    // Filter state from URL
    const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 300);
    }, []);
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
    const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') || '');
    const [priorityFilter, setPriorityFilter] = useState(() => searchParams.get('priority') || '');
    const [channelFilter, setChannelFilter] = useState(() => searchParams.get('channel') || '');
    const [hotelFilter, setHotelFilter] = useState(() => searchParams.get('activeHotel') || '');
    const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || 'due_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
        () => (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    );

    // Unmasking state
    const [unmaskedNumbers, setUnmaskedNumbers] = useState<Record<number, string>>({});
    const [unmaskingLoading, setUnmaskingLoading] = useState<Record<number, boolean>>({});

    // Status change state
    const [resolvingActionId, setResolvingActionId] = useState<number | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const { mutate: updateAction, isPending: isUpdatingStatus } = useUpdateAction();

    const handleStatusUpdate = (actionId: number, status: ActionStatus, notes?: string) => {
        updateAction({
            id: actionId.toString(),
            data: {
                status,
                resolution_notes: notes
            }
        }, {
            onSuccess: () => {
                toast.success(`Action marked as ${ACTION_STATUS_LABELS[status]}`);
                onRefreshNeeded?.();
                setResolvingActionId(null);
                setResolutionNotes('');
            },
            onError: () => {
                toast.error('Failed to update status');
            }
        });
    };

    const handleToggleUnmask = async (e: React.MouseEvent, actionId: number) => {
        e.stopPropagation();
        if (unmaskedNumbers[actionId]) {
            const newState = { ...unmaskedNumbers };
            delete newState[actionId];
            setUnmaskedNumbers(newState);
            return;
        }

        setUnmaskingLoading(prev => ({ ...prev, [actionId]: true }));
        try {
            const { decryptedNumber } = await actionsApi.decryptNumber(actionId.toString());
            if (decryptedNumber) {
                setUnmaskedNumbers(prev => ({ ...prev, [actionId]: decryptedNumber }));
            } else {
                toast.error('Could not decrypt phone number');
            }
        } catch {
            toast.error('Failed to view phone number');
        } finally {
            setUnmaskingLoading(prev => ({ ...prev, [actionId]: false }));
        }
    };

    // Sync state to URL (uses debouncedSearch to avoid excessive URL updates)
    useEffect(() => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', page.toString());
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (statusFilter) params.set('status', statusFilter);
        if (typeFilter) params.set('type', typeFilter);
        if (priorityFilter) params.set('priority', priorityFilter);
        if (channelFilter) params.set('channel', channelFilter);
        if (hotelFilter) params.set('activeHotel', hotelFilter);
        if (sortBy !== 'due_at') params.set('sortBy', sortBy);
        if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);

        const queryString = params.toString();
        const currentQueryString = searchParams.toString();
        if (queryString !== currentQueryString) {
            const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
            router.replace(newUrl, { scroll: false });
        }
    }, [page, debouncedSearch, statusFilter, typeFilter, priorityFilter, channelFilter, sortBy, sortOrder, pathname, router, searchParams]);

    // Build API params
    const queryParams: ActionListRequest = useMemo(() => ({
        page,
        limit: PAGE_SIZE,
        sortBy: sortBy as ActionListRequest['sortBy'],
        sortOrder: sortOrder,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(statusFilter ? { status: statusFilter as ActionStatus } : {}),
        ...(typeFilter ? { request_type: typeFilter as ActionRequestType } : {}),
        ...(priorityFilter ? { priority: priorityFilter as ActionPriority } : {}),
        ...(channelFilter ? { channel: channelFilter as ActionListRequest['channel'] } : {}),
        ...(hotelFilter ? { activeHotel: hotelFilter } : {}),
        ...(dateRange ? { dateRange: dateRange as ActionListRequest['dateRange'] } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        // Exclude resolved actions by default unless explicitly filtered for them
        excludeResolved: !statusFilter || statusFilter !== 'resolved',
    }), [page, debouncedSearch, statusFilter, typeFilter, priorityFilter, channelFilter, hotelFilter, sortBy, sortOrder, dateRange, startDate, endDate]);

    const { data: hotelData } = useActionHotels();
    const hotelOptions = hotelData ?? [];

    const { data, isLoading, isFetching, isError, error, refetch } = useActionsList(queryParams);



    const resetPage = () => setPage(1);

    const hasActiveFilters = !!(debouncedSearch.trim() || statusFilter || typeFilter || priorityFilter || channelFilter || hotelFilter || sortBy !== 'due_at' || sortOrder !== 'desc');

    return (
        <div className="space-y-4">
            {/* Filters */}
            <ActionFilters
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                typeFilter={typeFilter}
                priorityFilter={priorityFilter}
                channelFilter={channelFilter}
                hotelFilter={hotelFilter}
                hotelOptions={hotelOptions}
                showChannelFilter={showChannelFilter}
                showHotelFilter={showChannelFilter}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSearchChange={handleSearchChange}
                onStatusChange={(v) => { setStatusFilter(v); resetPage(); }}
                onTypeChange={(v) => { setTypeFilter(v); resetPage(); }}
                onPriorityChange={(v) => { setPriorityFilter(v); resetPage(); }}
                onChannelChange={(v) => { setChannelFilter(v); resetPage(); }}
                onHotelChange={(v) => { setHotelFilter(v); resetPage(); }}
                onSortByChange={(v) => { setSortBy(v); resetPage(); }}
                onSortOrderChange={(v) => { setSortOrder(v); resetPage(); }}
            />

            {hasActiveFilters && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setSearchQuery(''); setDebouncedSearch(''); setStatusFilter(''); setTypeFilter('');
                        setPriorityFilter(''); setChannelFilter(''); setHotelFilter(''); setSortBy('due_at'); setSortOrder('desc');
                        resetPage();
                    }}
                >
                    Reset Filters
                </Button>
            )}

            {/* Loading */}
            {isLoading && <ActionTableSkeleton />}

            {/* Error */}
            {isError && !isLoading && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                    <p className="text-sm text-destructive">
                        {(error as Error)?.message || 'Failed to load actions.'}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                        Retry
                    </Button>
                </div>
            )}

            {/* Table */}
            {!isLoading && data && data.data.length > 0 && (
                <>
                    {/* Mobile Card View */}
                    <div className="space-y-3 md:hidden">
                        {data.data.map((action, i) => {
                            const isRepeat = action.follow_up_count > 0;
                            return (
                            <motion.div
                                key={action.id}
                                onClick={() => router.push(`/actions/${action.id}`)}
                                className={cn(
                                    "rounded-xl border p-3.5 cursor-pointer active:bg-secondary/30 transition-all",
                                    isRepeat
                                        ? "border-l-[3px] border-l-orange-500 border-orange-500/30 bg-orange-500/[0.04] shadow-[0_0_16px_rgba(249,115,22,0.12)]"
                                        : "border-border bg-card shadow-sm"
                                )}
                                initial={{ opacity: 0, y: 10 }}
                                animate={isRepeat
                                    ? { opacity: 1, y: 0, scale: [1, 1.005, 1] }
                                    : { opacity: 1, y: 0 }
                                }
                                transition={isRepeat
                                    ? { duration: 0.3, delay: i * 0.03, scale: { repeat: Infinity, duration: 3, ease: "easeInOut" } }
                                    : { duration: 0.3, delay: i * 0.03 }
                                }
                            >
                                {/* Row 1: Guest + Priority */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{action.guest_name || 'Unknown'}</p>
                                        {isRepeat && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                                                </span>
                                                <span className="text-[10px] uppercase text-orange-500 font-bold tracking-wide">
                                                    Repeat x{action.follow_up_count + 1}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <ActionPriorityBadge priority={action.priority} />
                                </div>

                                {/* Row 2: Phone */}
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {unmaskedNumbers[action.id] || action.phone_number || (action as any).caller_phone || 'N/A'}
                                    </span>
                                </div>

                                {/* Row 3: Type + Status */}
                                <div className="flex items-center gap-2 mb-2.5">
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                        {ACTION_REQUEST_TYPE_LABELS[((action as any).type || '').toLowerCase()] || ACTION_REQUEST_TYPE_LABELS[(action.request_type || '').toLowerCase() as ActionRequestType] || action.request_type_label || (action as any).type || '-'}
                                    </Badge>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="outline-none ring-0 focus:outline-none focus:ring-0">
                                                    <ActionStatusBadge
                                                        status={action.status}
                                                        className="cursor-pointer hover:opacity-80 transition-opacity text-[10px] px-2 py-0.5"
                                                        showChevron={true}
                                                    />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-[180px] bg-card border-border shadow-premium animate-in fade-in zoom-in-95">
                                                {(Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map((s) => (
                                                    <DropdownMenuItem
                                                        key={s}
                                                        className={cn(
                                                            "cursor-pointer text-sm py-2 px-3",
                                                            action.status?.toLowerCase() === s && "bg-secondary/50 font-medium"
                                                        )}
                                                        onClick={() => {
                                                            if (s === 'resolved') {
                                                                setResolvingActionId(action.id);
                                                                setResolutionNotes('');
                                                            } else if (s !== action.status) {
                                                                handleStatusUpdate(action.id, s);
                                                            }
                                                        }}
                                                    >
                                                        {ACTION_STATUS_LABELS[s]}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Row 4: Due + Created */}
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span
                                        className={cn(
                                            action.is_overdue && 'text-red-500 font-medium'
                                        )}
                                    >
                                        {action.is_overdue && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
                                        {formatDueDate(action.due_at, action.is_overdue)}
                                    </span>
                                    <span>{formatDate(action.created_at)}</span>
                                </div>

                                {/* Row 5: Comments */}
                                {action.comments && (
                                    <div className="mt-2.5 text-sm text-foreground bg-blue-500/10 border-l-2 border-blue-500 p-3 rounded-lg">
                                        <p className="font-semibold text-xs uppercase tracking-wider text-blue-600 mb-1">Comments:</p>
                                        <p className="text-sm leading-relaxed">{action.comments}</p>
                                    </div>
                                )}
                            </motion.div>
                            );
                        })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:flex flex-col rounded-xl border border-border bg-card shadow-premium-sm card-glow max-h-[calc(100vh-320px)] relative overflow-hidden">
                        <div className="overflow-auto flex-1">
                            <table className="w-full">
                                <thead className="border-b border-border bg-secondary/30 sticky top-0 z-10">
                                    <tr>
                                        {['Created', 'Guest', 'Phone', 'Issue Type', 'Priority', 'Status', 'Due', 'Comments'].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground bg-secondary">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.data.map((action, i) => {
                                        const isRepeat = action.follow_up_count > 0;
                                        return (
                                        <motion.tr
                                            key={action.id}
                                            onClick={() => router.push(`/actions/${action.id}`)}
                                            className={cn(
                                                "cursor-pointer transition-colors hover:bg-secondary/30",
                                                isRepeat && "bg-orange-500/[0.04] shadow-[inset_3px_0_0_0_rgb(249,115,22)]"
                                            )}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: i * 0.05 }}
                                        >
                                            <td className="px-4 py-4">
                                                <span className="text-sm">{formatDate(action.created_at)}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {action.guest_name || 'Unknown'}
                                                    </p>
                                                    {isRepeat && (
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                                                            </span>
                                                            <span className="text-[10px] uppercase text-orange-500 font-bold tracking-wide">
                                                                Repeat x{action.follow_up_count + 1}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2 group/phone">
                                                    <span className="text-sm text-muted-foreground font-mono">
                                                        {unmaskedNumbers[action.id] || action.phone_number || (action as any).caller_phone || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge variant="outline" className="text-xs">
                                                    {ACTION_REQUEST_TYPE_LABELS[((action as any).type || '').toLowerCase()] || ACTION_REQUEST_TYPE_LABELS[(action.request_type || '').toLowerCase() as ActionRequestType] || action.request_type_label || (action as any).type || '-'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4">
                                                <ActionPriorityBadge priority={action.priority} />
                                            </td>
                                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="outline-none ring-0 focus:outline-none focus:ring-0">
                                                            <ActionStatusBadge
                                                                status={action.status}
                                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                                                showChevron={true}
                                                            />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-[180px] bg-card border-border shadow-premium animate-in fade-in zoom-in-95">
                                                        {(Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map((s) => (
                                                            <DropdownMenuItem
                                                                key={s}
                                                                className={cn(
                                                                    "cursor-pointer text-sm py-2 px-3",
                                                                    action.status?.toLowerCase() === s && "bg-secondary/50 font-medium"
                                                                )}
                                                                onClick={() => {
                                                                    if (s === 'resolved') {
                                                                        setResolvingActionId(action.id);
                                                                        setResolutionNotes('');
                                                                    } else if (s !== action.status) {
                                                                        handleStatusUpdate(action.id, s);
                                                                    }
                                                                }}
                                                            >
                                                                {ACTION_STATUS_LABELS[s]}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={cn(
                                                        'text-sm',
                                                        action.is_overdue && 'text-red-500 font-medium'
                                                    )}
                                                >
                                                    {action.is_overdue && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                                                    {formatDueDate(action.due_at, action.is_overdue)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 max-w-[200px]">
                                                <span 
                                                    className="text-sm text-foreground font-medium line-clamp-2 block"
                                                    title={action.comments || ''}
                                                >
                                                    {action.comments ? (
                                                        action.comments.length > 30
                                                            ? `${action.comments.substring(0, 30)}...`
                                                            : action.comments
                                                    ) : '-'}
                                                </span>
                                            </td>
                                        </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {data.pagination.total > data.pagination.limit && (
                        <div className="mt-4">
                            <PaginationControls
                                pagination={data.pagination}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Empty */}
            {!isLoading && !isError && data && data.data.length === 0 && (
                <div className="rounded-lg border border-border bg-card p-8 sm:p-12 text-center">
                    <p className="text-sm text-muted-foreground">No actions found</p>
                    {hasActiveFilters && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSearchQuery(''); setStatusFilter(''); setTypeFilter('');
                                setPriorityFilter(''); setChannelFilter(''); setHotelFilter(''); setSortBy('due_at'); setSortOrder('desc');
                                resetPage();
                            }}
                            className="mt-2"
                        >
                            Clear filters
                        </Button>
                    )}
                </div>
            )}

            {/* Resolution Dialog */}
            <Dialog open={resolvingActionId !== null} onOpenChange={(open) => !open && setResolvingActionId(null)}>
                <DialogContent className="sm:max-w-[425px] bg-card border-border shadow-premium">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            Resolve Action
                        </DialogTitle>
                        <DialogDescription>
                            Please add a brief note about how this issue was resolved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Type resolution notes here..."
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            className="min-h-[120px] focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setResolvingActionId(null)}
                            disabled={isUpdatingStatus}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => resolvingActionId && handleStatusUpdate(resolvingActionId, 'resolved', resolutionNotes)}
                            disabled={isUpdatingStatus || !resolutionNotes.trim()}
                        >
                            {isUpdatingStatus ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Mark as Resolved
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fetching indicator */}
            {isFetching && !isLoading && (
                <div className="flex justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    );
}
