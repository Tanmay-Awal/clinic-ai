// Action Center Types
export * from './actions';

// API Types

/**
 * Pagination metadata returned from list API endpoints
 */
export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

/**
 * Generic paginated response type for list APIs
 * 
 * @template T - The type of items in the data array
 */
export interface PaginatedResponse<T> {
    data: T[];
    pagination: Pagination;
}

/**
 * Query parameters for paginated list requests
 */
export interface PaginationParams {
    page?: number;
    limit?: number;
}

/**
 * Standard API error response
 */
export interface ApiError {
    message: string;
    code?: string;
    status?: number;
}

// Calls Types

/**
 * Call data structure from the API (for list view)
 */
export interface Call {
    id: string;
    time: string;
    name: string | null;
    contact_number: string;
    display_mobile_number?: string | null;
    location: string | null;
    duration: number | null;
    sentiment: number | string | null;
    user_sentiment?: string | null;
    category?: string | null;
    sub_category?: string | null;
    reservation_type?: string | null;
    confidence?: number | null;
    asr_confidence?: number | null;
}

/**
 * Transcript entry structure
 */
export interface Transcript {
    id: string;
    call_id: string;
    role: 'agent' | 'user' | 'assistant';
    transcript: string;
    created_at: string;
}

/**
 * Analysis data structure
 */
export interface CallAnalysis {
    id: string;
    call_id: string;
    call_summary: string;
    user_sentiment: string | number | null;
    call_successful: boolean;
    name: string | null;
    location: string | null;
    contact_number: string | null;
    sentiment_percentage?: string | null;
    created_at: string;
    reservation_type?: string | null;
    top_ask_class?: string | null;
    max_booking_category?: string | null;
    top_queries?: string[] | null;
    guest_name?: string | null;
    party_size?: number | null;
    booking_date?: string | null;
    booking_time?: string | null;
    notes?: string | null;
    special_requests?: string | null;
    deposit_paid?: boolean | null;
    confirmation_status?: string | null;
    allergies?: string | string[] | null;
    guest_phone?: string | null;
    room_number?: string | null;
    request_type?: string | null;
    priority_level?: string | null;
    completion_status?: string | null;
    urgency?: string | null;
    assigned_to_staff?: string | null;
    requested_time?: string | null;
    feedback_type?: string | null;
    feedback_topic?: string | null;
    rating?: number | null;
    positives?: string[] | null;
    negatives?: string[] | null;
    aspects?: Record<string, number> | null;
    recommended?: boolean | null;
    summary?: string[] | null;
    sentiment_meter?: string | number | null;
    key_entities?: Array<{ type: string; value: string }> | null;
    call_outcome?: string | null;
    guest_engagement?: string | null;
    visit_type?: string | null;
    rebooking?: string | {
        date?: string | null;
        offered?: boolean | null;
        accepted?: boolean | null;
        party_size?: number | null;
        declined_reason?: string | null;
    } | null;
    requires_action?: boolean | null;
    action_type?: string | null;
}

/**
 * Detailed call data structure from the API (for detail view)
 */
export interface CallDetail {
    id: string;
    retell_call_id: string;
    agent_id: string;
    agent_name: string;
    call_source: string;
    call_direction: 'inbound' | 'outbound';
    from_number: string;
    to_number: string;
    display_mobile_number: string | null;
    disconnection_reason: string | null;
    transfer_destination: string | null;
    call_status: string;
    recording_url: string;
    recording_multi_channel_url: string;
    call_duration_ms: string | number;
    call_start_time: string;
    call_end_time: string;
    twilio_call_sid: string | null;
    category?: string | null;
    needs_ai_processing?: boolean;
    created_at: string;
    transcripts: Transcript[];
    analysis: CallAnalysis;
    linked_actions?: Array<{
        id: number;
        guest_name: string | null;
        request_type: string;
        priority: string;
        status: string;
        due_at: string | null;
        notes: string | null;
        created_at: string;
    }>;
}

/**
 * Paginated response for calls list API
 */
export type CallsResponse = PaginatedResponse<Call>;

/**
 * Query parameters for calls list
 */
export interface CallsListParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    outcome?: string;
    feedback_metric?: string;
    feedback_theme?: string;
    feedback_theme_kind?: 'positive' | 'negative';
    sub_category?: string;
    reservation_type?: string;
    direction?: 'inbound' | 'outbound';
    call_direction?: 'inbound' | 'outbound';
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
    startDate?: string;
    endDate?: string;
    call_ids?: number[];
}

// Dashboard Types

