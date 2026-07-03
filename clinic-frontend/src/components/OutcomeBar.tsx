import { motion } from 'framer-motion';

export interface OutcomeSegment {
    name: string;
    count: number;
    color?: string; // kept for API compatibility but ignored — colors are defined here
    callIds?: string[];
    agentBreakdown?: { name: string; count: number }[];
}

interface OutcomeBarProps {
    data: OutcomeSegment[];
    totalCalls: number;
    onSegmentClick?: (segmentName: string, callIds?: string[]) => void;
}

// Hardcoded color map — Tailwind JIT cannot detect dynamic class names from API responses.
// Always use inline style with hex values for guaranteed rendering.
const SEGMENT_COLORS: Record<string, string> = {
    'Appointment Booked': '#4ade80', // green
    'Enquiry Handled': '#38bdf8', // blue
    'Action Required': '#facc15', // yellow
    'Urgent Case': '#ef4444', // red
    'General Assistance': '#2dd4bf', // teal
    'Callback Arranged': '#f59e0b', // orange
    'Booking Cancelled': '#fb923c', // orange-red
    'Reschedule Requested': '#c084fc', // purple
    // Legacy/fallback colors
    'Booking Secured': '#4ade80',
    'Large Party Bookings': '#22d3ee',
    'Promotional / Offer': '#facc15',
    'Transferred to Staff': '#f59e0b',
    'Calls After Hours': '#a78bfa',
    'Successful Upsells': '#f472b6',
};

const getFallbackColor = (idx: number): string => {
    const fallbacks = ['#34d399', '#38bdf8', '#fbbf24', '#fb923c', '#fb7185'];
    return fallbacks[idx % fallbacks.length];
};

export default function OutcomeBar({ data, totalCalls, onSegmentClick }: OutcomeBarProps) {
    if (!data || data.length === 0 || totalCalls === 0) return null;

    const activeSegments = data.filter(d => d.count > 0);

    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-premium-sm h-full card-glow card-shine">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Call Outcomes</h3>
                    <p className="text-3xl font-semibold tracking-tight">
                        {totalCalls.toLocaleString()}{' '}
                        <span className="text-lg text-muted-foreground font-normal">total calls</span>
                    </p>
                </div>
            </div>

            {/* Stacked bar */}
            <div className="h-4 w-full flex rounded-full overflow-hidden mb-6 bg-secondary/50">
                {activeSegments.map((segment, idx) => {
                    const widthPct = (segment.count / totalCalls) * 100;
                    const bgColor = SEGMENT_COLORS[segment.name] ?? getFallbackColor(idx);
                    return (
                        <motion.button
                            key={segment.name}
                            initial={{ width: 0 }}
                            animate={{ width: `${widthPct}%` }}
                            transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                            style={{ backgroundColor: bgColor }}
                            className={onSegmentClick ? 'h-full cursor-pointer' : 'h-full'}
                            title={`${segment.name}: ${segment.count} (${widthPct.toFixed(1)}%)`}
                            onClick={() => onSegmentClick?.(segment.name, segment.callIds)}
                            disabled={!onSegmentClick}
                            type="button"
                        />
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
                {data.map((segment, idx) => {
                    const pct = totalCalls > 0 ? ((segment.count / totalCalls) * 100).toFixed(1) : '0.0';
                    const bgColor = SEGMENT_COLORS[segment.name] ?? getFallbackColor(idx);
                    return (
                        <button
                            key={segment.name}
                            className={`flex items-center gap-2 text-sm ${onSegmentClick ? 'cursor-pointer' : 'disabled:cursor-default'}`}
                            onClick={() => onSegmentClick?.(segment.name, segment.callIds)}
                            disabled={!onSegmentClick}
                            type="button"
                        >
                            <div
                                className="h-3 w-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: bgColor }}
                            />
                            <span className="text-muted-foreground font-medium">{segment.name}</span>
                            <span className="font-semibold">{segment.count}</span>
                            <span className="text-muted-foreground text-xs">({pct}%)</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
