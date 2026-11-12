import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Check, CircleCheck, FileCheck, FileDown, Loader2, ShieldCheck, TriangleAlert, UserRound, Wallet } from 'lucide-react';
import type { BankId, ExtBankId, GameState } from '../../../game/types';
import { useGame } from '../../../game/store';
import { available, lookupRecipient, outgoingBlock, PLAYER_PHONE, shownBalance, transferFee } from '../../../game/engine/banks';
import { BANKS, EXT_BANKS } from '../../../game/data/static';
import { BANK_NAMES, BANK_SHORT, clockStr, dateStr, digits, fmtCard, fmtPhone, fmtRub, maskCard, normPhone } from '../../../game/util';
import { cn, PasteBtn, parseNum, useResult } from '../../common/kit';
import { BankLogo, Body, Btn, Empty, ExtBankDot, Header, KV, Label, ResultSlot, Sheet, money, useBank } from './ui';

type Method = 'sbp' | 'card';
interface LookupView {
  ok: boolean;
  error?: string;
  masked?: string;
  bank?: ExtBankId;
  self?: BankId;
}

/** Banner shown on transfer screens when outgoing payments are blocked. */
function BlockNote() {
  const { bank, t } = useBank();
  const block = useGame((s) => outgoingBlock(s as GameState, bank));
  if (!block) return null;
  return (
    <div className={cn('mb-3 flex gap-2 rounded-2xl px-3.5 py-3 text-[12.5px] leading-snug', t.dark ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-700')}>
      <TriangleAlert size={16} className="mt-0.5 shrink-0" />
      <span>{block}</span>
    </div>
  );
}

function ClipHint() {
  const { t } = useBank();
  const clip = useGame((s) => s.clipboard);
  if (!clip) return <div className={cn('mt-1.5 px-1 text-[11px]', t.faint)}>Буфер обмена пуст — скопируйте реквизиты на компьютере</div>;
  return (
    <div className={cn('mt-1.5 truncate px-1 text-[11px]', t.faint)}>
      В буфере: {clip.label} · <span className="num">{clip.value}</span>
    </div>
  );
}

function AmountField({ amount, setAmount, fee, method }: { amount: string; setAmount: (s: string) => void; fee: number | null; method: Method | 'self' }) {
  const { bank, t } = useBank();
  const avail = useGame((s) => available(s.banks[bank]));
  const amt = parseNum(amount);
  return (
    <div className="mt-4">
      <Label>Сумма перевода</Label>
      <div className={cn('flex items-center rounded-[14px] px-3.5 transition', t.input)}>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d\s.,]/g, ''))}
          inputMode="decimal"
          placeholder="0"
          className="h-14 min-w-0 flex-1 bg-transparent text-[24px] font-semibold outline-none num"
        />
        <span className={cn('text-[22px] font-semibold', t.faint)}>₽</span>
        <PasteBtn onPaste={(v) => setAmount(v.replace(/[^\d.,]/g, ''))} className={cn('ml-2', t.ghost)}>
          Вставить
        </PasteBtn>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-[11.5px]">
        <span className={amt > avail ? 'text-rose-500' : t.muted}>Доступно {fmtRub(avail, 2)}</span>
        {amt >= 1 && fee !== null && (
          <span className={fee > 0 ? (t.dark ? 'text-amber-300' : 'text-amber-600') : t.pos}>
            {method === 'self' || (method === 'card' && fee === 0)
              ? 'Без комиссии'
              : fee === 0
                ? 'Без комиссии (в пределах лимита)'
                : method === 'card'
                  ? `Комиссия 1% (мин. 30 ₽): ${money(fee)}`
                  : `Комиссия 1%: ${money(fee)}`}
          </span>
        )}
      </div>
    </div>
  );
}

