import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Clock, LifeBuoy, ShieldCheck, TriangleAlert, Zap } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { BankId, Network } from '../../../game/types';
import { WITHDRAW_FEE } from '../../../game/engine/market';
import { BANKS } from '../../../game/data/static';
import { addressNetwork, durStr, fmtPhone, fmtRub, fmtUsdt, maskCard, shortDT } from '../../../game/util';
import { CopyBtn, PasteBtn, cn, parseNum, useResult } from '../../common/kit';
import { Callout, CodeInput, Field, Panel, Segmented, floor2, rBtn, rBtnGhost, rInput } from './rapiraUi';

const NET_LABEL: Record<Network, string> = { TRC20: 'TRC-20 (Tron)', TON: 'TON' };
const ALL_BANKS: BankId[] = ['sber', 'tbank', 'alfa'];

export function NeedTwoFA({ onGo }: { onGo: () => void }) {
  return (
    <Callout tone="warn" icon={<ShieldCheck size={14} />}>
      Вывод средств доступен только с двухфакторной защитой.{' '}
      <button type="button" className="font-semibold text-amber-300 underline-offset-2 hover:underline" onClick={onGo}>
        Подключить Google Authenticator →
      </button>
    </Callout>
  );
}

// ───────── RUB deposit via SBP ─────────

export function DepositRub() {
  const getReq = useGame((s) => s.rapiraDepositRequisites);
  const rub = useGame((s) => s.exchanges.rapira.rub);
  const [req, setReq] = useState<{ holder: string; phone: string; bank: 'tbank' } | null>(null);
  return (
    <Panel title="Пополнение RUB через СБП" icon={<Zap size={15} />} right={<span className="num text-xs text-slate-400">Баланс: {fmtRub(rub, 2)}</span>}>
      {!req ? (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-slate-400">
            Пополнение по номеру телефона через Систему быстрых платежей. Комиссия Rapira — 0 ₽. Переводите только <b className="text-slate-200">со своей карты</b>: платежи от третьих лиц возвращаются отправителю.
          </p>
          <button type="button" className={rBtn} onClick={() => setReq(getReq())}>
            Получить реквизиты
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="divide-y divide-slate-700/50 rounded-lg border border-slate-700/60 bg-[#0B1222]">
            <ReqRow label="Получатель" value={req.holder} />
            <ReqRow label="Банк получателя" value="Т-Банк" />
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-32 shrink-0 text-[11px] text-slate-500">Телефон для СБП</span>
              <span className="num flex-1 font-mono text-sm font-semibold text-white">{fmtPhone(req.phone)}</span>
              <CopyBtn value={req.phone} kind="phone" label="Rapira: пополнение RUB" meta={{ name: req.holder, bank: 'tbank' }} className="!text-[#60A5FA]" />
            </div>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-400 marker:text-slate-500">
            <li>Скопируйте номер — он попадёт в общий буфер ПК и телефона.</li>
            <li>На телефоне откройте свой банк → «Перевод по номеру телефона» → вставьте номер и выберите банк <b className="text-slate-200">Т-Банк</b>.</li>
            <li>Проверьте, что получатель — <b className="text-slate-200">ООО «РАПИРА ПЭЙ»</b>, и отправьте сумму.</li>
          </ol>
          <Callout icon={<Clock size={14} />}>Переведите сумму с телефона — зачисление 1–2 минуты.</Callout>
        </div>
      )}
    </Panel>
  );
}

function ReqRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-32 shrink-0 text-[11px] text-slate-500">{label}</span>
      <span className="text-sm text-slate-100">{value}</span>
    </div>
  );
}

// ───────── RUB withdrawal ─────────

