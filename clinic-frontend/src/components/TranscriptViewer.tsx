import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { TranscriptUtterance } from '@/lib/mockData';

interface TranscriptViewerProps {
  utterances: TranscriptUtterance[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export function TranscriptViewer({ utterances, currentTime, onSeek }: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find active utterance based on current time
    const index = utterances.findIndex((u, i) => {
      const nextTime = i < utterances.length - 1 ? utterances[i + 1].timestamp : Infinity;
      return currentTime >= u.timestamp && currentTime < nextTime;
    });
    setActiveIndex(index >= 0 ? index : null);
  }, [currentTime, utterances]);

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWordClick = (timestamp: number) => {
    onSeek(timestamp);
  };

  const filteredUtterances = searchQuery
    ? utterances.filter(u => u.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : utterances;

  if (!utterances || utterances.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
        No transcript entries available for this call.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Find in transcript..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border text-foreground"
        />
      </div>

      <div ref={containerRef} className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {filteredUtterances.map((utterance, index) => {
          const isActive = index === activeIndex;
          const isBot = utterance.speaker === 'bot';

          return (
            <div
              key={index}
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-800/90 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
              }`}
              onClick={() => handleWordClick(utterance.timestamp)}
            >
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                      isBot
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    }`}
                  >
                    {isBot ? 'AI Receptionist' : 'Patient'}
                  </Badge>
                  <span className="text-xs font-mono text-zinc-400">
                    {formatTimestamp(utterance.timestamp)}
                  </span>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-zinc-100 font-medium">
                {utterance.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
