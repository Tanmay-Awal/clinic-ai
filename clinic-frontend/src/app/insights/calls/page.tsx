'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import AppLayout from '@/components/Layouts/AppLayout';
import { CallInsightsHeader } from '@/components/insights/calls/CallInsightsHeader';
import { ExecutiveSummaryCard } from '@/components/insights/calls/ExecutiveSummaryCard';
import { StatsRow } from '@/components/insights/calls/StatsRow';
import { InsightsTabNavigation } from '@/components/insights/calls/InsightsTabNavigation';
import { InsightsList } from '@/components/insights/calls/InsightsList';
import { CallPatternsSection } from '@/components/insights/calls/CallPatternsSection';
import { InsightsLoadingState } from '@/components/insights/calls/InsightsLoadingState';
import { InsightsEmptyState } from '@/components/insights/calls/InsightsEmptyState';
import { callInsightsApi } from '@/lib/api/call-insights';
import type { CallInsightsReport, InsightTabType } from '@/types/callInsights';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore, hasActionsOnlyRole } from '@/store/authStore';
import { DisabledPageMessage } from '@/components/DisabledPageMessage';

const PERIOD_DAYS_MAP: Record<string, number> = {
    '7days': 7,
    '14days': 14,
    '30days': 30,
};

const POLL_INTERVAL_MS = 3000;

