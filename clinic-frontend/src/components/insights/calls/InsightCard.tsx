'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    ChevronDown,
    BarChart3,
    PoundSterling,
    Lightbulb,
    CheckSquare,
    AlertTriangle,
    Bot,
    Wrench,
    Users,
    Clock,
    Quote,
} from 'lucide-react';
import type { RevenueInsight, BotIssue, Recommendation } from '@/types/callInsights';

interface InsightCardProps {
    insight: RevenueInsight | BotIssue | Recommendation;
    type: 'revenue' | 'bot' | 'recommendation';
    defaultExpanded?: boolean;
}

const urgencyStyles = {
    critical: {
        border: 'border-l-red-500',
        badge: 'bg-red-500/10 text-red-500 border-red-500/30',
        label: 'CRITICAL',
    },
    high: {
        border: 'border-l-amber-500',
        badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
        label: 'HIGH',
    },
    medium: {
        border: 'border-l-blue-500',
        badge: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
        label: 'MEDIUM',
    },
};

const effortLabels: Record<string, { label: string; color: string }> = {
    quick_fix: { label: 'Quick Fix (~30 mins)', color: 'text-green-500' },
    moderate: { label: 'Moderate (1-2 hours)', color: 'text-amber-500' },
    significant: { label: 'Significant (half day+)', color: 'text-red-500' },
};

function getUrgency(
    insight: RevenueInsight | BotIssue | Recommendation
): 'critical' | 'high' | 'medium' {
    let urgencyValue = 'medium';
    if ('urgency' in insight) urgencyValue = insight.urgency;
    if ('priority' in insight) urgencyValue = insight.priority;

    const normalized = urgencyValue.toLowerCase();
    if (normalized === 'critical' || normalized === 'high' || normalized === 'medium') {
        return normalized as 'critical' | 'high' | 'medium';
    }
    return 'medium';
}

function getNumber(insight: RevenueInsight | BotIssue | Recommendation): number {
    if ('insightNumber' in insight) return insight.insightNumber;
    if ('issueNumber' in insight) return insight.issueNumber;
    if ('recommendationNumber' in insight) return insight.recommendationNumber;
    return 0;
}

function getTitle(insight: RevenueInsight | BotIssue | Recommendation): string {
    if ('headline' in insight) return insight.headline;
    if ('title' in insight) return insight.title;
    return '';
}

