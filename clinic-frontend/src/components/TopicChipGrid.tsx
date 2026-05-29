import { useState } from "react";
import { motion } from "framer-motion";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface Topic {
  label: string;
  percentage: number;
  sentiment: number;
  terms: string[];
  trend: { date: string; count: number }[];
}

interface TopicChipGridProps {
  topics: Topic[];
  onTopicSelect: (label: string) => void;
}

export function TopicChipGrid({ topics, onTopicSelect }: TopicChipGridProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleTopic = (label: string) => {
    const newSelected = selected.includes(label)
      ? selected.filter(s => s !== label)
      : [...selected, label];
    setSelected(newSelected);
    onTopicSelect(label);
  };

  const selectedTopics = topics.filter(t => selected.includes(t.label));
  const trendData = selectedTopics.length > 0 ? selectedTopics[0].trend : [];

  return (
    <div className="space-y-6">
      {/* Topic Chips */}
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => {
          const isSelected = selected.includes(topic.label);
          return (
            <motion.button
              key={topic.label}
              onClick={() => toggleTopic(topic.label)}
              className={`rounded-lg border px-4 py-2 transition-all ${isSelected
                  ? "border-white bg-white text-black"
                  : "border-border bg-card text-foreground hover:border-white/50"
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-sm font-medium">{topic.label}</div>
              <div className="text-xs opacity-60">{topic.percentage}% of calls</div>
            </motion.button>
          );
        })}
      </div>

      {/* Volume Trend Chart */}
      {selectedTopics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Volume Trend
          </h3>
          <ChartContainer
            config={{
              count: { label: "Calls", color: "hsl(var(--foreground))" },
            }}
            className="h-64"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--foreground))", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>
      )}
    </div>
  );
}
