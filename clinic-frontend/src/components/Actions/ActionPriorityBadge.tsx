'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActionPriority } from '@/types/actions';

const PRIORITY_COLORS: Record<ActionPriority, string> = {
    high: 'border-red-500/50 text-red-400 bg-red-500/10',
    medium: 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10',
    low: 'border-slate-500/50 text-slate-300 bg-slate-500/10',
};

const PRIORITY_LABELS: Record<ActionPriority, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

interface ActionPriorityBadgeProps {
    priority: ActionPriority;
    className?: string;
}

export function ActionPriorityBadge({ priority, className }: ActionPriorityBadgeProps) {
    const normalizedPriority = priority?.toLowerCase() as ActionPriority || 'medium';
    return (
        <Badge variant="outline" className={cn('text-xs', PRIORITY_COLORS[normalizedPriority], className)}>
            {PRIORITY_LABELS[normalizedPriority]}
        </Badge>
    );
}
