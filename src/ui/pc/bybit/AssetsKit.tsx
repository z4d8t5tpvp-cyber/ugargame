// Shared Bybit UI primitives used by Assets, MyAds and Profile.
import { useMemo, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, Lock, TriangleAlert } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { BankId } from '../../../game/types';
import { cn } from '../../common/kit';

export const PLAYER_BANKS: BankId[] = ['sber', 'tbank', 'alfa'];

export const inputCls =
  'w-full rounded-lg border border-white/10 bg-bybit-3/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber/60 focus:bg-bybit-3 disabled:opacity-50 read-only:cursor-default read-only:text-white/70 read-only:focus:border-white/10';
export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100';
export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

/** Scrollable page root sized to the browser window content area. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="@container h-full min-h-0 overflow-auto bg-bybit scroll-thin">
      <div className={cn('mx-auto w-full max-w-[1180px] space-y-4 p-4', className)}>{children}</div>
    </div>
  );
}

export function Card({ title, icon, right, children, className, bodyClassName }: { title?: ReactNode; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('rounded-xl border border-white/[0.06] bg-bybit-2 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]', className)}>
      {title && (
        <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          {icon && <span className="text-amber">{icon}</span>}
          <div className="text-sm font-semibold text-white">{title}</div>
          {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-white/50">
      <span>{children}</span>
      {right && <span className="text-white/40">{right}</span>}
    </div>
  );
}

const TONE = {
  info: { cls: 'border-sky-400/20 bg-sky-400/[0.07] text-sky-200/90', Icon: Info },
  warn: { cls: 'border-amber/25 bg-amber/[0.08] text-amber', Icon: TriangleAlert },
  danger: { cls: 'border-rose/30 bg-rose/[0.09] text-rose', Icon: CircleAlert },
  ok: { cls: 'border-emerald/25 bg-emerald/[0.08] text-emerald', Icon: CircleCheck },
} as const;

export function Callout({ tone = 'info', children, className, action }: { tone?: keyof typeof TONE; children: ReactNode; className?: string; action?: ReactNode }) {
  const { cls, Icon } = TONE[tone];
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed', cls, className)}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('inline-flex rounded-lg bg-bybit-3/70 p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition', value === o.id ? 'bg-bybit text-white shadow' : 'text-white/45 hover:text-white/80')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Row({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1 text-xs', className)}>
      <span className="text-white/45">{label}</span>
      <span className="num text-right text-white/90">{children}</span>
    </div>
  );
}

/** 6-digit code field: digits only, typed by hand from the phone. */
export function CodeInput({ value, onChange, onEnter, placeholder = '······', className }: { value: string; onChange: (v: string) => void; onEnter?: () => void; placeholder?: string; className?: string }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      className={cn(inputCls, 'num text-center font-mono text-base tracking-[0.45em]', className)}
    />
  );
}

/** Lock screen shown when a section needs registration or KYC first. */
export function AccessGate({ title, text }: { title: string; text: string }) {
  const setView = useGame((s) => s.setBybitView);
  return (
    <div className="flex min-h-[340px] items-center justify-center">
      <div className="max-w-sm rounded-2xl border border-white/[0.06] bg-bybit-2 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber/10 text-amber">
          <Lock size={22} />
        </div>
        <div className="text-base font-semibold text-white">{title}</div>
        <p className="mt-1.5 text-xs leading-relaxed text-white/50">{text}</p>
        <button type="button" className={cn(btnPrimary, 'mt-4 w-full')} onClick={() => setView('profile')}>
          Перейти в профиль
        </button>
      </div>
    </div>
  );
}

/** Decorative QR-like matrix derived deterministically from the value. */
export function QrSquare({ value, size = 128 }: { value: string; size?: number }) {
  const n = 25;
  const dark = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h = h || 1;
    const rnd = () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return (h >>> 0) / 4294967296;
    };
    const finder = (x: number, y: number) => {
      for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
        const dx = x - fx;
        const dy = y - fy;
        if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
          if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return 0; // separator
          const ring = Math.min(dx, dy, 6 - dx, 6 - dy);
          return ring === 1 ? 0 : 1;
        }
      }
      return -1;
    };
    const cells: [number, number][] = [];
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const f = finder(x, y);
        const on = f >= 0 ? f === 1 : x === 6 || y === 6 ? (x + y) % 2 === 0 : rnd() < 0.5;
        if (on) cells.push([x, y]);
      }
    return cells;
  }, [value]);
  const c = (n + 2) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n + 2} ${n + 2}`} className="shrink-0 rounded-lg" shapeRendering="crispEdges">
      <rect width={n + 2} height={n + 2} fill="#fff" />
      {dark.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width={1} height={1} fill="#0b0e14" />
      ))}
      <rect x={c - 2.6} y={c - 2.6} width={5.2} height={5.2} rx={1.2} fill="#fff" shapeRendering="geometricPrecision" />
      <rect x={c - 2} y={c - 2} width={4} height={4} rx={0.9} fill="#F0B90B" shapeRendering="geometricPrecision" />
      <text x={c} y={c + 1.25} textAnchor="middle" fontSize={3.4} fontWeight={800} fill="#12161F" fontFamily="Inter, sans-serif">
        ₮
      </text>
    </svg>
  );
}

export const groupBy4 = (s: string) => s.replace(/(.{4})(?=.)/g, '$1 ');
