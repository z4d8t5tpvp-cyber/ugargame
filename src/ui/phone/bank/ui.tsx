import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, Loader2 } from 'lucide-react';
import type { BankId, ExtBankId } from '../../../game/types';
import { useGame } from '../../../game/store';
import { cn } from '../../common/kit';
import { fmtRub, maskCard, round2 } from '../../../game/util';
import { EXT_STYLE, type BankTheme } from './theme';

export type Route = 'home' | 'sbp' | 'card' | 'self' | 'retail' | 'history' | 'requisites';
export type Res = { ok: boolean; error?: string; info?: string };

export interface BankCtxValue {
  bank: BankId;
  t: BankTheme;
  go: (r: Route) => void;
  openTx: (id: string) => void;
  /** Root-level snackbar for action results that should survive screen changes. */
  notify: (r: Res, okText?: string) => void;
}

export const BankCtx = createContext<BankCtxValue | null>(null);
export const useBank = () => {
  const v = useContext(BankCtx);
  if (!v) throw new Error('BankCtx missing');
  return v;
};

/** «1 000 ₽» for whole sums, «1 000,50 ₽» otherwise. */
export const money = (n: number) => fmtRub(n, Number.isInteger(round2(n)) ? 0 : 2);
export const signed = (n: number) => `${n > 0 ? '+' : '−'}${money(Math.abs(n))}`;