// ─── Revenue Insight Expanded Content ─────────────────────────────
function RevenueContent({ insight }: { insight: RevenueInsight }) {
    return (
        <div className="space-y-5 pt-4">
            {/* Signal */}
            <Section icon={BarChart3} title="Signal Detected" color="text-blue-500">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.signal.description}
                </p>
                {insight.signal.examples.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                        {insight.signal.examples.map((ex, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                                {ex}
                            </li>
                        ))}
                    </ul>
                )}
                {insight.signal.timePattern && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {insight.signal.timePattern}
                    </div>
                )}
            </Section>

            {/* Impact */}
            <Section icon={PoundSterling} title="Revenue Impact" color="text-amber-500">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.impact.description}
                </p>
                {insight.impact.recurringRisk && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-500/5 border border-red-500/10 px-2 py-1 text-xs text-red-400 font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        Recurring risk — pattern repeats weekly
                    </div>
                )}
            </Section>

            {/* Reasoning */}
            <Section icon={Lightbulb} title="Why This Matters" color="text-purple-500">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.reasoning}
                </p>
            </Section>

            {/* Action */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold section-heading-gradient">Action</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.action.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {insight.action.owner && (
                        <Badge variant="outline" className="text-xs">
                            <Users className="mr-1 h-3 w-3" />
                            {insight.action.owner}
                        </Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                        <Clock className="mr-1 h-3 w-3" />
                        {insight.action.timeline.replace('_', ' ')}
                    </Badge>
                </div>
            </div>

            {/* Evidence Quotes */}
            {insight.evidence.quotes && insight.evidence.quotes.length > 0 && (
                <Section icon={Quote} title="Caller Quotes" color="text-muted-foreground">
                    <div className="space-y-2">
                        {insight.evidence.quotes.map((q, i) => (
                            <blockquote
                                key={i}
                                className="border-l-2 border-muted-foreground/20 pl-3 text-sm italic text-muted-foreground"
                            >
                                {q}
                            </blockquote>
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
}

// ─── Bot Issue Expanded Content ───────────────────────────────────
function BotIssueContent({ insight }: { insight: BotIssue }) {
    // Some effort values might come back capitalized or malformed from raw GPT
    const effortKey = insight.trainingRecommendation.estimatedEffort?.toLowerCase() || '';
    const effort = effortLabels[effortKey] || null;
    return (
        <div className="space-y-5 pt-4">
            {/* What's Happening */}
            <Section icon={Bot} title="What's Happening" color="text-blue-500">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.problem.description}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                    Frequency: {insight.problem.frequency} occurrences
                </div>
                {insight.problem.examples.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                        {insight.problem.examples.map((ex, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                                {ex}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {/* Caller Impact */}
            <Section icon={Users} title="Caller Impact" color="text-amber-500">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.callerImpact.description}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                    <MiniStat label="Frustrated" value={insight.callerImpact.frustratedCallers} />
                    <MiniStat label="Lost Bookings" value={insight.callerImpact.lostBookings} />
                    <MiniStat label="Transfers" value={insight.callerImpact.transfersTriggered} />
                </div>
            </Section>

            {/* Training Recommendation */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold section-heading-gradient">Training Recommendation</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {insight.trainingRecommendation.description}
                </p>
                <div className="rounded-lg border border-border bg-background/70 p-3 text-sm text-foreground leading-relaxed">
                    {insight.trainingRecommendation.specificFix}
                </div>
                {effort && (
                    <div className="mt-3">
                        <Badge variant="outline" className={cn('text-xs', effort.color)}>
                            Effort: {effort.label}
                        </Badge>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Recommendation Expanded Content ──────────────────────────────
function RecommendationContent({ insight }: { insight: Recommendation }) {
    return (
        <div className="space-y-5 pt-4">
            {/* Based On */}
            {insight.basedOn.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    Based on insights:
                    {insight.basedOn.map((ref) => (
                        <Badge key={ref} variant="outline" className="text-xs">
                            {ref}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Opportunity */}
            <Section icon={Lightbulb} title="Opportunity" color="text-emerald-500">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.opportunity.description}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 text-xs text-emerald-500 font-medium">
                    Potential impact: {insight.opportunity.potentialImpact}
                </div>
            </Section>

            {/* Implementation */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold section-heading-gradient flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    Implementation Plan
                </h4>
                <ImplList heading="Immediate (This Week)" items={insight.implementation.immediate} color="text-red-400" />
                <ImplList heading="Short Term (This Month)" items={insight.implementation.shortTerm} color="text-amber-400" />
                <ImplList heading="Ongoing" items={insight.implementation.ongoing} color="text-blue-400" />
            </div>

            {/* Success Metric */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider section-heading-gradient mb-1">
                    Success Metric
                </h4>
                <p className="text-sm text-foreground">{insight.successMetric}</p>
            </div>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────
function Section({
    icon: Icon,
    title,
    color,
    children,
}: {
    icon: React.ElementType;
    title: string;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="mb-2 flex items-center gap-2">
                <Icon className={cn('h-4 w-4', color)} />
                <h4 className="text-sm font-semibold section-heading-gradient">{title}</h4>
            </div>
            {children}
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-border bg-background/50 p-2 text-center">
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function ImplList({
    heading,
    items,
    color,
}: {
    heading: string;
    items: string | string[];
    color: string;
}) {
    const list = Array.isArray(items) ? items : items ? [items] : [];
    if (list.length === 0) return null;
    return (
        <div className="rounded-lg border border-border bg-background/50 p-3">
            <h5 className={cn('text-xs font-semibold uppercase tracking-wider mb-2', color)}>
                {heading}
            </h5>
            <ul className="space-y-1.5">
                {list.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── Main InsightCard ─────────────────────────────────────────────
export function InsightCard({ insight, type, defaultExpanded = false }: InsightCardProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const urgency = getUrgency(insight);
    const number = getNumber(insight);
    const title = getTitle(insight);
    const style = urgencyStyles[urgency];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'overflow-hidden rounded-xl border border-border bg-card transition-all duration-200',
                'border-l-4',
                style.border
            )}
        >
            {/* Header (always visible) — clickable */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
            >
                <Badge className={cn('shrink-0 text-[10px] font-bold uppercase tracking-wider', style.badge)}>
                    {style.label}
                </Badge>
                <span className="shrink-0 text-sm font-bold text-muted-foreground">#{number}</span>
                <span className="flex-1 text-sm font-medium text-foreground leading-snug line-clamp-1">
                    {title}
                </span>
                <ChevronDown
                    className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                        expanded && 'rotate-180'
                    )}
                />
            </button>

            {/* Expanded content */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-border px-4 pb-5">
                            {type === 'revenue' && <RevenueContent insight={insight as RevenueInsight} />}
                            {type === 'bot' && <BotIssueContent insight={insight as BotIssue} />}
                            {type === 'recommendation' && (
                                <RecommendationContent insight={insight as Recommendation} />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
