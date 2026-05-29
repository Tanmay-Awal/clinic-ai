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

    // Disabled automatic scrolling to allow user to pause audio without interference
    // The transcript will still track the current time but won't auto-scroll
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Find in transcript..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      <div ref={containerRef} className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {filteredUtterances.map((utterance, index) => {
          const isActive = index === activeIndex;
          const isLowConfidence = utterance.confidence < 0.6;

          return (
            <div
              key={index}
              className={`rounded-lg border p-4 transition-all cursor-pointer ${
                isActive
                  ? 'bg-accent border-border'
                  : 'bg-card border-border hover:border-border'
              }`}
              onClick={() => handleWordClick(utterance.timestamp)}
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className={`text-xs ${isActive ? 'bg-foreground/20 text-foreground' : ''}`}
                >
                  {utterance.speaker === 'caller' ? 'Caller' : 'Bot'}
                </Badge>
                <span className={`text-xs ${isActive ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                  {formatTimestamp(utterance.timestamp)}
                </span>
                {isLowConfidence && (
                  <Badge variant="outline" className="text-xs">
                    Low Confidence
                  </Badge>
                )}
              </div>

              <p
                className={`text-sm leading-relaxed ${
                  isActive ? 'text-foreground' : isLowConfidence ? 'text-muted-foreground' : 'text-foreground/85'
                }`}
              >
                {utterance.has_redaction ? (
                  <>
                    {utterance.text.split('[REDACTED]').map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${
                              isActive ? 'bg-foreground/20 text-foreground' : 'bg-foreground text-background'
                            }`}
                            title="Sensitive info hidden"
                          >
                            █ REDACTED █
                          </span>
                        )}
                      </span>
                    ))}
                  </>
                ) : (
                  utterance.text
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
