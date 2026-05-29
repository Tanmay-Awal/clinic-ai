'use client';
import { useState, use, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Clock, RefreshCw, Tag, Loader2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { TranscriptViewer } from '@/components/TranscriptViewer';
import { AIInsightsCard } from '@/components/AIInsightsCard';
import { CategoryPanel } from '@/components/CategoryPanel';
import { SideDrawer } from '@/components/SideDrawer';
import { ResolutionBlock } from '@/components/ResolutionBlock';
import AppLayout from '@/components/Layouts/AppLayout';
import { useCall } from '@/hooks/use-calls';
import { useCallActions } from '@/hooks/use-actions';
import { ActionStatusBadge } from '@/components/Actions/ActionStatusBadge';
import { ActionPriorityBadge } from '@/components/Actions/ActionPriorityBadge';
import { ActionStatus, ActionPriority, ActionRequestType, ACTION_REQUEST_TYPE_LABELS } from '@/types/actions';
import { useAuthStore, hasActionsOnlyRole } from '@/store/authStore';
import { DisabledPageMessage } from '@/components/DisabledPageMessage';
import toast from 'react-hot-toast';
import { DEFAULT_DISPLAY_TIMEZONE, formatDateInTimezone, parseTimestampAsUtc } from '@/lib/timezone';
import { useOrganisationSettings } from '@/hooks/useOrganisationSettings';

// Get API base URL from environment variable
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3021/api';

// Helper function to normalize recording URL
// If it's an ElevenLabs recording path, construct full URL with API base
// If it's already a full URL with API base, use as-is
// Otherwise, use as-is (for Retell URLs)
function normalizeRecordingUrl(url: string | null | undefined): string | undefined {
  if (!url || !url.trim()) {
    return undefined;
  }

  const trimmedUrl = url.trim();

  // Check if it's already a full URL with API base
  if (trimmedUrl.includes(API_BASE_URL) && (trimmedUrl.includes('/elevenlabs/recording/') || trimmedUrl.includes('/livekit/recording/'))) {
    // Already a full URL, use as-is
    return trimmedUrl;
  }

  // Check if it's a recording proxy path (relative path)
  if (trimmedUrl.startsWith('/elevenlabs/recording/') || trimmedUrl.startsWith('/livekit/recording/')) {
    // Extract the path and append to API base
    // E.g., "/livekit/recording/348" -> "http://.../api/livekit/recording/348"
    // Remove leading slash if API_BASE_URL ends with one, to avoid double slashes
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${baseUrl}${trimmedUrl}`;
  }

  // For Retell or other URLs, use as-is
  return trimmedUrl;
}

export default function CallDetail({ params }: { params: Promise<{ callId: string }> }) {
  const router = useRouter();
  const { callId } = use(params);
  const { user } = useAuthStore();
  const isActionsRole = hasActionsOnlyRole(user);
  const { data: call, isLoading, isError, error } = useCall(callId);
  const { data: callActionsData } = useCallActions(callId);
  const { settings: orgSettings } = useOrganisationSettings();
  const displayTimezone = orgSettings?.default_timezone || DEFAULT_DISPLAY_TIMEZONE;
  const [currentTime, setCurrentTime] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Memoize handleSeek to prevent unnecessary re-renders
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Show error toast if there's an error (useEffect to avoid render-time side effects)
  useEffect(() => {
    if (isError && error) {
      toast.error(error.message || 'Failed to load call details');
    }
  }, [isError, error]);

  // Convert transcripts to utterances format for TranscriptViewer
  // Since API doesn't provide timestamps, we'll estimate them based on order
  // Memoize to prevent recalculation on every render
  const utterances = useMemo(() => {
    if (!call?.transcripts) return [];
    const callStartMs = call.call_start_time ? new Date(call.call_start_time).getTime() : 0;
    return call.transcripts.map((t, index) => {
      let timestamp: number;
      if (t.created_at && callStartMs) {
        timestamp = Math.max(0, (new Date(t.created_at).getTime() - callStartMs) / 1000);
      } else {
        timestamp = index * 3;
      }
      return {
        speaker: (t.role === 'agent' || t.role === 'assistant' ? 'bot' : 'caller') as 'caller' | 'bot',
        text: t.transcript,
        timestamp,
        confidence: 1,
        has_redaction: false,
      };
    });
  }, [call?.transcripts, call?.call_start_time]);

  // Calculate duration in seconds - memoize to prevent recalculation
  const durationSeconds = useMemo(() => {
    if (!call) return 0;
    const durationMs = typeof call.call_duration_ms === 'string'
      ? parseInt(call.call_duration_ms, 10)
      : call.call_duration_ms || 0;
    return Math.floor(durationMs / 1000);
  }, [call?.call_duration_ms]);

  // Format duration for display
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Format phone number - remove patterns, country codes, braces, dashes, and spaces
  const formatPhoneNumber = useCallback((phoneNumber: string | null | undefined) => {
    if (!phoneNumber) return 'N/A';
    // Remove patterns like "******2+1+", country codes (+91, +44), braces, dashes, and spaces
    return phoneNumber
      .replace(/\*{2,}\d+\+\d+\+/g, '') // Remove patterns like "******2+1+"
      .replace(/\+91\s*/g, '')
      .replace(/\+44\s*/g, '')
      .replace(/[()]/g, '')
      .replace(/-/g, '')
      .replace(/\s+/g, '') // Remove all spaces
      .trim();
  }, []);

  // Get sentiment score from analysis - handle both string and number - memoize
  const sentimentScore = useMemo(() => {
    if (!call?.analysis || call.analysis.user_sentiment === null || call.analysis.user_sentiment === undefined) {
      return 0.5; // Default neutral score
    }

    const sentiment = call.analysis.user_sentiment;

    // If sentiment is a number, use it directly (assuming 0-1 scale)
    if (typeof sentiment === 'number') {
      // Ensure it's between 0 and 1, or convert from -1 to 1 scale
      if (sentiment >= -1 && sentiment <= 1) {
        // Convert from -1 to 1 scale to 0 to 1 scale
        return sentiment >= 0 ? sentiment : (sentiment + 1) / 2;
      }
      // If already 0-1 scale, use as is
      return Math.max(0, Math.min(1, sentiment));
    }

    // If sentiment is a string, convert to numeric score
    if (typeof sentiment === 'string') {
      const lowerSentiment = sentiment.toLowerCase();
      if (lowerSentiment === 'positive') return 0.8;
      if (lowerSentiment === 'negative') return 0.2;
      if (lowerSentiment === 'neutral') return 0.5;
      // Try to parse as number string
      const parsed = parseFloat(sentiment);
      if (!isNaN(parsed)) {
        // Handle -1 to 1 scale or 0 to 1 scale
        if (parsed >= -1 && parsed <= 1) {
          return parsed >= 0 ? parsed : (parsed + 1) / 2;
        }
        return Math.max(0, Math.min(1, parsed));
      }
    }

    // Default fallback
    return 0.5;
  }, [call?.analysis?.user_sentiment]);

  // ── Role gate (after all hooks) ──
  if (isActionsRole) {
    return (
      <AppLayout>
        <DisabledPageMessage title="Calls Disabled" />
      </AppLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-1 flex-col min-h-dvh bg-background">
          <div className="sticky top-0 z-30 h-16 border-b border-border bg-background flex items-center px-6">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-4 w-32 ml-4" />
          </div>
          <div className="flex flex-1 p-6">
            <div className="flex-1 space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <div className="w-[50%] pl-6 space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (isError || !call) {
    return (
      <AppLayout>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Call not found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error?.message || 'The call you are looking for does not exist.'}
            </p>
            <Button onClick={() => router.push('/calls')} className="mt-4">
              Back to Calls
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col min-h-dvh bg-background">
        {/* Sticky Header Bar */}
        <div className="sticky top-0 z-30 min-h-16 py-2 border-b border-border bg-background flex items-center px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push('/calls');
              }
            }}
            className="mr-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <nav className="flex items-center gap-1 lg:gap-2 text-sm flex-1 min-w-0">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/calls');
                }
              }}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 hidden sm:block"
            >
              Calls
            </button>
            <span className="text-muted-foreground shrink-0 hidden sm:block">→</span>
            <span className="text-foreground truncate font-medium">
              {(call.analysis?.name && call.analysis.name !== 'null')
                ? call.analysis.name
                : (call.analysis?.guest_name && call.analysis.guest_name !== 'null')
                  ? call.analysis.guest_name
                  : (call?.display_mobile_number ? formatPhoneNumber(call.display_mobile_number) : null) || call.id}
            </span>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0 flex-wrap justify-end ml-2">
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
              <span className="hidden md:flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {call.call_direction}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" />
                {formatDuration(durationSeconds)}
              </span>
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {call.call_status}
              </Badge>
            </div>

            {/* <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled
                className="opacity-40"
                title="Coming soon"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Re-transcribe
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="opacity-40"
                title="Coming soon"
              >
                Re-summarize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDrawerOpen(true)}
                className="relative"
              >
                <Tag className="h-3 w-3 mr-1" />
                Tags
              </Button>
            </div> */}
          </div>
        </div>

        {/* Main Content - 2 Column Layout */}
        <div className="flex flex-col lg:flex-row relative">

          <div className="flex-1 flex flex-col w-full lg:max-w-[50%] p-4 lg:p-6 space-y-4 lg:space-y-6 lg:overflow-y-auto">
            {/* Waveform Player - Sticky */}
            <div className="sticky top-0 z-10 rounded-2xl border border-border bg-card p-6 mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Recording
              </h3>
              <WaveformPlayer
                durationSeconds={durationSeconds}
                currentTime={currentTime}
                onSeek={handleSeek}
                asrConfidence={utterances.map(() => 1)} // Default confidence since API doesn't provide it
                audioUrl={
                  normalizeRecordingUrl(call.recording_url) ||
                  normalizeRecordingUrl(call.recording_multi_channel_url)
                }
              />
            </div>

            {/* Transcript */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Transcript
              </h3>
              <TranscriptViewer
                utterances={utterances}
                currentTime={currentTime}
                onSeek={setCurrentTime}
              />
            </div>
          </div>

          {/* Right Column - AI Insights + Category Panel */}
          <div className="w-full lg:w-[50%] p-4 lg:p-6 space-y-4 lg:space-y-6 border-t lg:border-t-0 lg:border-l border-border lg:sticky lg:top-16 lg:h-dvh lg:overflow-y-auto">
            <AIInsightsCard
              summary={call.analysis?.call_summary || ''}
              sentimentScore={sentimentScore}
              entities={[]}
              actionItems={[]}
              riskFlags={[]}
              userSentiment={call.analysis?.user_sentiment}
              sentimentPercentage={call.analysis?.sentiment_percentage}
              sentimentMeter={call.analysis?.sentiment_meter}
              callSuccessful={call.analysis?.call_successful}
              topQueries={call.analysis?.top_queries}
              location={call.analysis?.location}
              name={call.analysis?.name}
              contactNumber={call.analysis?.contact_number}
              reservationType={call.analysis?.reservation_type}
              topAskClass={call.analysis?.top_ask_class}
              maxBookingCategory={call.analysis?.max_booking_category}
              notes={call.analysis?.notes}
              specialRequests={call.analysis?.special_requests}
              allergies={call.analysis?.allergies}
              keyEntities={call.analysis?.key_entities}
              roomNumber={call.analysis?.room_number}
              requestType={call.analysis?.request_type}
              feedbackType={call.analysis?.feedback_type}
              visitType={call.analysis?.visit_type}
              callOutcome={call.analysis?.call_outcome}
              requiresAction={call.analysis?.requires_action}
              actionType={call.analysis?.action_type}
              rebooking={call.analysis?.rebooking}
              guestEngagement={call.analysis?.guest_engagement}
            />

            {/* Category detail cards (Reservation Details, Feedback Details, etc.) hidden for now */}
            {/* {call.analysis && (
              <CategoryPanel
                category={call.category || call.call_source || 'default'}
                data={{
                  // Pass ALL fields from analysis to show all available data
                  ...call.analysis,
                }}
              />
            )} */}

            {/* Linked Actions */}
            {(() => {
              const actions = (call.linked_actions && call.linked_actions.length > 0)
                ? call.linked_actions.map((la) => ({
                    id: la.id,
                    status: la.status as ActionStatus,
                    label: la.request_type.replace(/_/g, ' '),
                    priority: la.priority as ActionPriority,
                    meta: `Created ${formatDateInTimezone(parseTimestampAsUtc(la.created_at), { day: '2-digit', month: 'short', year: 'numeric' }, displayTimezone)}`,
                  }))
                : callActionsData?.actions.length
                  ? callActionsData.actions.map((a) => ({
                      id: a.id,
                      status: a.status,
                      label: ACTION_REQUEST_TYPE_LABELS[a.request_type as ActionRequestType] || a.request_type_label,
                      priority: a.priority,
                      meta: undefined,
                    }))
                  : null;

              if (!actions) return null;

              return (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="relative overflow-hidden bg-card border border-border rounded-xl p-6 shadow-sm group"
                >
                  <h3 className="relative text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    Linked Actions
                  </h3>
                  <div className="relative space-y-3">
                    {actions.map((item) => (
                      <motion.div
                        key={item.id}
                        onClick={() => router.push(`/actions/${item.id}`)}
                        whileHover={{ x: 4, backgroundColor: "rgba(var(--primary), 0.05)" }}
                        className="relative overflow-hidden p-3 rounded-xl border border-border bg-background cursor-pointer hover:border-primary/50 transition-all group/item"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">Action #{item.id}</span>
                            <ActionStatusBadge status={item.status} />
                          </div>
                          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover/item:text-primary transition-colors" />
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 italic mb-2">
                          {item.label}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground/60 uppercase">
                          {item.meta && <><span>{item.meta}</span><span>•</span></>}
                          <ActionPriorityBadge priority={item.priority} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              );
            })()}

            {/* TODO: ResolutionBlock - Not in API response, using mock/default data */}
            {/* <ResolutionBlock
            initialData={{
              requiresFollowup: !call.analysis?.call_successful || false,
              compOffer: 'none',
              followupDueAt: '',
              followupOutcome: 'pending'
            }}
          /> */}
          </div>
        </div>

        {/* Side Drawer */}
        <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      </div>
    </AppLayout>
  );
}
