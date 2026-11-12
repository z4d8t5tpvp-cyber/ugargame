import { useEffect, useRef, useState } from 'react';
import { BedDouble, ClipboardList, Cpu, Eye, Flame, Gauge, LogOut, Moon, Pause, Play, Sun, Timer, Volume2, VolumeX, Lightbulb, Zap } from 'lucide-react';
import { needsFocus, useGame } from '../../game/store';
import type { PcAppId, Speed } from '../../game/types';
import { attention } from '../../game/engine/core';
import { clockStr, dateStr, hourOf } from '../../game/util';
import { cn, useResult } from '../common/kit';
import { APPS } from './Desktop';

export default function Taskbar() {
  return (
    <div className="relative z-[300] flex h-11 shrink-0 items-center gap-1.5 border-t border-white/10 bg-[#0b0f17]/95 px-2 backdrop-blur">
      <StartMenu />
      <WindowButtons />
      <div className="ml-auto flex items-center gap-1.5">
        <CpuMeter />
        <ClipboardChip />
        <Vitals />
        <Clock />
        <SpeedControls />
      </div>
    </div>
  );
}

function StartMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sound = useGame((s) => s.ui.sound);
  const hints = useGame((s) => s.ui.hints);
  const difficulty = useGame((s) => s.difficulty);
  const res = useResult();
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);
  const g = useGame.getState;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className={cn('flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold tracking-wide', open ? 'bg-white/15' : 'hover:bg-white/10')}>
        <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-emerald-400 to-sky-500 text-[10px] text-black">V</span>
        Пуск
      </button>
      {open && (
        <div className="absolute bottom-11 left-0 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#121722] p-2 shadow-2xl">
          <div className="px-2 pt-1 pb-2 text-[11px] text-white/40">VoronovOS · {difficulty === 'story' ? 'сюжетный режим' : 'реалистичный режим'}</div>
          {(Object.keys(APPS) as PcAppId[]).map((id) => (
            <MenuItem key={id} icon={APPS[id].icon} onClick={() => { g().openWindow(id); setOpen(false); }}>{APPS[id].title}</MenuItem>
          ))}
          <div className="my-1.5 h-px bg-white/10" />
          <MenuItem icon={<BedDouble size={14} />} onClick={() => res.show(g().sleep())}>Лечь спать (до 08:00 / вздремнуть днём)</MenuItem>
          <MenuItem icon={<Timer size={14} />} onClick={() => res.show(g().skipHours(1), 'Прошёл час')}>Подождать 1 час</MenuItem>
          <MenuItem icon={sound ? <Volume2 size={14} /> : <VolumeX size={14} />} onClick={() => g().toggleSound()}>Звук: {sound ? 'включён' : 'выключен'}</MenuItem>
          <MenuItem icon={<Lightbulb size={14} />} onClick={() => g().toggleHints()}>Подсказки: {hints ? 'включены' : 'выключены'}</MenuItem>
          <div className="my-1.5 h-px bg-white/10" />
          <MenuItem icon={<LogOut size={14} />} onClick={() => { setOpen(false); g().quitToMenu(); }}>Сохранить и выйти в меню</MenuItem>
          {res.node && <div className="mt-1">{res.node}</div>}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs text-white/85 hover:bg-white/10">
      <span className="text-white/60">{icon}</span>
      {children}
    </button>
  );
}

function WindowButtons() {
  const json = useGame((s) => JSON.stringify((Object.keys(s.ui.windows) as PcAppId[]).filter((id) => s.ui.windows[id].open).map((id) => [id, s.ui.windows[id].minimized, s.ui.windows[id].z === s.ui.zTop])));
  const list = JSON.parse(json) as [PcAppId, boolean, boolean][];
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-hidden">
      {list.map(([id, min, top]) => (
        <button
          key={id}
          onClick={() => (min || !top ? useGame.getState().focusWindow(id) : useGame.getState().minimizeWindow(id))}
          className={cn('flex h-8 max-w-[150px] min-w-0 items-center gap-1.5 rounded-md border-b-2 px-2 text-[11px]', top && !min ? 'border-sky-400 bg-white/10 text-white' : 'border-white/20 text-white/60 hover:bg-white/5')}
        >
          {APPS[id].icon}
          <span className="truncate">{APPS[id].short}</span>
        </button>
      ))}
    </div>
  );
}

