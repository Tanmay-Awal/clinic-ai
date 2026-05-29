'use client';

import { useState } from 'react';
import { Loader2, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionStatsCards } from '@/components/Actions/ActionStatsCards';
import { ActionTable } from '@/components/Actions/ActionTable';
import { NewActionDialog } from '@/components/Actions/NewActionDialog';
import { useActionStats } from '@/hooks/use-actions';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import type { ActionStatsRequest } from '@/types/actions';

export function ActionsPageContent() {

    const statsParams: ActionStatsRequest = {};
    const { data: stats, isLoading: statsLoading, isFetching: statsFetching, refetch: refetchStats } = useActionStats(statsParams);
    const { permission, isEnabled, subscribe, unsubscribe, isLoading: pushLoading, isSupported } = usePushNotifications();

    return (
        <div className="flex flex-col min-h-dvh overflow-y-auto md:h-dvh md:max-h-dvh md:overflow-hidden p-4 md:p-6">
            <div className="flex flex-col md:h-full space-y-3 md:space-y-4 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Action Center</h1>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
                            Manage and track guest follow-ups and resolutions
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSupported && isEnabled && (
                            <button
                                onClick={unsubscribe}
                                disabled={pushLoading}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                                title="Click to disable notifications"
                            >
                                {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                                Notifications On
                            </button>
                        )}
                        {isSupported && permission === 'denied' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                                <BellOff className="h-3 w-3" />
                                Blocked
                            </span>
                        )}
                        {statsFetching && !statsLoading && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                        )}
                        <Button variant="outline" size="sm" onClick={() => refetchStats()}>
                            Refresh
                        </Button>
                        <NewActionDialog />
                    </div>
                </div>

                {/* Push notification banner — show when not enabled (never asked, or opted out) */}
                {isSupported && !isEnabled && permission !== 'denied' && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Enable notifications for new actions, overdue items, and repeat callers.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={subscribe}
                            disabled={pushLoading}
                            className="self-end sm:self-auto shrink-0"
                        >
                            {pushLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Enable
                        </Button>
                    </div>
                )}

                {/* Stats Cards */}
                <ActionStatsCards data={stats} isLoading={statsLoading} />

                {/* Actions Table — on mobile it flows naturally; on md+ it fills remaining space and scrolls internally */}
                <div className="md:flex-1 md:min-h-0 md:overflow-y-auto">
                    <ActionTable onRefreshNeeded={refetchStats} />
                </div>
            </div>
        </div>
    );
}
