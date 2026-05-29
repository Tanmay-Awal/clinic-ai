'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { CallInsightsReport } from '@/types/callInsights';

interface CallPatternsSectionProps {
    patterns: CallInsightsReport['callPatterns'];
}

// ── Formatters ─────────────────────────────────────────────────────────────

function formatHour(h: string | number): string {
    const hour = typeof h === 'string' ? parseInt(h) : h;
    if (isNaN(hour)) return String(h);
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
}

// ── Shared chart styles ─────────────────────────────────────────────────────

const tooltipStyle = {
    backgroundColor: 'hsl(220 14% 11%)',
    border: '1px solid hsl(220 13% 18%)',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'hsl(220 9% 80%)',
};

const axisStyle = {
    stroke: 'hsl(220 13% 30%)',
    fontSize: 11,
    fontFamily: 'inherit',
};

// ── Party size horizontal bar ───────────────────────────────────────────────

function PartySizeRow({ size, count, max }: { size: string; count: number; max: number }) {
    const pct = max > 0 ? (count / max) * 100 : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="w-6 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">
                {size}
            </span>
            <div className="flex-1 h-5 rounded-sm bg-muted/30 overflow-hidden relative">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-sm"
                    style={{ backgroundColor: 'hsl(217 91% 60%)', opacity: 0.75 }}
                />
            </div>
            <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">{count}</span>
        </div>
    );
}

// ── Main component ──────────────────────────────────────────────────────────

export function CallPatternsSection({ patterns }: CallPatternsSectionProps) {
    const [isOpen, setIsOpen] = useState(true);

    const maxPartySize = Math.max(...(patterns.byPartySize?.map(p => p.count) ?? [1]));

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold uppercase tracking-widest section-heading-gradient">
                        Call Patterns & Analytics
                    </span>
                </div>
                <ChevronDown
                    className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform duration-200',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-border divide-y divide-border">

                            {/* Row 1: Day + Hour charts */}
                            <div className="grid gap-0 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                                {/* Calls by Day */}
                                <div className="p-5">
                                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest section-heading-gradient">
                                        Calls by Day of Week
                                    </p>
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={patterns.byDayOfWeek} barGap={2} barCategoryGap="30%">
                                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" vertical={false} />
                                                <XAxis
                                                    dataKey="day"
                                                    tick={{ ...axisStyle }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(d: string) => d.slice(0, 3)}
                                                />
                                                <YAxis
                                                    tick={{ ...axisStyle }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={28}
                                                />
                                                <Tooltip
                                                    contentStyle={tooltipStyle}
                                                    cursor={{ fill: 'hsl(220 13% 18%)' }}
                                                />
                                                <Bar dataKey="count" name="Total Calls" fill="hsl(220 9% 72%)" radius={[3, 3, 0, 0]} maxBarSize={32} />
                                                <Bar dataKey="bookings" name="Bookings" fill="hsl(142 71% 45%)" radius={[3, 3, 0, 0]} maxBarSize={32} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Calls by Hour */}
                                <div className="p-5">
                                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest section-heading-gradient">
                                        Calls by Hour of Day
                                    </p>
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={patterns.byHourOfDay} barGap={2} barCategoryGap="25%">
                                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" vertical={false} />
                                                <XAxis
                                                    dataKey="hour"
                                                    tick={{ ...axisStyle }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={formatHour}
                                                    interval={2}
                                                />
                                                <YAxis
                                                    tick={{ ...axisStyle }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={28}
                                                />
                                                <Tooltip
                                                    contentStyle={tooltipStyle}
                                                    cursor={{ fill: 'hsl(220 13% 18%)' }}
                                                    labelFormatter={(h) => `${formatHour(h)} – ${formatHour(
                                                        typeof h === 'string' ? String(parseInt(h) + 1).padStart(2, '0') + ':00' : h + 1
                                                    )}`}
                                                />
                                                <Bar dataKey="count" name="Total Calls" fill="hsl(220 9% 72%)" radius={[3, 3, 0, 0]} maxBarSize={24} />
                                                <Bar dataKey="bookings" name="Bookings" fill="hsl(142 71% 45%)" radius={[3, 3, 0, 0]} maxBarSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Top Questions (full width) */}
                            <div className="p-5">
                                <p className="mb-4 text-xs font-semibold uppercase tracking-widest section-heading-gradient">
                                    Top Questions Asked
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {patterns.topQuestions.map((q, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-2.5 rounded-lg bg-muted/20 px-3 py-2.5 border border-border/50"
                                        >
                                            {q.answered ? (
                                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                            ) : (
                                                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400/80" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm leading-snug text-foreground">
                                                    {q.question}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {q.count}× · {q.answered ? 'Answered' : 'Not answered'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Row 3: Party Size + Special Requests */}
                            <div className="grid gap-0 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                                {/* Party Size */}
                                <div className="p-5">
                                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest section-heading-gradient">
                                        Bookings by Party Size
                                    </p>
                                    <div className="space-y-2.5">
                                        {patterns.byPartySize.map((p) => (
                                            <PartySizeRow
                                                key={p.size}
                                                size={p.size}
                                                count={p.count}
                                                max={maxPartySize}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Special Requests */}
                                {patterns.topSpecialRequests?.length > 0 && (
                                    <div className="p-5">
                                        <p className="mb-4 text-xs font-semibold uppercase tracking-widest section-heading-gradient">
                                            Top Special Requests
                                        </p>
                                        <div className="space-y-2">
                                            {[...patterns.topSpecialRequests].sort((a, b) => b.count - a.count).map((r, i) => (
                                                <div key={i} className="flex items-center justify-between gap-3">
                                                    <span className="text-sm text-foreground truncate">{r.request}</span>
                                                    <span className="shrink-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted/50 px-1.5 text-xs font-semibold text-muted-foreground tabular-nums">
                                                        {r.count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
