'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ChatbotSummaryResponse } from '@/types/chatbot';
import { Sparkles, RefreshCw, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatbotSummaryPanelProps {
  summary: ChatbotSummaryResponse | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
}

const OUTCOME_COLORS: Record<string, string> = {
  'Booking Made': 'bg-green-500/10 border-green-500/30 text-green-400',
  'Demo Requested': 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  'Information Provided': 'bg-sky-500/10 border-sky-500/30 text-sky-400',
  'Lesson Plan Created': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  'Pricing Discussed': 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  'Complaint Raised': 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  'No Resolution': 'bg-slate-500/10 border-slate-500/30 text-slate-400',
  'Incomplete': 'bg-amber-500/10 border-amber-500/30 text-amber-400',
};

const ENTITY_COLORS: Record<string, string> = {
  product_name: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  grade_level: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  subject: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  topic: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
  email: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  phone: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
  school_name: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  customer_name: 'bg-green-500/10 border-green-500/30 text-green-400',
  request_type: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
};

function getSentimentInfo(meter: number | null): { label: string; color: string; bgColor: string } {
  if (meter === null) return { label: 'N/A', color: 'bg-slate-500', bgColor: '' };
  if (meter >= 0.8) return { label: 'Positive', color: 'bg-green-500', bgColor: 'text-green-400' };
  if (meter >= 0.6) return { label: 'Mildly Positive', color: 'bg-emerald-500', bgColor: 'text-emerald-400' };
  if (meter >= 0.45) return { label: 'Neutral', color: 'bg-yellow-500', bgColor: 'text-yellow-400' };
  if (meter >= 0.3) return { label: 'Negative', color: 'bg-orange-500', bgColor: 'text-orange-400' };
  return { label: 'Very Negative', color: 'bg-red-500', bgColor: 'text-red-400' };
}

export function ChatbotSummaryPanel({ summary, isLoading, isError, onRefresh }: ChatbotSummaryPanelProps) {
  return (
    <aside className="w-full h-full flex flex-col bg-card lg:border-l border-border overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-5 bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between shrink-0">
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="chatbot-sparkle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center border border-border">
            <Sparkles className="w-4 h-4" style={{ stroke: 'url(#chatbot-sparkle-gradient)' }} />
          </div>
          <h2 className="text-[15px] font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent leading-tight">
            Summary
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-secondary transition-all active:scale-95"
          title="Regenerate summary"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-primary bg-primary/5 rounded-2xl border border-primary/10">
              <Bot className="w-4 h-4 animate-bounce" />
              <span>Analyzing conversation...</span>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center h-40 space-y-4 bg-red-500/5 rounded-2xl border border-red-500/10 p-6">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-red-500 font-bold">!</span>
            </div>
            <p className="text-sm font-medium text-red-500 dark:text-red-400">Analysis failed</p>
            <Button variant="outline" size="sm" onClick={onRefresh} className="hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Try Again
            </Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && !summary && (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center border border-border">
              <Sparkles className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-[13px] font-medium text-muted-foreground max-w-[200px]">
              No analysis available yet
            </p>
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && summary && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            {/* Outcome + Sentiment */}
            <div className="grid grid-cols-2 gap-3">
              {summary.call_outcome && (
                <div className="bg-secondary/50 p-3.5 rounded-2xl border border-border shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_#6366f1]"></span>
                    Outcome
                  </p>
                  <div className={cn(
                    'min-h-[48px] flex items-center justify-center p-2 rounded-xl border',
                    OUTCOME_COLORS[summary.call_outcome] || 'bg-primary/5 border-primary/10'
                  )}>
                    <p className="text-[11px] font-semibold text-foreground leading-tight text-center whitespace-normal">
                      {summary.call_outcome}
                    </p>
                  </div>
                </div>
              )}

              {summary.sentiment_meter !== null && summary.sentiment_meter !== undefined && (
                <div className="bg-secondary/50 p-3.5 rounded-2xl border border-border shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_#f97316]"></span>
                    Sentiment
                  </p>
                  {(() => {
                    const s = getSentimentInfo(summary.sentiment_meter);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn('text-[11px] font-bold', s.bgColor)}>{s.label}</span>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {Math.round((summary.sentiment_meter ?? 0) * 100)}%
                          </span>
                        </div>
                        <Progress
                          value={(summary.sentiment_meter ?? 0) * 100}
                          className="h-1.5 bg-background border border-border/20"
                          indicatorClassName={s.color}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Customer + Persona */}
            {(summary.customer_name || summary.persona) && (
              <div className="grid grid-cols-2 gap-3">
                {summary.customer_name && (
                  <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Customer</p>
                    <p className="text-[13px] font-semibold text-foreground truncate">{summary.customer_name}</p>
                  </div>
                )}
                {summary.persona && (
                  <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Persona</p>
                    <p className="text-[13px] font-semibold text-foreground capitalize truncate">{summary.persona}</p>
                  </div>
                )}
              </div>
            )}

            {/* Key Takeaways */}
            {summary.summary && summary.summary.length > 0 && (
              <div className="bg-secondary/50 p-5 rounded-2xl border border-border shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_#f59e0b]"></span>
                  Key Takeaways
                </p>
                <ul className="space-y-3">
                  {summary.summary.map((point, i) => (
                    <li key={i} className="flex gap-2.5 group">
                      <div className="mt-1 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/10 text-amber-500 shrink-0">
                        <span className="text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <span className="text-[13px] text-foreground leading-relaxed font-medium">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entities */}
            {summary.key_entities && summary.key_entities.length > 0 && (
              <div className="bg-secondary/50 p-4 rounded-2xl border border-border shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_5px_#a855f7]"></span>
                  Detected Entities
                </p>
                <div className="flex flex-wrap gap-2">
                  {summary.key_entities.map((entity, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={cn(
                        'text-[11px] font-semibold px-2.5 py-1 h-auto capitalize shadow-sm transition-transform hover:scale-105 cursor-default',
                        ENTITY_COLORS[entity.type] || 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                      )}
                      title={entity.type.replace(/_/g, ' ')}
                    >
                      {entity.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {summary.notes && summary.notes.trim().length > 0 && (
              <div className="relative overflow-hidden bg-secondary/50 p-4 rounded-2xl border border-border shadow-sm">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50"></div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-2 ml-2">Additional Notes</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed italic ml-2">{summary.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
