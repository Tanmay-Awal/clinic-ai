interface DonutChartBWProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  description?: string;
}

export default function DonutChartBW({
  data,
  title,
  description,
}: DonutChartBWProps) {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const colors = ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#7C3AED'];

  const hasData = total > 0 && data.length > 0;

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {!hasData ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-muted-foreground">No data available</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut */}
          <div className="relative h-40 w-40 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="-rotate-90">
              {data.map((item, index) => {
                const safeTotal = total || 1;
                const percentage = (item.value / safeTotal) * 100;
                const offset = data
                  .slice(0, index)
                  .reduce(
                    (acc, d) => acc + ((d.value || 0) / safeTotal) * 100,
                    0
                  );

                const r = 35;
                const circumference = 2 * Math.PI * r;

                return (
                  <circle
                    key={item.name}
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke={colors[index % colors.length]}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(percentage / 100) * circumference} ${circumference}`}
                    strokeDashoffset={-((offset / 100) * circumference)}
                    className="transition-all hover:opacity-90"
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-foreground">
                {total}
              </span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2 min-w-0">
            {data.map((item, index) => {
              const percentage = total
                ? ((item.value / total) * 100).toFixed(1)
                : '0.0';

              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{
                        backgroundColor: colors[index % colors.length],
                      }}
                    />
                    <span className="truncate text-foreground">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {item.value} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
