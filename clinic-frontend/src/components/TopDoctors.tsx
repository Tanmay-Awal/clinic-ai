import React from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, User, Users } from 'lucide-react';

interface DoctorData {
  name: string;
  specialization: string;
  patientCount: number;
}

interface TopDoctorsProps {
  doctors?: DoctorData[];
  dateRangeLabel?: string;
}

export default function TopDoctors({ doctors = [], dateRangeLabel = 'Selected Range' }: TopDoctorsProps) {
  // Take top 5 doctors
  const displayDoctors = doctors.slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 card-glow card-shine h-full flex flex-col relative overflow-hidden">
      {/* Decorative gradient corner */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mb-5 relative z-10 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-cyan-400" />
            Top Doctors
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Most active doctors for {dateRangeLabel}
          </p>
        </div>
      </div>

      <div className="flex-1 relative z-10 space-y-3">
        {displayDoctors.length > 0 ? (
          displayDoctors.map((doc, idx) => (
            <motion.div
              key={`${doc.name}-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className="group relative rounded-xl border border-border bg-gradient-to-r from-card to-card/50 p-4 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
                    <User className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-cyan-400 transition-colors">
                      {doc.name}
                    </h4>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {doc.specialization}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="flex items-baseline gap-1.5 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50 group-hover:border-cyan-500/20 transition-colors">
                    <Users className="h-3.5 w-3.5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                    <span className="text-sm font-bold text-foreground tabular-nums group-hover:text-cyan-400 transition-colors">
                      {doc.patientCount}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider mr-1">
                    Patients
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <Stethoscope className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No doctor data available</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Check back later for patient counts</p>
          </div>
        )}
      </div>
    </div>
  );
}