export default function CallInsightsPage() {
    const { user } = useAuthStore();
    const isActionsRole = hasActionsOnlyRole(user);

    const { toast } = useToast();
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── State ──────────────────────────────────────────────────────
    const [report, setReport] = useState<CallInsightsReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<InsightTabType>('revenue');
    const [selectedPeriod, setSelectedPeriod] = useState('7days');
    const [totalCallsEstimate, setTotalCallsEstimate] = useState<number>(0);
    const [dashboardMode, setDashboardMode] = useState<'reservation' | 'feedback'>('reservation');

    // ─── Sync with dashboard category ──────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem('dashboardCategory');
        if (saved === 'feedback') {
            setDashboardMode('feedback');
        } else {
            setDashboardMode('reservation');
        }
    }, []);

    // ─── Cleanup polling on unmount ─────────────────────────────────
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // ─── Load latest report on mount ────────────────────────────────
    useEffect(() => {
        loadLatestReport();
    }, []);

    const loadLatestReport = async () => {
        try {
            setIsLoading(true);
            const data = await callInsightsApi.getReports(undefined, 1);
            if (data.reports.length > 0 && data.reports[0].status === 'completed' && data.reports[0].report_data) {
                setReport(data.reports[0].report_data);
            }
        } catch {
            // Silently fail — user will see empty state
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Poll for report completion ─────────────────────────────────
    const startPolling = useCallback((reportId: number) => {
        if (pollRef.current) clearInterval(pollRef.current);

        pollRef.current = setInterval(async () => {
            try {
                const data = await callInsightsApi.getReport(reportId);
                if (data.status === 'completed' && data.report?.report_data) {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setReport(data.report.report_data as CallInsightsReport);
                    setIsGenerating(false);
                    toast({
                        title: 'Insights Generated',
                        description: `Analyzed ${(data.report.report_data as CallInsightsReport)?.statistics?.totalCalls ?? data.report.total_calls} calls.`,
                    });
                } else if (data.status === 'failed') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setIsGenerating(false);
                    toast({
                        title: 'Generation Failed',
                        description: data.error || 'An error occurred while generating insights.',
                        variant: 'destructive',
                    });
                }
            } catch {
                if (pollRef.current) clearInterval(pollRef.current);
                setIsGenerating(false);
                toast({
                    title: 'Error',
                    description: 'Failed to check report status.',
                    variant: 'destructive',
                });
            }
        }, POLL_INTERVAL_MS);
    }, [toast]);

    // ─── Generate Report ────────────────────────────────────────────
    const handleRunNow = useCallback(async () => {
        setIsGenerating(true);
        setReport(null);

        try {
            const periodDays = PERIOD_DAYS_MAP[selectedPeriod] ?? 7;
            const data = await callInsightsApi.generateReport({
                periodDays,
                forceRegenerate: true,
            });

            if (data.status === 'completed') {
                // Report was cached — fetch it directly
                const reportData = await callInsightsApi.getReport(data.reportId);
                if (reportData.report?.report_data) {
                    setReport(reportData.report.report_data as CallInsightsReport);
                    setIsGenerating(false);
                    toast({
                        title: 'Insights Ready',
                        description: 'Loaded your most recent insights report.',
                    });
                    return;
                }
            }

            if (data.status === 'no_agents') {
                setIsGenerating(false);
                toast({
                    title: 'No Agents',
                    description: 'No voice agents are assigned to your account.',
                    variant: 'destructive',
                });
                return;
            }

            // Status is 'processing' — start polling
            setTotalCallsEstimate(0);
            startPolling(data.reportId);
        } catch {
            setIsGenerating(false);
            toast({
                title: 'Error',
                description: 'Failed to start insights generation.',
                variant: 'destructive',
            });
        }
    }, [selectedPeriod, startPolling, toast]);

    const handleExportPdf = useCallback(() => {
        toast({
            title: 'Coming Soon',
            description: 'PDF export will be available in a future update.',
        });
    }, [toast]);

    // ── Role gate (after all hooks) ──
    if (isActionsRole) {
        return (
            <AppLayout>
                <DisabledPageMessage title="Insights Disabled" />
            </AppLayout>
        );
    }

    // ─── Render ─────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex flex-1 items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="flex flex-1 flex-col h-full">
                {/* Header */}
                <CallInsightsHeader
                    botName={report?.metadata.botName ?? 'Voice Bot'}
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={setSelectedPeriod}
                    onRunNow={handleRunNow}
                    onExportPdf={handleExportPdf}
                    isGenerating={isGenerating}
                    lastGeneratedAt={report?.metadata.generatedAt}
                />

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    <div className="mx-auto max-w-5xl space-y-6 p-6">
                        {/* Loading State */}
                        {isGenerating && (
                            <InsightsLoadingState totalCalls={totalCallsEstimate} />
                        )}

                        {/* Empty State */}
                        {!isGenerating && !report && (
                            <InsightsEmptyState onRunNow={handleRunNow} />
                        )}

                        {/* Report Content */}
                        {!isGenerating && report && (
                            <>
                                {/* Executive Summary */}
                                <ExecutiveSummaryCard
                                    criticalFinding={report.executiveSummary.criticalFinding}
                                    revenueImpact={report.executiveSummary.revenueImpact}
                                    immediateAction={report.executiveSummary.immediateAction}
                                    periodStart={report.metadata.periodStart}
                                    periodEnd={report.metadata.periodEnd}
                                />

                                {/* Stats Row */}
                                <StatsRow
                                    stats={{
                                        totalCalls: report.statistics.totalCalls,
                                        successfulBookings: report.statistics.successfulBookings,
                                        conversionRate: report.statistics.conversionRate,
                                        transferRate: report.statistics.transferRate,
                                        voicemailRate: report.statistics.voicemailRate,
                                        totalCoversBooked: report.statistics.totalCoversBooked,
                                    }}
                                    botName={report.metadata.botName}
                                    mode={dashboardMode}
                                />

                                {/* Tab Navigation */}
                                <InsightsTabNavigation
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    revenueCount={report.revenueInsights.length}
                                    recommendationCount={report.strategicRecommendations.filter(r => !r.basedOn?.some(id => id.startsWith('BP-'))).length}
                                />

                                {/* Insights List */}
                                <InsightsList
                                    type={activeTab}
                                    revenueInsights={report.revenueInsights}
                                    botIssues={report.botPerformanceIssues}
                                    recommendations={report.strategicRecommendations}
                                />

                                {/* Call Patterns */}
                                <CallPatternsSection patterns={report.callPatterns} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
