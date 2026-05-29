'use client';
import { useState, useEffect, useCallback, useRef } from "react";
import { InsightsHeader, type InsightCategory } from "@/components/InsightsHeader";
import { callInsightsApi } from "@/lib/api/call-insights";
import AppLayout from '@/components/Layouts/AppLayout';
import { AlertCircle, Loader2, Ban, Phone } from "lucide-react";
import { useOrganisationSettings } from '@/hooks/useOrganisationSettings';
import type { CallInsightsReport } from '@/types/callInsights';
import { useAuthStore, hasActionsOnlyRole } from '@/store/authStore';
import { DisabledPageMessage } from '@/components/DisabledPageMessage';
import { Button } from "@/components/ui/button";

// Call Insights Components
import { CallInsightsHistorySheet } from '@/components/insights/calls/CallInsightsHistorySheet';
import { ExecutiveSummaryCard } from '@/components/insights/calls/ExecutiveSummaryCard';
import { StatsRow } from '@/components/insights/calls/StatsRow';
import { InsightsTabNavigation } from '@/components/insights/calls/InsightsTabNavigation';
import { InsightsList } from '@/components/insights/calls/InsightsList';
import { CallPatternsSection } from '@/components/insights/calls/CallPatternsSection';
import { InsightsEmptyState } from '@/components/insights/calls/InsightsEmptyState';
import type { InsightTabType } from '@/types/callInsights';
import { DEFAULT_DISPLAY_TIMEZONE, formatDateInTimezone, parseTimestampAsUtc } from '@/lib/timezone';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 60;