export function WithdrawRub({ onSecurity }: { onSecurity: () => void }) {
  const banks = useGame((s) => s.banks);
  const rub = useGame((s) => s.exchanges.rapira.rub);
  const twoFA = useGame((s) => s.exchanges.rapira.twoFA);
  const withdrawRub = useGame((s) => s.rapiraWithdrawRub);
  const opened = ALL_BANKS.filter((b) => banks[b].opened);
  const [bank, setBank] = useState<BankId | null>(null);
  const [amt, setAmt] = useState('');
  const [code, setCode] = useState('');
  const res = useResult();
  const target = bank && opened.includes(bank) ? bank : opened[0] ?? null;
  const a = parseNum(amt);
  const fee = Math.round(a * 0.005 * 100) / 100;

  const submit = () => {
    if (!target) return res.show({ ok: false, error: 'Нет открытых карт' });
    if (code.length !== 6) return res.show({ ok: false, error: 'Введите код из Google Authenticator' });
    if (res.show(withdrawRub(target, a, code))) {
      setAmt('');
      setCode('');
    }
  };

  return (
    <Panel title="Вывод RUB на карту" icon={<Banknote size={15} />} right={<span className="num text-xs text-slate-400">Доступно: {fmtRub(rub, 2)}</span>}>
      <div className="space-y-3">
        <Field label="Карта получателя (только на своё имя)">
          <div className="grid gap-2 @2xl:grid-cols-3">
            {opened.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setBank(id)}
                className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition', target === id ? 'border-[#3B82F6] bg-[#3B82F6]/10' : 'border-slate-700 hover:border-slate-500')}
              >
                <span className="h-6 w-6 shrink-0 rounded-md" style={{ background: BANKS[id].color }} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-slate-100">{BANKS[id].name}</span>
                  <span className="num block text-[10px] text-slate-500">{maskCard(banks[id].card)}</span>
                </span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Сумма, ₽" right={<button type="button" className="text-[#60A5FA] hover:underline" onClick={() => setAmt(rub >= 1000 ? String(floor2(rub)) : '')}>Всё</button>}>
          <input className={cn(rInput, 'num')} placeholder="от 1 000 ₽" value={amt} onChange={(e) => setAmt(e.target.value)} />
        </Field>
        <div className="flex justify-between rounded-lg bg-[#0B1222] px-3 py-2 text-[11px]">
          <span className="text-slate-500">Комиссия 0,5%: <span className="num text-slate-300">{fmtRub(fee, 2)}</span></span>
          <span className="text-slate-500">
            На карту: <span className="num font-semibold text-white">{a > 0 ? fmtRub(Math.max(0, a - fee), 2) : '—'}</span>
          </span>
        </div>
        {!twoFA ? (
          <NeedTwoFA onGo={onSecurity} />
        ) : (
          <Field label="Код Google Authenticator">
            <CodeInput value={code} onChange={setCode} onEnter={submit} />
          </Field>
        )}
        <button type="button" className={cn(rBtn, 'w-full')} disabled={!twoFA || !(a > 0) || !target} onClick={submit}>
          Вывести на карту
        </button>
        <p className="text-[11px] text-slate-500">Зачисление обычно 4–10 минут. Крупные и частые выводы видит комплаенс вашего банка.</p>
        {res.node}
      </div>
    </Panel>
  );
}

// ───────── crypto deposit ─────────

export function DepositCrypto() {
  const acc = useGame(useShallow((s) => ({ trc: s.exchanges.rapira.depositTrc20, ton: s.exchanges.rapira.depositTon, memo: s.exchanges.rapira.tonMemo })));
  const [net, setNet] = useState<Network>('TON');
  const address = net === 'TRC20' ? acc.trc : acc.ton;
  return (
    <Panel title="Пополнение USDT" icon={<ArrowDownToLine size={15} />}>
      <Segmented
        value={net}
        onChange={setNet}
        options={[
          { id: 'TON', label: 'TON', cls: 'bg-[#3B82F6] text-white' },
          { id: 'TRC20', label: 'TRC-20', cls: 'bg-[#3B82F6] text-white' },
        ]}
      />
      <div className="mt-3 flex gap-3">
        <FakeQr seed={address} />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="text-[11px] text-slate-500">Адрес USDT · сеть {NET_LABEL[net]}</div>
            <div className="mt-0.5 font-mono text-xs break-all text-slate-100 select-text">{address}</div>
            <CopyBtn value={address} kind="address" meta={{ network: net }} label={`Адрес пополнения Rapira (${NET_LABEL[net]})`} className="mt-1 -ml-1.5 !text-[#60A5FA]" />
          </div>
          {net === 'TON' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.07] p-2">
              <div className="text-[11px] font-semibold text-amber-300">MEMO (комментарий) — обязательно</div>
              <div className="flex items-center gap-2">
                <span className="num font-mono text-base font-bold text-white select-text">{acc.memo}</span>
                <CopyBtn value={acc.memo} kind="memo" meta={{ network: 'TON' }} label="MEMO Rapira" />
              </div>
            </div>
          )}
        </div>
      </div>
      {net === 'TON' ? (
        <Callout tone="danger" icon={<TriangleAlert size={14} />} className="mt-3">
          Адрес TON общий для всех клиентов биржи — зачисление идёт по MEMO. Перевод без MEMO или с ошибкой не зачислится автоматически: только через поддержку, до 12 часов и комиссия 5 USDT.
        </Callout>
      ) : (
        <Callout className="mt-3">Отправляйте только USDT в сети TRC-20. Зачисление после 19 подтверждений (≈ 3 минуты). Газ платит отправитель в TRX.</Callout>
      )}
    </Panel>
  );
}

