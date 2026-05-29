'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, PhoneIncoming, PhoneOutgoing, RefreshCw, Home, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCallsList } from '@/hooks/use-calls';
import { useActionsList } from '@/hooks/use-actions';
import { ACTION_REQUEST_TYPE_LABELS } from '@/types/actions';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useAuthStore } from '@/store/authStore';

import type { Call } from '@/types/calls';
import type { ActionListItem } from '@/types/actions';
import { useRef } from 'react';

// Helper to check if category is housekeeping
const isHousekeepingCategory = (category: string | null | undefined): boolean => {
  if (!category) return false;
  const lower = category.toLowerCase();
  return lower === 'housekeeping' || lower === 'house keeping';
};

type NotificationItem = 
  | (Call & { type: 'call'; timestamp: string })
  | (ActionListItem & { type: 'action'; timestamp: string });

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  readNotifications?: Set<string>;
  onNotificationRead?: (itemId: string) => void;
}

export function NotificationsDrawer({
  isOpen,
  onClose,
  onMarkAllRead,
  readNotifications = new Set(),
  onNotificationRead
}: NotificationsDrawerProps) {
  const router = useRouter();
  const prevIsOpen = useRef(isOpen);

  // Get user's timezone from auth store
  const DEFAULT_TIMEZONE = 'Europe/London';

  const rawTimezone =
    useAuthStore((state) => state.user?.timezone);

  const userTimezone =
    typeof rawTimezone === 'string' && rawTimezone.length > 0
      ? rawTimezone
      : DEFAULT_TIMEZONE;

  // Fetch last 10 calls
  const { data: calls, isLoading: isLoadingCalls, refetch: refetchCalls } = useCallsList({
    page: 1,
    limit: 10,
    sort_by: 'call_start_time',
    sort_order: 'DESC',
  });

  // Fetch last 10 actions
  const { data: actionsData, isLoading: isLoadingActions, refetch: refetchActions } = useActionsList({
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const allNotifications = useMemo(() => {
    const items: NotificationItem[] = [];
    if (calls && calls.length > 0) {
      calls.forEach(c => items.push({ ...c, type: 'call', timestamp: c.time || new Date().toISOString() }));
    }
    if (actionsData?.data && actionsData.data.length > 0) {
      actionsData.data.forEach(a => items.push({ ...a, type: 'action', timestamp: a.created_at || new Date().toISOString() }));
    }
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [calls, actionsData]);

  const isLoading = isLoadingCalls || isLoadingActions;

  useEffect(() => {
    if (!isOpen) return;

    // Fetch immediately when drawer opens
    refetchCalls();
    refetchActions();

    // Poll every 20 seconds while drawer is open
    const interval = setInterval(() => {
      refetchCalls();
      refetchActions();
    }, 20000);
    return () => clearInterval(interval);
  }, [isOpen, refetchCalls, refetchActions]);


  // Mark all as read when drawer opens and data is available
  useEffect(() => {
    if (isOpen && !prevIsOpen.current && allNotifications.length > 0) {
      allNotifications.forEach(item => {
        if (onNotificationRead) {
          onNotificationRead(`${item.type}_${item.id}`);
        }
      });
      onMarkAllRead();
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, allNotifications, onNotificationRead, onMarkAllRead]);

  const handleMarkAllRead = () => {
    onMarkAllRead();
  };

  const handleItemClick = (item: NotificationItem) => {
    if (onNotificationRead) {
      onNotificationRead(`${item.type}_${item.id}`);
    }
    if (item.type === 'action') {
      router.push(`/actions`);
    } else {
      router.push(`/calls/${item.id}`);
    }
    onClose();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Just now';
    try {
      let date: Date;

      // If the date string doesn't have timezone info, assume it's UTC
      if (!dateString.includes('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
        // Append 'Z' to treat as UTC
        date = new Date(dateString + 'Z');
      } else {
        date = new Date(dateString);
      }

      // Convert to user's timezone and calculate relative time
      const zonedDate = toZonedTime(date, userTimezone);
      return formatDistanceToNow(zonedDate, { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const unreadCount = allNotifications.filter(item => !readNotifications.has(`${item.type}_${item.id}`)).length || 0;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-card border-l border-border z-50 transform transition-transform duration-300 ease-in-out overflow-hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { refetchCalls(); refetchActions(); }}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : allNotifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications found
              </div>
            ) : (
              <div className="divide-y divide-border">
                {allNotifications.map((item) => {
                  const isRead = readNotifications.has(`${item.type}_${item.id}`);

                  if (item.type === 'action') {
                    const actionData = item;
                    const actionLabel = ACTION_REQUEST_TYPE_LABELS[actionData.request_type as keyof typeof ACTION_REQUEST_TYPE_LABELS] || (actionData as any).request_type_label || 'Action Needed';
                    return (
                      <div
                        key={`action_${item.id}`}
                        onClick={() => handleItemClick(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                             e.preventDefault();
                             handleItemClick(item);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "p-4 cursor-pointer outline-none transition-colors hover:bg-secondary/30 focus-visible:bg-secondary/30",
                          !isRead && "bg-secondary/20"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                            !isRead ? "bg-primary" : "bg-transparent"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <ClipboardList className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <p className="text-sm font-medium text-foreground truncate">
                                Action Needed
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-600 bg-blue-500/10">
                                {actionLabel}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(item.timestamp)}
                              </span>
                            </div>
                            {actionData.guest_name && (
                              <p className="text-xs text-foreground/80 mt-1">
                                For: {actionData.guest_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default is call
                  const call = item;
                  const isHousekeeping = isHousekeepingCategory(call.category);
                  const callData = call;
                  const roomNumber = (callData as any)?.room_number || (callData as any)?.analysis?.room_number;
                  const requestType = (callData as any)?.request_type || (callData as any)?.analysis?.request_type;
                  const callDirection = (callData as any)?.call_direction || (callData as any)?.direction || 'inbound';
                  const isInbound = callDirection === 'inbound';

                  return (
                    <div
                      key={`call_${call.id}`}
                      onClick={() => handleItemClick(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                           e.preventDefault();
                           handleItemClick(item);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "p-4 cursor-pointer outline-none transition-colors hover:bg-secondary/30 focus-visible:bg-secondary/30",
                        !isRead && "bg-secondary/20"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                          !isRead ? "bg-primary" : "bg-transparent"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isInbound ? (
                              <PhoneIncoming className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <PhoneOutgoing className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <p className="text-sm font-medium text-foreground truncate">
                              {call.name || 'Unknown Caller'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {call.category && (
                              <Badge variant="outline" className="text-xs">
                                {call.category}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(call.time)}
                            </span>
                          </div>
                          {isHousekeeping && (roomNumber || requestType) && (
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {roomNumber && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Home className="h-3 w-3" />
                                  Room {roomNumber}
                                </Badge>
                              )}
                              {requestType && (
                                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 bg-amber-500/10">
                                  {requestType}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
