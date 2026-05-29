import { motion } from "framer-motion";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import { AlertCircle } from "lucide-react";

interface PredictiveData {
  bucket: string;
  count: number;
}

interface Feature {
  name: string;
  weight: number;
}

interface AtRiskItem {
  id: string;
  name: string;
  probability: number;
  site: string;
}

interface PredictiveInsightsChartProps {
  title: string;
  distribution: PredictiveData[];
  features: Feature[];
  atRisk: AtRiskItem[];
  insight: string;
  mean: number;
}

export function PredictiveInsightsChart({ title, distribution, features, atRisk, insight, mean }: PredictiveInsightsChartProps) {
  return (
    <div className="space-y-6">
      {/* Probability Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title} - Probability Distribution
        </h3>

        <ChartContainer
          config={{
            count: { label: "Count", color: "hsl(var(--foreground))" },
          }}
          className="h-64"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine x={mean.toString()} stroke="hsl(var(--foreground))" strokeDasharray="3 3" label="Mean" />
              <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* AI Insight */}
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground italic">{insight}</p>
        </div>
      </motion.div>

      {/* Feature Importance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Feature Importance
        </h3>

        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{feature.name}</span>
                <span className="text-muted-foreground">{(feature.weight * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground transition-all"
                  style={{ width: `${feature.weight * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* At-Risk Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          High Risk Items (p &gt; 0.8)
        </h3>

        <div className="space-y-2">
          {atRisk.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div>
                <div className="font-medium text-foreground">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.site} • {item.id}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-foreground">{(item.probability * 100).toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
