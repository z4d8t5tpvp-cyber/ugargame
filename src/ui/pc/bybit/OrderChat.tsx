import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Check, FileText, Headset, Paperclip, Send, ShieldCheck, ZoomIn } from 'lucide-react';
import type { OrderChatMsg, P2POrder } from '../../../game/types';
import { useGame } from '../../../game/store';
import { BANK_NAMES, clockStr, dateStr, fmtRub } from '../../../game/util';
import { Avatar, cn, useNow } from '../../common/kit';

const QUICK = ['Здравствуйте, оплачиваю', 'Оплатил, чек прикрепил', 'Деньги не поступили', 'Отправитель не совпадает с вашим ФИО', 'Подождите, проверяю'];

export default function OrderChat({ o, onAttach }: { o: P2POrder; onAttach?: () => void }) {
  const now = useNow();
  const [text, setText] = useState('');
  const [zoom, setZoom] = useState<OrderChatMsg | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Counterparty replies are scheduled slightly in the future — hide them until due.
  const visible = o.chat.filter((m) => m.at <= now + 1e-6);
  const typing = visible.length < o.chat.length;

  const firstScroll = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? 'auto' : 'smooth' });
    firstScroll.current = false;
  }, [visible.length, typing]);

  const send = (t: string) => {
    const msg = t.trim();
    if (!msg) return;
    useGame.getState().sendOrderChat(o.id, msg);
    setText('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#141924]">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5">
        <div className="relative">
          <Avatar name={o.cp.nick} color={o.cp.color} size={30} />
          <span className={cn('absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#141924]', o.cp.online ? 'bg-emerald' : 'bg-white/30')} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[13px] font-semibold text-white">
            <span className="truncate">{o.cp.nick}</span>
            {o.cp.verified && <BadgeCheck size={13} className="shrink-0 text-amber" />}
          </div>
          <div className="text-[11px] text-white/40">{typing ? 'печатает…' : o.cp.online ? 'в сети' : 'был(а) недавно'}</div>
        </div>
      </div>

      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        <div className="flex gap-1.5 rounded-lg bg-white/[0.03] px-2.5 py-2 text-[10.5px] leading-snug text-white/40">
          <ShieldCheck size={13} className="mt-px shrink-0" />
          Общайтесь только в чате ордера. Поддержка Bybit никогда не пишет в Telegram и не просит перевести деньги вне сделки.
        </div>
        {visible.map((m) => (
          <Bubble key={m.id} m={m} o={o} onZoom={() => setZoom(m)} />
        ))}
        {typing && (
          <div className="flex items-center gap-1 px-1 text-white/40">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] px-2.5 pt-2 pb-2.5">
        <div className="scroll-thin mb-2 flex gap-1 overflow-x-auto pb-1">
          {QUICK.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => send(q)}
              className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] whitespace-nowrap text-white/65 hover:border-amber/50 hover:text-white"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-bybit px-2 focus-within:border-amber/60">
          {onAttach && (
            <button type="button" onClick={onAttach} title="Прикрепить PDF-чек" className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-white">
              <Paperclip size={15} />
            </button>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(text)}
            placeholder="Сообщение…"
            className="h-9 min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/30"
          />
          <button type="button" onClick={() => send(text)} disabled={!text.trim()} title="Отправить" className="rounded p-1.5 text-amber hover:bg-white/10 disabled:opacity-30">
            <Send size={15} />
          </button>
        </div>
      </div>

      {zoom && (
        <div className="absolute inset-0 z-40 flex cursor-zoom-out items-center justify-center bg-black/80 p-6" onClick={() => setZoom(null)}>
          <div className="origin-center scale-[1.6]">
            <ReceiptShot m={zoom} o={o} />
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ m, o, onZoom }: { m: OrderChatMsg; o: P2POrder; onZoom: () => void }) {
  if (m.from === 'system') {
    return (
      <div className="flex justify-center">
        <div className="max-w-[92%] rounded-md bg-white/[0.04] px-2.5 py-1 text-center text-[11px] leading-snug text-white/45">
          {m.text} <span className="num text-white/25">{clockStr(m.at)}</span>
        </div>
      </div>
    );
  }
  const mine = m.from === 'me';
  const support = m.from === 'support';
  const a = m.attachment;
  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
      {!mine && (
        <div className={cn('mb-0.5 flex items-center gap-1 px-1 text-[10.5px]', support ? 'font-semibold text-sky-300' : 'text-white/40')}>
          {support ? (
            <>
              <Headset size={11} /> Поддержка Bybit
            </>
          ) : (
            o.cp.nick
          )}
        </div>
      )}
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug',
          mine ? 'rounded-br-md bg-amber/[0.16] text-amber-50' : support ? 'rounded-bl-md border border-sky-400/25 bg-sky-500/15 text-sky-50' : 'rounded-bl-md bg-bybit-3 text-white/90',
        )}
      >
        {m.text && <div className="break-words whitespace-pre-wrap">{m.text}</div>}
        {a?.kind === 'pdf' && (
          <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1.5">
            <FileText size={18} className="shrink-0 text-rose" />
            <div className="min-w-0">
              <div className="truncate text-[11.5px] text-white/90">{a.name}</div>
              <div className="text-[10px] text-white/40">PDF-документ</div>
            </div>
          </div>
        )}
        {a?.kind === 'receipt_img' && (
          <button type="button" onClick={onZoom} className="group relative mt-1.5 block cursor-zoom-in" title="Открыть изображение">
            <ReceiptShot m={m} o={o} />
            <span className="absolute right-1.5 bottom-1.5 rounded-full bg-black/55 p-1 text-white opacity-0 transition group-hover:opacity-100">
              <ZoomIn size={12} />
            </span>
            <div className="mt-1 text-left text-[10px] text-white/40">{a.name}</div>
          </button>
        )}
      </div>
      <div className="num mt-0.5 px-1 text-[10px] text-white/25">{clockStr(m.at)}</div>
    </div>
  );
}

