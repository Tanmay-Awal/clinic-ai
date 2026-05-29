import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'alert';
  text: string;
}

interface InsightBlockBWProps {
  title: string;
  insights: Insight[];
}

export default function InsightBlockBW({ title, insights }: InsightBlockBWProps) {
  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="h-4 w-4" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium uppercase tracking-wide section-heading-gradient">
          {title}
        </h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div 
            key={index}
            className="flex gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50"
          >
            <div className="flex-shrink-0 mt-0.5 text-foreground">
              {getIcon(insight.type)}
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
