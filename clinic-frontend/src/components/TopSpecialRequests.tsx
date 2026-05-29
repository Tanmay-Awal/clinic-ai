import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SpecialRequestItem } from '@/types';

import { Sparkles } from 'lucide-react';

interface TopSpecialRequestsProps {
    requests: SpecialRequestItem[];
    title?: string;
    description?: string;
    dateRangeLabel?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Dietary & Allergens': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    'Special Occasions': 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    'Seating': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    'Other': 'text-gray-500 bg-gray-500/10 border-gray-500/20',
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
    'Dietary & Allergens': 'bg-amber-500',
    'Special Occasions': 'bg-purple-500',
    'Seating': 'bg-blue-500',
    'Other': 'bg-gray-500',
};

const CATEGORY_ORDER = ['Dietary & Allergens', 'Special Occasions', 'Seating', 'Other'];

function CategoryGroup({
    category,
    items,
    baseDelay,
}: {
    category: string;
    items: SpecialRequestItem[];
    baseDelay: number;
}) {
    return (
        <motion.div
            key={category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: baseDelay }}
        >
            <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
                <div className={`w-1.5 h-1.5 rounded-full ${CATEGORY_DOT_COLORS[category] || 'bg-gray-500'}`} />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {category}
                </span>
            </div>
            <div className="space-y-2.5">
                {items.map((request, index) => (
                    <motion.div
                        key={request.code || index}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: baseDelay + index * 0.05 }}
                        className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-transparent border border-white/[0.05] border-l-[4px] border-l-sky-500/40 hover:border-l-sky-500 hover:bg-white/[0.03] hover:border-white/[0.12] hover:shadow-[0_0_20px_rgba(14,165,233,0.1)] transition-all duration-300 group cursor-default"
                    >
                        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-500 group-hover:text-sky-400 group-hover:bg-sky-500/20 group-hover:scale-110 transition-all duration-300 text-sm font-bold shadow-inner">
                            {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-semibold text-foreground truncate group-hover:text-sky-400 transition-colors tracking-wide">
                                {request.label}
                            </div>
                            <div className="text-[12px] text-muted-foreground mt-0.5 font-medium">
                                Requested <span className="text-foreground font-bold">{request.count}</span> times
                            </div>
                            {request.sampleDetail && (
                                <div className="text-[11px] text-muted-foreground italic mt-1 line-clamp-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    &ldquo;{request.sampleDetail}&rdquo;
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

const TopSpecialRequests: React.FC<TopSpecialRequestsProps> = ({
    requests,
    title,
    description,
    dateRangeLabel = 'Today',
}) => {
    const displayTitle = title || 'Top Special Requests';
    const displayDescription = description || `Common requests for ${dateRangeLabel.toLowerCase()}`;

    const groupedRequests = useMemo(() => {
        if (!requests || requests.length === 0) return {};

        const groups: Record<string, SpecialRequestItem[]> = {};
        requests.forEach((req) => {
            const cat = req.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(req);
        });
        return groups;
    }, [requests]);

    const orderedCategories = useMemo(() => {
        const allCategories = Object.keys(groupedRequests);
        const ordered = CATEGORY_ORDER.filter((cat) => allCategories.includes(cat));
        const extra = allCategories.filter((cat) => !CATEGORY_ORDER.includes(cat));
        return [...ordered, ...extra];
    }, [groupedRequests]);

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
                <Sparkles className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
            </div>

            <div className="space-y-4 flex-1 flex flex-col scrollable-list custom-scrollbar">
                {requests && requests.length > 0 ? (
                    orderedCategories.map((cat, catIndex) => (
                        <CategoryGroup
                            key={cat}
                            category={cat}
                            items={groupedRequests[cat]}
                            baseDelay={catIndex * 0.1}
                        />
                    ))
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-sm text-muted-foreground text-center">
                            No special requests data available
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopSpecialRequests;
