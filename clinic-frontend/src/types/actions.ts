export type ActionStatus = 'open' | 'in_progress' | 'waiting_on_guest' | 'resolved';
export type ActionPriority = 'high' | 'medium' | 'low';

export type ActionRequestType =
    | 'promotions'
    | 'large_group'
    | 'system_error'
    | 'availability_error'
    | 'cancellation'
    | 'update'
    | 'waitlist'
    | 'lost_and_found'
    | 'misc';

// Label mapping for display — used in badges and filters
export const ACTION_REQUEST_TYPE_LABELS: Record<ActionRequestType, string> = {
    promotions: 'Promotion Enquiry',
    large_group: 'Large Group Booking',
    system_error: 'System Error',
    availability_error: 'Availability Error',
    cancellation: 'Cancellation',
    update: 'Booking Update',
    waitlist: 'Waitlist',
    lost_and_found: 'Lost & Found',
    misc: 'Callback Needed',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    waiting_on_guest: 'Waiting on Guest',
    resolved: 'Resolved',
};

// ── List item (returned from POST /api/actions/list) ──

export interface ActionListItem {
    id: number;
    created_at: string;
    guest_name: string | null;
    phone_number: string;           // masked: ******9141
    request_type: ActionRequestType;
    request_type_label: string;     // from action_config.label
    priority: ActionPriority;
    status: ActionStatus;
    follow_up_count: number;
    due_at: string;
    is_overdue: boolean;            // computed: due_at < now() && status != 'resolved'
    notes: string | null;
    comments?: string | null;
    comments_updated_at?: string | null;
    resolved_at: string | null;
    linked_calls: Array<{
        call_id: number;
        is_primary: boolean;
        created_at: string;
    }>;
}

// ── Detail (returned from GET /api/actions/:id) ──

export interface ActionDetail extends ActionListItem {
    updated_at: string;
    resolution_notes: string | null;
    email_notification: {
        id: number;
        request_type: string;
        name: string;
        email: string;
        date: string;
        time: string;
        party_size: number;
        notes: string;
        dietary_requirements: string;
        special_occasion: string;
        serviceType: string;
        terrace_preference: string;
    } | null;
    linked_calls: Array<{
        call_id: number;
        is_primary: boolean;
        notes: string | null;
        created_at: string;
        call_summary: string | null;
        call_start_time: string;
        call_duration_ms: number;
        guest_name: string | null;
    }>;
}

// ── Stats (returned from POST /api/actions/stats) ──

export interface ActionStatsResponse {
    open_actions: { count: number; change_pct: number };
    due_today: { count: number; change_pct: number };
    overdue: { count: number; change_pct: number };
    top_types: Array<{
        request_type: string;
        label: string;
        count: number;
        change_pct: number;
    }>;
}

// ── Request types ──

export interface ActionListRequest {
    startDate?: string;
    endDate?: string;
    dateRange?: 'today' | 'yesterday' | '7d' | '30d' | '90d';
    status?: ActionStatus;
    request_type?: ActionRequestType;
    priority?: ActionPriority;
    search?: string;
    sortBy?: 'created_at' | 'due_at' | 'priority' | 'status';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    excludeResolved?: boolean;
    channel?: 'voice' | 'whatsapp';
    activeHotel?: string;
}

import type { PaginatedResponse } from './index';

export type ActionListResponse = PaginatedResponse<ActionListItem>;

export interface ActionStatsRequest {
    startDate?: string;
    endDate?: string;
    dateRange?: 'today' | 'yesterday' | '7d' | '30d' | '90d';
}

export interface CreateActionRequest {
    request_type: ActionRequestType;
    guest_name?: string;
    phone_number?: string;
    priority?: ActionPriority;
    notes?: string;
    call_id?: number;
}

export interface UpdateActionRequest {
    status?: ActionStatus;
    resolution_notes?: string;
    notes?: string;
    comments?: string;
}

export interface PushSubscribeRequest {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    browser?: string;
}

export interface CallActionsResponse {
    actions: Array<{
        id: number;
        request_type: ActionRequestType;
        request_type_label: string;
        status: ActionStatus;
        priority: ActionPriority;
        is_primary: boolean;
    }>;
}
