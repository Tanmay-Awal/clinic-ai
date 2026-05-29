import React from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface VolumeTrendChartProps {
    data: { label: string; value: number }[];
    comparisonData?: { label: string; value: number }[];
    title?: string;
    description?: string;
    color?: string;
    comparisonColor?: string;
}

const VolumeTrendChart: React.FC<VolumeTrendChartProps> = ({
    data,
    comparisonData,
    title = 'Call Volume Trend',
    description = 'calls over time',
    color = '#34d399',
    comparisonColor = 'hsla(0, 0%, 100%, 0.15)',
}) => {
    if (!data || data.length === 0) return null;

    // Check if comparison data actually has values
    const hasComparison = comparisonData && comparisonData.length > 0;

    // Merge data for dual-line chart
    const chartData = data.map((d, i) => ({
        ...d,
        ...(hasComparison ? { previousValue: comparisonData[i]?.value ?? 0 } : {})
    }));

    return (
        <div className="w-full h-full rounded-2xl border border-border bg-card p-6 card-glow card-shine">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                        {title}
                    </h3>
                    {description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                    )}
                </div>
                {hasComparison && (
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="text-muted-foreground">Current</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-0.5 w-3 border-t border-dashed" style={{ borderColor: comparisonColor }} />
                            <span className="text-muted-foreground">Previous</span>
                        </div>
                    </div>
                )}
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                                <stop offset="50%" stopColor={color} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="hsl(var(--muted))"
                            opacity={0.4}
                        />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            interval="preserveStartEnd"
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--foreground))',
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                        />
                        {hasComparison && (
                            <Area
                                type="monotone"
                                dataKey="previousValue"
                                stroke={comparisonColor}
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                fill="transparent"
                                isAnimationActive={true}
                                name="Previous Period"
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            isAnimationActive={true}
                            name="Current Period"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default VolumeTrendChart;