export interface Last7DaysCallCount {
    [day: string]: {
        [hour: string]: number;
    };
}

export interface LocationWiseCallCount {
    location: string;
    count: number;
}

export interface ReservationCategory {
    name: string;
    value: number;
}

export interface TimingDistribution {
    label: string;
    value: number;
}

export interface TopQuery {
    query: string;
    count: number;
}

export interface ReservationDashboardResponse {
    totalCalls: number;
    avgSentimentPercentage: number;
    avgSentiment?: string | number;
    last7DaysCallCount: Last7DaysCallCount;
    locationWiseCallCount: LocationWiseCallCount[];
    reservationCategories?: ReservationCategory[];
    timingDistribution?: TimingDistribution[];
    topAskClass?: string;
    maxBookingCategory?: string;
    topQueriesToday?: TopQuery[];
    totalBookingsCaptured?: number;
    totalBookingsBreakdown?: { name: string; count: number }[];
    avgTime?: number;
    totalCovers?: number;
    confirmedPercentage?: number;
    avgPartySize?: number;
    topSpecialRequests?: { request: string; count: number }[];
    volumeTrend?: { label: string; value: number }[];
    conversionFunnel?: { stage: string; count: number; pct: number }[];
    volumeComparison?: { previousTrend?: { date?: string; label?: string; volume?: number; value?: number }[] } | null;
    trendingTopics?: TrendingTopicItem[];
    topDoctors?: { name: string; specialization: string; patientCount: number }[];
    topDiseases?: { name: string; count: number }[];
    afterHoursStats?: {
        callsAfterHours: number;
        bookingsDoneAfterHours: number;
        durationGeneratedAfterHours: number;
        callIds?: string[];
        error?: boolean;
        breakdown?: {
            secured?: { count: number; duration?: number; callIds: string[] };
            largeGroup?: { count: number; duration?: number; callIds: string[] };
            promotional?: { count: number; duration?: number; callIds: string[] };
            table?: { count: number; duration?: number; callIds: string[] };
            room?: { count: number; duration?: number; callIds: string[] };
        };
    } | null;
    reservationSeparation?: {
        totalReservationCalls: number;
        securedBookings: { count: number; duration: number; callIds?: string[]; agentBreakdown?: { name: string; count: number }[] };
        largePartyBookings?: { count: number; duration: number; callIds?: string[]; agentBreakdown?: { name: string; count: number }[] };
        promotionalBookings?: { count: number; duration: number; callIds?: string[]; agentBreakdown?: { name: string; count: number }[] };
        urgentBookings?: { count: number; duration: number; callIds?: string[]; agentBreakdown?: { name: string; count: number }[] };
        largeGroup?: { count: number; duration: number; callIds?: string[] };
        promotions?: { count: number; duration: number; callIds?: string[] };
    } | null;
    upsellStats?: { totalRevenue: number; totalUpsells: number; breakdown?: { prosecco?: number; wine?: number; other?: number }; callIds?: string[] } | null;
    kpiTrends?: {
        totalCalls?: KpiTrendItem;
        avgSentiment?: KpiTrendItem;
        totalBookingsCaptured?: KpiTrendItem;
        confirmedPercentage?: KpiTrendItem;
        avgTime?: KpiTrendItem;
    };
    outcomeBarData?: { name: string; count: number; callIds?: string[] }[];
    dailyBookings?: {
        byDateBooked: { date: string; count: number }[];
        byVisitDate: { date: string; count: number }[];
    };
}

export interface DashboardParams {
    startDate?: string;
    endDate?: string;
    dateRange?: string;
    location?: string;
    [key: string]: any;
}

export interface SummaryDashboardResponse {
    totalCalls: number;
    inboundCalls: number;
    outboundCalls: number;
    aht: number;
    avgSentimentScore: number;
    conversionRate: number;
    depositCaptureRate: number;
    kpiTrends?: {
        totalCalls?: KpiTrendItem;
        aht?: KpiTrendItem;
        avgSentiment?: KpiTrendItem;
        conversionRate?: KpiTrendItem;
        depositCaptureRate?: KpiTrendItem;
    };
    outcomeBarData?: { name: string; count: number; callIds?: string[] }[];
    volumeTrend?: { label?: string; date?: string; value?: number; volume?: number }[];
    volumeComparison?: { previousTrend?: { date?: string; label?: string; volume?: number; value?: number }[] } | null;
    conversionFunnel?: { stage: string; count: number; pct: number }[];
    trendingTopics?: TrendingTopicItem[];
    heatmapData?: Last7DaysCallCount;
    leaderboardData?: any[];
}

