import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, FileSpreadsheet, FileText, FolderOpen, Globe, Pause, Play, VolumeX } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { TgMessage } from '../../../game/types';
import { cn } from '../../common/kit';
import { hashStr, mmss, seeded, TG, useTgNav } from './shared';

/** Text with clickable @mentions (opens the profile when such a chat exists). */
export function TgText({ text, className }: { text: string; className?: string }) {
  const { usernames, openProfile } = useTgNav();
  const parts = text.split(/(@[A-Za-z0-9_]{3,})/g);
  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p;
        const id = usernames[p];
        return (
          <span
            key={i}
            className={cn('text-[#6AB3F3]', id && 'cursor-pointer hover:underline')}
            onClick={id ? (e) => (e.stopPropagation(), openProfile(id)) : undefined}
          >
            {p}
          </span>
        );
      })}
    </span>
  );
}

// Only one voice/video plays at a time.
let active: { id: string; stop: () => void } | null = null;
const heard = new Set<string>();

function usePlayback(id: string, dur: number, rate: number) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [wasHeard, setHeard] = useState(() => heard.has(id));
  const posRef = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      posRef.current += ((now - last) / 1000) * rate;
      last = now;
      if (posRef.current >= dur) {
        posRef.current = 0;
        setPos(0);
        setPlaying(false);
        heard.add(id);
        setHeard(true);
      } else setPos(posRef.current);
    }, 80);
    return () => clearInterval(t);
  }, [playing, rate, dur, id]);
  useEffect(
    () => () => {
      if (active?.id === id) active = null;
    },
    [id],
  );
  const toggle = () => {
    if (playing) {
      setPlaying(false);
      if (active?.id === id) active = null;
      return;
    }
    if (active && active.id !== id) active.stop();
    active = { id, stop: () => setPlaying(false) };
    heard.add(id);
    setPlaying(true);
  };
  return { playing, pos, toggle, heard: wasHeard, started: playing || pos > 0 || wasHeard };
}

