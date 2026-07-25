import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Thermometer, ChevronRight } from 'lucide-react';

interface DiseaseData {
  name: string;
  count: number;
}

interface TopDiseasesProps {
  diseases?: DiseaseData[];
  dateRangeLabel?: string;
}

export default function TopDiseases({ diseases = [], dateRangeLabel = 'Selected Range' }: TopDiseasesProps) {
  // Take top 5 diseases
  const displayDiseases = diseases.slice(0, 5);
  const maxCount = Math.max(...displayDiseases.map(d => d.count), 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 card-glow card-shine h-full flex flex-col relative overflow-hidden">
      {/* Decorative gradient corner */}
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mb-6 relative z-10 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            Top Conditions Treated
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Most frequent appointment reasons for {dateRangeLabel}
          </p>
        </div>
      </div>

      <div className="flex-1 relative z-10 space-y-4">
        {displayDiseases.length > 0 ? (
          displayDiseases.map((disease, idx) => {
            const percentage = Math.max((disease.count / maxCount) * 100, 5);
            return (
              <motion.div
                key={`${disease.name}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
                className="group relative rounded-xl border border-border bg-gradient-to-r from-card to-card/50 p-4 transition-all duration-300 hover:border-rose-500/30 hover:shadow-lg hover:shadow-rose-500/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:bg-rose-500/20 transition-colors">
                      <Thermometer className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-rose-400 transition-colors">
                        {disease.name}
                      </h4>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Condition
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="flex items-baseline gap-1.5 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50 group-hover:border-rose-500/20 transition-colors">
                      <span className="text-sm font-bold text-foreground tabular-nums group-hover:text-rose-400 transition-colors">
                        {disease.count}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider mr-1">
                      Cases
                    </span>
                  </div>
                </div>
                
                {/* Progress bar background */}
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                  {/* Animated fill */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + (idx * 0.1), ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-rose-500/60 to-rose-400 rounded-full group-hover:shadow-[0_0_8px_rgba(251,113,133,0.5)] transition-shadow"
                  />
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <Activity className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No conditions data available</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Check back later for medical insights</p>
          </div>
        )}
      </div>
    </div>
  );
}
