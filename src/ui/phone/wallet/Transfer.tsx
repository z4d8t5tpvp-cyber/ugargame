import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowDown, Check, Fuel, Info } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { Network } from '../../../game/types';
import { GAS, TRX_USD } from '../../../game/engine/crypto';
import { addressNetwork, plural } from '../../../game/util';
import { cn, CopyBtn, parseNum, PasteBtn, useResult } from '../../common/kit';
import { Field, FakeQr, fmtAmt, Header, inputCls, netLabel, NetTabs, TokenIcon } from './ui';

export function Receive({ onBack }: { onBack: () => void }) {
  const [net, setNet] = useState<Network>('TRC20');
  const addr = useGame((s) => (net === 'TRC20' ? s.wallet.addressTrc20 : s.wallet.addressTon));
  return (
    <div className="flex h-full flex-col">
      <Header title="Получить" onBack={onBack} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <NetTabs value={net} onChange={setNet} />
        <div className="mt-4 flex flex-col items-center rounded-3xl bg-[#1D2633] p-4">
          <div className="text-[14px] font-semibold text-white">USDT · {netLabel(net)}</div>
          <div className="mt-0.5 text-[12px] text-[#8994A3]">{net === 'TRC20' ? 'Сеть Tron' : 'Сеть The Open Network'}</div>
          <div className="relative mt-3 overflow-hidden rounded-2xl bg-white p-2.5">
            <FakeQr value={addr} size={176} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-1">
              <TokenIcon token="USDT" size={34} />
            </div>
          </div>
          <div className="mt-3 break-all px-1 text-center font-mono text-[13px] leading-relaxed text-white">{addr}</div>
          <CopyBtn value={addr} label={`Мой Tonkeeper (${netLabel(net)})`} kind="address" meta={{ network: net }} className="mt-3 rounded-xl bg-[#263040] px-4 py-2 text-[14px]">
            Скопировать адрес
          </CopyBtn>
        </div>
        <div className="mt-3 flex gap-2.5 rounded-2xl bg-[#F5A73B]/10 p-3 text-[12.5px] leading-snug text-[#F5C27A]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {net === 'TRC20'
            ? 'Отправляйте на этот адрес только USDT в сети TRC-20 (Tron). Монеты из других сетей будут потеряны.'
            : 'Отправляйте на этот адрес только USDT в сети TON. Это личный кошелёк — MEMO при выводе с биржи не нужен.'}
        </div>
      </div>
    </div>
  );
}

