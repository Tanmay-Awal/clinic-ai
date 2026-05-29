import React, { useEffect, useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Search, Calendar, Phone, History, Loader2 } from 'lucide-react';
import { callInsightsApi } from '@/lib/api/call-insights';
import type { CallInsightsReport } from '@/types/callInsights';
import { format, isValid } from 'date-fns';

const safeFormat = (dateInput: any, fmt: string, fallback = 'Unknown Date') => {
    if (!dateInput) return fallback;
    const d = new Date(dateInput);
    return isValid(d) ? format(d, fmt) : fallback;
};

interface HistoryReportItem {
    id: number;
    status: string;
    period_start: string;
    period_end: string;
    total_calls: number;
    report_data: CallInsightsReport | null;
    generated_at: string | null;
    created_at: string;
}

interface CallInsightsHistorySheetProps {
    isOpen: boolean;
    onClose: () => void;
    agentId?: string;
    onSelectReport: (report: CallInsightsReport, periodStart: string, periodEnd: string) => void;
}

export function CallInsightsHistorySheet({
    isOpen,
    onClose,
    agentId,
    onSelectReport,
}: CallInsightsHistorySheetProps) {
    const [reports, setReports] = useState<HistoryReportItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchHistory = React.useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch a generous limit to allow client-side searching
            const data = await callInsightsApi.getReports(agentId, 50);
            setReports(
                data.reports.filter((r) => r.status === 'completed' && r.report_data)
            );
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setIsLoading(false);
        }
    }, [agentId]);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, fetchHistory]);

    const filteredReports = reports.filter((r) => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        const startStr = safeFormat(r.period_start, 'MMM dd, yyyy').toLowerCase();
        const endStr = safeFormat(r.period_end, 'MMM dd, yyyy').toLowerCase();
        return startStr.includes(searchLower) || endStr.includes(searchLower);
    }).sort((a, b) => {
        const dateA = new Date(a.period_end).getTime();
        const dateB = new Date(b.period_end).getTime();
        return dateB - dateA;
    });

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background/95 backdrop-blur-sm border-l border-border pr-2 py-6 flex flex-col">
                <SheetHeader className="px-4 mb-4">
                    <SheetTitle className="text-xl font-semibold flex items-center gap-2">
                        <History className="h-5 w-5" />
                        History
                    </SheetTitle>
                </SheetHeader>

                <div className="px-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-9 h-9 bg-muted/50 focus-visible:ring-1"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 px-4 pr-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No past reports found.
                        </p>
                    ) : (
                        <div className="relative border-l border-muted-foreground/30 ml-2 space-y-0.5">
                            {filteredReports.map((report, index) => {
                                const isLast = index === filteredReports.length - 1;
                                const publishedDate = report.period_end;

                                return (
                                    <div
                                        key={report.id}
                                        className={`relative pl-6 pb-8 ${isLast ? '' : ''}`}
                                    >
                                        <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-muted-foreground border-2 border-background" />
                                        
                                        <div 
                                            className="space-y-1.5 cursor-pointer group"
                                            onClick={() => {
                                                if (report.report_data) {
                                                    onSelectReport(
                                                        report.report_data, 
                                                        report.period_start, 
                                                        report.period_end
                                                    );
                                                    onClose();
                                                }
                                            }}
                                        >
                                            <h4 className="text-[15px] font-medium leading-none text-foreground group-hover:text-primary transition-colors">
                                                Insights: {safeFormat(report.period_start, 'MMM d')} - {safeFormat(report.period_end, 'MMM d, yyyy')}
                                            </h4>
                                            
                                            <div className="text-[13px] text-muted-foreground space-y-1 mt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                    <span>
                                                        Analyzed period ({safeFormat(report.period_start, 'MMM d')} - {safeFormat(report.period_end, 'MMM d')})
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-blue-400">
                                                    <Phone className="h-3.5 w-3.5 shrink-0" />
                                                    <span>Analyzed {report.total_calls} calls</span>
                                                </div>
                                                <div className="pt-0.5 opacity-80">
                                                    Published on: {safeFormat(publishedDate, 'MMM d, yyyy')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
