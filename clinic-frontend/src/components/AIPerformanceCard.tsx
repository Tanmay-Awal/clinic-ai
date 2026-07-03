import { Clock, Phone, CalendarCheck, Smile } from 'lucide-react';

interface AIPerformanceCardProps {
  totalCalls: number;
  totalBookings: number;
  avgTime: number; // in seconds
  avgSentiment: number;
}

export function AIPerformanceCard({ totalCalls, totalBookings, avgTime, avgSentiment }: AIPerformanceCardProps) {
  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:border-border/80 card-glow card-shine text-left w-full">
      <div className="w-full flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            AI Assistant Performance
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Overall efficiency and call metrics
          </p>
        </div>
      </div>

      {/* Main Metric with gradient accent */}
      <div className="flex flex-col items-center justify-center flex-grow mb-6 mt-2 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 blur-2xl" />
        </div>
        <span className="text-[48px] leading-none font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 transition-transform duration-300 group-hover:scale-[1.03]">
          {totalCalls.toLocaleString()}
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">
          Total Calls Handled
        </span>
      </div>

      <div className="w-full space-y-2">
        {/* Appointments Booked */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[13px] font-medium text-foreground">Appointments Booked</span>
          </div>
          <span className="text-lg font-bold text-emerald-400 tabular-nums">{totalBookings.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* Average Handle Time */}
          <div className="relative p-3 rounded-xl border border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/40 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] text-sky-400/80 font-semibold uppercase tracking-wider">Avg Time</span>
            </div>
            <span className="text-xl font-bold text-foreground tabular-nums">{formatTime(avgTime)}</span>
          </div>

          {/* Average Sentiment */}
          <div className="relative p-3 rounded-xl border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1">
              <Smile className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[11px] text-rose-400/80 font-semibold uppercase tracking-wider">Sentiment</span>
            </div>
            <span className="text-xl font-bold text-foreground tabular-nums">{Math.round(avgSentiment)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
