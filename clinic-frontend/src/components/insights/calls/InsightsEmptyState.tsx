'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BarChart3, Play, Sparkles } from 'lucide-react';

interface InsightsEmptyStateProps {
    onRunNow: () => void;
}

export function InsightsEmptyState({ onRunNow }: InsightsEmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-24 px-4 text-center"
        >
            {/* Illustration */}
            <div className="relative mb-8">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
                    <BarChart3 className="h-10 w-10 text-primary/40" />
                </div>
                <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                </div>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-foreground">
                No insights generated yet
            </h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground leading-relaxed">
                Click &quot;Run Now&quot; to analyze your voice bot&apos;s recent calls and generate
                AI-powered insights about revenue opportunities, bot performance, and
                strategic recommendations.
            </p>

            <Button onClick={onRunNow} size="lg" className="gap-2">
                <Play className="h-4 w-4" />
                Generate Insights
            </Button>

            <p className="mt-4 text-xs text-muted-foreground">
                Analysis typically takes 15-30 seconds
            </p>
        </motion.div>
    );
}