export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  const { t, go } = useBank();
  return (
    <div className={cn('relative z-10 flex h-12 shrink-0 items-center gap-1 px-1.5', t.bar)}>
      <button onClick={onBack ?? (() => go('home'))} className={cn('flex h-9 w-9 items-center justify-center rounded-full', t.press, t.dark ? 'text-white' : t.accent)} title="Назад">
        <ChevronLeft size={24} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] leading-tight font-semibold">{title}</div>
        {subtitle && <div className={cn('truncate text-[11px] leading-tight', t.muted)}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function Body({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-8', className)}>{children}</div>;
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const { t } = useBank();
  return (
    <div onClick={onClick} className={cn('rounded-[18px] p-4', t.surface, onClick && 'cursor-pointer', className)}>
      {children}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  busy,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'light';
  disabled?: boolean;
  busy?: boolean;
  className?: string;
}) {
  const { t } = useBank();
  const v =
    variant === 'primary'
      ? t.primary
      : variant === 'ghost'
        ? t.ghost
        : variant === 'danger'
          ? 'bg-[#E5352B] text-white active:bg-[#C92B22] disabled:opacity-40'
          : 'bg-white text-[#B3261E] active:bg-white/90';
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={cn('flex h-12 w-full items-center justify-center gap-2 rounded-[14px] px-4 text-[15px] font-semibold transition disabled:cursor-not-allowed', v, className)}
    >
      {busy && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const { t } = useBank();
  return <div className={cn('mb-1.5 px-1 text-[12px] font-medium', t.muted)}>{children}</div>;
}

/** Key/value line used in receipts and detail sheets. */
export function KV({ k, v, strong, mono }: { k: string; v: ReactNode; strong?: boolean; mono?: boolean }) {
  const { t } = useBank();
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-[13px]">
      <span className={cn('shrink-0', t.muted)}>{k}</span>
      <span className={cn('min-w-0 text-right break-words', strong && 'font-semibold', mono && 'num')}>{v}</span>
    </div>
  );
}

export function Meter({ value, color, dark }: { value: number; color: string; dark: boolean }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full', dark ? 'bg-white/10' : 'bg-black/[0.07]')}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

/** Bottom sheet confined to the phone screen (the app root must be `relative overflow-hidden`). */
export function Sheet({ open, onClose, title, children, panelClass }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; panelClass: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-40 flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            className={cn('no-scrollbar relative max-h-[90%] overflow-y-auto rounded-t-[24px] px-4 pt-2 pb-5 shadow-2xl', panelClass)}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
          >
            <button onClick={onClose} className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-current opacity-20" title="Закрыть" />
            {title && <div className="mb-3 text-[18px] leading-tight font-semibold">{title}</div>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Restyles the kit `useResult()` node for light bank themes. */
export function ResultSlot({ node, dark, className }: { node: ReactNode; dark: boolean; className?: string }) {
  if (!node) return null;
  return (
    <div
      className={cn(
        '[&>div]:rounded-xl [&>div]:px-3.5 [&>div]:py-2.5 [&>div]:text-[13px] [&>div]:leading-snug [&>div]:font-medium',
        !dark && '[&_.text-emerald-300]:text-emerald-700 [&_.text-rose-300]:text-rose-700',
        className,
      )}
    >
      {node}
    </div>
  );
}

export function BankLogo({ bank, size = 32 }: { bank: BankId; size?: number }) {
  if (bank === 'sber')
    return (
      <div className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: 'conic-gradient(from 200deg, #F2E913, #2FB24C, #1E9DD8, #21A038, #F2E913)' }}>
        <div className="flex items-center justify-center rounded-full bg-[#21A038]" style={{ width: size * 0.8, height: size * 0.8 }}>
          <Check size={size * 0.55} strokeWidth={3.2} className="text-white" />
        </div>
      </div>
    );
  if (bank === 'tbank')
    return (
      <div
        className="flex shrink-0 items-center justify-center bg-[#FFDD2D] font-black text-black"
        style={{ width: size, height: size * 1.08, fontSize: size * 0.58, clipPath: 'polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%)', paddingBottom: size * 0.16 }}
      >
        Т
      </div>
    );
  return (
    <div className="flex shrink-0 flex-col items-center justify-center rounded-[22%] bg-[#EF3124] font-black text-white" style={{ width: size, height: size, fontSize: size * 0.55, lineHeight: 1 }}>
      <span style={{ marginTop: size * 0.02 }}>А</span>
      <span className="rounded-full bg-white" style={{ width: size * 0.42, height: Math.max(2, size * 0.08), marginTop: size * 0.04 }} />
    </div>
  );
}

export function ExtBankDot({ bank, size = 22 }: { bank: ExtBankId; size?: number }) {
  const s = EXT_STYLE[bank];
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full font-bold" style={{ width: size, height: size, background: s.bg, color: s.fg, fontSize: size * 0.5 }}>
      {s.letter}
    </span>
  );
}

/** Plastic card visual. */
export function CardFace({ t, card, children, small }: { t: BankTheme; card: string; children?: ReactNode; small?: boolean }) {
  return (
    <div className={cn('relative overflow-hidden rounded-[18px] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)]', t.cardText, small ? 'p-3' : 'p-4')} style={{ background: t.cardFace }}>
      {t.id === 'tbank' && <div className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/[0.06]" />}
      {t.id === 'sber' && <div className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-white/10" />}
      {t.id === 'alfa' && <div className="pointer-events-none absolute -right-6 -bottom-16 h-40 w-40 rounded-full bg-black/10" />}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          {t.id === 'sber' ? (
            <span className="text-[15px] font-extrabold tracking-wide">СБЕР</span>
          ) : t.id === 'tbank' ? (
            <>
              <BankLogo bank="tbank" size={18} />
              <span className="text-[12px] font-semibold tracking-[0.2em] text-white/80">BLACK</span>
            </>
          ) : (
            <>
              <span className="text-[20px] leading-none font-black">А</span>
              <span className="text-[12px] font-semibold text-white/85">Альфа-Карта</span>
            </>
          )}
        </div>
        <span className="text-[13px] font-extrabold tracking-tight italic opacity-90">МИР</span>
      </div>
      {children}
      <div className="relative mt-3 flex items-end justify-between text-[11px] font-medium tracking-wider opacity-85">
        <span>ARTEM VORONOV</span>
        <span className="num">{maskCard(card)}</span>
      </div>
    </div>
  );
}

/** Real-time inline flash text that disappears after `ms`. */
export function useFlash(ms = 3500) {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const flash = (s: string) => {
    setText(s);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(null), ms);
  };
  return [text, flash] as const;
}

/**
 * «Обновить выписку»: short fake network delay, then reveals unseen operations.
 * Returns ids that just appeared so rows can be highlighted.
 */
export function useRefresh(bank: BankId) {
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [msg, flash] = useFlash();
  const run = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      const st = useGame.getState();
      const ids = st.banks[bank].txs.filter((x) => !x.seen).map((x) => x.id);
      // Mark ids as fresh before revealing them so the rows mount already highlighted.
      setFresh(new Set(ids));
      const n = st.refreshStatement(bank);
      setBusy(false);
      flash(n > 0 ? `Новых операций: ${n}` : 'Новых операций нет');
      setTimeout(() => setFresh(new Set()), 4500);
    }, 650);
  };
  return { busy, fresh, msg, run };
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  const { t } = useBank();
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className={cn('mb-3 flex h-14 w-14 items-center justify-center rounded-full', t.accentBg)}>{icon}</div>
      <div className="text-[15px] font-semibold">{title}</div>
      {text && <div className={cn('mt-1 text-[12.5px] leading-snug', t.muted)}>{text}</div>}
    </div>
  );
}
