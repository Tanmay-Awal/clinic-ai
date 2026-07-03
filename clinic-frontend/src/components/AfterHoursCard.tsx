import { Moon, CalendarCheck, PhoneCall, Clock } from 'lucide-react';

interface AfterHoursCardProps {
  callsHandled: number;
  appointmentsBooked: number;
  durationGenerated: number; // in minutes
}

export function AfterHoursCard({ callsHandled, appointmentsBooked, durationGenerated }: AfterHoursCardProps) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:border-border/80 card-glow card-shine text-left w-full">
      <div className="w-full flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            After-Hours Value
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Work handled while the clinic was closed
          </p>
        </div>
      </div>

      {/* Main Metric with gradient accent */}
      <div className="flex flex-col items-center justify-center flex-grow mb-6 mt-2 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 blur-2xl" />
        </div>
        <span className="text-[48px] leading-none font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 transition-transform duration-300 group-hover:scale-[1.03]">
          {callsHandled.toLocaleString()}
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">
          Calls Handled Overnight
        </span>
      </div>

      <div className="w-full space-y-2">
        {/* Appointments Booked */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[13px] font-medium text-foreground">Appointments Booked</span>
          </div>
          <span className="text-lg font-bold text-emerald-400 tabular-nums">{appointmentsBooked.toLocaleString()}</span>
        </div>

        {/* Human Time Saved */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-sky-500/25 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/40 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden mt-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="text-[13px] font-medium text-foreground">Receptionist Time Saved</span>
          </div>
          <span className="text-lg font-bold text-sky-400 tabular-nums">{Math.round(durationGenerated)} mins</span>
        </div>
      </div>
    </div>
  );
}
