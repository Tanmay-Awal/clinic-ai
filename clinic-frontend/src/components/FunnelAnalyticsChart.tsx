import { motion } from "framer-motion";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

interface FunnelStage {
  stage: string;
  count: number;
  conversion: number;
}

interface FunnelAnalyticsChartProps {
  title: string;
  description?: string;
  data: FunnelStage[];
}

const FUNNEL_COLORS = [
  '#34d399', // emerald-400
  '#38bdf8', // sky-400
  '#a78bfa', // violet-400
  '#fbbf24', // amber-400
  '#f472b6', // pink-400
];

export function FunnelAnalyticsChart({ title, description, data }: FunnelAnalyticsChartProps) {
  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 h-full card-glow card-shine"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
        <p className="mt-4 text-xs text-muted-foreground">No funnel data available</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-6 h-full flex flex-col card-glow card-shine"
    >
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Bar Chart */}
      <ChartContainer
        config={{
          count: { label: "Calls", color: "hsl(var(--foreground))" },
        }}
        className="h-56 mb-1"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="4%">
            <defs>
              {FUNNEL_COLORS.map((color, i) => (
                <linearGradient key={i} id={`funnelGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
            <XAxis
              dataKey="stage"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              interval={0}
              tickFormatter={(value) => {
                // Shorten labels for cleaner display
                const words = value.split(' ');
                if (words.length > 2) return words.slice(0, 2).join(' ');
                return value;
              }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={150}>
              {data.map((_, i) => (
                <Cell key={i} fill={`url(#funnelGrad${i % FUNNEL_COLORS.length})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Conversion Rates Table */}
      <div className="mt-auto space-y-2">
        {data.map((stage, i) => (
          <div
            key={stage.stage}
            className={`flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card hover:border-border/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
              />
              <span className="text-[13px] font-medium text-muted-foreground">{stage.stage}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground tabular-nums">{stage.count.toLocaleString()}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md tabular-nums ${stage.conversion >= 80
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : stage.conversion >= 50
                    ? 'bg-sky-500/10 text-sky-400'
                    : stage.conversion >= 30
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
              >
                {Math.round(stage.conversion)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
