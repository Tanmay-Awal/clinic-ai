'use client';
import { motion } from 'framer-motion';

interface RebookingFunnelProps {
    stats?: {
        offered: number;
        accepted: number;
        declined: number;
        conversionRate: number;
    };
}

export default function RebookingFunnel({ stats }: RebookingFunnelProps) {
    const offered = stats?.offered || 0;
    const accepted = stats?.accepted || 0;
    const declined = stats?.declined || 0;
    const conversionRate = stats?.conversionRate || 0;

    const stages = [
        { label: 'Offered Rebooking', value: offered, color: '#3b82f6', width: offered > 0 ? 100 : 0 },
        { label: 'Accepted', value: accepted, color: '#10b981', width: offered > 0 ? (accepted / offered) * 100 : 0 },
        { label: 'Declined', value: declined, color: '#ef4444', width: offered > 0 ? (declined / offered) * 100 : 0 },
    ];

    return (
        <div className="rounded-2xl border border-border bg-card p-6 card-glow card-shine relative overflow-hidden h-full flex flex-col justify-between">
            <div className="mb-6 relative z-10 flex justify-between items-end">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Rebooking & Loyalty</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Rebooking retention funnel</p>
                </div>
            </div>

            <div className="space-y-6 relative z-10 flex-1 flex flex-col justify-center mb-6">
                {/* Rebooking Funnel Bars */}
                {offered > 0 ? (
                    <>
                        <div className="space-y-4">
                            {stages.map((stage, idx) => (
                                <div key={stage.label} className="relative">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium text-foreground/90">{stage.label}</span>
                                        <span className="text-sm font-bold text-foreground">{stage.value}</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-muted/40 overflow-hidden relative shadow-inner">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.max(stage.width, stage.value > 0 ? 3 : 0)}%` }}
                                            transition={{ duration: 0.8, delay: idx * 0.15, ease: 'easeOut' }}
                                            className="h-full rounded-full relative"
                                            style={{
                                                backgroundColor: stage.color,
                                                boxShadow: `0 0 12px ${stage.color}aa`
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
                                        </motion.div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mt-2">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                            >
                                <span>⭐</span> {conversionRate}% Conversion Rate
                            </motion.div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-60">
                        <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                            <span className="text-xl">📊</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium text-center">
                            No rebooking activity recorded<br />
                            <span className="text-xs opacity-70">Offers will appear once captured by AI</span>
                        </p>
                    </div>
                )}
            </div>

            {/* NPS & Escalation Cards */}

        </div>
    );
}
