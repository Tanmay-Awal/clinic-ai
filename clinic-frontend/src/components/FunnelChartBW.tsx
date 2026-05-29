interface FunnelChartBWProps {
  stages: Array<{ label: string; value: number; percentage?: number }>;
  title: string;
  description?: string;
}

export default function FunnelChartBW({ stages, title, description }: FunnelChartBWProps) {
  const maxValue = Math.max(...stages.map(s => s.value));

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const widthPercent = (stage.value / maxValue) * 100;
          const showPercentage = stage.percentage !== undefined ? stage.percentage : 
            (index > 0 ? ((stage.value / stages[0].value) * 100) : 100);

          return (
            <div key={stage.label} className="relative">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{stage.label}</span>
                <span className="text-muted-foreground">
                  {stage.value.toLocaleString()} ({showPercentage.toFixed(1)}%)
                </span>
              </div>
              <div 
                className="h-10 rounded-lg bg-gradient-to-r from-foreground to-foreground/40 flex items-center px-4 transition-all hover:from-foreground/90 hover:to-foreground/50"
                style={{ width: `${widthPercent}%`, minWidth: '120px' }}
              >
                <span className="text-xs font-medium text-background">
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
