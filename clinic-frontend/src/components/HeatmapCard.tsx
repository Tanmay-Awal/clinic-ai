'use client';
import { useState, useMemo } from 'react';

import type { Last7DaysCallCount } from '@/types/dashboard';

interface HeatmapCardProps {
  direction: 'inbound' | 'outbound';
  data?: Last7DaysCallCount;
}

export default function HeatmapCard({ direction, data }: HeatmapCardProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: string; value: number } | null>(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Transform API data to heatmap format or use mock data
  const heatmapData = useMemo(() => {
    if (!data) {
      // Use mock data if no API data provided
      return [];
    }

    // Transform API data structure to heatmap format
    // API format: { "Monday": { "7": 4, "9": 10 }, ... }
    // Heatmap format: [{ hour: "7am", Monday: 4, Tuesday: 0, ... }, ...]
    let hours = Array.from({ length: 24 }, (_, i) => i.toString());
    if (data && Object.keys(data).length > 0) {
      const activeHours = new Set<number>();
      Object.values(data).forEach(dayData => {
        if (dayData) {
          Object.keys(dayData).forEach(h => activeHours.add(parseInt(h)));
        }
      });
      if (activeHours.size > 0) {
        hours = Array.from(activeHours).sort((a, b) => a - b).map(String);
      }
    }

    const dayMap: Record<string, string> = {
      'Monday': 'Monday',
      'Tuesday': 'Tuesday',
      'Wednesday': 'Wednesday',
      'Thursday': 'Thursday',
      'Friday': 'Friday',
      'Saturday': 'Saturday',
      'Sunday': 'Sunday',
    };

    return hours.map(hourStr => {
      const hour = parseInt(hourStr, 10);
      const suffix = hour >= 12 ? 'pm' : 'am';
      const formattedHour = `${hour}${suffix}`;

      const row: Record<string, number | string> = { hour: formattedHour };
      days.forEach(day => {
        const dayData = data[day] || {};
        row[day] = dayData[hourStr] || 0;
      });
      return row;
    });
  }, [data]);

  // Calculate max value for scaling
  const allValues = heatmapData.flatMap(row => {
    const record = row as Record<string, number | string>;
    return days.map(day => {
      const val = record[day];
      return typeof val === 'number' ? val : 0;
    });
  });
  const maxValue = Math.max(...allValues, 1); // Ensure at least 1 to avoid division by zero

  const getIntensity = (value: number) => {
    const ratio = value / maxValue;
    // Black to white gradient
    const lightness = Math.round(10 + ratio * 80); // 10% to 90% lightness
    return `hsl(0 0% ${lightness}%)`;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
            Call Density by Hour × Weekday
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {direction === 'inbound' ? 'Inbound' : 'Outbound'} calls
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Day headers */}
        <div className="flex gap-1 pl-16 mb-1">
          {dayAbbr.map((day, idx) => (
            <div key={days[idx]} className="flex-1 text-center text-xs text-muted-foreground font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="space-y-1">
          {heatmapData.map((row) => (
            <div key={row.hour} className="flex gap-1 items-center">
              <div className="w-14 text-xs text-muted-foreground text-right font-medium">
                {row.hour}
              </div>
              {days.map(day => {
                const record = row as Record<string, number | string>;
                const val = record[day];
                const value = typeof val === 'number' ? val : 0;
                const currentDayAbbr = dayAbbr[days.indexOf(day)];
                const isHovered = hoveredCell?.day === currentDayAbbr && hoveredCell?.hour === record.hour;

                return (
                  <div
                    key={day}
                    className="relative flex-1 aspect-square rounded cursor-pointer transition-all hover:ring-2 hover:ring-foreground"
                    style={{ backgroundColor: getIntensity(value) }}
                    onMouseEnter={() => setHoveredCell({ day: currentDayAbbr, hour: record.hour as string, value })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 min-w-max rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-premium-md pointer-events-none">
                        <div className="font-medium text-foreground">
                          {hoveredCell.day} {hoveredCell.hour}
                        </div>
                        <div className="text-muted-foreground">
                          {hoveredCell.value} calls
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
