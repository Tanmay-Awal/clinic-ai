import { motion } from "framer-motion";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AspectData {
  aspect: string;
  positive: number;
  negative: number;
  delta: number;
}

interface AspectTornadoChartProps {
  data: AspectData[];
}

export function AspectTornadoChart({ data }: AspectTornadoChartProps) {
  // Transform data for tornado chart (negative values on left, positive on right)
  const tornadoData = data.map(d => ({
    aspect: d.aspect,
    negative: -Math.abs(d.negative),
    positive: d.positive,
    delta: d.delta,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Aspect Sentiment Distribution
      </h3>

      <ChartContainer
        config={{
          negative: { label: "Negative", color: "hsl(var(--muted))" },
          positive: { label: "Positive", color: "hsl(var(--foreground))" },
        }}
        className="h-80"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={tornadoData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis dataKey="aspect" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="negative" fill="hsl(var(--muted))" stackId="stack" />
            <Bar dataKey="positive" fill="hsl(var(--foreground))" stackId="stack" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Delta Indicators */}
      <div className="mt-4 space-y-2">
        {data.map((d) => (
          <div key={d.aspect} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{d.aspect}</span>
            <div className="flex items-center gap-1">
              {d.delta > 0 ? (
                <TrendingUp className="h-3 w-3 text-foreground" />
              ) : (
                <TrendingDown className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={d.delta > 0 ? "text-foreground" : "text-muted-foreground"}>
                {Math.abs(d.delta)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
