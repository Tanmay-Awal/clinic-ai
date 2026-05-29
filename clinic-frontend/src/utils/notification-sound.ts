/**
 * Notification Sound Utility
 *
 * Primary:  Web Audio API (AudioContext + pre-decoded buffer).
 *           More reliable when the tab regains focus after being backgrounded,
 *           since the buffer is already decoded and ready to play instantly.
 * Fallback: HTMLAudioElement if AudioContext is unavailable.
 *
 * License: Mixkit Sound Effects Free License (https://mixkit.co/license/)
 */

const SOUND_URL = '/sounds/notification.mp3';
const VOLUME = 0.5;

class NotificationSound {
    private ctx: AudioContext | null = null;
    private buffer: AudioBuffer | null = null;
    private fallbackAudio: HTMLAudioElement | null = null;
    private initPromise: Promise<void> | null = null;

    /** Initialize audio. Pre-decodes the MP3 into an AudioBuffer. Safe to call multiple times. */
    init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                    const response = await fetch(SOUND_URL);
                    const arrayBuffer = await response.arrayBuffer();
                    this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
                }
            } catch {
                // AudioContext unavailable — fallback below
            }

            // Always set up HTMLAudioElement as backup
            try {
                this.fallbackAudio = new Audio(SOUND_URL);
                this.fallbackAudio.volume = VOLUME;
                this.fallbackAudio.load();
            } catch {
                // No audio support
            }
        })();

        return this.initPromise;
    }

    /** Play the notification sound. Tries AudioContext first, falls back to Audio element. */
    async play() {
        if (!this.initPromise) await this.init();
        await this.initPromise;

        // Primary: AudioContext
        if (this.ctx && this.buffer) {
            try {
                if (this.ctx.state === 'suspended') {
                    await this.ctx.resume();
                }
                const source = this.ctx.createBufferSource();
                source.buffer = this.buffer;
                const gain = this.ctx.createGain();
                gain.gain.value = VOLUME;
                source.connect(gain);
                gain.connect(this.ctx.destination);
                source.start(0);
                return;
            } catch {
                // AudioContext play failed — try fallback
            }
        }

        // Fallback: HTMLAudioElement
        if (this.fallbackAudio) {
            this.fallbackAudio.currentTime = 0;
            this.fallbackAudio.play().catch(() => {});
        }
    }
}

export const notificationSound = new NotificationSound();
