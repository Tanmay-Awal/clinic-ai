'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ExternalLink,
    Loader2,
    Eye,
    EyeOff,
    Clock,
    FileText,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import AppLayout from '@/components/Layouts/AppLayout';
import { ActionStatusBadge } from '@/components/Actions/ActionStatusBadge';
import { ActionPriorityBadge } from '@/components/Actions/ActionPriorityBadge';
import { useAction, useUpdateAction } from '@/hooks/use-actions';
import { actionsApi } from '@/lib/api/actions';
import { cn } from '@/lib/utils';
import type { ActionStatus, ActionRequestType } from '@/types/actions';
import { ACTION_STATUS_LABELS, ACTION_REQUEST_TYPE_LABELS } from '@/types/actions';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore, hasActionsOnlyRole, isAdmin } from '@/store/authStore';
import { useOrganisationSettings } from '@/hooks/useOrganisationSettings';
import { formatDateInTimezone, parseTimestampAsUtc } from '@/lib/timezone';

export default function ActionDetailPage({ params }: { params: Promise<{ actionId: string }> }) {
    const router = useRouter();
    const { actionId } = use(params);
    const { user } = useAuthStore();
    const isActionsRole = hasActionsOnlyRole(user);
    const isAdminRole = isAdmin(user);
    const { data: action, isLoading, isError, error } = useAction(actionId);
    const updateAction = useUpdateAction();
    const { settings: orgSettings } = useOrganisationSettings();
    const displayTimezone = orgSettings?.default_timezone || 'Europe/London';

    const [resolutionNotes, setResolutionNotes] = useState('');
    const [statusToSet, setStatusToSet] = useState<ActionStatus | ''>('');
    const [comments, setComments] = useState('');
    const [isEditingComments, setIsEditingComments] = useState(false);
    const [commentsSavedAt, setCommentsSavedAt] = useState<string | null>(null);

    // Unmasking state
    const [unmaskedNumber, setUnmaskedNumber] = useState<string | null>(null);
    const [isUnmasking, setIsUnmasking] = useState(false);

    const handleToggleUnmask = async () => {
        if (unmaskedNumber) {
            setUnmaskedNumber(null);
            return;
        }

        setIsUnmasking(true);
        try {
            const { decryptedNumber } = await actionsApi.decryptNumber(actionId);
            if (decryptedNumber) {
                setUnmaskedNumber(decryptedNumber);
            } else {
                toast.error('Could not decrypt phone number');
            }
        } catch {
            toast.error('Failed to view phone number');
        } finally {
            setIsUnmasking(false);
        }
    };

    useEffect(() => {
        if (isError && error) {
            toast.error((error as Error).message || 'Failed to load action details');
        }
    }, [isError, error]);

    useEffect(() => {
        if (!action || isEditingComments) return;
        setComments(action.comments || '');
        setCommentsSavedAt(action.comments_updated_at || null);
    }, [action, isEditingComments]);

    const handleStatusChange = (newStatus: ActionStatus) => {
        if (newStatus === 'resolved') {
            setStatusToSet(newStatus);
            return;
        }
        updateAction.mutate({ id: actionId, data: { status: newStatus } });
    };

    const handleResolve = () => {
        updateAction.mutate({
            id: actionId,
            data: {
                status: 'resolved',
                ...(resolutionNotes.trim() ? { resolution_notes: resolutionNotes.trim() } : {}),
            },
        }, {
            onSuccess: () => {
                setStatusToSet('');
                setResolutionNotes('');
                router.push('/actions');
            },
        });
    };

    const handleSaveComments = () => {
        updateAction.mutate({
            id: actionId,
            data: { comments },
        }, {
            onSuccess: (data) => {
                setIsEditingComments(false);
                setComments(data.comments || '');
                setCommentsSavedAt(data.comments_updated_at || null);
            },
            onError: () => {
                toast.error('Failed to save comments');
            },
        });
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="p-6 space-y-6 max-w-7xl mx-auto">
                    <Skeleton className="h-8 w-64" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Skeleton className="h-48 w-full rounded-xl" />
                            <Skeleton className="h-64 w-full rounded-xl" />
                        </div>
                        <Skeleton className="h-96 w-full rounded-xl" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (isError || !action) {
        return (
            <AppLayout>
                <div className="flex flex-1 items-center justify-center p-6">
                    <div className="text-center">
                        <p className="text-lg font-semibold">Action not found</p>
                        <Button onClick={() => router.push('/actions')} className="mt-4 rounded-lg">
                            Back to Actions
                        </Button>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="min-h-dvh bg-background">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border flex items-center h-12 sm:h-14 px-3 sm:px-4 lg:px-6">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/actions')}
                            className="h-10 w-10 rounded-md shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium min-w-0">
                            <span className="text-muted-foreground shrink-0">Actions</span>
                            <span className="text-muted-foreground/50 shrink-0">/</span>
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">{action.guest_name || 'Detail'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {action.is_overdue && (
                            <Badge variant="outline" className="text-[10px] font-semibold border-red-500/50 text-red-500 bg-red-500/5 rounded-md px-2 py-0">
                                Overdue
                            </Badge>
                        )}
                        <ActionStatusBadge status={action.status} />
                    </div>
                </header>

                <main className="p-4 lg:p-6 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Summary Card */}
                            <motion.section
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                whileHover={{ y: -2 }}
                                className={cn(
                                    "relative overflow-hidden bg-card border rounded-xl p-4 sm:p-6 shadow-sm group",
                                    action.follow_up_count > 0
                                        ? "border-l-[3px] border-l-orange-500 border-orange-500/30"
                                        : "border-border"
                                )}
                            >
                                <div className="relative">
                                    {action.follow_up_count > 0 && (
                                        <motion.div
                                            className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                                            animate={{ boxShadow: ["0 0 12px rgba(249,115,22,0.08)", "0 0 20px rgba(249,115,22,0.18)", "0 0 12px rgba(249,115,22,0.08)"] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
                                            </span>
                                            <span className="text-xs font-bold text-orange-500 uppercase tracking-wide">
                                                Repeat Caller — {action.follow_up_count + 1} contacts for this issue
                                            </span>
                                        </motion.div>
                                    )}
                                    <div className="flex items-start justify-between mb-4 sm:mb-6">
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1 truncate">
                                                {action.guest_name || 'Guest Request'}
                                            </h1>
                                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                                                <FileText className="h-4 w-4 shrink-0" />
                                                {ACTION_REQUEST_TYPE_LABELS[((action as any).type || '').toLowerCase()] || ACTION_REQUEST_TYPE_LABELS[(action.request_type || '').toLowerCase() as ActionRequestType] || action.request_type_label || (action as any).type || '-'}
                                                <span className="text-border mx-1">•</span>
                                                <ActionPriorityBadge priority={action.priority} />
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Due At</p>
                                            <p className={cn(
                                                "text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 justify-end",
                                                action.is_overdue && "text-red-400"
                                            )}>
                                                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                {action.due_at ? formatDateInTimezone(parseTimestampAsUtc(action.due_at), { hour: '2-digit', minute: '2-digit' }, displayTimezone) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-border/50">
                                        <div>
                                            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Guest</p>
                                            <p className="text-sm font-medium text-foreground">{action.guest_name || 'Anonymous'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Phone</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-mono font-medium">{action.caller_phone || action.phone_number || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Repeats</p>
                                            <p className={cn("text-xs font-bold px-2 py-0.5 rounded-full inline-block", action.follow_up_count > 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500")}>
                                                {action.follow_up_count > 0 ? `${action.follow_up_count + 1} contacts` : 'First contact'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Date</p>
                                            <p className="text-sm font-medium">{action.due_at ? formatDateInTimezone(parseTimestampAsUtc(action.due_at), { day: '2-digit', month: 'short', year: 'numeric' }, displayTimezone) : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.section>

                            {/* Details & Resolution */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <motion.section
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                    whileHover={{ y: -2 }}
                                    className="relative overflow-hidden bg-card border border-border rounded-xl p-5 shadow-sm space-y-3 group"
                                >
                                    <div className="relative">
                                        <div className="flex items-center gap-2 text-sm font-semibold border-b border-border pb-2">
                                            <FileText className="h-4 w-4 text-primary" />
                                            <span>Action Details</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap min-h-[80px]">
                                            {action.description || action.notes || 'No description available.'}
                                        </p>
                                    </div>
                                </motion.section>

                                {(action.status === 'resolved' || resolutionNotes) && (
                                    <motion.section
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        whileHover={{ y: -2 }}
                                        className="relative overflow-hidden bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 shadow-sm space-y-3 group"
                                    >
                                        <div className="relative">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 border-b border-emerald-500/10 pb-2">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Resolution Note</span>
                                            </div>
                                            <p className="text-sm text-emerald-700/80 leading-relaxed whitespace-pre-wrap italic min-h-[80px]">
                                                {action.resolution_notes || resolutionNotes || 'Resolved successfully.'}
                                            </p>
                                        </div>
                                    </motion.section>
                                )}
                            </div>

                            {/* Comments */}
                            <motion.section
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.25 }}
                                whileHover={{ y: -2 }}
                                className="relative overflow-hidden bg-card border border-border rounded-xl p-5 shadow-sm space-y-3 group"
                            >
                                <div className="relative">
                                    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold">
                                            <FileText className="h-4 w-4 text-primary" />
                                            <span>Comments</span>
                                        </div>
                                        {(isAdminRole || isActionsRole) ? (
                                            isEditingComments ? (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        className="h-8 px-3 text-xs"
                                                        onClick={handleSaveComments}
                                                        disabled={updateAction.isPending}
                                                    >
                                                        {updateAction.isPending && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                                                        Save
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-8 px-3 text-xs"
                                                        onClick={() => {
                                                            setIsEditingComments(false);
                                                            setComments(action.comments || '');
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    className="h-8 px-3 text-xs"
                                                    onClick={() => setIsEditingComments(true)}
                                                >
                                                    Edit
                                                </Button>
                                            )
                                        ) : null}
                                    </div>
                                    <div className="pt-3 space-y-2">
                                        {isEditingComments ? (
                                            <Textarea
                                                value={comments}
                                                onChange={(e) => setComments(e.target.value)}
                                                placeholder="Write a note for this action..."
                                                className="rounded-lg text-sm min-h-[120px] resize-none bg-background/50 focus:bg-background transition-colors"
                                            />
                                        ) : (
                                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap min-h-[80px]">
                                                {comments.trim() ? comments : 'No comments yet.'}
                                            </p>
                                        )}
                                        {commentsSavedAt && (
                                            <p className="text-[10px] text-muted-foreground">
                                                Last saved at{' '}
                                                {formatDateInTimezone(
                                                    parseTimestampAsUtc(commentsSavedAt),
                                                    {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    },
                                                    displayTimezone,
                                                )}
                                            </p>
                                        )}
                                        {!isAdminRole && !isActionsRole && (
                                            <p className="text-[10px] text-muted-foreground">Only admins can edit comments.</p>
                                        )}
                                    </div>
                                </div>
                            </motion.section>

                            {/* Schema Grid */}
                            {action.email_notification && (
                                <motion.section
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    whileHover={{ y: -2 }}
                                    className="relative overflow-hidden bg-card border border-border rounded-xl shadow-sm group"
                                >
                                    <div className="relative">
                                        <div className="px-5 py-3 border-b border-border bg-secondary/20 flex items-center justify-between">
                                            <h3 className="text-sm font-bold flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                Email Notification Data
                                            </h3>
                                            <Badge variant="outline" className="text-[10px] font-bold">Metadata</Badge>
                                        </div>
                                        <div className="p-5 grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                                            {Object.entries(action.email_notification).map(([key, value]) => {
                                                if (!value || typeof value === 'object') return null;
                                                return (
                                                    <div key={key}>
                                                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{key.replace(/_/g, ' ')}</p>
                                                        <p className="text-sm font-medium border-b border-border/40 pb-1">{value}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.section>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Update Control */}
                            <motion.section
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                                whileHover={{ y: -2, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
                                className="relative overflow-hidden bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 sticky top-20 group transition-all"
                            >
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                                <div className="relative">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Manage Status</h3>
                                    <div className="space-y-2">
                                        {(Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map((s) => (
                                            <Button
                                                key={s}
                                                variant={action.status === s ? 'secondary' : 'ghost'}
                                                className={cn(
                                                    "w-full justify-start h-10 rounded-lg text-sm font-medium px-3 transition-all",
                                                    action.status === s ? "bg-secondary text-foreground ring-1 ring-border shadow-inner" : "text-muted-foreground hover:bg-secondary/50"
                                                )}
                                                disabled={action.status === s || updateAction.isPending}
                                                onClick={() => handleStatusChange(s)}
                                            >
                                                <motion.div
                                                    animate={action.status === s ? { scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] } : {}}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                    className={cn(
                                                        "h-1.5 w-1.5 rounded-full mr-2.5",
                                                        s === 'open' && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                                                        s === 'in_progress' && "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
                                                        s === 'waiting_on_guest' && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
                                                        s === 'resolved' && "bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.5)]"
                                                    )}
                                                />
                                                {ACTION_STATUS_LABELS[s]}
                                            </Button>
                                        ))}
                                    </div>

                                    <AnimatePresence>
                                        {statusToSet === 'resolved' && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="pt-4 border-t border-border mt-4 space-y-3"
                                            >
                                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Resolution Notes</Label>
                                                <Textarea
                                                    value={resolutionNotes}
                                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                                    placeholder="Enter resolution notes..."
                                                    className="rounded-lg text-sm min-h-[100px] resize-none bg-background/50 focus:bg-background transition-colors"
                                                />
                                                <div className="flex gap-2">
                                                    <Button onClick={handleResolve} className="flex-1 rounded-lg h-9 text-xs font-bold" disabled={updateAction.isPending}>
                                                        {updateAction.isPending && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                                                        Confirm
                                                    </Button>
                                                    <Button variant="outline" className="rounded-lg h-9 text-xs" onClick={() => setStatusToSet('')}>Cancel</Button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="pt-6 border-t border-border mt-6">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Linked History</h3>
                                        {!action.linked_calls || action.linked_calls.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic bg-secondary/10 p-3 rounded-lg border border-border/50">No linked calls.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {action.linked_calls.map((lc) => (
                                                    <motion.div
                                                        key={lc.call_id}
                                                        onClick={() => !isActionsRole && router.push(`/calls/${lc.call_id}`)}
                                                        whileHover={isActionsRole ? {} : { x: 4 }}
                                                        className={cn(
                                                            "relative overflow-hidden p-3 rounded-xl border border-border bg-background transition-all group",
                                                            isActionsRole
                                                                ? "cursor-default opacity-60"
                                                                : "cursor-pointer hover:border-primary/50"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-bold">Call #{lc.call_id}</span>
                                                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground line-clamp-2 italic mb-2">"{lc.call_summary || 'No summary'}"</p>
                                                        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-muted-foreground/60 uppercase">
                                                            <span>{formatDateInTimezone(parseTimestampAsUtc(lc.call_start_time), { day: '2-digit', month: 'short', year: 'numeric' }, displayTimezone)}</span>
                                                            <span>•</span>
                                                            <span>{Math.floor(lc.call_duration_ms / 60000)}m Duration</span>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.section>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
