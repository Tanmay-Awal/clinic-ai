'use client';
import { motion } from 'framer-motion';

interface RatingBreakdownProps {
    data?: { stars: number; count: number; percentage: number }[];
    avgRating?: number;
    totalRatings?: number;
}

const starColors = [
    'bg-red-500',       // 1 star
    'bg-orange-500',    // 2 stars
    'bg-amber-500',     // 3 stars
    'bg-lime-500',      // 4 stars
    'bg-emerald-500',   // 5 stars
];

export default function RatingBreakdown({ data, avgRating = 0, totalRatings = 0 }: RatingBreakdownProps) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">Rating Breakdown</h3>
                <p className="mt-4 text-xs text-muted-foreground">No rating data available</p>
            </div>
        );
    }

    // Reverse so 5 stars is on top
    const sortedData = [...data].sort((a, b) => b.stars - a.stars);
    const maxCount = Math.max(...sortedData.map(d => d.count), 1);

    return (
        <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">Rating Breakdown</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Star distribution across all feedback</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{avgRating.toFixed(1)}</div>
                    <div className="flex items-center gap-0.5 justify-end mt-1">
                        {[1, 2, 3, 4, 5].map(star => (
                            <svg key={star} className={`w-3.5 h-3.5 ${star <= Math.round(avgRating) ? 'text-amber-400' : 'text-muted-foreground/30'}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{totalRatings} ratings</div>
                </div>
            </div>

            <div className="space-y-2.5">
                {sortedData.map((row, idx) => (
                    <div key={row.stars} className="flex items-center gap-3">
                        <span className="w-8 text-xs font-medium text-muted-foreground text-right">{row.stars} ★</span>
                        <div className="flex-1 h-5 rounded-full bg-muted/30 overflow-hidden relative">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max((row.count / maxCount) * 100, row.count > 0 ? 4 : 0)}%` }}
                                transition={{ duration: 0.6, delay: idx * 0.08, ease: 'easeOut' }}
                                className={`h-full rounded-full ${starColors[row.stars - 1]}`}
                            />
                        </div>
                        <span className="w-10 text-xs font-medium text-foreground text-right">{row.count}</span>
                        <span className="w-12 text-xs text-muted-foreground text-right">{row.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
