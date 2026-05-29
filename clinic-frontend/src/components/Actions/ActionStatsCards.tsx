'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ActionStatsResponse } from '@/types/actions';

interface StatCardProps {
    label: string;
    count: number;
    changePct: number;
    isOverdue?: boolean;
}

function StatCard({ label, count, changePct, isOverdue }: StatCardProps) {
    const isPositiveChange = changePct > 0;
    // For overdue, positive change is bad (more overdue items)
    const changeColor = isOverdue
        ? (isPositiveChange ? 'text-red-400' : 'text-emerald-400')
        : (isPositiveChange ? 'text-emerald-400' : 'text-red-400');

    return (
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-premium-sm card-glow card-shine relative overflow-hidden group">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <p className={cn('mt-1.5 sm:mt-2 text-xl sm:text-2xl font-semibold', isOverdue && count > 0 && 'text-red-500')}>
                {count}
            </p>
            {changePct !== 0 && (
                <div className={cn('mt-1 flex items-center gap-1 text-[10px] sm:text-xs', changeColor)}>
                    {isPositiveChange ? (
                        <TrendingUp className="h-3 w-3" />
                    ) : (
                        <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(changePct).toFixed(0)}% vs prev</span>
                </div>
            )}
        </div>
    );
}

function StatsCardsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-2 h-7 w-12" />
                    <Skeleton className="mt-1 h-3 w-24" />
                </div>
            ))}
        </div>
    );
}

interface ActionStatsCardsProps {
    data: ActionStatsResponse | undefined;
    isLoading: boolean;
}

export function ActionStatsCards({ data, isLoading }: ActionStatsCardsProps) {
    if (isLoading || !data) {
        return <StatsCardsSkeleton />;
    }

    return (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard
                label="Open Actions"
                count={data.open_actions.count}
                changePct={data.open_actions.change_pct}
            />
            <StatCard
                label="Due Today"
                count={data.due_today.count}
                changePct={data.due_today.change_pct}
            />
            <StatCard
                label="Overdue"
                count={data.overdue.count}
                changePct={data.overdue.change_pct}
                isOverdue
            />
            {data.top_types.slice(0, 2).map((type) => (
                <StatCard
                    key={type.request_type}
                    label={type.label}
                    count={type.count}
                    changePct={type.change_pct}
                />
            ))}
        </div>
    );
}
