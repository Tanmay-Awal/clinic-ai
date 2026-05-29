'use client';

import { InsightCard } from './InsightCard';
import type { RevenueInsight, BotIssue, Recommendation, InsightTabType } from '@/types/callInsights';

interface InsightsListProps {
    type: InsightTabType;
    revenueInsights: RevenueInsight[];
    botIssues: BotIssue[];
    recommendations: Recommendation[];
}

export function InsightsList({
    type,
    revenueInsights,
    botIssues,
    recommendations,
}: InsightsListProps) {
    const items =
        type === 'revenue'
            ? revenueInsights
            : recommendations.filter(r => !r.basedOn?.some(id => id.startsWith('BP-')));

    const cardType = type === 'revenue' ? 'revenue' : 'recommendation';

    if (items.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                No {type === 'revenue' ? 'revenue insights' : 'recommendations'} found.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item, index) => (
                <InsightCard
                    key={item.id}
                    insight={item}
                    type={cardType}
                    defaultExpanded={index === 0}
                />
            ))}
        </div>
    );
}