/** Deterministic QR-looking pattern; purely decorative. */
function FakeQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const n = 21;
    let h = 2166136261;
    const out: boolean[] = [];
    for (let i = 0; i < n * n; i++) {
      h ^= seed.charCodeAt(i % seed.length) + i;
      h = Math.imul(h, 16777619);
      out.push(((h >>> 7) & 1) === 1);
    }
    return out;
  }, [seed]);
  const n = 21;
  const finder = (x: number, y: number) => {
    const inBox = (bx: number, by: number) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
    for (const [bx, by] of [[0, 0], [14, 0], [0, 14]] as const) {
      if (inBox(bx, by)) {
        const dx = x - bx;
        const dy = y - by;
        return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
      }
    }
    return -1;
  };
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="h-24 w-24 shrink-0 rounded-md bg-white p-1" shapeRendering="crispEdges">
      {cells.map((on, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        const f = finder(x, y);
        const fill = f === -1 ? on : f === 1;
        return fill ? <rect key={i} x={x} y={y} width="1" height="1" fill="#0F172A" /> : null;
      })}
    </svg>
  );
}

// ───────── crypto withdrawal ─────────

export function WithdrawCrypto({ onSecurity }: { onSecurity: () => void }) {
  const usdt = useGame((s) => s.exchanges.rapira.usdt);
  const twoFA = useGame((s) => s.exchanges.rapira.twoFA);
  const withdraw = useGame((s) => s.withdraw);
  const [net, setNet] = useState<Network>('TON');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [amt, setAmt] = useState('');
  const [code, setCode] = useState('');
  const res = useResult();
  const fee = WITHDRAW_FEE[net];
  const a = parseNum(amt);
  const detected = address.trim() ? addressNetwork(address) : null;
  const mismatch = !!address.trim() && detected !== net;

  const submit = () => {
    if (code.length !== 6) return res.show({ ok: false, error: 'Введите код из Google Authenticator' });
    if (res.show(withdraw({ from: 'rapira', network: net, address: address.trim(), memo: net === 'TON' ? memo : '', amount: a, code }))) {
      setAmt('');
      setCode('');
    }
  };

  return (
    <Panel title="Вывод USDT" icon={<ArrowUpFromLine size={15} />} right={<span className="num text-xs text-slate-400">Доступно: {fmtUsdt(usdt)}</span>}>
      <div className="space-y-3">
        <Segmented
          value={net}
          onChange={setNet}
          options={[
            { id: 'TON', label: `TON · комиссия ${WITHDRAW_FEE.TON} USDT`, cls: 'bg-[#3B82F6] text-white' },
            { id: 'TRC20', label: `TRC-20 · комиссия ${WITHDRAW_FEE.TRC20} USDT`, cls: 'bg-[#3B82F6] text-white' },
          ]}
        />
        <Field
          label="Адрес получателя"
          right={
            <PasteBtn
              className="text-[#60A5FA] hover:bg-white/5"
              onPaste={(v, clip) => {
                if (clip.kind === 'memo') return setMemo(v);
                setAddress(v);
                if (clip.meta?.network) setNet(clip.meta.network);
              }}
            >
              Вставить
            </PasteBtn>
          }
          hint={
            address.trim() ? (
              detected ? (
                <span className={mismatch ? 'text-rose-400' : 'text-emerald-400'}>{mismatch ? `Это адрес сети ${NET_LABEL[detected]}, а выбрана ${NET_LABEL[net]}` : `Сеть адреса: ${NET_LABEL[detected]} ✓`}</span>
              ) : (
                <span className="text-rose-400">Неверный формат адреса</span>
              )
            ) : undefined
          }
        >
          <input className={cn(rInput, 'font-mono text-xs')} placeholder={net === 'TON' ? 'UQ…' : 'T…'} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        {net === 'TON' && (
          <Field label="MEMO / комментарий" hint="Биржи-получатели зачисляют TON-переводы по MEMO. Проверьте его дважды.">
            <input className={cn(rInput, 'num font-mono')} placeholder="Обязателен для бирж" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </Field>
        )}
        <Field label="Сумма, USDT" right={<button type="button" className="text-[#60A5FA] hover:underline" onClick={() => setAmt(usdt > fee ? String(floor2(usdt)) : '')}>Макс.</button>}>
          <input className={cn(rInput, 'num')} placeholder={`больше ${fee}`} value={amt} onChange={(e) => setAmt(e.target.value)} />
        </Field>
        <div className="flex justify-between rounded-lg bg-[#0B1222] px-3 py-2 text-[11px]">
          <span className="text-slate-500">
            Комиссия сети: <span className="num text-slate-300">{fee} USDT</span>
          </span>
          <span className="text-slate-500">
            Будет зачислено: <span className="num font-semibold text-white">{a > fee ? fmtUsdt(a - fee) : '—'}</span>
          </span>
        </div>
        {!twoFA ? (
          <NeedTwoFA onGo={onSecurity} />
        ) : (
          <Field label="Код Google Authenticator">
            <CodeInput value={code} onChange={setCode} onEnter={submit} />
          </Field>
        )}
        <button type="button" className={cn(rBtn, 'w-full')} disabled={!twoFA || !(a > fee) || !address.trim()} onClick={submit}>
          Вывести {a > 0 ? fmtUsdt(a) : 'USDT'}
        </button>
        {res.node}
      </div>
    </Panel>
  );
}

