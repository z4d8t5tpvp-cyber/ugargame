import type { ReactNode } from 'react';
import { useGame } from '../../../game/store';
import type { BankId, GameFile, Receipt } from '../../../game/types';
import { BANKS } from '../../../game/data/static';
import { BANK_NAMES, clockStr, dateLong, fmtPhone, fmtRub, maskCard } from '../../../game/util';
import { cn } from '../../common/kit';

const HOTLINE: Record<BankId, string> = { sber: '900', tbank: '8 800 333-77-77', alfa: '8 800 200-00-00' };

/** SBP identifier looks like A6258…; derived from the op number so it is stable. */
const sbpId = (r: Receipt) => {
  let h = 7;
  for (const c of r.op + r.txId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `A${(r.at % 1000).toString().padStart(3, '0')}${h.toString(16).toUpperCase().padStart(8, '0')}0000011${(h % 9000) + 1000}`.slice(0, 32);
};

export function ReceiptView({ r }: { r: Receipt }) {
  const incoming = useGame((s) => (s.banks[r.bank].txs.find((t) => t.id === r.txId)?.amount ?? -1) > 0);
  const card = useGame((s) => s.banks[r.bank].card);
  const bank = BANKS[r.bank];
  const rows: [string, string][] = incoming
    ? [
        ['Отправитель', r.recipient],
        ['Телефон отправителя', r.recipientPhone ? fmtPhone(r.recipientPhone) : '—'],
        ['Банк отправителя', r.recipientBank || '—'],
        ['Получатель', 'Артём Сергеевич В.'],
        ['Счёт зачисления', maskCard(card)],
      ]
    : [
        ['ФИО получателя', r.recipient],
        ['Телефон получателя', r.recipientPhone ? fmtPhone(r.recipientPhone) : '—'],
        ['Банк получателя', r.recipientBank || '—'],
        ['Отправитель', 'Артём Сергеевич В.'],
        ['Счёт списания', maskCard(card)],
      ];
  return (
    <div className="relative mx-auto w-full max-w-[310px] overflow-hidden rounded-sm bg-white text-[11px] text-[#1A1A1A] shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: bank.color, color: bank.text }}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm font-black">{bank.name[0]}</span>
        <span className="text-[13px] font-bold">{BANK_NAMES[r.bank]}</span>
        <span className="ml-auto text-[10px] opacity-80">Чек по операции</span>
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="text-[10px] text-[#6B7280]">
          {dateLong(r.at)}, {clockStr(r.at)} (МСК)
        </div>
        <div className="mt-1 text-[13px] font-semibold">{incoming ? 'Входящий перевод по СБП' : 'Перевод по СБП'}</div>
        <div className="num mt-1 text-[22px] font-bold">{fmtRub(r.amount, 2)}</div>
        <div className="my-3 border-t border-dashed border-[#D1D5DB]" />
        <dl className="space-y-1.5">
          <Line k="Статус" v={<span className="font-semibold text-[#16A34A]">Исполнен</span>} />
          {rows.map(([k, v]) => (
            <Line key={k} k={k} v={v} />
          ))}
          <Line k="Сумма" v={fmtRub(r.amount, 2)} />
          <Line k="Комиссия" v={fmtRub(r.fee, 2)} />
          {r.comment && <Line k="Сообщение" v={r.comment} />}
          <Line k="№ операции" v={r.op} mono />
          <Line k="Идентификатор СБП" v={sbpId(r)} mono small />
        </dl>
        <div className="mt-4 flex items-end justify-between">
          <div className="text-[9px] leading-tight text-[#9CA3AF]">
            {bank.name} · служба поддержки {HOTLINE[r.bank]}
            <br />
            Документ сформирован автоматически
          </div>
          <Stamp bank={r.bank} at={r.at} />
        </div>
      </div>
    </div>
  );
}

function Line({ k, v, mono, small }: { k: string; v: ReactNode; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-[#6B7280]">{k}</dt>
      <dd className={cn('min-w-0 text-right break-all', mono && 'num font-mono', small && 'text-[9px]')}>{v}</dd>
    </div>
  );
}

function Stamp({ bank, at }: { bank: BankId; at: number }) {
  const c = bank === 'tbank' ? '#1D4ED8' : BANKS[bank].color;
  return (
    <div className="flex h-[74px] w-[74px] shrink-0 -rotate-12 flex-col items-center justify-center rounded-full border-[2.5px] text-center opacity-80" style={{ borderColor: c, color: c }}>
      <div className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full border" style={{ borderColor: c }}>
        <span className="text-[7px] leading-none font-bold">{BANKS[bank].name.toUpperCase()}</span>
        <span className="my-0.5 text-[9px] leading-none font-black">ИСПОЛНЕНО</span>
        <span className="num text-[7px] leading-none">{clockStr(at)}</span>
      </div>
    </div>
  );
}

export function LinesView({ file }: { file: GameFile }) {
  const lines = file.lines ?? [];
  const [title, ...rest] = lines;
  const mono = file.kind === 'order_export' || file.kind === 'statement';
  return (
    <div className="mx-auto w-full max-w-[420px] rounded-sm bg-white px-5 py-4 text-[11px] text-[#1A1A1A] shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
      {title && <div className="mb-2 border-b border-[#E5E7EB] pb-2 text-[13px] font-bold">{title}</div>}
      <div className={cn('space-y-0.5 leading-relaxed', mono && 'font-mono text-[10px]')}>
        {rest.map((l, i) => (l ? <div key={i} className="break-words">{l}</div> : <div key={i} className="h-2" />))}
        {!lines.length && <div className="text-[#9CA3AF]">Пустой документ</div>}
      </div>
      <div className="mt-4 text-right text-[9px] text-[#9CA3AF]">Стр. 1 из 1</div>
    </div>
  );
}