function CpuMeter() {
  const tier = useGame((s) => s.hero.pcTier);
  const open = useGame((s) => Object.values(s.ui.windows).filter((w) => w.open && !w.minimized).length);
  const cpu = tier === 0 ? (open > 3 ? 99 : 18 + open * 21) : tier === 1 ? 9 + open * 7 : 5 + open * 3;
  const ram = tier === 0 ? Math.min(3.9, 1.8 + open * 0.55) : tier === 1 ? 6 + open * 1.2 : 9 + open;
  const ramMax = tier === 0 ? 4 : tier === 1 ? 32 : 64;
  return (
    <div title={tier === 0 ? 'Старый ПК: больше 3 окон — тормоза. Апгрейд — в «Магазине имущества».' : 'Нагрузка ПК'} className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] num', cpu >= 95 ? 'bg-rose-500/15 text-rose-300' : 'text-white/55')}>
      <Cpu size={13} />
      <span>ЦП {cpu}%</span>
      <span className="text-white/30">|</span>
      <span>ОЗУ {ram.toFixed(1)}/{ramMax} ГБ</span>
    </div>
  );
}

function ClipboardChip() {
  const clip = useGame((s) => s.clipboard);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!clip) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [clip?.at, clip?.value]);
  return (
    <div title={clip ? `${clip.label}: ${clip.value}` : 'Буфер обмена пуст'} className={cn('flex max-w-[230px] items-center gap-1.5 rounded-md px-2 py-1 text-[10px] transition', flash ? 'bg-amber-400/25 text-amber-100' : 'bg-white/5 text-white/60')}>
      <ClipboardList size={13} className="shrink-0" />
      <span className="truncate">{clip ? `Скопировано: ${clip.label}` : 'Буфер пуст'}</span>
    </div>
  );
}

function Vitals() {
  const energy = useGame((s) => Math.round(s.hero.energy));
  const stress = useGame((s) => Math.round(s.hero.stress));
  const att = useGame((s) => attention(s));
  const item = (icon: React.ReactNode, v: number, color: string, label: string, invert = false) => (
    <div title={`${label}: ${v}/100`} className="flex items-center gap-1">
      {icon}
      <div className="h-1.5 w-9 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${v}%`, background: invert ? (v > 70 ? '#F6465D' : v > 40 ? '#F0B90B' : '#0ECB81') : v < 25 ? '#F6465D' : color }} />
      </div>
    </div>
  );
  return (
    <div className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1 text-white/60">
      {item(<Zap size={12} className="text-amber-300" />, energy, '#F0B90B', 'Энергия')}
      {item(<Flame size={12} className="text-rose-300" />, stress, '#F6465D', 'Стресс', true)}
      {item(<Eye size={12} className="text-sky-300" />, att, '#38BDF8', 'Внимательность')}
    </div>
  );
}

function Clock() {
  const now = useGame((s) => Math.floor(s.now));
  const chapter = useGame((s) => s.chapter);
  const h = hourOf(now);
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-0.5 text-right">
      <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">Гл. {chapter}</span>
      {h < 6 || h >= 22 ? <Moon size={13} className="text-indigo-300" /> : <Sun size={13} className="text-amber-200" />}
      <div className="leading-tight">
        <div className="text-xs font-semibold num">{clockStr(now)}</div>
        <div className="text-[10px] text-white/45">{dateStr(now)}</div>
      </div>
    </div>
  );
}

function SpeedControls() {
  const speed = useGame((s) => s.speed);
  const focus = useGame((s) => needsFocus(s));
  const job = useGame((s) => !!s.job.activeJob);
  const opts: [Speed, React.ReactNode, string][] = [
    [0, <Pause size={12} />, 'Пауза'],
    [1, <Play size={12} />, '1x'],
    [2, <span className="text-[10px] font-bold">2x</span>, '2x'],
    [5, <span className="text-[10px] font-bold">5x</span>, '5x'],
  ];
  return (
    <div className="flex items-center gap-1">
      {focus && speed !== 0 && (
        <span title="Пока идёт сделка, время течёт медленнее" className="flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-1 text-[10px] text-sky-300">
          <Gauge size={11} /> сделка
        </span>
      )}
      {job && <span className="rounded bg-amber-500/15 px-1.5 py-1 text-[10px] text-amber-300">на смене</span>}
      <div className="flex overflow-hidden rounded-md border border-white/10">
        {opts.map(([v, icon, title]) => (
          <button key={v} title={title} onClick={() => useGame.getState().setSpeed(v)} className={cn('flex h-7 w-7 items-center justify-center', speed === v ? 'bg-sky-500/30 text-white' : 'text-white/55 hover:bg-white/10')}>
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
