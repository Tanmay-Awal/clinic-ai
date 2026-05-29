'use client';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Phone, Play, FileDown, Loader2 } from 'lucide-react';

interface CallInsightsHeaderProps {
    botName: string;
    selectedPeriod: string;
    onPeriodChange: (period: string) => void;
    onRunNow: () => void;
    onExportPdf: () => void;
    isGenerating: boolean;
    lastGeneratedAt?: string;
}

export function CallInsightsHeader({
    botName,
    selectedPeriod,
    onPeriodChange,
    onRunNow,
    onExportPdf,
    isGenerating,
    lastGeneratedAt,
}: CallInsightsHeaderProps) {
    return (
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
            <div className="flex h-16 items-center justify-between gap-4 px-6">
                {/* Title */}
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Call Insights
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            for {botName}
                            {lastGeneratedAt && (
                                <span className="ml-2 text-muted-foreground">
                                    · Generated {new Date(lastGeneratedAt).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    {/* Period Selector */}
                    <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                        <SelectTrigger className="w-36 h-9 bg-background text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7days">Last 7 days</SelectItem>
                            <SelectItem value="14days">Last 14 days</SelectItem>
                            <SelectItem value="30days">Last 30 days</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Run Now */}
                    <Button
                        onClick={onRunNow}
                        disabled={isGenerating}
                        className="gap-2 h-9"
                    >
                        {isGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        {isGenerating ? 'Generating...' : 'Run Now'}
                    </Button>

                    {/* Export PDF */}
                    <Button
                        variant="outline"
                        onClick={onExportPdf}
                        className="gap-2 h-9"
                        disabled={isGenerating}
                    >
                        <FileDown className="h-4 w-4" />
                        Export PDF
                    </Button>
                </div>
            </div>
        </div>
    );
}
