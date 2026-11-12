import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ClipboardPaste, Copy } from 'lucide-react';
import { useGame } from '../../game/store';
import type { Clipboard } from '../../game/types';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Current game minute. Re-renders on every tick — use only in small components. */
export const useNow = () => useGame((s) => s.now);

/** Copies a value into the shared PC↔phone clipboard. */
export function CopyBtn({
  value,
  label,
  kind = 'text',
  meta,
  className,
  children,
  title = 'Скопировать',
}: {
  value: string;
  label: string;
  kind?: Clipboard['kind'];
  meta?: Clipboard['meta'];
  className?: string;
  children?: ReactNode;
  title?: string;
}) {
  const copy = useGame((s) => s.copy);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1400);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        copy({ kind, value, label, meta });
        setDone(true);
      }}
      className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition', done ? 'text-emerald-400' : 'text-amber-300 hover:bg-white/10', className)}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {children ?? (done ? 'Скопировано' : 'Скопировать')}
    </button>
  );
}

/** Pastes from the shared clipboard. */
export function PasteBtn({ onPaste, className, children }: { onPaste: (value: string, clip: Clipboard) => void; className?: string; children?: ReactNode }) {
  const clip = useGame((s) => s.clipboard);
  return (
    <button
      type="button"
      disabled={!clip}
      onClick={() => clip && onPaste(clip.value, clip)}
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition disabled:opacity-40', className)}
    >
      <ClipboardPaste size={13} />
      {children ?? 'Вставить из буфера'}
    </button>
  );
}

export function Avatar({ name, color, emoji, size = 36, className }: { name: string; color: string; emoji?: string; size?: number; className?: string }) {
  const initials = name
    .replace(/[^A-Za-zА-Яа-яЁё ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}99)`, fontSize: size * (emoji ? 0.5 : 0.38) }}
    >
      {emoji ?? initials}
    </div>
  );
}

/** Small progress bar 0..1 */
export function Bar({ value, color = '#0ECB81', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-white/10', className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

/** Inline result message for actions returning { ok, error, info }. */
export function useResult() {
  const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (r: { ok: boolean; error?: string; info?: string }, okText?: string) => {
    setRes({ ok: r.ok, text: r.ok ? r.info ?? okText ?? 'Готово' : r.error ?? 'Ошибка' });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRes(null), 5000);
    return r.ok;
  };
  const node = res ? <div className={cn('rounded-md px-3 py-2 text-xs', res.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300')}>{res.text}</div> : null;
  return { show, node, clear: () => setRes(null) };
}

/** Numeric input that accepts spaces and commas. */
export const parseNum = (s: string) => {
  const v = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
};
