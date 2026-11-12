import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/store';

/** Drives the simulation: ~5 ticks per real second. */
export function useGameLoop() {
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const t = performance.now();
      const dt = (t - last) / 1000;
      last = t;
      useGame.getState().tick(dt);
    }, 200);
    return () => clearInterval(id);
  }, []);
}

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

// ───────── tiny WebAudio sound effects (no assets) ─────────
let ac: AudioContext | null = null;
type Sfx = 'notify' | 'message' | 'cash' | 'error' | 'click' | 'thought';

export function sfx(kind: Sfx) {
  if (!useGame.getState().ui.sound) return;
  try {
    ac ??= new AudioContext();
    const now = ac.currentTime;
    const tone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.06) => {
      const o = ac!.createOscillator();
      const g = ac!.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, now + start);
      g.gain.linearRampToValueAtTime(vol, now + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g).connect(ac!.destination);
      o.start(now + start);
      o.stop(now + start + dur + 0.02);
    };
    if (kind === 'notify') { tone(880, 0, 0.12); tone(1320, 0.09, 0.16); }
    if (kind === 'message') tone(990, 0, 0.1, 'triangle');
    if (kind === 'cash') { tone(1046, 0, 0.1); tone(1318, 0.08, 0.1); tone(1568, 0.16, 0.18); }
    if (kind === 'error') { tone(220, 0, 0.2, 'sawtooth', 0.04); tone(180, 0.15, 0.25, 'sawtooth', 0.04); }
    if (kind === 'click') tone(600, 0, 0.04, 'square', 0.02);
    if (kind === 'thought') tone(520, 0, 0.3, 'sine', 0.03);
  } catch {
    /* audio unavailable */
  }
}

/** Plays sounds in reaction to state changes. */
export function useSoundEffects() {
  useEffect(() => {
    let lastBuzz = useGame.getState().ui.buzz;
    let lastToast = useGame.getState().toasts.at(-1)?.id;
    return useGame.subscribe((s) => {
      if (s.ui.buzz !== lastBuzz) {
        lastBuzz = s.ui.buzz;
        sfx('notify');
      }
      const t = s.toasts.at(-1);
      if (t && t.id !== lastToast) {
        lastToast = t.id;
        if (t.kind === 'error') sfx('error');
        else if (t.kind === 'success') sfx('cash');
        else if (t.kind === 'thought') sfx('thought');
      }
    });
  }, []);
}
