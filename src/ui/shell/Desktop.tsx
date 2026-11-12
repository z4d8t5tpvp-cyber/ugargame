import { AnimatePresence, motion } from 'framer-motion';
import { Calculator, FileText, FolderOpen, Globe, X } from 'lucide-react';
import { useEffect } from 'react';
import { useGame } from '../../game/store';
import type { PcAppId } from '../../game/types';
import { cn } from '../common/kit';
import { useSize } from '../common/hooks';
import { WindowFrame } from './WindowFrame';
import BrowserApp from './BrowserApp';
import FilesApp from '../pc/FilesApp';
import CalcApp from '../pc/CalcApp';
import NotesApp from '../pc/NotesApp';

export const APPS: Record<PcAppId, { title: string; short: string; icon: React.ReactNode; big: React.ReactNode }> = {
  browser: { title: 'Браузер — P2P и биржи', short: 'Браузер', icon: <Globe size={13} />, big: <Globe size={26} className="text-sky-300" /> },
  files: { title: 'Папка: Чеки и Ордера (115-ФЗ)', short: 'Чеки и Ордера', icon: <FolderOpen size={13} />, big: <FolderOpen size={26} className="text-amber-300" /> },
  calc: { title: 'Калькулятор спреда', short: 'Калькулятор', icon: <Calculator size={13} />, big: <Calculator size={26} className="text-emerald-300" /> },
  notes: { title: 'Блокнот: Правила Марата KMI.txt', short: 'Правила.txt', icon: <FileText size={13} />, big: <FileText size={26} className="text-slate-200" /> },
};

export default function Desktop() {
  const [ref, size] = useSize<HTMLDivElement>();
  const lagging = useGame((s) => s.hero.pcTier === 0 && Object.values(s.ui.windows).filter((w) => w.open && !w.minimized).length > 3);
  const fileCount = useGame((s) => s.files.length);
  return (
    <div ref={ref} className={cn('absolute inset-0 overflow-hidden', lagging && 'lagging')}>
      <Wallpaper />
      <div className="absolute top-3 left-3 z-[1] flex flex-col gap-1">
        {(Object.keys(APPS) as PcAppId[]).map((id) => (
          <button
            key={id}
            onClick={() => useGame.getState().openWindow(id)}
            className="group flex w-[86px] flex-col items-center gap-1 rounded-md p-2 text-center hover:bg-white/10"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm group-hover:bg-white/10">
              {APPS[id].big}
              {id === 'files' && fileCount > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black">{fileCount}</span>}
            </div>
            <span className="text-[11px] leading-tight text-white/85 drop-shadow">{APPS[id].short}</span>
          </button>
        ))}
      </div>
      <WindowFrame id="browser" title={APPS.browser.title} icon={APPS.browser.icon} bounds={size}>
        <BrowserApp />
      </WindowFrame>
      <WindowFrame id="files" title={APPS.files.title} icon={APPS.files.icon} bounds={size}>
        <FilesApp />
      </WindowFrame>
      <WindowFrame id="calc" title={APPS.calc.title} icon={APPS.calc.icon} bounds={size}>
        <CalcApp />
      </WindowFrame>
      <WindowFrame id="notes" title={APPS.notes.title} icon={APPS.notes.icon} bounds={size}>
        <NotesApp />
      </WindowFrame>
      <Toasts />
    </div>
  );
}

function Wallpaper() {
  const night = useGame((s) => {
    const h = Math.floor((s.now % 1440) / 60);
    return h < 7 || h >= 20;
  });
  const moscow = useGame((s) => s.hero.location === 'moscow');
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 transition-colors duration-[3000ms]"
        style={{
          background: night
            ? 'radial-gradient(1200px 600px at 75% 110%, #1d2a4a 0%, transparent 60%), radial-gradient(800px 400px at 10% -10%, #182033 0%, transparent 60%), #0a0d14'
            : 'radial-gradient(1200px 600px at 75% 110%, #23406b 0%, transparent 60%), radial-gradient(900px 500px at 10% -10%, #2b3550 0%, transparent 60%), #111827',
        }}
      />
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      {/* skyline */}
      <svg className="absolute right-0 bottom-0 left-0 h-[34%] w-full opacity-40" preserveAspectRatio="none" viewBox="0 0 1000 200">
        {moscow ? (
          <path d="M0 200 V140 H60 V110 H90 V150 H140 V80 H160 V40 H175 V80 H200 V130 H260 V60 H300 V20 H315 V60 H340 V120 H400 V90 H450 V150 H520 V70 H560 V30 H575 V70 H600 V140 H680 V100 H720 V60 H750 V110 H820 V140 H880 V90 H930 V150 H1000 V200 Z" fill="#0b1220" />
        ) : (
          <path d="M0 200 V150 H80 V120 H200 V150 H260 V110 H380 V150 H420 V125 H560 V150 H600 V115 H720 V150 H780 V130 H900 V150 H1000 V200 Z" fill="#0b1220" />
        )}
      </svg>
      <div className="absolute right-6 bottom-6 text-right font-semibold tracking-[0.3em] text-white/10">VORONOV·OS</div>
    </div>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  useEffect(() => {
    if (!toasts.length) return;
    const t = setInterval(() => {
      const now = Date.now();
      for (const x of useGame.getState().toasts) if (now - x.createdAt > (x.kind === 'thought' ? 8000 : 6500)) useGame.getState().dismissToast(x.id);
    }, 500);
    return () => clearInterval(t);
  }, [toasts.length]);
  return (
    <div className="pointer-events-none absolute bottom-3 left-28 z-[200] flex w-[380px] max-w-[60%] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30 }}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs shadow-xl backdrop-blur-md',
              t.kind === 'success' && 'border-emerald-400/30 bg-emerald-950/85 text-emerald-100',
              t.kind === 'error' && 'border-rose-400/30 bg-rose-950/85 text-rose-100',
              t.kind === 'warn' && 'border-amber-400/30 bg-amber-950/85 text-amber-100',
              t.kind === 'info' && 'border-sky-400/25 bg-slate-900/90 text-slate-100',
              t.kind === 'thought' && 'border-violet-400/30 bg-violet-950/85 text-violet-100 italic',
            )}
          >
            <span className="mt-px">{t.kind === 'thought' ? '💭' : t.kind === 'success' ? '✅' : t.kind === 'error' ? '⛔' : t.kind === 'warn' ? '⚠️' : 'ℹ️'}</span>
            <span className="flex-1 leading-snug">{t.kind === 'thought' ? `Артём: «${t.text}»` : t.text}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-50 hover:opacity-100">
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
