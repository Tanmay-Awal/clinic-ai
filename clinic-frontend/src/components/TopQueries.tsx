import React from 'react';
import { motion } from 'framer-motion';
import type { TopQueryItem } from '@/types';

import { BarChart3 } from 'lucide-react';

interface TopQueriesProps {
    queries: TopQueryItem[];
    title?: string;
    description?: string;
    dateRangeLabel?: string;
}

const TopQueries: React.FC<TopQueriesProps> = ({
    queries,
    title,
    description,
    dateRangeLabel = 'Today',
}) => {
    const displayTitle = title || 'Top Queries';
    const displayDescription = description || `Most frequently asked questions for ${dateRangeLabel.toLowerCase()}`;

    return (
        <div className="rounded-2xl border border-border bg-card p-6 h-full min-h-[320px] flex flex-col card-glow card-shine">
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                        {displayTitle}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {displayDescription}
                    </p>
                </div>
                <BarChart3 className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
            </div>

            <div className="space-y-2.5 flex-1 flex flex-col scrollable-list custom-scrollbar">
                {queries && queries.length > 0 ? (
                    queries.map((query, index) => (
                        <motion.div
                            key={`${query.code || query.label}-${index}`}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-transparent border border-white/[0.05] border-l-[4px] border-l-emerald-500/40 hover:border-l-emerald-500 hover:bg-white/[0.03] hover:border-white/[0.12] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300 group cursor-default"
                        >
                            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 group-hover:text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-300 text-sm font-bold shadow-inner">
                                {index + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-[14px] font-semibold text-foreground truncate group-hover:text-emerald-400 transition-colors tracking-wide">
                                    {query.label}
                                </div>
                                <div className="text-[12px] text-muted-foreground mt-0.5 font-medium">
                                    Asked <span className="text-foreground font-bold">{query.count}</span> times
                                </div>
                                {query.sampleVerbatim && (
                                    <div className="text-[11px] text-muted-foreground italic mt-1 line-clamp-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        &ldquo;{query.sampleVerbatim}&rdquo;
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-sm text-muted-foreground text-center">
                            No queries data available
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopQueries;