export function VoiceBubble({ m, mine, time }: { m: TgMessage; mine: boolean; time: ReactNode }) {
  const dur = Math.max(1, m.duration ?? 6);
  const [fast, setFast] = useState(false);
  const { playing, pos, toggle, heard: wasHeard } = usePlayback(m.id, dur, fast ? 1.5 : 1);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (playing) setOpen(true);
  }, [playing]);
  const bars = useMemo(() => {
    const r = seeded(hashStr(m.id + m.text));
    return Array.from({ length: 30 }, (_, i) => {
      const env = 0.55 + 0.45 * Math.sin((i / 29) * Math.PI);
      return Math.max(0.16, Math.min(1, r() * env + 0.12));
    });
  }, [m.id, m.text]);
  const frac = pos / dur;
  const on = mine ? '#FFFFFF' : TG.link;
  const off = mine ? 'rgba(255,255,255,.35)' : 'rgba(106,179,243,.35)';
  return (
    <div className="w-[236px] px-2.5 pb-1.5 pt-2">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95', mine ? 'bg-white text-[#2B5278]' : 'bg-[#5288C1] text-white')}
        >
          {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex h-[26px] items-center gap-[2px]">
            {bars.map((h, i) => (
              <span
                key={i}
                className={cn('w-[3px] rounded-full', playing && 'wave-bar')}
                style={{
                  height: `${h * 100}%`,
                  background: (!playing && pos === 0) || i / bars.length < frac ? on : off,
                  animationDelay: playing ? `${(i % 9) * 0.08}s` : undefined,
                }}
              />
            ))}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px]" style={{ color: mine ? '#9CC2E6' : TG.sub }}>
            <span className="num">{mmss(playing || pos > 0 ? pos : dur)}</span>
            {!mine && !wasHeard && <span className="h-1.5 w-1.5 rounded-full bg-[#6AB3F3]" />}
            <button
              type="button"
              onClick={() => setFast((f) => !f)}
              className={cn('rounded px-1 text-[10px] font-bold leading-4 transition', fast ? 'bg-white/90 text-[#17212B]' : 'bg-white/10 text-white/60 hover:bg-white/20')}
            >
              1.5x
            </button>
          </div>
        </div>
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium transition hover:bg-white/10', mine ? 'text-[#9CC2E6]' : 'text-[#6AB3F3]')}
        >
          Расшифровка
          <ChevronDown size={13} className={cn('transition', open && 'rotate-180')} />
        </button>
        {time}
      </div>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className={cn('mt-1 border-t pt-1.5 text-[13.5px] leading-snug text-white/90', mine ? 'border-white/15' : 'border-white/10')}>
            <TgText text={m.text} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

const SCENES: Record<NonNullable<TgMessage['scene']>, { emoji: string; bg: string; glow: string }> = {
  watch: { emoji: '⌚', bg: 'linear-gradient(135deg,#2a1d02,#8a6a12,#f5d76e,#b8860b,#2a1d02)', glow: 'rgba(255,230,150,.55)' },
  car: { emoji: '🚘', bg: 'linear-gradient(135deg,#0b1220,#1d3557,#457b9d,#0b1220)', glow: 'rgba(255,200,120,.45)' },
  restaurant: { emoji: '🍾', bg: 'linear-gradient(135deg,#2b0a0e,#8e1f2b,#f4a261,#5c1a1b)', glow: 'rgba(255,220,170,.5)' },
  gym: { emoji: '🥊', bg: 'linear-gradient(135deg,#120c0c,#5a1010,#c0392b,#1f1414)', glow: 'rgba(255,120,90,.45)' },
  office: { emoji: '🏙️', bg: 'linear-gradient(135deg,#0c1a33,#1e3c72,#5f8bd6,#0c1a33)', glow: 'rgba(170,210,255,.45)' },
  yacht: { emoji: '🛥️', bg: 'linear-gradient(135deg,#013a52,#0083b0,#7fdbff,#014f6e)', glow: 'rgba(255,255,255,.5)' },
};

const EMOJI_MOTION: Record<NonNullable<TgMessage['scene']>, { animate: Record<string, number[]>; duration: number }> = {
  watch: { animate: { rotate: [-8, 8, -8], scale: [1, 1.06, 1] }, duration: 3.2 },
  car: { animate: { x: [-10, 10, -10], y: [0, -2, 0] }, duration: 2.4 },
  restaurant: { animate: { rotate: [-12, 6, -12], y: [0, -6, 0] }, duration: 2.6 },
  gym: { animate: { x: [0, 8, -4, 0], scale: [1, 1.12, 0.96, 1] }, duration: 1.1 },
  office: { animate: { y: [4, -4, 4], scale: [1, 1.03, 1] }, duration: 4 },
  yacht: { animate: { y: [0, -6, 0], rotate: [-4, 4, -4] }, duration: 3 },
};

export function VideoCircle({ m, time }: { m: TgMessage; time: ReactNode }) {
  const dur = Math.max(1, m.duration ?? 10);
  const scene = m.scene ?? 'office';
  const sc = SCENES[scene];
  const mo = EMOJI_MOTION[scene];
  const { playing, pos, toggle, started } = usePlayback(m.id, dur, 1);
  const size = 176;
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const frac = pos / dur;
  const words = m.text.split(/\s+/);
  const shown = playing ? words.slice(0, Math.max(1, Math.ceil(words.length * Math.min(1, frac * 1.15)))).join(' ') : m.text;
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button type="button" onClick={toggle} className="relative shrink-0 overflow-hidden rounded-full shadow-lg shadow-black/40 active:scale-[0.98]" style={{ width: size, height: size }}>
        <motion.div
          className="absolute inset-0"
          style={{ backgroundImage: sc.bg, backgroundSize: '260% 260%' }}
          animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
          transition={{ duration: playing ? 5 : 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute h-24 w-24 rounded-full blur-2xl"
          style={{ background: sc.glow }}
          animate={{ x: [10, 90, 30, 10], y: [20, 60, 100, 20] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        {scene === 'car' && (
          <motion.div
            className="absolute bottom-7 left-0 h-[3px] w-[400px]"
            style={{ backgroundImage: 'repeating-linear-gradient(90deg,rgba(255,255,255,.7) 0 18px,transparent 18px 36px)' }}
            animate={{ x: [0, -72] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
          />
        )}
        {scene === 'yacht' && (
          <motion.div
            className="absolute bottom-0 left-[-20%] h-12 w-[140%] rounded-[50%] bg-white/15"
            animate={{ y: [0, 5, 0], x: [0, 12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        )}
        {scene === 'restaurant' &&
          [0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-amber-100/70"
              style={{ left: 60 + i * 13, bottom: 40 }}
              animate={{ y: [0, -90], opacity: [0, 1, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        {scene === 'office' &&
          Array.from({ length: 10 }, (_, i) => (
            <motion.span
              key={i}
              className="absolute h-2 w-1.5 bg-amber-200/70"
              style={{ left: 30 + (i % 5) * 24, top: 34 + Math.floor(i / 5) * 92 }}
              animate={{ opacity: [0.2, 0.9, 0.2] }}
              transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        <motion.div className="absolute inset-0 flex items-center justify-center text-[64px] drop-shadow-[0_6px_14px_rgba(0,0,0,.5)]" animate={mo.animate} transition={{ duration: mo.duration, repeat: Infinity, ease: 'easeInOut' }}>
          {sc.emoji}
        </motion.div>
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,.55)' }} />
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          {playing && (
            <>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={3} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} />
            </>
          )}
        </svg>
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
              <Play size={20} fill="#fff" className="ml-0.5 text-white" />
            </div>
          </div>
        )}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white">
          {!playing && <VolumeX size={11} />}
          <span className="num">{mmss(playing ? dur - pos : dur)}</span>
        </div>
      </button>
      <div className="flex w-[176px] justify-end">{time}</div>
      {started && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="max-w-[250px] rounded-xl bg-black/40 px-2.5 py-1.5 text-[13px] leading-snug text-white/90 backdrop-blur-sm">
          <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-wide text-white/45">Субтитры</span>
          <TgText text={shown} />
        </motion.div>
      )}
    </div>
  );
}

export function FileCard({ m, mine }: { m: TgMessage; mine: boolean }) {
  const setBrowserTab = useGame((s) => s.setBrowserTab);
  const openWindow = useGame((s) => s.openWindow);
  const f = m.file ?? { name: m.text, kind: 'pdf' as const };
  const xlsx = f.kind === 'xlsx';
  const kb = useMemo(() => {
    const h = hashStr(f.name);
    return xlsx ? 18 + (h % 70) + (h % 10) / 10 : 84 + (h % 320) + (h % 10) / 10;
  }, [f.name, xlsx]);
  return (
    <div className="w-[248px] px-2.5 pt-2">
      <div className="flex items-center gap-2.5">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white', xlsx ? 'bg-[#1D9A5B]' : 'bg-[#E5484D]')}>
          {xlsx ? <FileSpreadsheet size={24} /> : <FileText size={24} />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-white">{f.name}</div>
          <div className="text-[12px]" style={{ color: mine ? '#9CC2E6' : TG.sub }}>
            {kb.toFixed(1).replace('.', ',')} КБ · {xlsx ? 'XLSX' : 'PDF'}
          </div>
        </div>
      </div>
      {xlsx ? (
        <button
          type="button"
          onClick={() => {
            setBrowserTab('sheet');
            openWindow('browser');
          }}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 py-1.5 text-[13px] font-medium text-[#6AB3F3] transition hover:bg-white/15"
        >
          <Globe size={14} /> Открыть в браузере
        </button>
      ) : (
        <div className="mt-2 rounded-lg bg-white/5 px-2 py-1.5 text-[12px] leading-snug text-white/70">
          Сохранено в папку «Чеки и Ордера» на компьютере
          <button type="button" onClick={() => openWindow('files')} className="mt-1 flex items-center gap-1 font-medium text-[#6AB3F3] hover:underline">
            <FolderOpen size={13} /> Открыть папку
          </button>
        </div>
      )}
    </div>
  );
}