export function TransferScreen({ method }: { method: Method }) {
  const { bank, t, go } = useBank();
  const [input, setInput] = useState('');
  const [toBank, setToBank] = useState<ExtBankId | null>(null);
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [lk, setLk] = useState<LookupView | null>(null);
  const [searching, setSearching] = useState(false);
  const [fee, setFee] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ txId: string } | null>(null);
  const sbpOut = useGame((s) => s.banks[bank].sbpOutMonth);
  const res = useResult();

  const key = method === 'sbp' ? normPhone(input) : digits(input);
  const ready = method === 'sbp' ? key.length === 11 && !!toBank : key.length === 16;
  const amt = parseNum(amount);

  // Recipient lookup; lookupRecipient registers new payees, so it must run inside the store.
  useEffect(() => {
    setLk(null);
    if (!ready) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      const r = useGame.getState().act((d) => {
        const x = lookupRecipient(d, key, method, method === 'sbp' ? toBank : null);
        return { ok: x.ok, error: x.error, masked: x.masked, bank: x.bank, self: x.self } as LookupView;
      });
      setLk(r);
      setSearching(false);
    }, 550);
    return () => clearTimeout(timer);
  }, [key, toBank, method, ready]);

  useEffect(() => {
    if (!(amt >= 1)) {
      setFee(null);
      return;
    }
    const target = lk?.bank ?? (method === 'sbp' ? toBank : null);
    setFee(useGame.getState().act((d) => transferFee(d, bank, amt, method, target, !!lk?.self)));
  }, [amt, lk, toBank, method, bank, sbpOut]);

  const send = () => {
    setSending(true);
    setTimeout(() => {
      const r = useGame.getState().transfer({ from: bank, method, to: key, toBank: method === 'sbp' ? toBank : null, amount: amt, comment: comment.trim() });
      setSending(false);
      if (r.ok && r.txId) {
        setConfirm(false);
        setDone({ txId: r.txId });
      } else res.show(r);
    }, 700);
  };

  if (done) return <ReceiptScreen txId={done.txId} onDone={() => go('home')} toCard={method === 'card' ? key : undefined} />;

  const recipientLine = method === 'sbp' ? fmtPhone(key) : fmtCard(key);
  const canGo = !!lk?.ok && amt >= 1;

  return (
    <div className="flex h-full flex-col">
      <Header title={method === 'sbp' ? 'Перевод по СБП' : 'Перевод по номеру карты'} subtitle={method === 'sbp' ? 'Система быстрых платежей' : 'На карту любого банка РФ'} />
      <Body>
        <BlockNote />
        <Label>{method === 'sbp' ? 'Номер телефона получателя' : 'Номер карты получателя'}</Label>
        <div className={cn('flex items-center rounded-[14px] pr-1.5 pl-3.5 transition', t.input)}>
          <input
            value={input}
            onChange={(e) => setInput(method === 'card' ? fmtCard(digits(e.target.value).slice(0, 16)) : e.target.value.slice(0, 18))}
            inputMode="tel"
            placeholder={method === 'sbp' ? '+7 (___) ___-__-__' : '0000 0000 0000 0000'}
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none num"
          />
          <PasteBtn
            onPaste={(v) => {
              const dg = digits(v);
              if (method === 'card') setInput(fmtCard(dg.slice(0, 16)));
              else setInput(dg.length >= 10 ? fmtPhone(dg) : v.slice(0, 18));
            }}
            className={cn('h-9 rounded-[10px]! px-2.5!', t.ghost)}
          >
            Вставить
          </PasteBtn>
        </div>
        <ClipHint />

        {method === 'sbp' && (
          <div className="mt-4">
            <Label>Банк получателя</Label>
            <div className="grid grid-cols-3 gap-2">
              {EXT_BANKS.map((b) => (
                <button
                  key={b}
                  onClick={() => setToBank(b)}
                  className={cn('flex h-10 items-center gap-1.5 rounded-xl px-2 text-[12.5px] font-medium ring-1 transition', toBank === b ? t.chipOn : t.chipOff)}
                >
                  <ExtBankDot bank={b} size={20} />
                  <span className="truncate">{BANK_SHORT[b]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <RecipientBox method={method} key_={key} toBank={toBank} lk={lk} searching={searching} />

        <AmountField amount={amount} setAmount={setAmount} fee={fee} method={lk?.self ? 'self' : method} />

        <div className="mt-4">
          <Label>Сообщение</Label>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 140))}
            placeholder="Сообщение получателю (необязательно)"
            className={cn('h-12 w-full rounded-[14px] px-3.5 text-[14px] outline-none', t.input)}
          />
        </div>

        <Btn className="mt-5" disabled={!canGo} onClick={() => (res.clear(), setConfirm(true))}>
          Продолжить
        </Btn>
      </Body>

      <Sheet open={confirm} onClose={() => !sending && setConfirm(false)} title="Проверьте перевод" panelClass={t.sheet}>
        <div className="mb-3 flex items-center gap-3">
          <span className={cn('flex h-12 w-12 items-center justify-center rounded-full', t.accentBg)}>
            <UserRound size={22} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold">{lk?.masked}</div>
            <div className={cn('text-[12.5px]', t.muted)}>
              {lk?.bank ? BANK_NAMES[lk.bank] : ''} · <span className="num">{recipientLine}</span>
            </div>
          </div>
        </div>
        <div className={cn('divide-y rounded-2xl px-3.5', t.divide, t.dark ? 'bg-white/[0.04]' : 'bg-black/[0.03]')}>
          <KV k="Получатель" v={lk?.masked} strong />
          <KV k="Банк получателя" v={lk?.bank ? BANK_NAMES[lk.bank] : '—'} />
          <KV k={method === 'sbp' ? 'Телефон' : 'Карта'} v={recipientLine} mono />
          <KV k="Сумма" v={money(amt)} mono />
          <KV k="Комиссия" v={fee ? money(fee) : 'Без комиссии'} mono />
          {comment.trim() && <KV k="Сообщение" v={comment.trim()} />}
          <KV k="Итого к списанию" v={money(amt + (fee ?? 0))} strong mono />
        </div>
        <div className={cn('mt-3 flex gap-2 text-[11.5px] leading-snug', t.muted)}>
          <ShieldCheck size={15} className="mt-px shrink-0" />
          Убедитесь, что имя получателя совпадает с тем, кому вы переводите. Отменить перевод будет невозможно.
        </div>
        <ResultSlot node={res.node} dark={t.dark} className="mt-3" />
        <Btn className="mt-3" onClick={send} busy={sending}>
          {sending ? 'Отправляем…' : `Отправить перевод`}
        </Btn>
      </Sheet>
    </div>
  );
}

function RecipientBox({ method, key_, toBank, lk, searching }: { method: Method; key_: string; toBank: ExtBankId | null; lk: LookupView | null; searching: boolean }) {
  const { t } = useBank();
  let body;
  if (searching) {
    body = (
      <div className={cn('flex items-center gap-2 text-[13px]', t.muted)}>
        <Loader2 size={15} className="animate-spin" /> Ищем получателя…
      </div>
    );
  } else if (lk?.ok) {
    body = (
      <div className="flex items-center gap-2.5">
        {lk.bank && <ExtBankDot bank={lk.bank} size={30} />}
        <div className="min-w-0">
          <div className="text-[15px] font-semibold">Получатель: {lk.masked}</div>
          <div className={cn('text-[12px]', t.muted)}>{lk.bank ? BANK_NAMES[lk.bank] : ''}{lk.self ? ' · ваш счёт' : ''}</div>
        </div>
      </div>
    );
  } else if (lk && !lk.ok) {
    body = (
      <div className={cn('flex gap-2 text-[13px] leading-snug', t.dark ? 'text-rose-300' : 'text-rose-600')}>
        <TriangleAlert size={16} className="mt-px shrink-0" /> {lk.error}
      </div>
    );
  } else {
    body = (
      <div className={cn('text-[12.5px] leading-snug', t.muted)}>
        {method === 'sbp'
          ? key_.length >= 11 && !toBank
            ? 'Выберите банк получателя'
            : 'Введите номер и выберите банк — приложение покажет имя получателя'
          : 'Введите 16 цифр карты — приложение покажет имя получателя'}
      </div>
    );
  }
  const okBox = lk?.ok && !searching;
  return (
    <div
      className={cn(
        'mt-4 rounded-2xl border-2 border-dashed px-3.5 py-3 transition',
        okBox ? (t.dark ? 'border-[#FFDD2D]/60 bg-[#FFDD2D]/[0.07]' : 'border-amber-300 bg-amber-50') : t.line,
      )}
    >
      <div className={cn('mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase', okBox ? (t.dark ? 'text-[#FFDD2D]' : 'text-amber-700') : t.faint)}>
        <ShieldCheck size={13} />
        Проверка ФИО получателя
      </div>
      {body}
    </div>
  );
}

/** Success screen after a transfer with the «save PDF» action. */
export function ReceiptScreen({ txId, onDone, toCard }: { txId: string; onDone: () => void; toCard?: string }) {
  const { bank, t } = useBank();
  const tx = useGame((s) => s.banks[bank].txs.find((x) => x.id === txId));
  const fileName = useGame((s) => (tx?.receiptFileId ? s.files.find((f) => f.id === tx.receiptFileId)?.name : undefined));
  const card = useGame((s) => s.banks[bank].card);
  const res = useResult();
  if (!tx) return <Empty icon={<CircleCheck size={24} />} title="Перевод выполнен" />;
  const amount = Math.abs(tx.amount);
  const save = () => {
    const fid = useGame.getState().saveReceipt(bank, tx.id);
    if (!fid) res.show({ ok: false, error: 'Не удалось сформировать чек' });
  };
  return (
    <div className="flex h-full flex-col">
      <Body className="pt-6">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 260 }}
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: t.hex }}
          >
            <Check size={44} strokeWidth={3} className={t.id === 'tbank' ? 'text-black' : 'text-white'} />
          </motion.div>
          <div className="mt-4 text-[20px] font-bold">Перевод выполнен</div>
          <div className="mt-1 text-[32px] leading-tight font-bold num">{money(amount)}</div>
          <div className={cn('mt-1 text-[13px]', t.muted)}>{tx.title}</div>
        </div>

        <div className={cn('mt-5 divide-y rounded-[18px] px-3.5', t.divide, t.surface)}>
          <KV k="Получатель" v={tx.title} strong />
          {tx.counterpartyBank && <KV k="Банк получателя" v={tx.counterpartyBank} />}
          {tx.phone && <KV k="Телефон" v={fmtPhone(tx.phone)} mono />}
          {toCard && <KV k="Карта получателя" v={maskCard(toCard)} mono />}
          <KV k="Дата и время" v={`${dateStr(tx.at)}, ${clockStr(tx.at)}`} />
          <KV k="Номер операции" v={tx.id.replace(/^tx_/, '').slice(-10).toUpperCase()} mono />
          <KV k="Комиссия" v={tx.fee ? money(tx.fee) : 'Без комиссии'} mono />
          {tx.comment && <KV k="Сообщение" v={tx.comment} />}
          <KV k="Списано с карты" v={`${BANKS[bank].name} ${maskCard(card)}`} />
        </div>

        <div className="mt-4 space-y-2">
          {tx.receiptFileId ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-start gap-2 rounded-2xl px-3.5 py-3 text-[12.5px] leading-snug', t.accentBg)}>
              <FileCheck size={18} className="mt-px shrink-0" />
              <span>
                Чек сохранён: <b className="break-all">{fileName ?? 'PDF'}</b> — доступен на компьютере в папке «Чеки и Ордера»
              </span>
            </motion.div>
          ) : (
            <Btn variant="ghost" onClick={save}>
              <FileDown size={18} />
              Сохранить PDF-чек в память
            </Btn>
          )}
          <ResultSlot node={res.node} dark={t.dark} />
          <Btn onClick={onDone}>Готово</Btn>
        </div>
      </Body>
    </div>
  );
}