export default function Insights() {
  const { settings, isLoading: isLoadingSettings } = useOrganisationSettings();
  const { user } = useAuthStore();
  const isActionsRole = hasActionsOnlyRole(user);
  const [category, setCategory] = useState<InsightCategory>("Reservation");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchIdRef = useRef(0);

  // Call Insights state
  const [callReport, setCallReport] = useState<CallInsightsReport | null>(null);
  const [callLoading, setCallLoading] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  const [activeInsightTab, setActiveInsightTab] = useState<InsightTabType>('revenue');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historicalPeriod, setHistoricalPeriod] = useState<{ start: string; end: string } | null>(null);

  const activeAgentId =
    category === "Reservation"
      ? settings?.insight_agent_ids?.reservation
      : settings?.insight_agent_ids?.feedback;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const fetchLatestCompletedReport = useCallback(async (showLoading = true, agentId?: string) => {
    const fetchId = ++fetchIdRef.current;
    
    if (!agentId) {
      setCallReport(null);
      setHistoricalPeriod(null);
      setCallError(null);
      if (showLoading) setCallLoading(false);
      return false;
    }
    if (showLoading) setCallLoading(true);
    setCallError(null);
    try {
      const data = await callInsightsApi.getReports(agentId, 50);
      
      // Check if this is still the latest fetch request
      if (fetchId !== fetchIdRef.current) return false;

      const completedReports = data.reports.filter(r => r.status === 'completed' && r.report_data);
      if (completedReports.length > 0) {
        const latestReport = completedReports.sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0];
        setCallReport(latestReport.report_data);
        setHistoricalPeriod(null);
        return true;
      }
      setCallReport(null);
      setHistoricalPeriod(null);
      return false;
    } catch (error) {
      if (fetchId !== fetchIdRef.current) return false;
      console.error("Failed to fetch call reports:", error);
      setCallError("Failed to load call insights.");
      setCallReport(null);
      setHistoricalPeriod(null);
      return false;
    } finally {
      if (showLoading && fetchId === fetchIdRef.current) setCallLoading(false);
    }
  }, []);

  // Fetch latest call insights report for active tab/agent
  useEffect(() => {
    if (isLoadingSettings || !settings?.enable_ai_insights) return;

    // Issue #3: Stop any in-flight polling from the previous tab
    if (pollRef.current) clearInterval(pollRef.current);

    // Issue #1: Clear stale state so previous tab's data doesn't flash
    setActiveInsightTab('revenue');
    setCallReport(null);
    setHistoricalPeriod(null);
    setCallError(null);

    fetchLatestCompletedReport(true, activeAgentId);
  }, [category, activeAgentId, fetchLatestCompletedReport, isLoadingSettings, settings?.enable_ai_insights]);

  // Poll a report until it's complete
  const pollReport = useCallback((reportId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let polls = 0;

    pollRef.current = setInterval(async () => {
      polls++;
      try {
        const result = await callInsightsApi.getReport(reportId);
        if (result.status === 'completed' && result.report) {
          if (pollRef.current) clearInterval(pollRef.current);
          setCallReport(result.report.report_data);
          setHistoricalPeriod(null);
          setCallLoading(false);
        } else if (result.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setCallError(result.error || 'Report generation failed.');
          setCallLoading(false);
        }
      } catch {
        // Keep polling
      }
      if (polls >= MAX_POLLS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setCallError('Report generation timed out.');
        setCallLoading(false);
      }
    }, POLL_INTERVAL_MS);
  }, []);

  // Handle "Run Now" / Generate
  const handleRunNow = useCallback(async () => {
    setCallLoading(true);
    setCallError(null);
    try {
      const data = await callInsightsApi.generateReport({
        agentId: activeAgentId,
        periodDays: 7,
        forceRegenerate: true,
      });
      if (data.status === 'completed') {
        // Cached report — fetch it manually as useEffect won't trigger (tab stayed the same)
        await fetchLatestCompletedReport(false, activeAgentId);
        return;
      }
      if (data.status === 'no_agents') {
        setCallError('No voice agents are assigned to your account.');
        setCallLoading(false);
        return;
      }

      // Status is 'processing' — start polling
      pollReport(data.reportId);
    } catch (error) {
      console.error("Failed to generate report:", error);
      setCallError("Failed to generate insights.");
      setCallLoading(false);
    }
  }, [activeAgentId, fetchLatestCompletedReport, pollReport]);

  const handleSelectHistoricalReport = useCallback((pastReport: CallInsightsReport, start: string, end: string) => {
    setCallReport(pastReport);
    setHistoricalPeriod({ start, end });
    setActiveInsightTab('revenue');
  }, []);

  const loadLatestReport = () => fetchLatestCompletedReport(true, activeAgentId);

  // ── Role gate (after all hooks) ──
  if (isActionsRole) {
    return (
      <AppLayout>
        <DisabledPageMessage title="Insights Disabled" />
      </AppLayout>
    );
  }

  if (isLoadingSettings) {
    return (
      <AppLayout>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!settings?.enable_ai_insights) {
    return (
      <AppLayout>
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
          <div className="rounded-full bg-muted p-4">
            <Ban className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">AI Insights Disabled</h2>
            <p>This feature has been disabled from the Admin Panel.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col min-h-full">
        <InsightsHeader
          category={category}
          setCategory={setCategory}
          reportData={callReport}
          onOpenHistory={() => setIsHistoryOpen(true)}
          tabLabels={{
            Reservation: settings?.insight_agent_ids?.reservation_label ?? 'Reservation',
            Feedback: settings?.insight_agent_ids?.feedback_label ?? 'Feedback',
          }}
        />

        <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full lg:px-10 py-8">
          {/* ─── Call Insights View ─────────────────────────── */}
          <>
            {historicalPeriod && !callLoading && callReport && (
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-3 rounded-lg flex items-center justify-between mb-6">
                <div className="text-sm font-medium">
                  Viewing Past Report: {formatDateInTimezone(parseTimestampAsUtc(historicalPeriod.start), { day: 'numeric', month: 'short', year: 'numeric' }, DEFAULT_DISPLAY_TIMEZONE)} - {formatDateInTimezone(parseTimestampAsUtc(historicalPeriod.end), { day: 'numeric', month: 'short', year: 'numeric' }, DEFAULT_DISPLAY_TIMEZONE)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                  onClick={loadLatestReport}
                >
                  Return to Latest
                </Button>
              </div>
            )}
            {callLoading ? (
              <div className="flex h-64 flex-col items-center justify-center text-muted-foreground gap-3 animate-pulse">
                <Phone className="h-10 w-10 opacity-50" />
                <p className="text-lg font-medium">Loading insights...</p>
                <p className="text-sm">Fetching the latest analysis from the server.</p>
              </div>
            ) : callError ? (
              <div className="flex h-64 flex-col items-center justify-center text-muted-foreground gap-3">
                <AlertCircle className="h-10 w-10 opacity-50 text-red-400" />
                <p className="text-lg font-medium">Error</p>
                <p className="text-sm">{callError}</p>
              </div>
            ) : callReport ? (
              <div className="space-y-6">
                <ExecutiveSummaryCard
                  criticalFinding={callReport.executiveSummary.criticalFinding}
                  revenueImpact={callReport.executiveSummary.revenueImpact}
                  immediateAction={callReport.executiveSummary.immediateAction}
                  periodStart={callReport.metadata.periodStart}
                  periodEnd={callReport.metadata.periodEnd}
                />
                <StatsRow 
                    stats={callReport.statistics} 
                    botName={callReport.metadata.botName}
                />
                <InsightsTabNavigation
                  activeTab={activeInsightTab}
                  onTabChange={setActiveInsightTab}
                  revenueCount={callReport.revenueInsights.length}
                  recommendationCount={callReport.strategicRecommendations.filter(r => !r.basedOn?.some(id => id.startsWith('BP-'))).length}
                />
                <InsightsList
                  type={activeInsightTab}
                  revenueInsights={callReport.revenueInsights}
                  botIssues={callReport.botPerformanceIssues}
                  recommendations={callReport.strategicRecommendations}
                />
                <CallPatternsSection patterns={callReport.callPatterns} />
              </div>
            ) : !activeAgentId ? (
              <div className="flex h-64 flex-col items-center justify-center text-muted-foreground gap-3">
                <p className="text-lg font-medium">No {category} insights for now</p>
                <p className="text-sm text-center max-w-md">
                  We couldn&apos;t find a mapped {category.toLowerCase()} insights agent for your account yet.
                </p>
              </div>
            ) : (
              <InsightsEmptyState onRunNow={handleRunNow} />
            )}
          </>
        </div>
      </div>

      <CallInsightsHistorySheet
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        agentId={activeAgentId}
        onSelectReport={handleSelectHistoricalReport}
      />
    </AppLayout>
  );
}
