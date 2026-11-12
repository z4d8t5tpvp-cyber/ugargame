import { useEffect, useRef, useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';

/** Same contract as kit's useResult, but readable on light (white) pages. */
export function useLightResult() {
  const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const show = (r: { ok: boolean; error?: string; info?: string }, okText?: string) => {
    setRes({ ok: r.ok, text: r.ok ? r.info ?? okText ?? 'Готово' : r.error ?? 'Ошибка' });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRes(null), 6000);
    return r.ok;
  };
  const node = res ? (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${res.ok ? 'border-[#B7E1C6] bg-[#EBF7EF] text-[#0B6B36]' : 'border-[#F5B5BF] bg-[#FFF0F2] text-[#B0162B]'}`}>
      {res.ok ? <CircleCheck size={14} className="mt-px shrink-0" /> : <CircleX size={14} className="mt-px shrink-0" />}
      <span>{res.text}</span>
    </div>
  ) : null;
  return { show, node, clear: () => setRes(null) };
}
