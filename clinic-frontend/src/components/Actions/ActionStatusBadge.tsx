'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActionStatus } from '@/types/actions';
import { ACTION_STATUS_LABELS } from '@/types/actions';

import { ChevronDown } from 'lucide-react';

const STATUS_COLORS: Record<ActionStatus, string> = {
    open: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
    in_progress: 'border-blue-500/50 text-blue-400 bg-blue-500/10',
    waiting_on_guest: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
    resolved: 'border-slate-500/50 text-slate-400 bg-slate-500/10',
};

interface ActionStatusBadgeProps {
    status: ActionStatus;
    className?: string;
    showChevron?: boolean;
}

export function ActionStatusBadge({ status, className, showChevron = false }: ActionStatusBadgeProps) {
    return (
        <Badge variant="outline" className={cn('text-xs font-medium gap-1.5 py-1 px-2.5 flex items-center w-fit', STATUS_COLORS[status], className)}>
            {ACTION_STATUS_LABELS[status]}
            {showChevron && <ChevronDown className="h-3 w-3 opacity-70" />}
        </Badge>
    );
}
