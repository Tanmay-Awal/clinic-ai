interface WordCloudBWProps {
  words: Array<{ text: string; weight: number }>;
  title: string;
  description?: string;
}

export default function WordCloudBW({ words, title, description }: WordCloudBWProps) {
  const maxWeight = Math.max(...words.map(w => w.weight));

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

      <div className="flex flex-wrap items-center justify-center gap-4 py-8">
        {words.map((word, index) => {
          const size = 12 + (word.weight / maxWeight) * 32;
          const opacity = 0.4 + (word.weight / maxWeight) * 0.6;
          
          return (
            <span
              key={index}
              className="font-medium transition-all hover:scale-110"
              style={{
                fontSize: `${size}px`,
                opacity: opacity,
                color: 'hsl(var(--foreground))'
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
