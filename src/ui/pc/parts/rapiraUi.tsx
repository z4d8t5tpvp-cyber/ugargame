import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '../../common/kit';

export const R_BG = '#0F172A';
export const R_ACCENT = '#3B82F6';

export const rInput =
  'w-full rounded-lg border border-slate-700/80 bg-[#0B1222] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 disabled:opacity-60';
export const rBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40';
export const rBtnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40';

export function Panel({ title, icon, right, children, className, bodyClass }: { title?: ReactNode; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn('rounded-xl border border-slate-700/50 bg-[#131C2E] shadow-lg shadow-black/20', className)}>
      {title && (
        <header className="flex items-center gap-2 border-b border-slate-700/50 px-4 py-2.5">
          {icon && <span className="text-[#3B82F6]">{icon}</span>}
          <h3 className="text-[13px] font-semibold text-slate-100">{title}</h3>
          {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={cn('p-4', bodyClass)}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, right, children }: { label: string; hint?: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="block">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium tracking-wide text-slate-400">
        <span>{label}</span>
        {right}
      </div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

/** 6-digit numeric code (SMS / 2FA). */
export function CodeInput({ value, onChange, onEnter, placeholder = '••••••', className }: { value: string; onChange: (v: string) => void; onEnter?: () => void; placeholder?: string; className?: string }) {
  return (
    <input
      inputMode="numeric"
      maxLength={7}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      className={cn(rInput, 'num text-center font-mono text-lg tracking-[0.5em]', className)}
    />
  );
}

export function Callout({ tone = 'info', icon, children, className }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; icon?: ReactNode; children: ReactNode; className?: string }) {
  const cls = {
    info: 'border-[#3B82F6]/30 bg-[#3B82F6]/[0.07] text-slate-300',
    warn: 'border-amber-500/30 bg-amber-500/[0.07] text-amber-100/90',
    danger: 'border-rose-500/35 bg-rose-500/[0.08] text-rose-100/90',
    ok: 'border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-100/90',
  }[tone];
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed', cls, className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { id: T; label: ReactNode; cls?: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('flex rounded-lg bg-[#0B1222] p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn('flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition', value === o.id ? o.cls ?? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RapiraLogo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width={small ? 20 : 24} height={small ? 20 : 24} viewBox="0 0 24 24" aria-hidden>
        <defs>
          <linearGradient id="rapira-g" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#1D4ED8" />
            <stop offset="1" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#rapira-g)" />
        <path d="M6 18 L17 7 M14 6.5 L17.5 6.5 L17.5 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className={cn('font-black tracking-tight text-white', small ? 'text-sm' : 'text-[17px]')}>
        rapira<span className="text-[#3B82F6]">.</span>
      </span>
    </div>
  );
}

export function TwoFABadge({ on }: { on: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', on ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>
      <ShieldCheck size={11} /> {on ? '2FA включена' : '2FA выключена'}
    </span>
  );
}

export const floor2 = (v: number) => Math.floor(v * 100 + 1e-6) / 100;
export const groupBy4 = (s: string) => s.replace(/(.{4})(?=.)/g, '$1 ');
