import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Network } from '../../../game/types';
import { cn } from '../../common/kit';

export const TK = {
  bg: '#10161F',
  card: '#1D2633',
  card2: '#263040',
  text2: '#8994A3',
  accent: '#45AEF5',
  green: '#39CC83',
  red: '#FF4766',
  orange: '#F5A73B',
};

const usdFmt = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtUsd = (n: number) => `$ ${usdFmt.format(Math.floor(n * 100 + 1e-6) / 100)}`;
export const fmtAmt = (n: number, dec = 2) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(Math.floor(n * 10 ** dec + 1e-6) / 10 ** dec);
export const netLabel = (n: Network) => (n === 'TRC20' ? 'TRC-20' : 'TON');

export function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 px-1.5">
      <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1D2633] text-white transition hover:bg-[#263040]">
        <ArrowLeft size={18} />
      </button>
      <div className="flex-1 text-center text-[16px] font-semibold text-white">{title}</div>
      <div className="flex w-9 justify-end">{right}</div>
    </div>
  );
}

function TonGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6.2 6.5h11.6c.9 0 1.4 1 1 1.7l-6.2 10.2a.7.7 0 0 1-1.2 0L5.2 8.2c-.4-.7.1-1.7 1-1.7Z" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M12 6.6v12" stroke="#fff" strokeWidth="1.9" />
    </svg>
  );
}

function TronGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 5l15 3.2L13 20 4 5Z M4 5l9 15 M19 8.2 9 10.5 4 5" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function TokenIcon({ token, net, size = 44 }: { token: 'USDT' | 'TRX' | 'TON'; net?: Network; size?: number }) {
  const bg = token === 'USDT' ? '#26A17B' : token === 'TRX' ? '#EB0029' : '#0098EA';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="flex h-full w-full items-center justify-center rounded-full font-bold text-white" style={{ background: bg, fontSize: size * 0.5 }}>
        {token === 'USDT' ? '₮' : token === 'TRX' ? <TronGlyph size={size * 0.56} /> : <TonGlyph size={size * 0.56} />}
      </div>
      {net && (
        <div
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-2 ring-[#1D2633]"
          style={{ width: size * 0.42, height: size * 0.42, background: net === 'TRC20' ? '#EB0029' : '#0098EA' }}
        >
          {net === 'TRC20' ? <TronGlyph size={size * 0.28} /> : <TonGlyph size={size * 0.28} />}
        </div>
      )}
    </div>
  );
}

export function NetTabs({ value, onChange, labels }: { value: Network; onChange: (n: Network) => void; labels?: Record<Network, string> }) {
  return (
    <div className="flex rounded-xl bg-[#1D2633] p-1">
      {(['TRC20', 'TON'] as Network[]).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn('flex-1 rounded-lg py-1.5 text-[13.5px] font-semibold transition', value === n ? 'bg-[#45AEF5] text-white' : 'text-[#8994A3] hover:text-white')}
        >
          {labels?.[n] ?? (n === 'TRC20' ? 'USDT · TRC-20' : 'USDT · TON')}
        </button>
      ))}
    </div>
  );
}

/** Deterministic QR-looking matrix (decorative — it's a game). */
export function FakeQr({ value, size = 188 }: { value: string; size?: number }) {
  const N = 29;
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  let x = h >>> 0 || 7;
  const cells: [number, number][] = [];
  // Finder eyes plus their quiet zone stay empty.
  const finder = (r: number, c: number) => (r < 8 && c < 8) || (r < 8 && c > N - 9) || (r > N - 9 && c < 8);
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      if (finder(r, c)) continue;
      if ((x >>> 0) % 100 < 47) cells.push([r, c]);
    }
  const s = size / N;
  const eye = (r: number, c: number) => (
    <g key={`${r}-${c}`}>
      <rect x={c * s} y={r * s} width={7 * s} height={7 * s} rx={s * 1.6} fill="#10161F" />
      <rect x={(c + 1) * s} y={(r + 1) * s} width={5 * s} height={5 * s} rx={s * 1.1} fill="#fff" />
      <rect x={(c + 2) * s} y={(r + 2) * s} width={3 * s} height={3 * s} rx={s * 0.8} fill="#10161F" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="#fff" />
      {cells.map(([r, c]) => (
        <rect key={`${r}.${c}`} x={c * s + 0.3} y={r * s + 0.3} width={s - 0.6} height={s - 0.6} rx={s * 0.35} fill="#10161F" />
      ))}
      {eye(0, 0)}
      {eye(0, N - 7)}
      {eye(N - 7, 0)}
    </svg>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
        <span className="text-[13px] font-medium text-[#8994A3]">{label}</span>
        {hint && <span className="text-[11.5px] text-[#8994A3]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-transparent bg-[#1D2633] px-3.5 py-3 text-[15px] text-white outline-none transition placeholder:text-[#5B6675] focus:border-[#45AEF5]';
