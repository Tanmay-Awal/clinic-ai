'use client';
import AppLayout from '@/components/Layouts/AppLayout';
import { motion } from 'framer-motion';

const SparkleIconLarge = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
      fill="url(#sparkle-gradient-lg)"
    />
    <circle cx="18" cy="6" r="1.5" fill="#F472B6" />
    <circle cx="6" cy="18" r="1" fill="#22D3EE" />
    <defs>
      <linearGradient id="sparkle-gradient-lg" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F472B6" />
        <stop offset="0.5" stopColor="#A855F7" />
        <stop offset="1" stopColor="#22D3EE" />
      </linearGradient>
    </defs>
  </svg>
);

export default function AIAssistantPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] w-full px-4 py-6 bg-background relative overflow-hidden">
        {/* Ambient Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] -z-10" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#22D3EE]/5 rounded-full blur-[120px] -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-3xl bg-gradient-to-b from-[#1c1c1c] to-[#111111] rounded-3xl sm:rounded-[2.5rem] border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] overflow-hidden relative"
        >
          {/* Subtle Outer Glow */}
          <div className="absolute inset-0 rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-tr from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

          {/* Two-column on md+, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 relative z-10">

            {/* Left: Brand + Description */}
            <div className="flex flex-col items-center md:items-start justify-center p-8 sm:p-10 text-center md:text-left md:border-r md:border-white/[0.06]">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-2xl sm:rounded-[1.5rem] border border-white/10 flex items-center justify-center shadow-2xl relative group mb-5"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl sm:rounded-[1.5rem]" />
                <SparkleIconLarge className="w-8 h-8 sm:w-10 sm:h-10" />
              </motion.div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 leading-tight mb-2">
                Netra AI
              </h1>
              <p className="text-foreground/70 text-base sm:text-lg font-medium leading-snug mb-4">
                Your AI-powered analyst.
              </p>
              <p className="text-foreground/40 text-sm sm:text-base leading-relaxed max-w-xs bg-clip-text text-transparent bg-gradient-to-b from-foreground/50 to-foreground/30">
                Soon you&apos;ll be able to ask questions about bookings, feedback, and performance using natural language.
              </p>
            </div>

            {/* Right: Sample Questions + Coming Soon */}
            <div className="flex flex-col justify-center p-8 sm:p-10 border-t border-white/[0.06] md:border-t-0">
              <p className="text-foreground/30 text-xs uppercase tracking-widest font-semibold mb-4 text-center md:text-left">
                Ask anything like
              </p>
              <ul className="space-y-3 w-full mb-8">
                {[
                  "How many bookings today?",
                  "Show weekend performance",
                  "Which channel converts best?"
                ].map((q, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                    className="flex items-center gap-4 text-foreground/50 font-medium text-sm sm:text-base bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 hover:border-white/10 transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400 shrink-0 shadow-[0_0_6px_rgba(168,85,247,0.4)]" />
                    {q}
                  </motion.li>
                ))}
              </ul>

              <div className="flex justify-center md:justify-start">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  animate={{ opacity: [0.9, 1, 0.9] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/30 to-orange-600/20 rounded-full blur-md" />
                    <div className="
                      relative
                      px-7 py-2.5
                      rounded-full
                      bg-[#1a1a1a]
                      border border-amber-500/20
                      font-bold
                      tracking-widest
                      text-[11px]
                      uppercase
                      shadow-2xl
                      transition-all
                      group-hover:border-amber-500/40
                      cursor-default
                    ">
                      <span className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
