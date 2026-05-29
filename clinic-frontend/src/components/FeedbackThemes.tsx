'use client';
import { motion } from 'framer-motion';

interface FeedbackThemesProps {
    positiveThemes?: { comment_preview: string; count: number; callId?: number; callIds?: number[] }[];
    negativeThemes?: { comment_preview: string; count: number; callId?: number; callIds?: number[] }[];
    onThemeClick?: (callId: number) => void;
    onThemeMetricClick?: (theme: string, kind: 'positive' | 'negative', callIds?: number[]) => void;
}

export default function FeedbackThemes({ positiveThemes = [], negativeThemes = [], onThemeClick, onThemeMetricClick }: FeedbackThemesProps) {
    const hasData = positiveThemes.length > 0 || negativeThemes.length > 0;

    if (!hasData) {
        return (
            <div className="rounded-2xl border border-border bg-card p-6 card-glow card-shine relative overflow-hidden h-full">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">Feedback Themes</h3>
                <p className="mt-4 text-xs text-muted-foreground">No theme data available</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-card p-6 card-glow card-shine relative overflow-hidden h-full">
            <div className="mb-5">
                <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">Feedback Themes</h3>
                <p className="mt-1 text-xs text-muted-foreground">Top positive & negative feedback themes</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Positive Themes */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium text-emerald-500 uppercase tracking-wide">What&apos;s Working</span>
                    </div>
                    <div className="space-y-2">
                        {positiveThemes.length > 0 ? positiveThemes.map((item, idx) => (
                            <motion.button
                                key={item.comment_preview}
                                type="button"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06 }}
                                className={`w-full text-left flex items-center gap-3 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 p-3.5 transition-all duration-300 group shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] ${typeof item.callId === 'number' && item.callId > 0 && onThemeClick ? 'cursor-pointer' : ''}`}
                                onClick={() => {
                                    if (onThemeMetricClick) {
                                        onThemeMetricClick(item.comment_preview, 'positive', item.callIds);
                                        return;
                                    }
                                    if (typeof item.callId === 'number' && item.callId > 0 && onThemeClick) onThemeClick(item.callId);
                                }}
                                disabled={!onThemeMetricClick && !(typeof item.callId === 'number' && item.callId > 0 && onThemeClick)}
                            >
                                <span className="text-emerald-500 text-sm font-bold drop-shadow-sm group-hover:scale-110 transition-transform">✓</span>
                                <span className="flex-1 text-sm font-semibold text-foreground/90 tracking-wide leading-snug drop-shadow-sm">{item.comment_preview.charAt(0).toUpperCase() + item.comment_preview.slice(1)}</span>
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors shadow-inner">
                                    ×{item.count}
                                </span>
                            </motion.button>
                        )) : (
                            <p className="text-xs text-muted-foreground italic">No positive themes recorded</p>
                        )}
                    </div>
                </div>

                {/* Negative Themes */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs font-medium text-red-500 uppercase tracking-wide">Needs Attention</span>
                    </div>
                    <div className="space-y-2">
                        {negativeThemes.length > 0 ? negativeThemes.map((item, idx) => (
                            <motion.button
                                key={item.comment_preview}
                                type="button"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06 }}
                                className={`w-full text-left flex items-center gap-3 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 p-3.5 transition-all duration-300 group shadow-sm hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] ${typeof item.callId === 'number' && item.callId > 0 && onThemeClick ? 'cursor-pointer' : ''}`}
                                onClick={() => {
                                    if (onThemeMetricClick) {
                                        onThemeMetricClick(item.comment_preview, 'negative', item.callIds);
                                        return;
                                    }
                                    if (typeof item.callId === 'number' && item.callId > 0 && onThemeClick) onThemeClick(item.callId);
                                }}
                                disabled={!onThemeMetricClick && !(typeof item.callId === 'number' && item.callId > 0 && onThemeClick)}
                            >
                                <span className="text-red-500 text-sm font-bold drop-shadow-sm group-hover:scale-110 transition-transform">✕</span>
                                <span className="flex-1 text-sm font-semibold text-foreground/90 tracking-wide leading-snug drop-shadow-sm">{item.comment_preview.charAt(0).toUpperCase() + item.comment_preview.slice(1)}</span>
                                <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full flex-shrink-0 group-hover:bg-red-500/20 transition-colors shadow-inner">
                                    ×{item.count}
                                </span>
                            </motion.button>
                        )) : (
                            <p className="text-xs text-muted-foreground italic">No negative themes recorded</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