// ───────── stuck deposits ─────────

export function StuckDeposits({ compact }: { compact?: boolean }) {
  const stuck = useGame((s) => s.exchanges.rapira.stuckDeposits);
  const now = useGame((s) => Math.floor(s.now));
  const resolveStuck = useGame((s) => s.resolveStuck);
  if (!stuck.length) return null;
  return (
    <Panel title="Незачисленные депозиты" icon={<LifeBuoy size={15} />} className="border-rose-500/30" right={<span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">{stuck.length}</span>}>
      <ul className="space-y-2">
        {stuck.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700/60 bg-[#0B1222] px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="num text-sm font-semibold text-white">
                {fmtUsdt(d.amount)} <span className="text-xs font-normal text-slate-500">· {NET_LABEL[d.network]} · {shortDT(d.at)}</span>
              </div>
              <div className="text-[11px] text-rose-300/90">Не указан или неверный MEMO — автоматическое зачисление невозможно</div>
            </div>
            {d.resolveAt ? (
              <div className="text-right text-[11px] text-slate-400">
                <div className="text-amber-300">Заявка в поддержке</div>
                <div className="num">зачисление ≈ через {durStr(Math.max(0, d.resolveAt - now))} · −5 USDT</div>
              </div>
            ) : (
              <button type="button" className={cn(rBtnGhost, 'text-xs')} onClick={() => resolveStuck('rapira', d.id)}>
                <LifeBuoy size={13} /> Обратиться в поддержку
              </button>
            )}
          </li>
        ))}
      </ul>
      {!compact && <p className="mt-2 text-[11px] text-slate-500">Поддержка найдёт перевод по хэшу транзакции и зачислит вручную. Комиссия за ручное зачисление — 5 USDT.</p>}
    </Panel>
  );
}
