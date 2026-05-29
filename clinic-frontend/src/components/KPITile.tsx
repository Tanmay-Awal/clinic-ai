import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPITrend {
  current: number;
  previous: number;
  changePct: number;
  rag?: 'green' | 'amber' | 'red';
  sparkline?: number[];
  currentLabel?: string;
}

interface KPITileProps {
  label: string;
  value: string | number;
  delta?: number;
  format?: 'number' | 'percent' | 'duration' | 'score';
  trend?: KPITrend;
  onClick?: () => void;
  breakdown?: { name: string; count: number }[];
}

const RAG_COLORS = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

function MicroSparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data || data.length < 2) return null;

  const width = 80;
  const height = 24;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      className={cn('opacity-40', className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function KPITile({ 
  label, 
  value, 
  delta, 
  format = 'number', 
  trend, 
  onClick,
  breakdown
}: KPITileProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'duration':
        const mins = Math.floor(val / 60);
        const secs = val % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      case 'score':
        return val.toFixed(2);
      default:
        return val.toLocaleString();
    }
  };

  // Use trend data if available, otherwise fall back to delta
  const changePct = trend?.changePct ?? delta;
  const isPositive = changePct !== undefined && changePct > 0;
  const isNegative = changePct !== undefined && changePct < 0;
  const isFlat = changePct !== undefined && changePct === 0;

  // Format display value 
  const displayValue = formatValue(value);

  return (
    <div
      onClick={onClick}
      className={cn(
        // MIN_KPI_HEIGHT: Keeps KPI card heights stable across tiles with/without breakdown text in dense dashboard grids.
        'relative rounded-xl border border-border bg-card p-6 shadow-premium-sm overflow-hidden card-glow card-shine flex flex-col justify-between h-full min-h-[140px]',
        onClick && 'cursor-pointer hover:border-border/80'
      )}
    >
      {/* RAG indicator dot */}
      {trend?.rag && (
        <div className="absolute top-3 right-3">
          <div className={cn('h-2.5 w-2.5 rounded-full', RAG_COLORS[trend.rag])} />
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        
        <div className="flex items-end gap-4 overflow-hidden">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {displayValue}
          </p>

          {breakdown && breakdown.length > 0 && (
            <div className="flex flex-col gap-1 text-[10px] leading-tight mb-1 border-l border-border/60 pl-3">
              {breakdown.filter((agent) => agent.name).map((agent) => (
                <div key={agent.name} className="flex items-center gap-1.5 leading-none">
                  <span className="text-muted-foreground font-medium whitespace-nowrap">{agent.name}</span>
                  <span className="text-foreground font-bold">{agent.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={cn('mt-auto pt-2 flex items-center', changePct !== undefined ? 'justify-between' : 'justify-end')}>
        {/* Trend badge */}
        {changePct !== undefined ? (
          <div
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium shrink-0',
              isPositive && 'bg-emerald-500/10 text-emerald-500',
              isNegative && 'bg-red-500/10 text-red-500',
              isFlat && 'bg-secondary text-muted-foreground'
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            {isFlat && <Minus className="h-3 w-3" />}
            {Math.abs(changePct).toFixed(1)}%
          </div>
        ) : null}

        {/* Sparkline */}
        {trend?.sparkline && trend.sparkline.length > 1 && (
          <MicroSparkline data={trend.sparkline} className="text-muted-foreground ml-auto" />
        )}
      </div>
    </div>
  );
}
