import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock, ScanSearch, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { AddressInfo } from '../../../game/types';
import { amlCheck } from '../../../game/engine/crypto';
import { shortAddr } from '../../../game/util';
import { cn, PasteBtn } from '../../common/kit';
import { Header, inputCls, netLabel } from './ui';

type Check = { address: string; info: AddressInfo };
// Survives navigation inside the phone for the session.
let checks: Check[] = [];

const level = (risk: number) =>
  risk < 30
    ? { color: '#39CC83', label: 'Низкий риск', icon: ShieldCheck }
    : risk < 60
      ? { color: '#F5C542', label: 'Средний риск', icon: ShieldAlert }
      : { color: '#FF4766', label: 'Высокий риск: средства могут быть заморожены', icon: ShieldAlert };

function Gauge({ risk }: { risk: number }) {
  const r = 70;
  const len = Math.PI * r;
  const lv = level(risk);
  const ang = Math.PI * (1 - risk / 100);
  const nx = 90 + Math.cos(ang) * (r - 16);
  const ny = 86 - Math.sin(ang) * (r - 16);
  return (
    <svg width={180} height={100} viewBox="0 0 180 100">
      <defs>
        <linearGradient id="aml-g" x1="0" x2="1">
          <stop offset="0" stopColor="#39CC83" />
          <stop offset="0.45" stopColor="#F5C542" />
          <stop offset="1" stopColor="#FF4766" />
        </linearGradient>
      </defs>
      <path d={`M20 86 A${r} ${r} 0 0 1 160 86`} fill="none" stroke="#263040" strokeWidth={12} strokeLinecap="round" />
      <motion.path
        d={`M20 86 A${r} ${r} 0 0 1 160 86`}
        fill="none"
        stroke="url(#aml-g)"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={len}
        initial={{ strokeDashoffset: len }}
        animate={{ strokeDashoffset: len * (1 - risk / 100) }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <line x1={90} y1={86} x2={nx} y2={ny} stroke={lv.color} strokeWidth={3} strokeLinecap="round" />
      <circle cx={90} cy={86} r={5} fill={lv.color} />
    </svg>
  );
}

function Result({ c }: { c: Check }) {
  const { info } = c;
  const lv = level(info.aml.risk);
  const Icon = lv.icon;
  const known = info.kind === 'exchange_deposit' || info.kind === 'my_wallet';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-3xl bg-[#1D2633] p-4">
      <div className="flex flex-col items-center">
        <Gauge risk={info.aml.risk} />
        <div className="num -mt-2 text-[34px] font-bold" style={{ color: lv.color }}>
          {info.aml.risk}%
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-center text-[14px] font-semibold" style={{ color: lv.color }}>
          <Icon size={16} className="shrink-0" /> {lv.label}
        </div>
      </div>
      <div className="mt-4 divide-y divide-white/5 rounded-2xl bg-[#10161F]/60">
        <div className="flex justify-between gap-3 px-3.5 py-2.5 text-[13px]">
          <span className="text-[#8994A3]">Адрес</span>
          <span className="font-mono text-white">{shortAddr(c.address)}</span>
        </div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5 text-[13px]">
          <span className="text-[#8994A3]">Сеть</span>
          <span className="text-white">{netLabel(info.network)}</span>
        </div>
        <div className="flex justify-between gap-3 px-3.5 py-2.5 text-[13px]">
          <span className="text-[#8994A3]">Владелец</span>
          <span className="text-right text-white">{known ? info.owner : 'Неизвестный кошелёк'}</span>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1.5 px-1 text-[12px] font-medium text-[#8994A3]">Источники средств</div>
        {info.aml.tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {info.aml.tags.map((t) => (
              <span key={t} className="rounded-lg px-2 py-1 text-[12px] font-medium" style={{ background: `${lv.color}22`, color: lv.color }}>
                {t}
              </span>
            ))}
          </div>
        ) : (
          <div className="px-1 text-[12.5px] text-[#8994A3]">Связей с рискованными источниками не найдено</div>
        )}
      </div>
    </motion.div>
  );
}

export function Aml({ onBack }: { onBack: () => void }) {
  const unlocked = useGame((s) => s.wallet.amlUnlocked);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<Check | null>(null);
  const [history, setHistory] = useState<Check[]>(checks);

  const run = () => {
    const a = address.trim();
    setError('');
    setBusy(true);
    setCurrent(null);
    // Short "scan" delay; the engine result is copied out of the immer draft before the producer ends.
    setTimeout(() => {
      const r = useGame.getState().act((d) => {
        const x = amlCheck(d, a);
        return x.ok ? { ok: true as const, info: { ...x.info, aml: { risk: x.info.aml.risk, tags: [...x.info.aml.tags] } } } : x;
      });
      setBusy(false);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const c = { address: a, info: r.info };
      setCurrent(c);
      checks = [c, ...checks.filter((x) => x.address !== a)].slice(0, 6);
      setHistory(checks);
    }, 900);
  };

  if (!unlocked)
    return (
      <div className="flex h-full flex-col">
        <Header title="AML-скринер" onBack={onBack} />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1D2633] text-[#8994A3]">
            <Lock size={34} />
          </div>
          <div className="mt-4 text-[17px] font-semibold text-white">Недоступно</div>
          <div className="mt-1 text-[13.5px] leading-snug text-[#8994A3]">Откроется после встречи с Маратом</div>
        </div>
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <Header title="AML-скринер" onBack={onBack} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <div className="text-[13px] leading-snug text-[#8994A3]">Проверьте адрес контрагента до сделки: связь с санкциями, мошенничеством или миксерами может привести к заморозке средств.</div>
        <div className="relative mt-3">
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value.replace(/\s/g, ''))}
            rows={2}
            spellCheck={false}
            placeholder="Адрес TRC-20 или TON"
            className={cn(inputCls, 'resize-none pr-24 font-mono text-[13.5px] leading-snug')}
          />
          <PasteBtn onPaste={(v) => setAddress(v.trim())} className="absolute right-2 top-2 bg-[#263040] text-[#45AEF5] hover:bg-[#2d394c]">
            Вставить
          </PasteBtn>
        </div>
        {error && <div className="mt-2 rounded-xl bg-[#FF4766]/10 px-3 py-2 text-[12.5px] text-[#FF8095]">{error}</div>}
        <button
          type="button"
          disabled={!address.trim() || busy}
          onClick={run}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#45AEF5] py-3 text-[15px] font-semibold text-white transition hover:bg-[#5bb8f7] disabled:bg-[#1D2633] disabled:text-[#5B6675]"
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <ScanSearch size={17} />}
          {busy ? 'Проверяем по базам…' : 'Проверить'}
        </button>

        {current && <Result key={current.address} c={current} />}

        {history.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 px-1 text-[13px] font-semibold text-white">Недавние проверки</div>
            <div className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-[#1D2633]">
              {history.map((h) => {
                const lv = level(h.info.aml.risk);
                return (
                  <button key={h.address} type="button" onClick={() => setCurrent(h)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-[#263040]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: lv.color }} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-white">{shortAddr(h.address)}</span>
                    <span className="text-[12px] text-[#8994A3]">{netLabel(h.info.network)}</span>
                    <span className="num w-10 text-right text-[13px] font-semibold" style={{ color: lv.color }}>
                      {h.info.aml.risk}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
