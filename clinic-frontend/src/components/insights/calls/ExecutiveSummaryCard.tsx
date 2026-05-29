'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, PoundSterling, Target } from 'lucide-react';
import { DEFAULT_DISPLAY_TIMEZONE, formatDateInTimezone, parseTimestampAsUtc } from '@/lib/timezone';

interface ExecutiveSummaryCardProps {
    criticalFinding: string;
    revenueImpact: string;
    immediateAction: string;
    periodStart: string;
    periodEnd: string;
}

export function ExecutiveSummaryCard({
    criticalFinding,
    revenueImpact,
    immediateAction,
    periodStart,
    periodEnd,
}: ExecutiveSummaryCardProps) {
    const formatDate = (iso: string) =>
        formatDateInTimezone(parseTimestampAsUtc(iso), {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }, DEFAULT_DISPLAY_TIMEZONE);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-destructive/5"
        >
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-destructive/5 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />

            <div className="relative p-6">
                {/* Period label */}
                <div className="mb-4 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-600/10 to-blue-500/10 border border-teal-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                        <AlertTriangle className="mr-1.5 h-3 w-3 text-amber-500" />
                        Executive Summary
                    </span>
                    <span className="text-xs font-medium text-foreground/70">
                        {formatDate(periodStart)} — {formatDate(periodEnd)}
                    </span>
                </div>

                {/* Critical Finding */}
                <div className="mb-6">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider section-heading-gradient">
                        🚨 Critical Finding
                    </h3>
                    <p className="text-lg font-medium leading-relaxed text-foreground">
                        {criticalFinding}
                    </p>
                </div>

                {/* Impact + Action Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Revenue Impact */}
                    <div className="rounded-xl border border-border bg-background/50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                                <PoundSterling className="h-4 w-4 text-amber-500" />
                            </div>
                            <h4 className="text-sm font-semibold section-heading-gradient">
                                Revenue Impact
                            </h4>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {revenueImpact}
                        </p>
                    </div>

                    {/* Immediate Action */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <Target className="h-4 w-4 text-primary" />
                            </div>
                            <h4 className="text-sm font-semibold section-heading-gradient">
                                Immediate Action
                            </h4>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {immediateAction}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
