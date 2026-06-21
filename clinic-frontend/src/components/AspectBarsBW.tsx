

interface AspectData {
  aspect: string;
  negative: number;
  neutral: number;
  positive: number;
}

interface AspectBarsBWProps {
  data?: { aspect: string; score: number }[];
}

export default function AspectBarsBW({ data }: AspectBarsBWProps) {
  // Use passed data. If empty input given [], use [] (don't fallback to mock).
  // Only fallback to mock if data is explicitly undefined/null AND we want mock.
  // BUT the dashboard sends "feedbackData?.[]" which gives undefined if loading, or [] if empty.
  // We want to treat undefined as [] to show empty state instead of mock.
  const sourceData = data || []; // Change fallback from 'mockData' to []

  const aspectData: AspectData[] = sourceData.map(item => {
    // If score is from backend (0-1 usually)
    const positive = Math.max(0, item.score) * 100;
    const neutral = Math.max(0, 100 - positive);
    const negative = 0; // Backend implementation focused on single likelihood score

    return {
      aspect: item.aspect,
      negative,
      neutral,
      positive
    };
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
          Aspect Sentiment (Feedback)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Sentiment breakdown by aspect
        </p>
      </div>

      <div className="space-y-4">
        {aspectData.map((item) => (
          <div key={item.aspect}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{item.aspect}</span>
              <span className="text-muted-foreground">
                {item.positive.toFixed(0)}% positive
              </span>
            </div>
            <div className="flex h-6 w-full overflow-hidden rounded-lg">
              {/* Negative */}
              {item.negative > 0 && (
                <div
                  className="bg-[hsl(0_0%_20%)]"
                  style={{ width: `${item.negative}%` }}
                />
              )}
              {/* Neutral */}
              {item.neutral > 0 && (
                <div
                  className="bg-[hsl(0_0%_45%)]"
                  style={{ width: `${item.neutral}%` }}
                />
              )}
              {/* Positive */}
              {item.positive > 0 && (
                <div
                  className="bg-[hsl(0_0%_80%)]"
                  style={{ width: `${item.positive}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-[hsl(0_0%_20%)]" />
          <span className="text-muted-foreground">Negative</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-[hsl(0_0%_45%)]" />
          <span className="text-muted-foreground">Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-[hsl(0_0%_80%)]" />
          <span className="text-muted-foreground">Positive</span>
        </div>
      </div>
    </div>
  );
}