const SHOT_BANKS = [
  { name: 'Сбербанк', color: '#21A038', ink: '#fff' },
  { name: 'Т-Банк', color: '#FFDD2D', ink: '#222' },
  { name: 'Альфа-Банк', color: '#EF3124', ink: '#fff' },
  { name: 'ВТБ', color: '#0A2896', ink: '#fff' },
];
const hash = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/**
 * Screenshot of a mobile-bank receipt sent by the buyer. Forged ones carry subtle
 * tells (old-style bank name, off-brand green, operation time after the message, a
 * misaligned row) — deliberately never labelled.
 */
function ReceiptShot({ m, o }: { m: OrderChatMsg; o: P2POrder }) {
  const fake = !!m.attachment?.fake;
  const h = hash(m.id);
  const bank = fake ? { name: 'Сбербанкъ', color: '#2DB24F', ink: '#fff' } : SHOT_BANKS[h % SHOT_BANKS.length];
  const green = fake ? '#35C35B' : '#21A038';
  const opAt = fake ? m.at + 6 + (h % 5) : m.at - 1;
  const barAt = fake ? opAt + 1 : m.at;
  const toBank = o.playerBank ? BANK_NAMES[o.playerBank] : 'Сбербанк';
  const rows: [string, string][] = [
    ['Получатель', 'Артём Сергеевич В.'],
    ['Банк получателя', toBank],
    ['Счёт списания', `•• ${String(1000 + (h % 9000))}`],
    ['Дата и время', `${dateStr(opAt)}, ${clockStr(opAt)}`],
    ['№ операции', `${String(h).padStart(10, '0').slice(0, 10)}`],
  ];
  return (
    <div className="w-[188px] overflow-hidden rounded-[14px] border border-black/20 bg-[#f4f5f7] text-left text-[#1f2329] shadow-lg">
      <div className="flex items-center justify-between px-3 pt-1.5 pb-1 text-[8.5px] font-semibold">
        <span className="num">{clockStr(barAt)}</span>
        <span className="tracking-tight">5G ▮▮▮ 76%</span>
      </div>
      <div className="px-3 py-1.5 text-[11px] font-bold" style={{ background: bank.color, color: bank.ink }}>
        {bank.name}
      </div>
      <div className="bg-white px-3 pt-3 pb-2.5 text-center">
        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full" style={{ background: green }}>
          <Check size={18} strokeWidth={3} className="text-white" />
        </div>
        <div className="mt-1.5 text-[11.5px] font-semibold" style={{ color: green }}>
          Перевод выполнен
        </div>
        <div className={cn('num mt-0.5 text-[17px] font-bold', fake && 'tracking-[0.02em]')}>{fmtRub(o.rub, 2)}</div>
        <div className="text-[8.5px] text-[#8a8f98]">Перевод по СБП · комиссия 0 ₽</div>
      </div>
      <div className="space-y-1 bg-white px-3 pb-3 text-[8.5px]">
        {rows.map(([k, v], i) => (
          <div key={k} className={cn('flex justify-between gap-2 border-t border-[#eceef1] pt-1', fake && i === 2 && 'translate-x-[3px] translate-y-px')}>
            <span className="shrink-0 text-[#8a8f98]">{k}</span>
            <span className="num truncate text-right font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
