'use client';

import { motion } from 'framer-motion';
import { Phone, CalendarCheck, TrendingUp, MessageSquare, ArrowRightLeft, Users } from 'lucide-react';

interface StatsRowProps {
    stats: {
        totalCalls: number;
        successfulBookings: number;
        conversionRate: number;
        transferRate?: number;
        voicemailRate?: number;
        totalCoversBooked: number;
    };
    botName?: string;
    mode?: 'reservation' | 'feedback';
}

const statConfig = [
    {
        key: 'totalCalls' as const,
        label: 'Total Calls',
        icon: Phone,
        format: (v?: number) => (v ?? 0).toString(),
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
    },
    {
        key: 'successfulBookings' as const,
        label: 'Bookings Made',
        icon: CalendarCheck,
        format: (v?: number) => (v ?? 0).toString(),
        color: 'text-green-500',
        bg: 'bg-green-500/10',
    },
    {
        key: 'conversionRate' as const,
        label: 'Conversion Rate',
        icon: TrendingUp,
        format: (v?: number) => `${(v ?? 0).toFixed(1)}%`,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
    },
    {
        key: 'transferRate' as const,
        label: 'Transfer Rate',
        icon: ArrowRightLeft,
        format: (v?: number) => `${(v ?? 0).toFixed(1)}%`,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
    },
    {
        key: 'voicemailRate' as const,
        label: 'Voicemail Rate',
        icon: MessageSquare,
        format: (v?: number) => `${(v ?? 0).toFixed(1)}%`,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
    },
    {
        key: 'totalCoversBooked' as const,
        label: 'Covers Booked',
        icon: Users,
        format: (v?: number) => (v ?? 0).toString(),
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
    },
];

export function StatsRow({ stats, botName, mode }: StatsRowProps) {
    const isFeedback = mode === 'feedback' ||
                       (mode !== 'reservation' && botName?.toLowerCase().includes('feedback')) ||
                       (typeof stats.voicemailRate === 'number' && stats.voicemailRate > 0);
    const isReservation = !isFeedback;
    const isSales = botName?.toLowerCase().includes('riley');

    const salesLabels: Record<string, string> = {
        totalCalls: 'Total Queries',
        successfulBookings: 'Demos Booked',
        conversionRate: 'Adoption Rate',
        transferRate: 'Escalation Rate',
        totalCoversBooked: 'Renewal Opportunities',
    };

    const filteredConfig = statConfig
        .filter(stat => {
            if (stat.key === 'transferRate') return isReservation;
            if (stat.key === 'voicemailRate') return isFeedback;
            return true;
        })
        .map(stat => isSales && salesLabels[stat.key] ? { ...stat, label: salesLabels[stat.key] } : stat);

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {filteredConfig.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <motion.div
                        key={stat.key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.08 }}
                        className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-border/80 hover:shadow-sm"
                    >
                        {/* Decorative gradient */}
                        <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/3 blur-2xl transition-colors group-hover:bg-primary/5" />

                        <div className="relative">
                            <div className="mb-3 flex items-center gap-2">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </div>
                            <p className="text-2xl font-bold tracking-tight text-foreground">
                                {stat.format(stats[stat.key])}
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                                {stat.label}
                            </p>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
