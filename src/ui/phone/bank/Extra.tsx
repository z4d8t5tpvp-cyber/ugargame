import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Info, ShoppingBag } from 'lucide-react';
import { useGame } from '../../../game/store';
import { PLAYER_PHONE } from '../../../game/engine/banks';
import { BANKS, RETAIL } from '../../../game/data/static';
import { digits, fmtCard, fmtPhone, fmtRub } from '../../../game/util';
import { cn, CopyBtn } from '../../common/kit';
import { BANK_REQ } from './theme';
import { Body, Btn, Header, Meter, useBank } from './ui';

const effectLine = (e: number, s: number, a: number) =>
  [e ? `${e > 0 ? '+' : '−'}${Math.abs(e)} энергии` : '', s ? `${s > 0 ? '+' : '−'}${Math.abs(s)} стресса` : '', a ? `${a > 0 ? '+' : '−'}${Math.abs(a)} внимательности` : '']
    .filter(Boolean)
    .join(' · ');

export function RetailScreen() {
  const { bank, t, notify } = useBank();
  const retailMonth = useGame((s) => s.banks[bank].retailMonth);
  const outMonth = useGame((s) => s.banks[bank].outMonth);
  const [paid, setPaid] = useState<string | null>(null);
  const share = outMonth > 0 ? retailMonth / outMonth : 0;
  const okShare = outMonth === 0 || share >= 0.12;

  const pay = (id: string, title: string) => {
    const r = useGame.getState().retail(bank, id);
    notify(r, `Оплачено: ${title}`);
    if (r.ok) {
      setPaid(id);
      setTimeout(() => setPaid((p) => (p === id ? null : p)), 1600);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header title="Платежи и покупки" subtitle="Бытовые траты · прогрев карты" />
      <Body>
        <div className={cn('rounded-[18px] p-4', t.surface)}>
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold">Доля бытовых трат в месяце</span>
            <span className={cn('font-semibold num', okShare ? t.pos : t.dark ? 'text-amber-300' : 'text-amber-600')}>{outMonth > 0 ? `${Math.round(share * 100)}%` : '—'}</span>
          </div>
          <div className="mt-2">
            <Meter value={outMonth > 0 ? share / 0.25 : 0} color={okShare ? '#22C55E' : '#F59E0B'} dark={t.dark} />
          </div>
          <div className={cn('mt-1.5 flex justify-between text-[11.5px]', t.muted)}>
            <span className="num">
              {fmtRub(retailMonth)} из {fmtRub(outMonth)} списаний
            </span>
            <span>цель ≥ 12%</span>
          </div>
          <div className={cn('mt-3 flex gap-2 rounded-xl px-3 py-2.5 text-[12px] leading-snug', t.accentBg)}>
            <Info size={15} className="mt-px shrink-0" />
            Обычные траты снижают риск 115-ФЗ: банк видит живого клиента, а не транзит
          </div>
        </div>

        <div className={cn('mt-3 rounded-[18px] p-1.5', t.surface)}>
          {RETAIL.map((it) => (
            <div key={it.id} className="flex items-center gap-3 px-2 py-2.5">
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[22px]', t.dark ? 'bg-white/[0.07]' : 'bg-black/[0.04]')}>{it.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium">{it.title}</div>
                <div className={cn('truncate text-[11.5px]', t.muted)}>{effectLine(it.energy, it.stress, it.attention) || 'Обязательный платёж'}</div>
                <div className="text-[13px] font-semibold num">{fmtRub(it.price)}</div>
              </div>
              <motion.div key={paid === it.id ? 'ok' : 'pay'} initial={{ scale: 0.85 }} animate={{ scale: 1 }}>
                {paid === it.id ? (
                  <span className={cn('flex h-9 w-[92px] items-center justify-center gap-1 rounded-xl text-[13px] font-semibold', t.accentBg)}>
                    <Check size={15} /> Оплачено
                  </span>
                ) : (
                  <Btn className="h-9 w-[92px] rounded-xl px-0 text-[13px]" onClick={() => pay(it.id, it.title)}>
                    Оплатить
                  </Btn>
                )}
              </motion.div>
            </div>
          ))}
        </div>
        <div className={cn('mt-3 flex items-center justify-center gap-1.5 text-[11.5px]', t.faint)}>
          <ShoppingBag size={13} /> Оплата картой {BANKS[bank].name}
        </div>
      </Body>
    </div>
  );
}

/** Deterministic account number derived from the card so it stays stable between sessions. */
const accountNo = (card: string) => {
  const d = digits(card).padEnd(16, '0');
  return `40817 810 ${d[4]} ${d.slice(5, 9)} ${d.slice(9, 16)}`;
};

export function RequisitesScreen() {
  const { bank, t } = useBank();
  const card = useGame((s) => s.banks[bank].card);
  const req = BANK_REQ[bank];
  // `!` beats the kit's dark-theme defaults regardless of CSS order.
  const copyCls = cn('shrink-0 rounded-lg! px-2! py-1! text-[12px]! font-semibold', t.ghost, t.dark ? 'text-white!' : t.id === 'alfa' ? 'text-[#0B0B0B]!' : 'text-[#178A2E]!');
  const rows: { k: string; v: string; copy?: { value: string; kind: 'card' | 'phone' | 'text'; label: string } }[] = [
    { k: 'Получатель', v: 'Воронов Артём Сергеевич', copy: { value: 'Воронов Артём Сергеевич', kind: 'text', label: 'ФИО получателя' } },
    { k: 'Номер карты', v: fmtCard(card), copy: { value: fmtCard(card), kind: 'card', label: `Моя карта ${BANKS[bank].name}` } },
    { k: 'Телефон для СБП', v: fmtPhone(PLAYER_PHONE), copy: { value: fmtPhone(PLAYER_PHONE), kind: 'phone', label: 'Мой телефон для СБП' } },
    { k: 'Номер счёта', v: accountNo(card), copy: { value: accountNo(card).replace(/\s/g, ''), kind: 'text', label: 'Номер счёта' } },
    { k: 'Банк получателя', v: req.legal },
    { k: 'БИК', v: req.bic },
    { k: 'Корр. счёт', v: req.corr },
  ];
  return (
    <div className="flex h-full flex-col">
      <Header title="Реквизиты" subtitle={`Карта ${BANKS[bank].name}`} />
      <Body>
        <div className={cn('divide-y rounded-[18px] px-4', t.divide, t.surface)}>
          {rows.map((r) => (
            <div key={r.k} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <div className={cn('text-[11.5px]', t.muted)}>{r.k}</div>
                <div className="text-[14px] font-medium break-all num">{r.v}</div>
              </div>
              {r.copy && <CopyBtn value={r.copy.value} kind={r.copy.kind} label={r.copy.label} className={copyCls} />}
            </div>
          ))}
        </div>
        <div className={cn('mt-3 flex gap-2 rounded-2xl px-3.5 py-3 text-[12px] leading-snug', t.accentBg)}>
          <Info size={15} className="mt-px shrink-0" />
          Эти данные указывают в способах оплаты на бирже: покупатели переводят рубли по номеру телефона через СБП или на карту.
        </div>
      </Body>
    </div>
  );
}
