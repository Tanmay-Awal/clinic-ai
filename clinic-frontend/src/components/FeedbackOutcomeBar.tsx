import React from 'react';
import { motion } from 'framer-motion';

export interface OutcomeStats {
    totalAttempted: number;
    meaningful: number;
    nonMeaningful: number;
    voicemail: number;
    unanswered: number;
}

interface FeedbackOutcomeBarProps {
    data: {
        totalAttempted: number;
        meaningful: number;
        nonMeaningful: number;
        voicemail: number;
        feedbackGivenPct: number;
        inbound: OutcomeStats;
        outbound: OutcomeStats;
    };
    onSegmentClick?: (segmentName: string, direction: 'inbound' | 'outbound') => void;
}

export default function FeedbackOutcomeBar({ data, onSegmentClick }: FeedbackOutcomeBarProps) {
    if (!data || data.totalAttempted === 0) return null;

    const renderDirectionCard = (title: string, stats: OutcomeStats, isOutbound: boolean) => {
        const direction = isOutbound ? 'outbound' : 'inbound';
        const segments = [
            { name: 'Meaningful', count: stats.meaningful, color: '#34d399' }, // emerald-400
            { name: 'Non Meaningful', count: stats.nonMeaningful, color: '#f97316' }, // orange-500
            { name: 'Voicemail', count: stats.voicemail, color: '#60a5fa' }, // blue-400
            { name: 'Unanswered', count: stats.unanswered, color: '#f87171' }, // red-400
        ];

        return (
            <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {isOutbound ? (
                            <svg className="w-5 h-5 text-[#f97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8l-8-8-8 8" transform="rotate(45 12 12)" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-[#34d399]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m-8 8l8 8 8-8" transform="rotate(45 12 12)" />
                            </svg>
                        )}
                        <h3 className="text-lg font-bold tracking-wider text-foreground uppercase">{title}</h3>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">
                        {stats.totalAttempted}
                    </p>
                </div>

                <div className="h-3 w-full flex rounded-full overflow-hidden mb-6 bg-secondary/50">
                    {segments.filter(s => s.count > 0).map((segment, idx) => {
                        const widthPct = stats.totalAttempted > 0 ? (segment.count / stats.totalAttempted) * 100 : 0;
                        return (
                            <motion.button
                                key={segment.name}
                                type="button"
                                onClick={() => onSegmentClick?.(segment.name, direction)}
                                initial={{ width: 0 }}
                                animate={{ width: `${widthPct}%` }}
                                transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                                style={{ backgroundColor: segment.color }}
                                className="h-full relative group/segment cursor-pointer border-r border-[#0f0f12] last:border-0"
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/segment:opacity-100 transition-opacity z-20 pointer-events-none">
                                    <div className="bg-card border border-border rounded px-2 py-1 shadow-lg whitespace-nowrap text-xs font-semibold pointer-events-none">
                                        {segment.name}: {segment.count} ({widthPct.toFixed(1)}%)
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    {segments.map((segment) => {
                        const pct = stats.totalAttempted > 0 ? ((segment.count / stats.totalAttempted) * 100).toFixed(1) : '0.0';
                        return (
                            <button key={segment.name} type="button" onClick={() => onSegmentClick?.(segment.name, direction)} className="flex flex-col pl-3 border-l-2 text-left" style={{ borderLeftColor: segment.color }}>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide leading-none mb-1.5">
                                    {segment.name}
                                </span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[15px] font-bold tabular-nums leading-none">{segment.count}</span>
                                    {segment.count > 0 && (
                                        <span className="text-[11px] font-bold leading-none" style={{ color: segment.color }}>{pct}%</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="rounded-xl border border-border bg-[#121214] p-8 shadow-premium-sm w-full mb-6 col-span-full font-sans">
            <div className="mb-12 flex items-center">
                <span className="text-5xl font-extrabold tabular-nums tracking-tighter text-white mr-4">
                    {data.totalAttempted}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground pt-1">
                    TOTAL CALLS TRACKED
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
                {renderDirectionCard('OUTBOUND', data.outbound, true)}
                {renderDirectionCard('INBOUND', data.inbound, false)}
            </div>
        </div>
    );
}
