import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Topic {
    topic?: string;
    label?: string;
    code?: string;
    count: number;
    change?: number;
}

interface TrendingTopicsProps {
    topics: Topic[];
    title?: string;
    description?: string;
}

const RANK_COLORS = [
    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
    { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30' },
    { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
];

const TrendingTopics: React.FC<TrendingTopicsProps> = ({
    topics,
    title = 'Trending Topics',
    description = 'Common themes from conversations'
}) => {
    if (!topics || topics.length === 0) return null;

    return (
        <div className="rounded-2xl border border-border bg-card p-6 h-full flex flex-col card-glow card-shine">
            <div className="mb-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    {title}
                </h3>
                {description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                )}
            </div>

            <div className="flex flex-col flex-1 gap-2.5 scrollable-list custom-scrollbar">
                {topics.map((item, index) => {
                    const rankStyle = RANK_COLORS[index % RANK_COLORS.length];
                    const label = item.label || item.topic || 'Unknown';

                    return (
                        <motion.div
                            key={item.label || item.topic || index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.08 }}
                            className={`flex items-center justify-between py-5 px-4 rounded-xl border ${rankStyle.border} bg-card/30 hover:bg-card hover:border-opacity-80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm group`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${rankStyle.bg} text-xs font-bold ${rankStyle.text}`}>
                                    {index + 1}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-foreground">{label}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.count} Mentions</div>
                                </div>
                            </div>

                            {item.change !== undefined && (
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${item.change > 0 ? 'text-emerald-400 bg-emerald-500/10' :
                                    item.change < 0 ? 'text-rose-400 bg-rose-500/10' :
                                        'text-muted-foreground bg-muted/10'
                                    }`}>
                                    {item.change > 0 ? <TrendingUp className="h-3 w-3" /> :
                                        item.change < 0 ? <TrendingDown className="h-3 w-3" /> :
                                            <Minus className="h-3 w-3" />}
                                    {Math.abs(item.change)}%
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default TrendingTopics;
