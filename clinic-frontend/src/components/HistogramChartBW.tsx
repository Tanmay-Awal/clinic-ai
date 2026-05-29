interface HistogramChartBWProps {
  data: Array<{ label: string; value: number }>;
  title: string;
  description?: string;
}

export default function HistogramChartBW({ data, title, description }: HistogramChartBWProps) {
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value), 1) : 1;

  return (
    <div className={title || description ? "rounded-2xl border border-border bg-card p-6" : ""}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <div className="flex items-end justify-between gap-2 h-48">
        {data.length > 0 ? (
          data.map((item, index) => {
            const heightPercent = (item.value / maxValue) * 100;
            
            return (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex-1 w-full flex items-end">
                  <div 
                    className="w-full bg-foreground rounded-t-lg transition-all hover:bg-foreground/80 group relative"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {item.value}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground text-center">
                  {item.label}
                </span>
              </div>
            );
          })
        ) : (
          <div className="w-full text-center text-sm text-muted-foreground py-8">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}
