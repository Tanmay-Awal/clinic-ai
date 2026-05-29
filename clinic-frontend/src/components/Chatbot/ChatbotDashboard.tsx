'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, ChevronLeft, ChevronRight, Bot, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatbotApi } from '@/api/chatbotApi';
import { ChatbotConversation, ChatbotConversationBlock, ChatbotDetailMessage } from '@/types/chatbot';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatbotSummaryPanel } from './ChatbotSummaryPanel';
import { MessageContent } from './MessageContent';

const ChatListSkeleton = () => (
  <div className="flex-1 overflow-y-auto py-2">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="w-full px-4 py-3 flex items-center gap-3 border-b border-border/40">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

const toDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    let d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    d = new Date(val.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d;
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
};

const PERSONA_STYLES: Record<string, { badge: string; dot: string; ring: string; label: string }> = {
  teacher:   { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',     dot: 'bg-blue-500',    ring: 'ring-blue-500/40',    label: 'Teacher' },
  concierge: { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30', dot: 'bg-purple-500',  ring: 'ring-purple-500/40',  label: 'Concierge' },
  sales:     { badge: 'bg-green-500/15 text-green-300 border-green-500/30',    dot: 'bg-green-500',   ring: 'ring-green-500/40',   label: 'Sales' },
  admin:     { badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', dot: 'bg-orange-500',  ring: 'ring-orange-500/40',  label: 'Admin' },
  support:   { badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',       dot: 'bg-cyan-500',    ring: 'ring-cyan-500/40',    label: 'Support' },
};

const DEFAULT_PERSONA_STYLE = {
  badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  dot: 'bg-slate-500',
  ring: 'ring-slate-500/40',
  label: 'Guest',
};

const getPersonaStyle = (persona?: string | null) => {
  if (!persona) return DEFAULT_PERSONA_STYLE;
  return PERSONA_STYLES[persona.toLowerCase()] || { ...DEFAULT_PERSONA_STYLE, label: persona };
};

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-violet-500 to-fuchsia-500',
  'from-indigo-500 to-purple-500',
  'from-yellow-500 to-orange-500',
  'from-sky-500 to-blue-500',
];

const getAvatarGradient = (key: string | number | null | undefined) => {
  const k = String(key ?? 'guest');
  let hash = 0;
  for (let i = 0; i < k.length; i++) hash = ((hash << 5) - hash + k.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
};

const ROLE_TEXT_GRADIENTS = [
  'from-indigo-400 to-purple-400',
  'from-pink-400 to-rose-400',
  'from-blue-400 to-cyan-400',
  'from-emerald-400 to-teal-400',
  'from-orange-400 to-amber-400',
  'from-violet-400 to-fuchsia-400',
  'from-sky-400 to-blue-500',
  'from-yellow-400 to-orange-500',
];

const getRoleGradient = (key: string | number | null | undefined) => {
  const k = String(key ?? 'role');
  let hash = 0;
  for (let i = 0; i < k.length; i++) hash = ((hash << 5) - hash + k.charCodeAt(i)) >>> 0;
  return ROLE_TEXT_GRADIENTS[hash % ROLE_TEXT_GRADIENTS.length];
};

const RAW_ROLES = new Set(['user', 'assistant', 'tool', 'system']);

const PLACEHOLDER_NAMES = new Set(['new conversation', 'guest', 'unknown']);

const isPlaceholderName = (name?: string | null) => {
  if (!name) return true;
  return PLACEHOLDER_NAMES.has(name.trim().toLowerCase());
};

const displayUserName = (name?: string | null) => (isPlaceholderName(name) ? 'User' : (name as string));

const isUserMessage = (msg: { role?: string | null }, convName?: string | null) => {
  const role = (msg.role || '').toString().trim();
  if (role.toLowerCase() === 'user') return true;
  if (RAW_ROLES.has(role.toLowerCase())) return false;
  if (convName && role.toLowerCase() === convName.toLowerCase()) return true;
  return false;
};

const getRoleLabel = (msg: { role?: string | null }, convName?: string | null) => {
  const role = (msg.role || '').toString().trim();
  if (!role) return 'Unknown';
  const lower = role.toLowerCase();
  if (lower === 'assistant') return 'Riley';
  if (lower === 'user') return displayUserName(convName);
  if (lower === 'tool') return 'Tool';
  if (lower === 'system') return 'System';
  return role;
};

const safeFormatDate = (dateStr: any, fmt: string) => {
  const d = toDate(dateStr);
  return d ? format(d, fmt) : '';
};

const getDateHeader = (date: Date | null) => {
  if (!date || isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'TODAY';
  if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
  return format(date, 'MMMM d, yyyy').toUpperCase();
};

const shortPreview = (s?: string | null, len = 60) => {
  if (!s) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > len ? t.slice(0, len - 3) + '...' : t;
};

const displayTimeOrDate = (dateStr?: string | null) => {
  const d = toDate(dateStr);
  if (!d) return '';
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return format(d, 'HH:mm');
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};


const ChatImage: React.FC<{ src: string }> = ({ src }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  return (
    <div className="rounded-xl overflow-hidden border border-border max-w-sm bg-card shadow-sm">
      <div className="relative w-full bg-secondary/30">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center min-h-[160px]">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {status === 'error' ? (
          <div className="min-h-[120px] flex items-center justify-center text-xs text-muted-foreground px-4 py-6">
            Image unavailable
          </div>
        ) : (
          <img
            src={src}
            alt="generated"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            className={cn(
              'w-full h-auto block transition-opacity duration-200',
              status === 'loaded' ? 'opacity-100' : 'opacity-0',
            )}
          />
        )}
      </div>
      <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground bg-secondary/40 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        AI Generated
      </div>
    </div>
  );
};

const isArtifactMessage = (msg: ChatbotDetailMessage) =>
  typeof msg.id === 'string' && msg.id.startsWith('artifact_');

export default function ChatbotDashboard() {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<ChatbotConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey[0];
          return key === 'chatbot-conversations'
            || key === 'chatbot-conversation'
            || key === 'chatbot-summary';
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const {
    data: conversationsData,
    isLoading: loadingList,
  } = useQuery({
    queryKey: ['chatbot-conversations', page, limit, searchQuery],
    queryFn: () => chatbotApi.getConversations(page, limit, searchQuery),
  });

  const allConversations = conversationsData?.data || [];

  const {
    data: conversationDetails,
    isLoading: loadingMessages,
  } = useQuery({
    queryKey: ['chatbot-conversation', selectedConversation?.user_id],
    queryFn: () => chatbotApi.getConversation(selectedConversation!.user_id),
    enabled: !!selectedConversation?.user_id,
  });

  const conversationBlocks: ChatbotConversationBlock[] = React.useMemo(() => {
    const blocks = Array.isArray(conversationDetails) ? conversationDetails : [];
    return [...blocks].sort((a, b) => {
      const ta = new Date(a.conversation.createdAt || '').getTime() || 0;
      const tb = new Date(b.conversation.createdAt || '').getTime() || 0;
      return ta - tb;
    });
  }, [conversationDetails]);

  const hasAnyMessages = conversationBlocks.some((b) => (b.messages?.length || 0) > 0);

  const summaryQueryKey = ['chatbot-summary', selectedConversation?.user_id];
  const {
    data: summaryData,
    isLoading: loadingSummary,
    isError: summaryError,
  } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: () => chatbotApi.getSummary(selectedConversation!.user_id),
    enabled: !!selectedConversation?.user_id,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const handleRefreshSummary = useCallback(async () => {
    if (!selectedConversation?.user_id) return;
    try {
      const fresh = await chatbotApi.getSummary(selectedConversation.user_id, true);
      queryClient.setQueryData(summaryQueryKey, fresh);
    } catch (e) {
      console.error('Failed to refresh chatbot summary:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.user_id, queryClient]);

  const handleSelectConversation = useCallback((conv: ChatbotConversation) => {
    setSelectedConversation(conv);
  }, []);

  React.useEffect(() => {
    if (!loadingMessages && hasAnyMessages) {
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [conversationBlocks, loadingMessages, hasAnyMessages]);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full h-full">
      {!selectedConversation ? (
        <div className="flex flex-col min-h-0 p-6 flex-1">
          <div className="flex flex-col min-h-0 space-y-4 flex-1">
            <div className="flex items-center justify-between bg-background pb-4 pt-2">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Chatbot</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {conversationsData?.pagination?.total || 0} conversations total
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center bg-background pb-4 flex-wrap">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, phone or title..."
                  className="h-10 pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="rounded-xl border border-border bg-card shadow-premium-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1 min-h-0">
                  {/* Desktop Table View */}
                  <table className="w-full hidden md:table">
                    <thead className="border-b border-border/50 sticky top-0 z-10">
                      <tr>
                        <th className="bg-card px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Started</th>
                        <th className="bg-card px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">User</th>
                        <th className="bg-card px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Persona</th>
                        <th className="bg-card px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Preview</th>
                        <th className="bg-card px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Last Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {loadingList ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm animate-pulse">Loading conversations...</td>
                        </tr>
                      ) : allConversations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">No conversations found.</td>
                        </tr>
                      ) : (
                        allConversations.map((conv) => (
                          <tr
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className="group cursor-pointer transition-all hover:bg-primary/[0.03] active:bg-primary/[0.06]"
                          >
                            <td className="px-6 py-5">
                              <span className="text-sm font-medium text-foreground/80">{safeFormatDate(conv.started_at, 'MMM d, HH:mm')}</span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform text-white shadow-sm',
                                  getAvatarGradient(conv.name || conv.phone || conv.id),
                                )}>
                                  {!isPlaceholderName(conv.name) ? (conv.name as string).charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {displayUserName(conv.name)}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">
                                    {conv.phone || '—'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              {(() => {
                                const ps = getPersonaStyle(conv.persona);
                                return (
                                  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', ps.badge)}>
                                    <span className={cn('w-1.5 h-1.5 rounded-full', ps.dot)} />
                                    {ps.label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-xs font-medium text-foreground/70 truncate max-w-[260px] inline-block">
                                {shortPreview(conv.preview, 80) || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right md:text-left">
                              <span className="text-xs font-medium text-muted-foreground/60">{safeFormatDate(conv.last_message_at, 'MMM d, HH:mm')}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-border/30">
                    {loadingList ? (
                      <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">Loading...</div>
                    ) : allConversations.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">No conversations found.</div>
                    ) : (
                      allConversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className="p-4 active:bg-primary/[0.06] flex flex-col gap-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                {!isPlaceholderName(conv.name) ? (conv.name as string).charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {!isPlaceholderName(conv.name) ? (conv.name as string) : (conv.phone || 'User')}
                                </p>
                                <p className="text-xs text-muted-foreground/70 font-mono">{conv.phone || '—'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-medium text-muted-foreground/60">
                                {safeFormatDate(conv.started_at, 'MMM d, HH:mm')}
                              </p>
                              <Badge variant="secondary" className="mt-1 font-normal border-none bg-secondary/50 text-muted-foreground text-[10px] px-1.5 py-0 h-4 capitalize">
                                {conv.persona || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                          <div className="pl-12">
                            <span className="text-[11px] text-muted-foreground/60 italic truncate block">
                              {shortPreview(conv.preview) || 'No preview'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination */}
            {conversationsData?.pagination && conversationsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between py-4 border-t border-border mt-auto">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, conversationsData.pagination.total)} of {conversationsData.pagination.total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 md:h-9 px-2 md:px-3"
                  >
                    <ChevronLeft className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Previous</span>
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, conversationsData.pagination.totalPages) }).map((_, i) => {
                      let pageNum = page;
                      if (page <= 3) pageNum = i + 1;
                      else if (page >= conversationsData.pagination.totalPages - 2) pageNum = conversationsData.pagination.totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                      if (pageNum > conversationsData.pagination.totalPages || pageNum < 1) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-9 h-9 p-0"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(conversationsData.pagination.totalPages, p + 1))}
                    disabled={page === conversationsData.pagination.totalPages}
                    className="h-8 md:h-9 px-2 md:px-3"
                  >
                    <span className="hidden md:inline">Next</span>
                    <ChevronRight className="h-4 w-4 md:ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row rounded-md overflow-hidden border border-border shadow-premium-lg bg-background h-full">
          {/* Centre: chat messages */}
          <div className="flex-1 lg:flex-[3] min-w-0 flex flex-col bg-background relative h-full mb-0">
            <div className="h-16 px-4 md:px-5 bg-card border-b border-border flex items-center justify-between shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <button
                  onClick={() => setSelectedConversation(null)}
                  title="Back to conversations"
                  className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className={cn(
                    'w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br flex items-center justify-center font-bold shrink-0 text-white text-xs md:text-base shadow-md',
                    getAvatarGradient(selectedConversation?.name || selectedConversation?.phone || selectedConversation?.id),
                  )}>
                    {!isPlaceholderName(selectedConversation?.name) ? (selectedConversation!.name as string).charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[15px] md:text-[18px] leading-tight font-semibold text-foreground truncate">
                      {!isPlaceholderName(selectedConversation?.name) ? selectedConversation!.name : (selectedConversation?.phone || 'User')}
                    </span>
                    <span className="text-[10px] md:text-xs text-muted-foreground truncate">
                      {selectedConversation?.phone || selectedConversation?.persona || 'Chatbot Conversation'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedConversation?.persona && (() => {
                  const ps = getPersonaStyle(selectedConversation.persona);
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border', ps.badge)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', ps.dot)} />
                      {ps.label}
                    </span>
                  );
                })()}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                </button>
              </div>
            </div>

            <div
              ref={messagesContainerRef}
              className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8 xl:px-10 py-6 md:py-10 flex flex-col gap-4 md:gap-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {loadingMessages ? (
                <div className="text-center py-3 bg-card rounded-md mx-auto px-6 text-muted-foreground text-sm font-medium border border-border">
                  Loading history...
                </div>
              ) : !hasAnyMessages ? (
                <div className="text-center py-3 bg-card rounded-md mx-auto px-6 text-muted-foreground text-sm font-medium border border-border">
                  No messages yet.
                </div>
              ) : (
                (() => {
                  const convName = selectedConversation?.name || null;
                  return conversationBlocks.map((block) => {
                    const visible = (block.messages || []).filter(
                      (m) => (m.content && m.content.trim().length > 0) || !!m.imageUrl,
                    );
                    if (visible.length === 0) return null;

                    const blockPersona = getPersonaStyle(block.conversation.persona);
                    const startTime = safeFormatDate(block.conversation.createdAt, 'MMM d · HH:mm');

                    return (
                      <React.Fragment key={`conv-${block.conversation.id}`}>
                        <div className="my-4 flex items-center gap-3">
                          <div className="h-px flex-1 bg-border" />
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Session #{block.conversation.id}
                            </span>
                            {startTime && (
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {startTime}
                              </span>
                            )}
                            {block.conversation.persona && (
                              <span className={cn(
                                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border',
                                blockPersona.badge,
                              )}>
                                <span className={cn('w-1 h-1 rounded-full', blockPersona.dot)} />
                                {blockPersona.label}
                              </span>
                            )}
                          </div>
                          <div className="h-px flex-1 bg-border" />
                        </div>

                        {visible.map((msg: ChatbotDetailMessage) => {
                          const artifact = isArtifactMessage(msg);
                          const isUser = !artifact && isUserMessage(msg as any, convName);
                          const hasContent = !artifact && !!(msg.content && msg.content.trim().length > 0);
                          const roleLabel = artifact ? 'Riley' : getRoleLabel(msg as any, convName);
                          const roleGradient = getRoleGradient(roleLabel);
                          const time = safeFormatDate(msg.createdAt, 'HH:mm');

                          return (
                            <div
                              key={`msg-${msg.id}`}
                              className={cn('w-full flex', isUser ? 'justify-end' : 'justify-start')}
                            >
                              <div className="w-fit max-w-[85%] md:max-w-[75%] lg:max-w-[70%] space-y-1.5">
                                <div className={cn('flex items-center gap-2 text-xs', isUser ? 'justify-end' : 'justify-start')}>
                                  {isUser && time && <span className="text-muted-foreground">{time}</span>}
                                  <span className={cn(
                                    'font-bold bg-gradient-to-r bg-clip-text text-transparent',
                                    roleGradient,
                                  )}>
                                    {roleLabel}
                                  </span>
                                  {!isUser && block.conversation.persona && (
                                    <span className={cn(
                                      'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border',
                                      blockPersona.badge,
                                    )}>
                                      {blockPersona.label}
                                    </span>
                                  )}
                                  {!isUser && time && <span className="text-muted-foreground">{time}</span>}
                                </div>

                                {hasContent && (
                                  <div
                                    className={cn(
                                      'relative rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed border shadow-sm break-words',
                                      isUser
                                        ? 'rounded-tr-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent'
                                        : 'rounded-tl-sm bg-card text-foreground border-border'
                                    )}
                                  >
                                    <MessageContent text={msg.content as string} />
                                  </div>
                                )}

                                {msg.imageUrl && <ChatImage src={msg.imageUrl} />}
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* Right: Summary panel */}
          <div className="flex-none h-auto lg:h-full flex flex-col lg:border-l border-border lg:w-[360px] xl:w-[400px] shrink-0 bg-card">
            <div className="lg:hidden flex items-center gap-4 px-6 py-6 bg-background/50">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border" />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Analysis Summary</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border" />
            </div>
            <div className="h-full">
              <ChatbotSummaryPanel
                summary={summaryData ?? null}
                isLoading={loadingSummary}
                isError={!!summaryError}
                onRefresh={handleRefreshSummary}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
