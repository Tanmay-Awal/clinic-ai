'use client';
import { motion } from 'framer-motion';

interface FeedbackTypeChartProps {
    data?: { type: string; count: number; percentage: number }[];
    onTypeClick?: (type: string) => void;
}

const typeIcons: Record<string, string> = {
    'Complaint': '🔴',
    'Compliment': '🟢',
    'Suggestion': '🔵',
    'Review': '🟡',
    'Rating': '⭐',
    'Mixed': '⚪',
    'Neutral': '⚪',
    'Unknown': '⚪',
};

// Premium Hex Colors tailored for each type. 
// Unknown is mapped to a sleek Slate color to avoid the neon green anomaly.
const typeColors: Record<string, string> = {
    'Compliment': '#10b981', // emerald-500
    'Complaint': '#ef4444', // red-500
    'Suggestion': '#3b82f6', // blue-500
    'Review': '#eab308', // yellow-500
    'Rating': '#8b5cf6', // violet-500
    'Mixed': '#f59e0b', // amber-500
    'Neutral': '#94a3b8', // slate-400
    'Unknown': '#38bdf8', // sky-400 (light bright positive blue)
};

export default function FeedbackTypeChart({ data, onTypeClick }: FeedbackTypeChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-2xl border border-border bg-card p-6 card-glow card-shine relative overflow-hidden">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">Feedback Types</h3>
                <p className="mt-4 text-xs text-muted-foreground">No feedback type data available</p>
            </div>
        );
    }

    const total = data.reduce((sum, d) => sum + d.count, 0);

    // Prepare chart data, ensuring reliable specific color mapping and no empties
    const chartData = data.filter(d => d.count > 0).map((d) => ({
        name: d.type,
        value: d.count,
        percentage: d.percentage,
        color: typeColors[d.type] || '#38bdf8',
        icon: typeIcons[d.type] || '⚪'
    }));

    return (
        <div className="rounded-2xl border border-border bg-card p-6 card-glow card-shine relative overflow-hidden h-full flex flex-col justify-between">
            <div className="mb-6 relative z-10 flex justify-between items-end">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Feedback Types</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Detailed breakdown of feedback classification</p>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold tracking-tight text-foreground">{total}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-medium">(Calls + Form)</span>
                </div>
            </div>

            <div className="relative z-10 space-y-8 flex-1 flex flex-col justify-center">
                {/* Horizontal Stacked Bar */}
                <div className="relative h-3 w-full rounded-full bg-muted/30 overflow-hidden flex shadow-inner">
                    {chartData.map((item, idx) => (
                        <motion.div
                            key={item.name}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                            className="h-full relative border-r border-background/20 last:border-r-0"
                            style={{ backgroundColor: item.color }}
                            title={`${item.name} (${item.percentage}%)`}
                        />
                    ))}
                </div>

                {/* Grid of Metric Cards */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                    {chartData.map((item, idx) => (
                        <motion.button
                            key={item.name}
                            type="button"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1, ease: 'easeOut' }}
                            className="bg-muted/10 rounded-xl p-4 border border-border/40 hover:bg-muted/30 hover:border-border/80 transition-all duration-300 relative overflow-hidden group cursor-pointer"
                            onClick={() => onTypeClick?.(item.name)}
                            aria-label={`View ${item.name} feedback calls`}
                        >
                            {/* Card Accent Glow */}
                            <div
                                className="absolute -inset-1 opacity-0 group-hover:opacity-10 blur-xl transition duration-500 rounded-xl"
                                style={{ backgroundColor: item.color }}
                            />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full ring-2 ring-background shadow-sm"
                                            style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }}
                                        />
                                        <span className="font-semibold text-sm text-foreground">{item.name}</span>
                                    </div>
                                    <span className="text-lg filter drop-shadow-sm opacity-80">{item.icon}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-bold text-foreground leading-none">{item.value}</span>
                                    </div>
                                    <span
                                        className="text-sm font-bold flex items-center justify-center bg-background border border-border/50 px-2 py-0.5 rounded-md"
                                        style={{ color: item.color }}
                                    >
                                        {item.percentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}
