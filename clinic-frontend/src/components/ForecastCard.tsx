import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const forecastData = [
  { date: 'Nov 5', actual: 380, forecast: 370, upper: 410, lower: 330 },
  { date: 'Nov 6', actual: 420, forecast: 395, upper: 435, lower: 355 },
  { date: 'Nov 7', actual: 395, forecast: 405, upper: 445, lower: 365 },
  { date: 'Nov 8', actual: 445, forecast: 420, upper: 460, lower: 380 },
  { date: 'Nov 9', actual: 510, forecast: 445, upper: 485, lower: 405 },
  { date: 'Nov 10', actual: 490, forecast: 470, upper: 510, lower: 430 },
  { date: 'Nov 11', actual: 475, forecast: 480, upper: 520, lower: 440 },
  { date: 'Nov 12', actual: 532, forecast: 495, upper: 535, lower: 455 },
];

export default function ForecastCard({ dateRangeLabel = 'Last 7 Days' }: { dateRangeLabel?: string }) {
  const lastActual = forecastData[forecastData.length - 1].actual;
  const lastForecast = forecastData[forecastData.length - 1].forecast;
  const variance = ((lastActual - lastForecast) / lastForecast * 100).toFixed(1);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
          Forecast vs Actual
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Actual {variance > '0' ? '+' : ''}{variance}% vs forecast ({dateRangeLabel.toLowerCase()})
        </p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={forecastData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="hsl(var(--foreground))"
            fillOpacity={0.1}
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="hsl(var(--background))"
            fillOpacity={1}
          />
          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
          {/* Actual line */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--foreground))', r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-medium text-yellow-500 border border-yellow-500/20">
          Under Development
        </span>
      </div>
    </div>
  );
}