export interface HousekeepingDashboardResponse {
    totalRequests: number;
    completionPercentage: number;
    completedCount: number;
    pendingCount: number;
    inProgressCount: number;
    cancelledCount: number;
    completionStatusDistribution: Array<{ status: string; count: number }>;
    priorityLevelDistribution: Array<{ priority: string; count: number }>;
    urgencyDistribution: Array<{ urgency: string; count: number }>;
    requestTypeDistribution: Array<{ requestType: string; count: number }>;
    topRequestTypes: Array<{ requestType: string; count: number }>;
    roomWiseStats: Array<{ roomNumber: string; count: number }>;
    staffAssignmentStats: Array<{ staff: string; count: number }>;
    timingDistribution: TimingDistribution[];
    last7DaysCallCount: Last7DaysCallCount;
    topAskClass?: string;
    topQueries: TopQuery[];
    repeatRequestsCount: number;
    repeatRequestsPercentage: number;
    inHouseGuestsCount: number;
    avgSentimentPercentage: number;
}

export interface AspectSentiment {
    aspect: string;
    score: number;
}

export interface ComplaintTopic {
    topic: string;
    count: number;
}

export interface FeedbackWord {
    word: string;
    count: number;
}

export interface KpiTrendItem {
    current: number;
    previous: number;
    changePct: number;
    rag?: 'green' | 'amber' | 'red';
    categoryBreakdown?: { name: string; count: number }[];
}

export interface RebookingStats {
    offered: number;
    accepted: number;
    declined: number;
    conversionRate: number;
}

export interface FeedbackDashboardResponse {
    totalFeedback: number;
    avgRating: number;
    sentimentScore: number;
    sentimentTrend: 'up' | 'down' | 'neutral';
    aspectSentiment: AspectSentiment[];
    complaintTopics: ComplaintTopic[];
    feedbackWords: FeedbackWord[];
    couponsProvided: number;
    positivePercentage: number;
    negativePercentage: number;
    volumeTrend: { label: string; value: number }[];
    kpiTrends?: {
        totalFeedback: KpiTrendItem;
        avgRating: KpiTrendItem;
        positivePercentage: KpiTrendItem;
        negativePercentage: KpiTrendItem;
        couponsProvided: KpiTrendItem;
        feedbackFormSent?: KpiTrendItem;
        formSubmissionPct?: KpiTrendItem;
    };
    ratingBreakdown?: { stars: number; count: number; percentage: number }[];
    feedbackTypeBreakdown?: { type: string; count: number; percentage: number }[];
    rebookingStats?: RebookingStats;
    nps?: { score: number; classification: string };
    escalationRate?: number;
    topPositiveThemes?: { comment_preview: string; count: number; callId?: number }[];
    topNegativeThemes?: { comment_preview: string; count: number; callId?: number }[];
    outcomeBar?: {
        totalAttempted: number;
        meaningful: number;
        nonMeaningful: number;
        voicemail: number;
        feedbackGivenPct: number;
        inbound: {
            totalAttempted: number;
            meaningful: number;
            nonMeaningful: number;
            voicemail: number;
            unanswered: number;
        };
        outbound: {
            totalAttempted: number;
            meaningful: number;
            nonMeaningful: number;
            voicemail: number;
            unanswered: number;
        };
    };
    metricCallIds?: {
        meaningful: number[];
        nonMeaningful: number[];
        voicemail: number[];
        unanswered: number[];
        positive: number[];
        negative: number[];
        compliment: number[];
        complaint: number[];
        mixed: number[];
        neutral: number[];
    };
    feedbackFormSent?: number;
    formSubmissionPct?: number;
}

// Analytics Insights Types

export interface AnalyticsInsightsResponse {
    trendingTopics: TrendingTopicItem[];
    topQueries: TopQueryItem[];
    topSpecialRequests: SpecialRequestItem[];
    summary: { totalCalls: number; dateRange: { start: string; end: string } };
}

export interface TrendingTopicItem {
    code: string;
    label: string;
    count: number;
}

export interface TopQueryItem {
    code: string;
    label: string;
    count: number;
    sampleVerbatim: string | null;
}

export interface SpecialRequestItem {
    code: string;
    label: string;
    count: number;
    category: string;
    sampleDetail: string | null;
}

// User Interactions Types

export interface UserInteraction {
    i_id: string;
    i_interaction_type_id: string;
    i_status: 'active' | 'completed' | 'cancelled' | string;
    i_created_at: string;
    interaction_type_name: string;
}

export interface UserInteractionsResponse {
    data: UserInteraction[];
    pagination: Pagination;
}
