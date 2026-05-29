'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Phone, BarChart3, Bot, Lightbulb } from 'lucide-react';

const loadingMessages = [
    { icon: Phone, text: 'Fetching call summaries...' },
    { icon: BarChart3, text: 'Analyzing conversation patterns...' },
    { icon: Lightbulb, text: 'Finding revenue opportunities...' },
    { icon: Bot, text: 'Identifying bot training gaps...' },
    { icon: BarChart3, text: 'Generating actionable insights...' },
];

interface InsightsLoadingStateProps {
    totalCalls?: number;
}

export function InsightsLoadingState({ totalCalls }: InsightsLoadingStateProps) {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const CurrentIcon = loadingMessages[messageIndex].icon;

    return (
        <div className="flex flex-col items-center justify-center py-24 px-4">
            {/* Pulsing ring */}
            <div className="relative mb-8">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" style={{ animationDuration: '2s' }} />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>

            {/* Animated message */}
            <motion.div
                key={messageIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 text-foreground"
            >
                <CurrentIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                    {loadingMessages[messageIndex].text}
                </span>
            </motion.div>

            {totalCalls && (
                <p className="mt-3 text-xs text-muted-foreground">
                    Analyzing {totalCalls} conversations from the last 7 days
                </p>
            )}

            {/* Subtle progress dots */}
            <div className="mt-6 flex gap-1.5">
                {loadingMessages.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${i <= messageIndex ? 'bg-primary' : 'bg-muted'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
