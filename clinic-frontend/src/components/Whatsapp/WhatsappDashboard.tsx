'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft, Eye, EyeOff, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappApi } from '@/api/whatsappApi';
import { WaConversation, MergedConversation } from '@/types/whatsapp';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WaSummaryPanel } from './WaSummaryPanel';

const ChatListSkeleton = () => (
  <div className="flex-1 overflow-y-auto py-2">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="w-full px-4 py-3 flex items-center gap-3 border-b border-[#edf1f4] dark:border-[#202c33]">
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


const safeFormatDate = (dateStr: any, fmt: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'N/A' : format(d, fmt);
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  expired: "bg-red-500/50",
  pending: "bg-amber-500",
  closed: "bg-slate-500",
  resolved: "bg-blue-500",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  pending: "Pending",
  closed: "Closed",
  resolved: "Resolved",
};

const getStatusColor = (status: string | null | undefined) => {
  if (!status) return STATUS_COLORS.active;
  return STATUS_COLORS[status.toLowerCase()] || "bg-green-500";
};

const getStatusLabel = (status: string | null | undefined) => {
  if (!status) return STATUS_LABELS.active;
  return STATUS_LABELS[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1);
};

const getDateHeader = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'TODAY';
  if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
  return format(date, 'MMMM d, yyyy').toUpperCase();
};

const shortPreview = (s?: string, len = 60) => {
  if (!s) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > len ? t.slice(0, len - 3) + '...' : t;
};

const formatPhone = (p?: string) => {
  if (!p) return '';
  const s = String(p).trim();
  if (s.startsWith('+')) return s;
  // if it already contains non-digit like spaces or dashes, preserve them but still prefix + if missing
  return '+' + s;
};

const PHONE_CACHE_KEY = 'wa_decrypted_phones';
const PREVIEW_CACHE_KEY = 'wa_conv_previews';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function loadCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage full or unavailable */ }
}

const displayTimeOrDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return format(d, 'HH:mm');
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export default function WhatsappDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<WaConversation | null>(null);
  const [selectedMerged, setSelectedMerged] = useState<MergedConversation | null>(null);
  const [decryptedPhones, setDecryptedPhones] = useState<Record<string, string>>({});
  const [convPreviews, setConvPreviews] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrefetchingPhones, setIsPrefetchingPhones] = useState(false);
  const [isPrefetchingPreviews, setIsPrefetchingPreviews] = useState(false);
  const [summaryConvId, setSummaryConvId] = useState<string | null>(null);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  // Initialize state from localStorage to speed up initial render
  React.useEffect(() => {
    const cachedPhones = loadCache<Record<string, string>>(PHONE_CACHE_KEY);
    const cachedPreviews = loadCache<Record<string, string>>(PREVIEW_CACHE_KEY);
    if (cachedPhones) setDecryptedPhones(cachedPhones);
    if (cachedPreviews) setConvPreviews(cachedPreviews);
  }, []);

  // Persist state to localStorage whenever it changes
  React.useEffect(() => {
    if (Object.keys(decryptedPhones).length > 0) {
      saveCache(PHONE_CACHE_KEY, decryptedPhones);
    }
  }, [decryptedPhones]);

  React.useEffect(() => {
    if (Object.keys(convPreviews).length > 0) {
      saveCache(PREVIEW_CACHE_KEY, convPreviews);
    }
  }, [convPreviews]);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('last_message_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, hotelFilter, statusFilter, sortBy, sortOrder]);

  const {
    data: conversationsData,
    isLoading: loadingList
  } = useQuery({
    queryKey: ['whatsapp-conversations', page, limit, searchQuery, hotelFilter, statusFilter, sortBy, sortOrder],
    queryFn: () => whatsappApi.getConversations(
      page,
      limit,
      searchQuery,
      hotelFilter,
      statusFilter,
      sortBy,
      sortOrder
    ),
  });

  const allConversations = conversationsData?.data || [];

  // Fetch all conversations for the sidebar when the chat view is open.
  // The paginated query above only has the current page; this ensures every
  // contact appears in the left panel regardless of which page they're on.
  const { data: allConvsForSidebar } = useQuery({
    queryKey: ['whatsapp-conversations-all', hotelFilter, statusFilter, searchQuery],
    queryFn: () => whatsappApi.getConversations(1, 500, searchQuery, hotelFilter, statusFilter, 'last_message_at', 'DESC'),
    enabled: !!selectedConversation,
    staleTime: 1000 * 60 * 5,
  });

  // React Query for Messages (only when a conversation is selected)
  const {
    data: messagesData,
    isLoading: loadingSingleMessages
  } = useQuery({
    queryKey: ['whatsapp-messages', selectedConversation?.id],
    queryFn: () => whatsappApi.getMessages(selectedConversation!.id),
    enabled: !!selectedConversation?.id,
  });

  // If a merged conversation is selected, fetch messages for all underlying conv ids and merge
  const {
    data: mergedMessagesData,
    isLoading: loadingMergedMessages
  } = useQuery({
    queryKey: ['whatsapp-merged-messages', selectedMerged?.convIds?.join(',')],
    queryFn: async () => {
      if (!selectedMerged || !selectedMerged.convIds?.length) return { messages: [] };
      const results = await Promise.all(selectedMerged.convIds.map((id: string) => whatsappApi.getMessages(id).catch(() => null)));
      const allMsgs: any[] = [];
      results.forEach((r: any) => { if (r && Array.isArray(r.messages)) allMsgs.push(...r.messages); });
      allMsgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return { messages: allMsgs };
    },
    enabled: !!selectedMerged?.convIds?.length,
  });

  const messages = mergedMessagesData?.messages || messagesData?.messages || [];
  const loadingMessages = selectedMerged ? loadingMergedMessages : loadingSingleMessages;

  // React Query for AI Summary (fires when a conversation is selected)
  const summaryQueryKey = ['whatsapp-summary', summaryConvId];
  const {
    data: summaryData,
    isLoading: loadingSummary,
    isError: summaryError,
  } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: () => whatsappApi.getSummary(summaryConvId!),
    enabled: !!summaryConvId,
    staleTime: 1000 * 60 * 10, // 10 min — summaries are cached on server too
    retry: 1,
  });

  const handleRefreshSummary = useCallback(async () => {
    if (!summaryConvId) return;
    try {
      const freshData = await whatsappApi.getSummary(summaryConvId, true);
      queryClient.setQueryData(summaryQueryKey, freshData);
    } catch (e) {
      console.error('Failed to refresh summary:', e);
    }
  }, [summaryConvId, queryClient, summaryQueryKey]);

  const handleSelectConversation = useCallback((conv: WaConversation | MergedConversation) => {
    if ('convIds' in conv && conv.convIds.length > 0) {
      // Already merged (from the internal sidebar)
      setSelectedMerged(conv as MergedConversation);
      const latestId = conv.convIds[conv.convIds.length - 1];
      const searchPool = allConvsForSidebar?.data?.length ? allConvsForSidebar.data : allConversations;
      const latestConv = searchPool.find(c => c.id === latestId) || null;
      setSelectedConversation(latestConv);
      setSummaryConvId(latestId);
    } else {
      // Single selection from main table — find all related conversations by phone
      const targetConv = conv as WaConversation;
      const phoneRaw = targetConv.customer?.phone || targetConv.phone || `unknown-${targetConv.id}`;
      const digitsOnly = String(phoneRaw).replace(/\D/g, '');
      const phoneKey = digitsOnly.length >= 7 ? digitsOnly : String(phoneRaw);

      // Search all loaded conversations for the same phone key
      const relatedConvs = allConversations.filter(c => {
        const cPhoneRaw = c.customer?.phone || c.phone || `unknown-${c.id}`;
        const cDigits = String(cPhoneRaw).replace(/\D/g, '');
        const cKey = cDigits.length >= 7 ? cDigits : String(cPhoneRaw);
        return cKey === phoneKey;
      });

      if (relatedConvs.length > 1) {
        // Build a merged object on the fly to trigger historical message loading
        const convIds = relatedConvs
          .sort((a, b) => new Date(a.started_at || 0).getTime() - new Date(b.started_at || 0).getTime())
          .map(c => c.id);

        setSelectedMerged({
          id: 'merged-' + phoneKey,
          convIds,
          last_message_at: targetConv.last_message_at || targetConv.started_at || null,
          preview: targetConv.preview || convPreviews[targetConv.id] || targetConv.last_message || targetConv.last_message_text || '',
          name: targetConv.name ?? null,
          displayPhone: formatPhone(phoneRaw),
        });

        // Track the specific conversation clicked so we can scroll to it
        setScrollTargetId(targetConv.id);

        // Find the absolute latest session to use for the header details
        const latestConv = relatedConvs[relatedConvs.length - 1];
        setSelectedConversation(latestConv);
        setSummaryConvId(latestConv.id);
      } else {
        // No other history found, proceed as single
        setSelectedMerged(null);
        setSelectedConversation(targetConv);
        setSummaryConvId(targetConv.id ?? null);
        setScrollTargetId(null);
      }
    }
  }, [allConversations, allConvsForSidebar, convPreviews]);

  // Effect to handle "Smart Jump" scroll
  React.useEffect(() => {
    if (scrollTargetId && messages.length > 0 && !loadingMessages) {
      // Use a slightly longer delay to ensure DOM is fully painted with historical data
      const timer = setTimeout(() => {
        const targetElement = messagesContainerRef.current?.querySelector(`[data-conv-id="${scrollTargetId}"]`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Clear target after scrolling so user can scroll freely
          setScrollTargetId(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (!loadingMessages && messages.length > 0 && !scrollTargetId) {
      // Default behavior: scroll to bottom if no specific target
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, loadingMessages, scrollTargetId]);

  const handleDecryptPhone = useCallback(async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();

    // Check if already decrypted using functional state to avoid dependency on decryptedPhones
    setDecryptedPhones(prev => {
      const isAlreadyDecrypted = !!prev[convId];
      if (isAlreadyDecrypted) {
        const next = { ...prev };
        delete next[convId];
        return next;
      }
      return prev;
    });

    // If not in state, fetch from API
    try {
      const data = await whatsappApi.getPhone(convId);
      if (data?.phone) {
        setDecryptedPhones(prev => ({ ...prev, [convId]: data.phone! }));
      }
    } catch (err) {
      console.error('Error fetching phone:', err);
    }
  }, []); // Correct: No dependency on decryptedPhones

  // Prefetch decrypted phone numbers for conversations so list shows real phone instead of 'Unknown'
  React.useEffect(() => {
    if (!allConversations || allConversations.length === 0) return;
    const missing = allConversations.filter(c => !decryptedPhones[c.id]);
    if (missing.length === 0) return;
    let active = true;

    (async () => {
      setIsPrefetchingPhones(true);
      try {
        // Prioritize the selected conversation if its phone isn't decrypted yet
        const prioritizedIds = [...missing.map(c => c.id)];
        if (selectedConversation?.id && prioritizedIds.includes(selectedConversation.id)) {
          prioritizedIds.splice(prioritizedIds.indexOf(selectedConversation.id), 1);
          prioritizedIds.unshift(selectedConversation.id);
        }

        // Fetch and update each phone number individually
        await Promise.allSettled(prioritizedIds.map(async (id) => {
          try {
            const data = await whatsappApi.getPhone(id);
            if (active && data?.phone) {
              setDecryptedPhones(prev => ({ ...prev, [id]: data.phone! }));
            }
          } catch (err) {
            console.error(`Error prefetching phone for ${id}:`, err);
          }
        }));
      } catch (err) {
        console.error('Error prefetching phones:', err);
      } finally {
        if (active) setIsPrefetchingPhones(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [allConversations]);

  // Prefetch last-message previews for conversations that don't return preview text.
  // NOTE: This fetches full message history just to get the last message — ideally the backend
  // should expose a /conversations/{id}/preview endpoint. Capped at 10 to reduce load.
  React.useEffect(() => {
    if (!allConversations || allConversations.length === 0) return;
    const missingPreview = allConversations
      .filter(c => !c.last_message && !c.last_message_text && !c.preview && !convPreviews[c.id])
      .slice(0, 10); // Cap at 10 — fetching full history per conv is expensive
    if (missingPreview.length === 0) return;
    let active = true;

    (async () => {
      setIsPrefetchingPreviews(true);
      try {
        // Fetch and update each preview individually for better perceived performance
        await Promise.allSettled(missingPreview.map(async (c) => {
          try {
            const data = await whatsappApi.getMessages(c.id);
            if (active && data?.messages?.length) {
              const last = data.messages[data.messages.length - 1];
              if (last && last.content) {
                setConvPreviews(prev => ({ ...prev, [c.id]: String(last.content) }));
              }
            }
          } catch (err) {
            console.error(`Error prefetching preview for ${c.id}:`, err);
          }
        }));
      } catch (err) {
        console.error('Error prefetching previews:', err);
      } finally {
        if (active) setIsPrefetchingPreviews(false);
      }
    })();

    return () => { active = false; };
  }, [allConversations]);

  const uniqueHotels = useMemo(() => {
    // Only extract hotels from the current visible set for the filter dropdown
    return Array.from(new Set(allConversations.map(c => c.active_hotel).filter(Boolean))).sort();
  }, [allConversations]);

  // Client-side grouping: merge conversations by normalized phone so multiple convs from same number appear as one.
  // IMPORTANT: decryptedPhones is intentionally NOT in the dependency array.
  // Using it as a merge key caused jarring UI re-merges as phones arrived asynchronously.
  // The static masked phone (c.customer?.phone || c.phone) is used as the stable merge key.
  // Decrypted phones are read inline in JSX for display only.
  const mergedConversations = useMemo(() => {
    // Use the full sidebar dataset when available, otherwise fall back to current page
    const source = allConvsForSidebar?.data?.length ? allConvsForSidebar.data : allConversations;
    if (!source || source.length === 0) return [];
    const map: Record<string, MergedConversation & { convIds: string[] }> = {};
    source.forEach((c) => {
      // Use static phone data only — stable across async decryption updates
      const phoneRaw = c.customer?.phone || c.phone || `unknown-${c.id}`;
      const digitsOnly = String(phoneRaw).replace(/\D/g, '');
      // Only use stripped digits when they look like a real phone (≥7 digits), otherwise use the full raw string
      const phoneKey = digitsOnly.length >= 7 ? digitsOnly : String(phoneRaw);
      if (!map[phoneKey]) {
        map[phoneKey] = {
          id: 'merged-' + phoneKey,
          convIds: [],
          last_message_at: c.last_message_at || c.started_at || null,
          preview: c.preview || convPreviews[c.id] || c.last_message || c.last_message_text || '',
          name: c.name ?? null,
          displayPhone: formatPhone(phoneRaw),
        };
      }
      map[phoneKey].convIds.push(c.id);

      // prefer any explicit name
      if (!map[phoneKey].name && c.name) map[phoneKey].name = c.name;

      // keep the latest last_message_at and preview
      if (c.last_message_at && (!map[phoneKey].last_message_at || new Date(c.last_message_at) > new Date(map[phoneKey].last_message_at))) {
        map[phoneKey].last_message_at = c.last_message_at;
        map[phoneKey].preview = c.preview || convPreviews[c.id] || c.last_message || c.last_message_text || map[phoneKey].preview;
      }
    });

    return Object.values(map).sort((a, b) => {
      const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return tb - ta;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allConversations, allConvsForSidebar, convPreviews]); // decryptedPhones excluded — see comment above

  const displayConversations = mergedConversations.length ? mergedConversations : allConversations;

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full h-full">
      {!selectedConversation ? (
        <div className="flex flex-col min-h-0 p-6 flex-1">
          <div className="flex flex-col min-h-0 space-y-4 flex-1">
            {/* Header area equivalent to CallsHeader */}
            <div className="flex items-center justify-between bg-background pb-4 pt-2">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">WhatsApp</h1>
                <p className="mt-1 text-sm text-muted-foreground">{conversationsData?.pagination?.total || 0} conversations total</p>
              </div>
            </div>

            {/* Filters area */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center bg-background pb-4 flex-wrap">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  className="h-10 pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Select value={hotelFilter} onValueChange={setHotelFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {uniqueHotels.map((h: any) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 border border-input rounded-md px-2 h-10 w-full md:w-fit overflow-hidden">
                <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">Sort:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 md:w-[120px] px-1 py-0 border-0 outline-none ring-0 focus:ring-0 focus:ring-offset-0 shadow-none h-auto bg-transparent text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="started_at">Started At</SelectItem>
                    <SelectItem value="last_message_at">Last Message</SelectItem>
                  </SelectContent>
                </Select>
                <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
                <Select value={sortOrder} onValueChange={(val: 'ASC' | 'DESC') => setSortOrder(val)}>
                  <SelectTrigger className="w-[70px] px-1 py-0 border-0 outline-none ring-0 focus:ring-0 focus:ring-offset-0 shadow-none h-auto bg-transparent text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESC">Desc</SelectItem>
                    <SelectItem value="ASC">Asc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table area equivalent to CallsTable */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="rounded-xl border border-border bg-card shadow-premium-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1 min-h-0">
                  {/* Desktop Table View */}
                  <table className="w-full hidden md:table">
                    <thead className="border-b border-border/50 sticky top-0 z-10">
                      <tr>
                        <th className="bg-card px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Time</th>
                        <th className="bg-card px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Customer</th>
                        <th className="bg-card px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Hotel</th>
                        <th className="bg-card px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Status</th>
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
                                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                                  {conv.name && conv.name.trim() !== '' ? conv.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {conv.name && conv.name.trim() !== '' ? conv.name : 'Guest'}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <p className="text-xs text-muted-foreground/70 font-mono">
                                      {decryptedPhones[conv.id] || conv.phone}
                                    </p>
                                    <button
                                      onClick={(e) => handleDecryptPhone(e, conv.id)}
                                      className="h-4 w-4 hover:text-primary inline-flex items-center justify-center rounded text-muted-foreground/50 transition-colors"
                                    >
                                      {decryptedPhones[conv.id] ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <Badge variant="secondary" className="font-normal border-none bg-secondary/50 text-muted-foreground px-2 py-0 h-5">
                                {conv.active_hotel || 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(conv.status))} />
                                <span className="text-xs font-medium text-foreground/70">{getStatusLabel(conv.status)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right md:text-left">
                              <span className="text-xs font-medium text-muted-foreground/60">{safeFormatDate(conv.last_message_at, 'MMM d, HH:mm')}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Mobile Card View — mirrors displayConversations to keep parity with desktop */}
                  <div className="md:hidden divide-y divide-border/30">
                    {loadingList ? (
                      <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">Loading...</div>
                    ) : displayConversations.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">No conversations found.</div>
                    ) : (
                      displayConversations.map((conv) => {
                        // MergedConversation uses convIds[last] as the phone-lookup key
                        const phoneKey = 'convIds' in conv
                          ? conv.convIds[conv.convIds.length - 1]
                          : (conv as WaConversation).id;
                        const displayPhone = 'convIds' in conv
                          ? (formatPhone(decryptedPhones[phoneKey] || '') || conv.displayPhone || '')
                          : (formatPhone(decryptedPhones[phoneKey] || (conv as WaConversation).phone || ''));
                        const hotelName = 'convIds' in conv
                          ? undefined
                          : (conv as WaConversation).active_hotel;
                        const startedAt = 'convIds' in conv
                          ? conv.last_message_at
                          : (conv as WaConversation).started_at;
                        const preview = conv.preview || ('convIds' in conv
                          ? (convPreviews[conv.convIds[conv.convIds.length - 1]] || '')
                          : (convPreviews[(conv as WaConversation).id] || ''));

                        return (
                          <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className="p-4 active:bg-primary/[0.06] flex flex-col gap-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                  {conv.name && conv.name.trim() !== '' ? conv.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {conv.name && conv.name.trim() !== '' && conv.name.toLowerCase() !== 'unknown'
                                      ? conv.name
                                      : (displayPhone || 'Guest')}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs text-muted-foreground/70 font-mono">
                                      {displayPhone}
                                    </p>
                                    {'convIds' in conv ? null : (
                                      <button
                                        onClick={(e) => handleDecryptPhone(e, (conv as WaConversation).id)}
                                        className="text-muted-foreground/50"
                                      >
                                        {decryptedPhones[(conv as WaConversation).id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-medium text-muted-foreground/60">
                                  {safeFormatDate(startedAt, 'MMM d, HH:mm')}
                                </p>
                                {hotelName !== undefined && (
                                  <Badge variant="secondary" className="mt-1 font-normal border-none bg-secondary/50 text-muted-foreground text-[10px] px-1.5 py-0 h-4">
                                    {hotelName || 'N/A'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-12">
                              {'convIds' in conv ? null : (
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor((conv as WaConversation).status))} />
                                  <span className="text-[11px] font-medium text-foreground/70">{getStatusLabel((conv as WaConversation).status)}</span>
                                </div>
                              )}
                              <span className="text-[11px] text-muted-foreground/60 italic truncate max-w-[150px]">
                                {shortPreview(preview) || 'No message preview'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Pagination UI */}
            {conversationsData?.pagination && conversationsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between py-4 border-t border-border mt-auto">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, conversationsData.pagination.total)} of {conversationsData.pagination.total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 md:h-9 px-2 md:px-3"
                  >
                    <ChevronLeft className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">Previous</span>
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, conversationsData.pagination.totalPages) }).map((_, i) => {
                      // Simple pagination logic for displaying window of pages
                      let pageNum = page;
                      if (page <= 3) pageNum = i + 1;
                      else if (page >= conversationsData.pagination.totalPages - 2) pageNum = conversationsData.pagination.totalPages - 4 + i;
                      else pageNum = page - 2 + i;

                      if (pageNum > conversationsData.pagination.totalPages || pageNum < 1) return null;

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
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
                    onClick={() => setPage(p => Math.min(conversationsData.pagination.totalPages, p + 1))}
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
      ) : selectedConversation ? (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row rounded-md overflow-hidden border border-border shadow-premium-lg bg-background h-full">
          <aside className="hidden lg:flex w-[340px] xl:w-[360px] shrink-0 flex-col bg-card border-r border-border">
            <div className="px-5 py-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search a chat"
                  className="h-11 pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {loadingList ? (
                <ChatListSkeleton />
              ) : allConversations.length === 0 ? (
                <div className="px-5 py-4 text-sm text-[#6f7b86] dark:text-[#8696a0]">No chats found.</div>
              ) : (
                displayConversations.map((conv) => {
                  const isSelected = selectedMerged ? (selectedMerged.id === conv.id) : (selectedConversation?.id === conv.id);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "w-full px-4 py-3 text-left flex items-center gap-3 border-b border-border/40 transition-colors",
                        isSelected
                          ? "bg-secondary"
                          : "hover:bg-secondary/50"
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold shrink-0">
                        {conv.name && conv.name.trim() !== '' ? conv.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[16px] font-medium text-foreground">
                            {conv.name && conv.name.trim() !== '' && conv.name.toLowerCase() !== 'unknown'
                              ? conv.name
                              : (formatPhone(decryptedPhones[conv.convIds?.[conv.convIds.length - 1]] || '') || conv.displayPhone || '')}
                          </p>
                          <span className={cn("text-xs shrink-0", isSelected ? "text-primary font-semibold" : "text-muted-foreground")}>
                            {displayTimeOrDate(conv.last_message_at)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[15px] text-muted-foreground">
                          {shortPreview(conv.preview || convPreviews[conv.id] || (Array.isArray(conv.convIds) ? convPreviews[conv.convIds[conv.convIds.length - 1]] : '') || '')}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Centre: Chat messages ── */}
          <div className="flex-1 lg:flex-[3] min-w-0 flex flex-col bg-background relative h-full mb-0">
            <div className="absolute inset-0 pointer-events-none z-0 block dark:hidden" style={{
              backgroundImage: 'url(/wp_bg_light.png)',
              backgroundRepeat: 'repeat',
              backgroundSize: '650px',
              backgroundPosition: 'center',
              opacity: 0.4,
            }} />

            <div className="absolute inset-0 pointer-events-none z-0 hidden dark:block" style={{
              backgroundImage: 'url(/wp_bg_dark.png)',
              backgroundRepeat: 'repeat',
              backgroundSize: '650px',
              backgroundPosition: 'center',
              opacity: 0.5,
            }} />

            {/* Chat Header */}
            <div className="h-16 px-4 md:px-5 bg-card border-b border-border flex items-center justify-between shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground lg:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary text-foreground flex items-center justify-center font-semibold shrink-0 border border-border text-xs md:text-base">
                    {selectedConversation?.name?.trim() ? selectedConversation.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    {(!decryptedPhones[selectedConversation?.id || ''] && (isPrefetchingPhones || loadingList)) ? (
                      <Skeleton className="h-4 md:h-5 w-24 md:w-32 bg-secondary" />
                    ) : (
                      <span className="text-[15px] md:text-[18px] leading-tight font-semibold text-foreground truncate">
                        {formatPhone(decryptedPhones[selectedConversation?.id || ''] || selectedConversation?.customer?.phone || selectedConversation?.phone || '')}
                      </span>
                    )}
                    <span className="text-[10px] md:text-xs text-muted-foreground truncate">
                      {selectedConversation?.active_hotel || 'WhatsApp Chat'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right shrink-0">
                  <span className={cn("text-[10px] md:text-xs font-semibold px-2 md:px-3 py-0.5 md:py-1 rounded-full text-white", getStatusColor(selectedConversation?.status || 'active'))}>
                    {getStatusLabel(selectedConversation?.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div
              ref={messagesContainerRef}
              className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8 xl:px-10 py-6 md:py-10 flex flex-col gap-4 md:gap-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {loadingMessages ? (
                <div className="text-center py-3 bg-white dark:bg-[#202c33] rounded-md mx-auto px-6 text-[#7b8790] dark:text-[#8696a0] text-sm font-medium border border-[#e1e6ea] dark:border-[#2a3942]">
                  Loading history...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-3 bg-white dark:bg-[#202c33] rounded-md mx-auto px-6 text-[#7b8790] dark:text-[#8696a0] text-sm font-medium border border-[#e1e6ea] dark:border-[#2a3942]">
                  No messages yet.
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isBot = msg.role === 'assistant' || msg.role === 'system';
                  const msgDate = new Date(msg.created_at);
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const prevMsgDate = prevMsg ? new Date(prevMsg.created_at) : null;
                  const showDateHeader = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();

                  // Find the conversation ID for this message (to enable smart scroll)
                  const messageConvId = (msg as any).conversation_id || (msg as any).wa_conversation_id;

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateHeader && (
                        <div className="my-3 flex items-center gap-4" data-conv-id={messageConvId}>
                          <div className="h-px flex-1 bg-[#d8dee3] dark:bg-[#2a3942]" />
                          <span className="text-xs font-bold tracking-[0.24em] text-[#7d8790] dark:text-[#8696a0]">{getDateHeader(msgDate)}</span>
                          <div className="h-px flex-1 bg-[#d8dee3] dark:bg-[#2a3942]" />
                        </div>
                      )}

                      <div className={cn("w-full flex", isBot ? "justify-start" : "justify-end")} data-conv-id={!showDateHeader ? messageConvId : undefined}>
                        <div className="w-fit max-w-[85%] md:max-w-[70%] lg:max-w-[58%]">
                          {isBot ? (
                            <div className="mb-1 flex items-center gap-2 text-xs">
                              <span className="font-semibold text-[#1d8f88] dark:text-[#00a884]">
                                Riley - Macgrow Hills
                              </span>
                              <span className="text-[#8f9aa3] dark:text-[#8696a0]">{safeFormatDate(msg.created_at, 'HH:mm')}</span>
                            </div>
                          ) : (
                            <div className="mb-1 text-right text-xs font-medium text-[#8f9aa3] dark:text-[#aebac1]">
                              {safeFormatDate(msg.created_at, 'HH:mm')}
                            </div>
                          )}

                          <div
                            className={cn(
                              "relative inline-block rounded-md px-4 py-3 text-[15px] leading-relaxed border shadow-[0_1px_2px_rgba(20,34,48,0.05)]",
                              isBot
                                ? "rounded-tl-sm bg-white dark:bg-[#202c33] text-[#2d3640] dark:text-[#e9edef] border-[#dce3e8] dark:border-[#2a3942]"
                                : "rounded-tr-sm bg-[#005d67] dark:bg-[#005c4b] text-white border-transparent"
                            )}
                          >

                            {msg.content}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right: AI Summary Panel ── */}
          <div className="flex-none h-auto lg:h-full flex flex-col lg:border-l border-border lg:w-[340px] xl:w-[400px] shrink-0 bg-card">
            {/* Mobile Partition Divider */}
            <div className="lg:hidden flex items-center gap-4 px-6 py-6 bg-background/50">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border" />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Analysis Summary</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border" />
            </div>

            <div className="h-full">
              <WaSummaryPanel
                summary={summaryData ?? null}
                isLoading={loadingSummary}
                isError={summaryError}
                onRefresh={handleRefreshSummary}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