export function Send({ onBack, onHistory }: { onBack: () => void; onHistory: () => void }) {
  const [net, setNet] = useState<Network>('TRC20');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [doneInfo, setDoneInfo] = useState('');
  const bal = useGame((s) => (net === 'TRC20' ? s.wallet.usdtTrc20 : s.wallet.usdtTon));
  const gasBal = useGame((s) => (net === 'TRC20' ? s.wallet.trx : s.wallet.ton));
  const walletSend = useGame((s) => s.walletSend);
  const res = useResult();

  const gas = GAS[net];
  const detected = address.trim() ? addressNetwork(address) : null;
  const mismatch = detected && detected !== net;
  const amt = parseNum(amount);
  const gasLow = gasBal < gas.amount;
  const canNext = address.trim().length > 0 && amt > 0;

  if (step === 'done')
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-[#39CC83]/15 text-[#39CC83]">
          <Check size={42} strokeWidth={2.6} />
        </motion.div>
        <div className="mt-4 text-[20px] font-bold text-white">Отправлено</div>
        <div className="mt-1 text-[14px] text-[#8994A3]">{doneInfo}</div>
        <div className="mt-1 text-[12.5px] text-[#8994A3]">{net === 'TRC20' ? 'Подтверждение в сети Tron займёт 1–3 минуты.' : 'Подтверждение в сети TON — около минуты.'}</div>
        <div className="mt-6 grid w-full gap-2">
          <button type="button" onClick={onBack} className="rounded-xl bg-[#45AEF5] py-3 text-[15px] font-semibold text-white transition hover:bg-[#5bb8f7]">
            Готово
          </button>
          <button type="button" onClick={onHistory} className="rounded-xl bg-[#1D2633] py-3 text-[15px] font-semibold text-white transition hover:bg-[#263040]">
            История
          </button>
        </div>
      </div>
    );

  if (step === 'confirm')
    return (
      <div className="flex h-full flex-col">
        <Header title="Подтверждение" onBack={() => setStep('form')} />
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col items-center py-3">
            <TokenIcon token="USDT" net={net} size={64} />
            <div className="num mt-3 text-[28px] font-bold text-white">{fmtAmt(amt)} USDT</div>
            <div className="text-[13px] text-[#8994A3]">Сеть {netLabel(net)}</div>
          </div>
          <div className="divide-y divide-white/5 rounded-2xl bg-[#1D2633]">
            <div className="px-4 py-3">
              <div className="text-[12.5px] text-[#8994A3]">Получатель</div>
              <div className="mt-0.5 break-all font-mono text-[13.5px] leading-relaxed text-white">{address.trim()}</div>
            </div>
            <div className="flex justify-between gap-3 px-4 py-3 text-[14px]">
              <span className="text-[#8994A3]">Комментарий / MEMO</span>
              <span className="break-all text-right font-mono text-white">{memo.trim() || '—'}</span>
            </div>
            <div className="flex justify-between gap-3 px-4 py-3 text-[14px]">
              <span className="text-[#8994A3]">Комиссия сети</span>
              <span className="text-right text-white">
                {gas.amount} {gas.token}
                <span className="block text-[12px] text-[#8994A3]">≈ {gas.usdtEq.toFixed(2)} USDT</span>
              </span>
            </div>
          </div>
          {net === 'TON' && !memo.trim() && (
            <div className="mt-3 flex gap-2 rounded-2xl bg-[#F5A73B]/10 p-3 text-[12.5px] leading-snug text-[#F5C27A]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> Без MEMO биржа не поймёт, чей это депозит.
            </div>
          )}
          {res.node && <div className="mt-3">{res.node}</div>}
        </div>
        <div className="shrink-0 space-y-2 p-4 pt-1">
          <button
            type="button"
            onClick={() => {
              const r = walletSend({ network: net, address: address.trim(), memo: memo.trim(), amount: amt });
              if (res.show(r)) {
                setDoneInfo(r.info ?? 'Транзакция отправлена в сеть');
                setStep('done');
              }
            }}
            className="w-full rounded-xl bg-[#45AEF5] py-3 text-[15px] font-semibold text-white transition hover:bg-[#5bb8f7]"
          >
            Подтвердить и отправить
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <Header title="Отправить" onBack={onBack} />
      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <NetTabs value={net} onChange={setNet} />

        <Field label="Адрес получателя">
          <div className="relative">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value.replace(/\s/g, ''))}
              rows={2}
              spellCheck={false}
              placeholder={net === 'TRC20' ? 'T…' : 'UQ… / EQ…'}
              className={cn(inputCls, 'resize-none pr-24 font-mono text-[13.5px] leading-snug', mismatch && 'border-[#FF4766]')}
            />
            <PasteBtn onPaste={(v) => setAddress(v.trim())} className="absolute right-2 top-2 bg-[#263040] text-[#45AEF5] hover:bg-[#2d394c]">
              Вставить
            </PasteBtn>
          </div>
          {mismatch && (
            <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl bg-[#FF4766]/10 px-3 py-2 text-[12.5px] text-[#FF8095]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={14} /> Это адрес сети {detected === 'TRC20' ? 'TRC-20' : 'TON'}
              </span>
              <button type="button" onClick={() => detected && setNet(detected)} className="shrink-0 font-semibold text-[#45AEF5] hover:underline">
                Сменить сеть
              </button>
            </div>
          )}
          {address.trim() && !detected && <div className="mt-1.5 px-1 text-[12px] text-[#FF8095]">Не похоже на адрес TRC-20 или TON</div>}
        </Field>

        <Field label="Комментарий / MEMO" hint={net === 'TON' ? <span className="text-[#F5A73B]">обязателен для бирж</span> : 'необязательно'}>
          <div className="relative">
            <input value={memo} onChange={(e) => setMemo(e.target.value)} spellCheck={false} placeholder={net === 'TON' ? 'MEMO из окна депозита биржи' : 'Комментарий'} className={cn(inputCls, 'pr-24 font-mono text-[14px]')} />
            <PasteBtn onPaste={(v) => setMemo(v.trim())} className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#263040] text-[#45AEF5] hover:bg-[#2d394c]">
              Вставить
            </PasteBtn>
          </div>
        </Field>

        <Field label="Сумма" hint={`Доступно: ${fmtAmt(bal)} USDT`}>
          <div className="relative">
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0" className={cn(inputCls, 'num pr-28 text-[20px] font-semibold')} />
            <span className="absolute right-[70px] top-1/2 -translate-y-1/2 text-[14px] text-[#8994A3]">USDT</span>
            <button type="button" onClick={() => setAmount(String(Math.floor(bal * 100) / 100))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-[#263040] px-2.5 py-1 text-[12.5px] font-semibold text-[#45AEF5] hover:bg-[#2d394c]">
              Макс
            </button>
          </div>
          {amt > bal + 1e-9 && <div className="mt-1.5 px-1 text-[12px] text-[#FF8095]">Недостаточно USDT в сети {netLabel(net)}</div>}
        </Field>

        <div className="rounded-2xl bg-[#1D2633] p-3.5 text-[13px]">
          <div className="flex items-start justify-between gap-3">
            <span className="flex shrink-0 items-center gap-1.5 text-[#8994A3]">
              <Fuel size={14} /> Комиссия сети
            </span>
            <span className="text-right text-white">{net === 'TRC20' ? '≈1.50 USDT, списывается 13.6 TRX' : '≈0.15 USDT, списывается 0.05 TON'}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[#8994A3]">Баланс {gas.token} на газ</span>
            <span className={cn('num font-medium', gasLow ? 'text-[#FF4766]' : 'text-white')}>
              {fmtAmt(gasBal, net === 'TRC20' ? 2 : 3)} {gas.token}
            </span>
          </div>
          {gasLow && <div className="mt-2 text-[12px] leading-snug text-[#FF8095]">Не хватает {gas.token} на комиссию. Купите газ на главном экране.</div>}
        </div>
      </div>
      <div className="shrink-0 p-4 pt-1">
        <button
          type="button"
          disabled={!canNext}
          onClick={() => {
            res.clear();
            setStep('confirm');
          }}
          className="w-full rounded-xl bg-[#45AEF5] py-3 text-[15px] font-semibold text-white transition hover:bg-[#5bb8f7] disabled:bg-[#1D2633] disabled:text-[#5B6675]"
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}

export function Swap({ onBack }: { onBack: () => void }) {
  const [net, setNet] = useState<Network>('TRC20');
  const [amount, setAmount] = useState('');
  const bal = useGame((s) => (net === 'TRC20' ? s.wallet.usdtTrc20 : s.wallet.usdtTon));
  const gasBal = useGame((s) => (net === 'TRC20' ? s.wallet.trx : s.wallet.ton));
  const tonUsd = useGame((s) => s.market.tonUsd);
  const walletSwap = useGame((s) => s.walletSwap);
  const res = useResult();
  const token = net === 'TRC20' ? 'TRX' : 'TON';
  const price = net === 'TRC20' ? TRX_USD : tonUsd;
  const amt = parseNum(amount);
  const out = (amt * 0.99) / price;
  const dec = net === 'TRC20' ? 2 : 3;
  const sends = Math.floor(gasBal / GAS[net].amount + 1e-9);

  return (
    <div className="flex h-full flex-col">
      <Header title="Купить газ" onBack={onBack} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <NetTabs value={net} onChange={(n) => (setNet(n), setAmount(''))} labels={{ TRC20: 'TRX · для TRC-20', TON: 'TON · для TON' }} />
        <div className="mt-3 flex gap-2 rounded-2xl bg-[#45AEF5]/10 p-3 text-[12.5px] leading-snug text-[#9ACFF7]">
          <Info size={15} className="mt-0.5 shrink-0" />
          Любой перевод USDT оплачивается «газом» в монете сети: {net === 'TRC20' ? '13.6 TRX за перевод в Tron' : '0.05 TON за перевод в TON'}. Без газа USDT не отправить.
        </div>

        <div className="mt-3 rounded-2xl bg-[#1D2633] p-3.5">
          <div className="flex items-center justify-between text-[12.5px] text-[#8994A3]">
            <span>Отдаёте</span>
            <button type="button" onClick={() => setAmount(String(Math.floor(bal * 100) / 100))} className="hover:text-white">
              Баланс: {fmtAmt(bal)} USDT
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <TokenIcon token="USDT" net={net} size={36} />
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0" className="num min-w-0 flex-1 bg-transparent text-[24px] font-semibold text-white outline-none placeholder:text-[#5B6675]" />
            <span className="text-[15px] font-semibold text-white">USDT</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[2, 5, 10].map((v) => (
              <button key={v} type="button" onClick={() => setAmount(String(v))} className="rounded-lg bg-[#263040] px-2.5 py-1 text-[12px] font-semibold text-[#45AEF5] hover:bg-[#2d394c]">
                {v} USDT
              </button>
            ))}
          </div>
        </div>
        <div className="relative z-10 -my-2.5 flex justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-4 border-[#10161F] bg-[#263040] text-[#45AEF5]">
            <ArrowDown size={16} />
          </div>
        </div>
        <div className="rounded-2xl bg-[#1D2633] p-3.5">
          <div className="text-[12.5px] text-[#8994A3]">Получаете ≈</div>
          <div className="mt-1.5 flex items-center gap-3">
            <TokenIcon token={token} size={36} />
            <span className="num min-w-0 flex-1 text-[24px] font-semibold text-white">{amt > 0 ? fmtAmt(out, dec) : '0'}</span>
            <span className="text-[15px] font-semibold text-white">{token}</span>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 rounded-2xl bg-[#1D2633] p-3.5 text-[13px]">
          <div className="flex justify-between">
            <span className="text-[#8994A3]">Курс</span>
            <span className="text-white">
              1 {token} = ${price.toFixed(net === 'TRC20' ? 3 : 2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8994A3]">Комиссия обмена</span>
            <span className="text-white">1%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8994A3]">Сейчас на балансе</span>
            <span className="text-white">
              {fmtAmt(gasBal, dec)} {token} · хватит на {sends} {plural(sends, 'перевод', 'перевода', 'переводов')}
            </span>
          </div>
        </div>
        {res.node && <div className="mt-3">{res.node}</div>}
      </div>
      <div className="shrink-0 p-4 pt-1">
        <button
          type="button"
          disabled={!(amt > 0)}
          onClick={() => {
            if (res.show(walletSwap(net, amt), `Получено ≈ ${fmtAmt(out, dec)} ${token}`)) setAmount('');
          }}
          className="w-full rounded-xl bg-[#45AEF5] py-3 text-[15px] font-semibold text-white transition hover:bg-[#5bb8f7] disabled:bg-[#1D2633] disabled:text-[#5B6675]"
        >
          Обменять
        </button>
      </div>
    </div>
  );
}