export function SelfTransferScreen() {
  const { bank, t, go } = useBank();
  const others = useGame((s) => (['sber', 'tbank', 'alfa'] as BankId[]).filter((id) => id !== bank && s.banks[id].opened).join(','));
  const targets = others ? (others.split(',') as BankId[]) : [];
  const [target, setTarget] = useState<BankId | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ amount: number; to: BankId } | null>(null);
  const res = useResult();
  const amt = parseNum(amount);
  const sel = target && targets.includes(target) ? target : (targets[0] ?? null);

  const send = () => {
    if (!sel) return;
    setBusy(true);
    setTimeout(() => {
      const r = useGame.getState().transfer({ from: bank, method: 'sbp', to: PLAYER_PHONE, toBank: sel, amount: amt, comment: '' });
      setBusy(false);
      if (r.ok) setDone({ amount: amt, to: sel });
      else res.show(r);
    }, 600);
  };

  if (done)
    return (
      <div className="flex h-full flex-col">
        <Body className="flex flex-col items-center justify-center text-center">
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: t.hex }}>
            <Check size={44} strokeWidth={3} className={t.id === 'tbank' ? 'text-black' : 'text-white'} />
          </motion.div>
          <div className="mt-4 text-[20px] font-bold">Деньги переведены</div>
          <div className="mt-1 text-[30px] font-bold num">{money(done.amount)}</div>
          <div className={cn('mt-1 text-[13px]', t.muted)}>Уже на вашем счёте в {BANK_NAMES[done.to]} · без комиссии</div>
          <Btn className="mt-8" onClick={() => go('home')}>
            Готово
          </Btn>
        </Body>
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <Header title="Между своими счетами" subtitle="Мгновенно и без комиссии" />
      <Body>
        <BlockNote />
        {targets.length === 0 ? (
          <Empty icon={<ArrowLeftRight size={24} />} title="Нет других счетов" text="Откройте карту в другом банке, чтобы переводить деньги между своими счетами" />
        ) : (
          <>
            <Label>Куда</Label>
            <div className="space-y-2">
              {targets.map((id) => (
                <SelfTarget key={id} id={id} active={sel === id} onClick={() => setTarget(id)} />
              ))}
            </div>
            <AmountField amount={amount} setAmount={setAmount} fee={0} method="self" />
            <ResultSlot node={res.node} dark={t.dark} className="mt-3" />
            <Btn className="mt-5" disabled={!(amt >= 1) || !sel} busy={busy} onClick={send}>
              {busy ? 'Переводим…' : amt >= 1 ? `Перевести ${money(amt)}` : 'Перевести'}
            </Btn>
          </>
        )}
      </Body>
    </div>
  );
}

function SelfTarget({ id, active, onClick }: { id: BankId; active: boolean; onClick: () => void }) {
  const { t } = useBank();
  const bal = useGame((s) => shownBalance(s.banks[id]));
  const card = useGame((s) => s.banks[id].card);
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left ring-2 transition', t.surface, active ? (t.dark ? 'ring-[#FFDD2D]' : t.id === 'alfa' ? 'ring-[#EF3124]' : 'ring-[#21A038]') : 'ring-transparent')}>
      <BankLogo bank={id} size={34} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{BANKS[id].name}</div>
        <div className={cn('text-[12px] num', t.muted)}>Карта {maskCard(card)}</div>
      </div>
      <div className="text-right">
        <div className="text-[14px] font-semibold num">{fmtRub(bal, 2)}</div>
        <Wallet size={13} className={cn('ml-auto', t.faint)} />
      </div>
    </button>
  );
}
