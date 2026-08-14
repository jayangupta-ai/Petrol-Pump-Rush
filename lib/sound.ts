/**
 * Crash-safe WebAudio engine. `init()` must be called from a user gesture.
 * Every `play*` method is a no-op if audio is unavailable or muted.
 */

let ctx: AudioContext | null = null;
let muted = false;

function webAudioCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export function initAudio(): void {
  if (ctx) return;
  try {
    const Ctor = webAudioCtor();
    if (!Ctor) return;
    ctx = new Ctor();
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
  } catch {
    ctx = null;
  }
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, type: OscillatorType, duration: number, vol = 0.08): void {
  if (!ctx || muted) return;
  try {
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    /* ignore audio failures */
  }
}

function arpeggio(freqs: number[], step = 0.09): void {
  freqs.forEach((f, i) => {
    setTimeout(() => tone(f, "sine", 0.12, 0.07), i * step * 1000);
  });
}

export function playClick(): void {
  tone(520, "triangle", 0.06, 0.05);
}

export function playStart(): void {
  arpeggio([392, 523, 659, 784], 0.07);
}

export function playSpawn(): void {
  tone(300, "sine", 0.1, 0.04);
}

export function playPerfect(): void {
  arpeggio([784, 988, 1319], 0.06);
}

export function playGood(): void {
  arpeggio([523, 659], 0.06);
}

export function playSpill(): void {
  tone(200, "sawtooth", 0.25, 0.05);
  setTimeout(() => tone(140, "sawtooth", 0.3, 0.05), 120);
}

export function playError(): void {
  tone(150, "sawtooth", 0.3, 0.06);
}

export function playExplosion(): void {
  tone(50, "square", 0.5, 0.25);
  setTimeout(() => tone(38, "sawtooth", 0.6, 0.2), 60);
}

export function playGameOver(): void {
  tone(220, "sawtooth", 0.5, 0.07);
  setTimeout(() => tone(110, "sawtooth", 0.8, 0.07), 200);
}

export function playLevelUp(): void {
  arpeggio([523, 659, 784, 1047], 0.08);
}
