import { useEffect, useRef, useState } from 'react';
import { cn } from '../../common/kit';

/** Same contract as kit's useResult, styled for Avito's light theme. */
export function useLightResult() {
  const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const show = (r: { ok: boolean; error?: string; info?: string }, okText?: string) => {
    setRes({ ok: r.ok, text: r.ok ? (r.info ?? okText ?? 'Готово') : (r.error ?? 'Ошибка') });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRes(null), 5000);
    return r.ok;
  };
  const node = res ? <div className={cn('rounded-lg px-3 py-2 text-[12.5px] leading-snug', res.ok ? 'bg-[#EAF6D8] text-[#3F6B00]' : 'bg-[#FFE8E8] text-[#D93636]')}>{res.text}</div> : null;
  return { show, node };
}

export function AvitoLogo({ size = 'md', label = 'Барахолка' }: { size?: 'sm' | 'md'; label?: string }) {
  const big = size === 'md';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('relative inline-block', big ? 'h-[22px] w-[22px]' : 'h-[16px] w-[16px]')}>
        <span className="absolute left-0 top-0 h-[55%] w-[55%] rounded-full bg-[#97CF26]" />
        <span className="absolute right-0 top-[8%] h-[38%] w-[38%] rounded-full bg-[#A169F7]" />
        <span className="absolute bottom-0 left-[6%] h-[40%] w-[40%] rounded-full bg-[#FF6163]" />
        <span className="absolute bottom-[2%] right-[2%] h-[50%] w-[50%] rounded-full bg-[#00AAFF]" />
      </span>
      <span className={cn('font-extrabold tracking-tight text-[#1A1A1A]', big ? 'text-[19px]' : 'text-[14px]')}>{label}</span>
    </span>
  );
}

const AV_COLORS = ['#00AAFF', '#97CF26', '#FF6163', '#A169F7', '#FFB021', '#14B8A6'];
export const buyerColor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
};

export function BuyerAvatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: buyerColor(name), fontSize: size * 0.42 }}>
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </div>
  );
}
