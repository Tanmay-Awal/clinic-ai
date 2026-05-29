import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useAuthStore } from '@/store/authStore';
import { getCsrfToken } from '@/utils/csrfToken';

// Get API base URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3021/api';

interface WaveformPlayerProps {
  durationSeconds: number;
  onSeek?: (time: number) => void;
  currentTime?: number;
  asrConfidence?: number[];
  audioUrl?: string; // URL to the audio recording
}

export function WaveformPlayer({
  durationSeconds,
  onSeek,
  currentTime = 0,
  asrConfidence = [],
  audioUrl
}: WaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState([80]);
  const [localTime, setLocalTime] = useState(currentTime);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const token = useAuthStore((state) => state.token);

  // Check if URL is an ElevenLabs recording endpoint (needs authentication)
  const isElevenLabsUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const apiUrl = new URL(API_BASE_URL);
      // Check if it's from our API and contains elevenlabs path
      return urlObj.origin === apiUrl.origin && url.includes('/elevenlabs/recording/');
    } catch {
      // If URL is relative or invalid, check if it contains elevenlabs path
      return url.includes('/elevenlabs/recording/');
    }
  };

  // Fetch authenticated audio from our API and create blob URL
  useEffect(() => {
    if (!audioUrl || !audioUrl.trim()) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    // Only fetch if it's an ElevenLabs URL (needs authentication)
    // Retell and other URLs are used directly without blob conversion
    if (isElevenLabsUrl(audioUrl)) {
      setIsLoadingAudio(true);

      if (!token) {
        if (process.env.NODE_ENV === 'development') {
          console.error('No auth token available for authenticated audio request');
        }
        setIsLoadingAudio(false);
        return;
      }

      // Fetch audio with authentication token and all required headers
      // Match what axios interceptor would send
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Add CSRF token if available (though GET requests typically don't need it)
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      fetch(audioUrl, {
        method: 'GET',
        headers,
        credentials: 'include', // IMPORTANT: Include cookies for CSRF and session
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
          }
          return response.blob();
        })
        .then(blob => {
          // Create blob URL
          const newBlobUrl = URL.createObjectURL(blob);

          // Clean up old blob URL
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }

          setBlobUrl(newBlobUrl);
          setIsLoadingAudio(false);
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching authenticated audio:', error);
          }
          setIsLoadingAudio(false);
          setIsPlaying(false);
        });
    } else {
      // For external URLs (Retell, etc.), use directly (no blob URL needed)
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    }

    // Cleanup function
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [audioUrl, token]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Sync localTime with currentTime prop (only when not playing to avoid conflicts)
  useEffect(() => {
    if (!isPlaying) {
      setLocalTime(currentTime);
      if (audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
        audioRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime, isPlaying]);

  // Memoize onSeek callback to prevent unnecessary re-renders
  const onSeekRef = useRef(onSeek);
  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);

  // Update audio source when URL or blob URL changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Use blob URL if available (for authenticated API requests), otherwise use direct URL
    const effectiveUrl = blobUrl || audioUrl;

    if (!effectiveUrl || !effectiveUrl.trim()) {
      // Clear src if no URL
      audio.src = '';
      audio.load(); // Reset the audio element
      setIsPlaying(false);
      setLocalTime(0);
      return;
    }

    // Set the src attribute directly on the audio element
    // This ensures the browser can properly load the source
    const currentSrc = audio.src || '';
    const newSrc = effectiveUrl.trim();

    if (currentSrc !== newSrc) {
      audio.src = newSrc;
      audio.load(); // Reload the audio element with new source
      setIsPlaying(false);
      setLocalTime(0);
    }
  }, [audioUrl, blobUrl]);

  // Handle audio playback events
  useEffect(() => {
    const audio = audioRef.current;
    const effectiveUrl = blobUrl || audioUrl;
    if (!audio || !effectiveUrl || !effectiveUrl.trim()) return;

    let rafId: number | null = null;
    let lastUpdateTime = 0;
    let lastSeekTime = 0;

    const handleTimeUpdate = () => {
      // Throttle updates to avoid too many re-renders (max 10 times per second)
      const now = Date.now();
      if (now - lastUpdateTime < 100) return;
      lastUpdateTime = now;

      const newTime = audio.currentTime;
      setLocalTime(newTime);

      // Only call onSeek if it's a significant change (>0.5 seconds) to avoid excessive parent re-renders
      // This prevents flickering by reducing the number of parent component updates
      if (Math.abs(newTime - lastSeekTime) > 0.5) {
        lastSeekTime = newTime;
        onSeekRef.current?.(newTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setLocalTime(0);
      // Don't call onSeek on ended to avoid unnecessary re-renders
    };

    const handleError = (e: Event) => {
      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        const audio = e.target as HTMLAudioElement;
        console.error('Audio error:', {
          error: audio.error,
          code: audio.error?.code,
          message: audio.error?.message,
          src: audio.src,
          networkState: audio.networkState,
          readyState: audio.readyState
        });
      }
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      // Audio is ready to play
      if (process.env.NODE_ENV === 'development') {
        console.log('Audio can play:', audio.src);
      }
    };

    const handleLoadedData = () => {
      // Audio data is loaded
      if (process.env.NODE_ENV === 'development') {
        console.log('Audio data loaded:', audio.src, 'Duration:', audio.duration);
      }
    };

    // Use native timeupdate event (throttled by browser) instead of RAF for better performance
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [audioUrl, blobUrl, isPlaying]);

  // Control playback
  useEffect(() => {
    const audio = audioRef.current;
    const effectiveUrl = blobUrl || audioUrl;
    if (!audio || !effectiveUrl || !effectiveUrl.trim()) {
      if (isPlaying) {
        setIsPlaying(false);
      }
      return;
    }

    // Check if audio is ready to play
    if (audio.readyState < 2) { // HAVE_CURRENT_DATA
      if (process.env.NODE_ENV === 'development') {
        console.log('Audio not ready, readyState:', audio.readyState);
      }
      // Wait for audio to be ready
      const handleCanPlay = () => {
        if (isPlaying) {
          audio.play().catch((error) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error playing audio:', error);
            }
            setIsPlaying(false);
          });
        }
        audio.removeEventListener('canplay', handleCanPlay);
      };
      audio.addEventListener('canplay', handleCanPlay);
      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }

    if (isPlaying) {
      audio.play().catch((error) => {
        // Log error in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error playing audio:', error);
        }
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUrl, blobUrl]);

  // Update playback speed
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = speed;
    }
  }, [speed]);

  // Update volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume[0] / 100;
    }
  }, [volume]);

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * durationSeconds;
    setLocalTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    // Debounce onSeek to avoid excessive updates
    onSeek?.(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speeds = [1, 1.25, 1.5];

  return (
    <div className="space-y-4">
      {/* Loading indicator for authenticated audio */}
      {isLoadingAudio && (
        <div className="text-xs text-muted-foreground p-2 text-center">
          Loading audio...
        </div>
      )}

      {/* Hidden audio element */}
      {(blobUrl || audioUrl) && (blobUrl || audioUrl?.trim()) ? (
        <audio
          ref={audioRef}
          preload="auto"
          onLoadedMetadata={() => {
            if (audioRef.current) {
              // Update duration if available from audio element
              const audioDuration = audioRef.current.duration;
              if (process.env.NODE_ENV === 'development') {
                console.log('Audio metadata loaded:', {
                  duration: audioDuration,
                  src: audioRef.current.src,
                  readyState: audioRef.current.readyState
                });
              }
              if (audioDuration && audioDuration > 0) {
                // Duration is already passed as prop, but we can use audio element's duration if needed
              }
            }
          }}
          onError={(e) => {
            const audio = e.currentTarget;
            if (process.env.NODE_ENV === 'development') {
              console.error('Audio load error:', {
                error: audio.error,
                code: audio.error?.code,
                message: audio.error?.message,
                src: audio.src,
                networkState: audio.networkState,
                readyState: audio.readyState
              });
            }
            setIsPlaying(false);
          }}
        >
          {(blobUrl || audioUrl) && (
            <>
              <source src={blobUrl || audioUrl} type="audio/wav" />
              <source src={blobUrl || audioUrl} type="audio/mpeg" />
              <source src={blobUrl || audioUrl} type="audio/mp3" />
              <source src={blobUrl || audioUrl} type="audio/ogg" />
              <source src={blobUrl || audioUrl} type="audio/webm" />
              <source src={blobUrl || audioUrl} />
            </>
          )}
          Your browser does not support the audio element.
        </audio>
      ) : (
        <div className="text-xs text-muted-foreground p-2 text-center">
          No audio recording available
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-12 rounded-full"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>

        <div className="flex items-center gap-2">
          {speeds.map(s => (
            <Button
              key={s}
              size="sm"
              variant={speed === s ? "default" : "outline"}
              className={speed === s ? "bg-foreground text-background hover:bg-foreground/90" : ""}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        <span className="font-mono text-sm text-muted-foreground">
          {formatTime(localTime)} / {formatTime(durationSeconds)}
        </span>

        <div className="relative">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
          {showVolumeSlider && (
            <div className="absolute right-0 top-full mt-2 w-32 rounded-lg border border-border bg-card p-3">
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
              />
            </div>
          )}
        </div>
      </div>

      <div
        ref={waveformRef}
        className="relative h-24 cursor-pointer rounded-lg bg-card border border-border overflow-hidden"
        onClick={handleWaveformClick}
      >
        {/* Waveform bars */}
        <div className="absolute inset-0 flex items-center px-2 gap-[2px]">
          {Array.from({ length: 100 }).map((_, i) => {
            const height = Math.random() * 60 + 20;
            const progress = localTime / durationSeconds;
            const isPast = i / 100 < progress;
            return (
              <div
                key={i}
                className="flex-1"
                style={{
                  height: `${height}%`,
                  backgroundColor: isPast ? 'hsl(var(--foreground) / 0.9)' : 'hsl(var(--foreground) / 0.2)',
                  transition: 'background-color 0.1s'
                }}
              />
            );
          })}
        </div>

        {/* Progress line */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-foreground"
          style={{ left: `${(localTime / durationSeconds) * 100}%` }}
        />
      </div>

      {/* ASR Confidence sparkline */}
      {asrConfidence.length > 0 && (
        <div className="h-5 flex items-end gap-[1px]">
          {asrConfidence.map((conf, i) => (
            <div
              key={i}
              className="flex-1 bg-foreground/40 rounded-t-sm"
              style={{ height: `${conf * 100}%` }}
              title={`Confidence: ${Math.round(conf * 100)}%`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
