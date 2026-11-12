import { useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import { useGame } from '../../game/store';
import type { PcAppId } from '../../game/types';
import { cn } from '../common/kit';

const MIN_W: Record<PcAppId, number> = { browser: 760, files: 520, calc: 280, notes: 340 };
const MIN_H: Record<PcAppId, number> = { browser: 460, files: 340, calc: 380, notes: 280 };

export function WindowFrame({ id, title, icon, bounds, children }: { id: PcAppId; title: string; icon: ReactNode; bounds: { w: number; h: number }; children: ReactNode }) {
  const w = useGame((s) => s.ui.windows[id]);
  const top = useGame((s) => s.ui.zTop);
  const lag = useGame((s) => s.hero.pcTier === 0);
  const [drag, setDrag] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const start = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number; mode: 'move' | 'resize' } | null>(null);
  const lastMove = useRef(0);

  if (!w.open || w.minimized) return null;
  const B = { w: Math.max(bounds.w, 400), h: Math.max(bounds.h, 300) };
  const minW = Math.min(MIN_W[id], B.w);
  const minH = Math.min(MIN_H[id], B.h);
  const x = Math.min(Math.max(0, w.x), Math.max(0, B.w - minW));
  const y = Math.min(Math.max(0, w.y), Math.max(0, B.h - minH));
  const ww = Math.min(Math.max(w.w, minW), B.w - x);
  const hh = Math.min(Math.max(w.h, minH), B.h - y);
  const rect = w.maximized ? { x: 0, y: 0, w: B.w, h: B.h } : drag ?? { x, y, w: ww, h: hh };

  const onDown = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    if (w.maximized && mode === 'move') return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x: rect.x, y: rect.y, w: rect.w, h: rect.h, mode };
    useGame.getState().focusWindow(id);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    // The starter PC struggles: throttle dragging when it lags.
    const now = performance.now();
    if (lag && now - lastMove.current < 70) return;
    lastMove.current = now;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (s.mode === 'move') setDrag({ x: Math.min(Math.max(-s.w + 120, s.x + dx), B.w - 80), y: Math.min(Math.max(0, s.y + dy), B.h - 36), w: s.w, h: s.h });
    else setDrag({ x: s.x, y: s.y, w: Math.min(Math.max(MIN_W[id], s.w + dx), B.w - s.x), h: Math.min(Math.max(MIN_H[id], s.h + dy), B.h - s.y) });
  };
  const onUp = () => {
    if (drag) {
      const g = useGame.getState();
      if (start.current?.mode === 'move') g.moveWindow(id, drag.x, drag.y);
      else g.resizeWindow(id, drag.w, drag.h);
    }
    start.current = null;
    setDrag(null);
  };

  const focused = w.z === top;
  return (
    <div
      className={cn('absolute flex flex-col overflow-hidden rounded-lg border shadow-2xl shadow-black/60', focused ? 'border-white/15' : 'border-white/8')}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: 10 + w.z }}
      onPointerDown={() => !focused && useGame.getState().focusWindow(id)}
    >
      <div
        className={cn('flex h-8 shrink-0 cursor-default items-center gap-2 px-2 text-xs', focused ? 'bg-[#1c2230] text-white/85' : 'bg-[#161b25] text-white/50')}
        onPointerDown={onDown('move')}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onDoubleClick={() => useGame.getState().toggleMaximize(id)}
      >
        <span className="text-white/70">{icon}</span>
        <span className="truncate font-medium">{title}</span>
        <div className="ml-auto flex items-center" onPointerDown={(e) => e.stopPropagation()}>
          <button className="rounded p-1.5 hover:bg-white/10" title="Свернуть" onClick={() => useGame.getState().minimizeWindow(id)}>
            <Minus size={13} />
          </button>
          <button className="rounded p-1.5 hover:bg-white/10" title="Развернуть" onClick={() => useGame.getState().toggleMaximize(id)}>
            {w.maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button className="rounded p-1.5 hover:bg-rose-500/80" title="Закрыть" onClick={() => useGame.getState().closeWindow(id)}>
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="win-body relative min-h-0 flex-1 bg-[#0f131b]">{children}</div>
      {!w.maximized && (
        <div className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize" onPointerDown={onDown('resize')} onPointerMove={onMove} onPointerUp={onUp}>
          <svg viewBox="0 0 10 10" className="h-full w-full text-white/25">
            <path d="M9 3 L3 9 M9 6 L6 9" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  );
}
