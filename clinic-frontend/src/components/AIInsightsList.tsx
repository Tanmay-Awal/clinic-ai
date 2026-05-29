'use client';

import { motion } from "framer-motion";
import { Sparkles, Bot, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

interface AIInsight {
    type: 'negative' | 'neutral' | 'positive' | 'alert';
    text: string;
}

interface AIInsightsListProps {
    insights: AIInsight[];
    category: string;
}

export function AIInsightsList({ insights, category }: AIInsightsListProps) {
    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        AI Generated Insights for {category}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Analysis based on recent call patterns and feedback
                    </p>
                </div>
            </div>

            <div className="grid gap-4">
                {insights.map((insight, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 hover:bg-accent/5 transition-all duration-300"
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 p-2 rounded-full bg-background border border-border shrink-0 ${insight.type === 'negative' ? 'text-red-500' :
                                insight.type === 'alert' ? 'text-amber-500' :
                                    insight.type === 'positive' ? 'text-green-500' : 'text-blue-500'
                                }`}>
                                {insight.type === 'negative' ? <AlertCircle className="h-4 w-4" /> :
                                    insight.type === 'alert' ? <TrendingUp className="h-4 w-4" /> :
                                        insight.type === 'positive' ? <CheckCircle2 className="h-4 w-4" /> :
                                            <Bot className="h-4 w-4" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-medium leading-relaxed text-foreground">
                                    {insight.text}
                                </p>
                            </div>
                        </div>
                        {/* Decorative gradient blob */}
                        <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
