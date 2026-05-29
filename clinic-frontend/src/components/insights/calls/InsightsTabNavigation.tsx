'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, Lightbulb } from 'lucide-react';
import type { InsightTabType } from '@/types/callInsights';

interface InsightsTabNavigationProps {
    activeTab: InsightTabType;
    onTabChange: (tab: InsightTabType) => void;
    revenueCount: number;
    recommendationCount: number;
}

const tabs = [
    { id: 'revenue' as const, label: 'Revenue Insights', icon: TrendingUp },
    { id: 'recommendations' as const, label: 'Recommendations', icon: Lightbulb },
];

export function InsightsTabNavigation({
    activeTab,
    onTabChange,
    revenueCount,
    recommendationCount,
}: InsightsTabNavigationProps) {
    const counts: Record<InsightTabType, number> = {
        revenue: revenueCount,
        recommendations: recommendationCount,
    };

    return (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-1.5">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
                            isActive
                                ? 'bg-background text-foreground shadow-sm border border-border/50'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        )}
                    >
                        <Icon className={cn('h-4 w-4', isActive
                            ? tab.id === 'recommendations' ? 'text-amber-500' : 'text-teal-600 dark:text-teal-400'
                            : ''
                        )} />
                        <span className={cn('hidden sm:inline', isActive
                            ? tab.id === 'recommendations'
                                ? 'font-semibold text-amber-700 dark:text-amber-400'
                                : 'section-heading-gradient font-semibold'
                            : ''
                        )}>{tab.label}</span>
                        <span
                            className={cn(
                                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                                isActive
                                    ? tab.id === 'recommendations'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'bg-teal-500/10 text-teal-700 dark:text-teal-400'
                                    : 'bg-muted text-muted-foreground'
                            )}
                        >
                            {counts[tab.id]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
