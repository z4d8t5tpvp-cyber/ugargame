import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowDownToLine, ArrowUpFromLine, Clock, LifeBuoy, LoaderCircle, Wallet } from 'lucide-react';
import { useGame } from '../../../game/store';
import { WITHDRAW_FEE } from '../../../game/engine/market';
import type { Network, PendingChain } from '../../../game/types';
import { addressNetwork, fmtPrice, fmtRub, fmtUsdt, round2, shortAddr, shortDT } from '../../../game/util';
import { CopyBtn, PasteBtn, cn, parseNum, useNow, useResult } from '../../common/kit';
import { AccessGate, btnGhost, btnPrimary, Callout, Card, CodeInput, inputCls, Label, Page, QrSquare, Row, Segmented } from './AssetsKit';

const NET_LABEL: Record<Network, string> = { TRC20: 'TRC-20', TON: 'TON' };
const NET_OPTIONS = [
  { id: 'TRC20' as Network, label: 'TRC-20 (Tron)' },
  { id: 'TON' as Network, label: 'TON' },
];

export default function Assets() {
  const registered = useGame((s) => s.exchanges.bybit.registered);
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  if (!registered)
    return (
      <Page>
        <AccessGate title="Нужен аккаунт Bybit" text="Зарегистрируйтесь, чтобы получить адреса пополнения и хранить USDT на бирже." />
      </Page>
    );
  return (
    <Page>
      <Balance />
      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card
          title={
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { id: 'deposit', label: <span className="inline-flex items-center gap-1.5"><ArrowDownToLine size={13} /> Пополнить</span> },
                { id: 'withdraw', label: <span className="inline-flex items-center gap-1.5"><ArrowUpFromLine size={13} /> Вывести</span> },
              ]}
            />
          }
          right={<span className="text-xs text-white/40">USDT · Tether</span>}
        >
          {tab === 'deposit' ? <Deposit /> : <Withdraw />}
        </Card>
        <div className="space-y-4">
          <InTransit />
          <Stuck />
        </div>
      </div>
    </Page>
  );
}

// ───────── balance ─────────

function Balance() {
  const usdt = useGame((s) => s.exchanges.bybit.usdt);
  const frozen = useGame((s) => s.exchanges.bybit.frozen);
  const ton = useGame((s) => s.exchanges.bybit.ton);
  const btc = useGame((s) => s.exchanges.bybit.btc);
  const inAds = useGame((s) => round2(s.exchanges.bybit.ads.filter((a) => a.side === 'sell').reduce((x, a) => x + a.remainingUsdt, 0)));
  const bookQty = useGame((s) => s.book.qty);
  const avg = useGame((s) => s.book.avg);
  const total = usdt + frozen;
  const inEscrow = Math.max(0, round2(frozen - inAds));
  return (
    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-bybit-2 to-bybit-3/60 p-4">
      <div className="flex items-center gap-2 text-xs text-white/50">
        <Wallet size={14} className="text-amber" /> Аккаунт финансирования · оценка активов
      </div>
      <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="num text-[28px] font-semibold leading-none text-white">{fmtUsdt(total, false)}</span>
        <span className="pb-0.5 text-sm text-white/50">USDT</span>
        <RubEstimate usdt={total} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 @3xl:grid-cols-4">
        <Tile label="Доступно" value={fmtUsdt(usdt)} hint="можно продать или вывести" tone="text-emerald" />
        <Tile label="Заморожено" value={fmtUsdt(frozen)} hint={frozen > 0 ? `объявления ${fmtUsdt(inAds, false)} · сделки ${fmtUsdt(inEscrow, false)}` : 'в эскроу и объявлениях'} tone={frozen > 0 ? 'text-amber' : undefined} />
        <Tile label="Средняя цена покупки" value={bookQty > 0 ? `${fmtPrice(avg)} ₽` : '—'} hint="себестоимость ваших USDT" />
        <MarketTile />
      </div>
      {(ton > 0 || btc > 0) && (
        <div className="num mt-3 flex gap-4 text-xs text-white/50">
          {ton > 0 && <span>TON: {ton.toFixed(3)}</span>}
          {btc > 0 && <span>BTC: {btc.toFixed(6)}</span>}
        </div>
      )}
    </div>
  );
}

function RubEstimate({ usdt }: { usdt: number }) {
  const base = useGame((s) => round2(s.market.base));
  return <span className="num pb-0.5 text-sm text-white/40">≈ {fmtRub(usdt * base)}</span>;
}

function MarketTile() {
  const base = useGame((s) => round2(s.market.base));
  return <Tile label="Курс USDT к рублю" value={`${fmtPrice(base)} ₽`} hint="по нему считается оценка" />;
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-bybit/60 px-3 py-2">
      <div className="text-[11px] text-white/40">{label}</div>
      <div className={cn('num mt-0.5 text-sm font-semibold text-white', tone)}>{value}</div>
      <div className="truncate text-[10px] text-white/30" title={hint}>
        {hint}
      </div>
    </div>
  );
}

// ───────── deposit ─────────

function Deposit() {
  const trc = useGame((s) => s.exchanges.bybit.depositTrc20);
  const ton = useGame((s) => s.exchanges.bybit.depositTon);
  const memo = useGame((s) => s.exchanges.bybit.tonMemo);
  const [net, setNet] = useState<Network>('TRC20');
  const address = net === 'TRC20' ? trc : ton;
  return (
    <div className="space-y-4">
      <div>
        <Label>Сеть</Label>
        <Segmented value={net} onChange={setNet} options={NET_OPTIONS} className="w-full" />
      </div>
      <div className="flex flex-col items-center gap-4 rounded-xl border border-white/[0.06] bg-bybit/50 p-4 @xl:flex-row @xl:items-start">
        <QrSquare value={address + (net === 'TON' ? memo : '')} size={132} />
        <div className="w-full min-w-0 flex-1 space-y-3">
          <div>
            <Label>Адрес пополнения USDT ({NET_LABEL[net]})</Label>
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-bybit-3/60 px-3 py-2">
              <code className="min-w-0 flex-1 select-text break-all font-mono text-[13px] leading-snug text-white">{address}</code>
              <CopyBtn value={address} kind="address" meta={{ network: net }} label={`Адрес пополнения Bybit (${NET_LABEL[net]})`} className="shrink-0" />
            </div>
          </div>
          {net === 'TON' && (
            <div>
              <Label right="обязательно">MEMO (комментарий)</Label>
              <div className="flex items-center gap-2 rounded-lg border border-rose/40 bg-rose/[0.06] px-3 py-2">
                <code className="num flex-1 select-text font-mono text-base font-semibold tracking-wider text-white">{memo}</code>
                <CopyBtn value={memo} kind="memo" meta={{ network: 'TON' }} label="MEMO Bybit" />
              </div>
            </div>
          )}
        </div>
      </div>
      {net === 'TON' && <Callout tone="danger">Обязательно укажите MEMO при отправке, иначе депозит не будет зачислен. Без MEMO биржа не поймёт, чей это перевод.</Callout>}
      <div className="rounded-lg bg-bybit-3/30 px-3 py-2">
        <Row label="Минимальный депозит">1 USDT</Row>
        <Row label="Зачисление">{net === 'TRC20' ? 'после 20 подтверждений, ≈ 3 мин' : 'после 1 подтверждения, ≈ 1 мин'}</Row>
        <Row label="Комиссия отправителя">{net === 'TRC20' ? 'платится в TRX (энергия сети)' : 'платится в TON'}</Row>
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">
        Отправляйте на этот адрес только USDT в сети {NET_LABEL[net]}. Другие монеты или другая сеть — средства будут потеряны. Скопируйте адрес, на телефоне откройте Tonkeeper → «Отправить» → вставьте адрес{net === 'TON' ? ' и MEMO' : ''}.
      </p>
    </div>
  );
}

// ───────── withdraw ─────────

function Withdraw() {
  const kyc = useGame((s) => s.exchanges.bybit.kyc);
  const twoFA = useGame((s) => s.exchanges.bybit.twoFA);
  const setView = useGame((s) => s.setBybitView);
  if (kyc !== 'verified' || !twoFA)
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="text-sm font-semibold text-white">Вывод пока недоступен</div>
        <p className="max-w-xs text-xs leading-relaxed text-white/50">
          {kyc !== 'verified' ? 'Для вывода криптовалюты нужно пройти верификацию личности (KYC).' : 'Для вывода привяжите Google Authenticator — каждый вывод подтверждается 6-значным кодом.'}
        </p>
        <button type="button" className={btnPrimary} onClick={() => setView('profile')}>
          Перейти в профиль
        </button>
      </div>
    );
  return <WithdrawForm />;
}

function WithdrawForm() {
  const usdt = useGame((s) => s.exchanges.bybit.usdt);
  const withdraw = useGame((s) => s.withdraw);
  const [net, setNet] = useState<Network>('TRC20');
  const [addr, setAddr] = useState('');
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const res = useResult();

  const a = parseNum(amount);
  const fee = WITHDRAW_FEE[net];
  const receive = Math.max(0, round2(a - fee));
  const trimmed = addr.trim();
  const detected = trimmed ? addressNetwork(trimmed) : null;
  const mismatch = detected !== null && detected !== net;

  const submit = () => {
    if (!trimmed) return res.show({ ok: false, error: 'Вставьте адрес получателя' });
    if (!(a > 0)) return res.show({ ok: false, error: 'Укажите сумму вывода' });
    if (code.length !== 6) return res.show({ ok: false, error: 'Введите 6-значный код из Google Authenticator' });
    if (res.show(withdraw({ from: 'bybit', network: net, address: trimmed, memo: net === 'TON' ? memo.trim() : '', amount: a, code }))) {
      setAmount('');
      setCode('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Сеть</Label>
        <Segmented
          value={net}
          onChange={(v) => {
            setNet(v);
            res.clear();
          }}
          options={NET_OPTIONS.map((o) => ({ ...o, label: `${o.label} · ${WITHDRAW_FEE[o.id]} USDT` }))}
          className="w-full"
        />
      </div>

      <div>
        <Label
          right={
            <PasteBtn
              className="text-amber hover:bg-white/10"
              onPaste={(v, clip) => {
                setAddr(v.trim());
                setPasteNote(clip.kind === 'memo' ? 'В буфере был MEMO, а не адрес — скопируйте адрес получателя.' : clip.kind !== 'address' ? `Вставлено: «${clip.label}». Проверьте, что это адрес кошелька.` : null);
              }}
            />
          }
        >
          Адрес получателя
        </Label>
        <input
          className={cn(inputCls, 'font-mono text-[13px]', mismatch && 'border-rose/60', detected === net && 'border-emerald/40')}
          placeholder={net === 'TRC20' ? 'T… (34 символа)' : 'UQ… или EQ… (48 символов)'}
          value={addr}
          spellCheck={false}
          onChange={(e) => {
            setAddr(e.target.value);
            setPasteNote(null);
          }}
        />
        <div className="mt-1.5 space-y-1.5">
          {detected === net && <p className="text-[11px] text-emerald">Адрес соответствует сети {NET_LABEL[net]} ✓</p>}
          {trimmed && detected === null && <p className="text-[11px] text-rose">Неверный формат адреса</p>}
          {mismatch && (
            <Callout
              tone="danger"
              action={
                <button type="button" className="rounded-md bg-rose px-2 py-1 text-[11px] font-semibold text-white" onClick={() => setNet(detected)}>
                  Выбрать {NET_LABEL[detected]}
                </button>
              }
            >
              Это адрес сети {NET_LABEL[detected]}, а выбрана {NET_LABEL[net]}. Перевод в чужую сеть не дойдёт.
            </Callout>
          )}
          {pasteNote && <p className="text-[11px] text-amber">{pasteNote}</p>}
        </div>
      </div>

      {net === 'TON' && (
        <div>
          <Label right={<PasteBtn className="text-amber hover:bg-white/10" onPaste={(v) => setMemo(v.trim())} />}>MEMO / комментарий</Label>
          <input className={cn(inputCls, 'num font-mono')} placeholder="Если получатель — биржа, MEMO обязателен" value={memo} onChange={(e) => setMemo(e.target.value)} />
          {!memo.trim() && <p className="mt-1 text-[11px] text-amber">Если отправляете на биржу (Rapira и т. п.), без MEMO депозит зависнет.</p>}
        </div>
      )}

      <div>
        <Label right={<span className="num">Доступно: {fmtUsdt(usdt)}</span>}>Сумма</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input className={cn(inputCls, 'num pr-14')} inputMode="decimal" placeholder={`Минимум ${(fee + 0.01).toFixed(2)}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">USDT</span>
          </div>
          <button type="button" className={btnGhost} onClick={() => setAmount((Math.floor(usdt * 100) / 100).toFixed(2))}>
            Макс
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-bybit-3/30 px-3 py-2">
        <Row label="Комиссия сети">{fmtUsdt(fee)}</Row>
        <Row label="Время зачисления">{net === 'TRC20' ? '≈ 3–5 мин' : '≈ 1–2 мин'}</Row>
        <Row label="Получите" className="border-t border-white/[0.06] pt-1.5">
          <span className={cn('text-sm font-semibold', a > fee ? 'text-white' : 'text-white/40')}>{fmtUsdt(receive)}</span>
        </Row>
      </div>

      <div>
        <Label right="меняется каждые 30 с">Код Google Authenticator</Label>
        <CodeInput value={code} onChange={setCode} onEnter={submit} />
      </div>

      {res.node}
      <button type="button" className={cn(btnPrimary, 'w-full py-2.5')} onClick={submit}>
        Вывести
      </button>
      <p className="text-[11px] leading-relaxed text-white/35">Транзакции в блокчейне необратимы. Сверьте первые и последние символы адреса перед отправкой.</p>
    </div>
  );
}

// ───────── in transit / stuck ─────────

function InTransit() {
  const items = useGame(
    useShallow((s) => {
      const ex = s.exchanges.bybit;
      return s.chain.filter((c) => c.source === 'bybit' || c.to === ex.depositTrc20 || c.to === ex.depositTon);
    }),
  );
  return (
    <Card title="В пути" icon={<Clock size={16} />} right={items.length > 0 && <span className="num rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-semibold text-amber">{items.length}</span>}>
      {items.length === 0 ? (
        <p className="py-2 text-center text-xs text-white/35">Нет транзакций в пути</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <TransitRow key={c.id} c={c} />
          ))}
        </div>
      )}
    </Card>
  );
}

function TransitRow({ c }: { c: PendingChain }) {
  const now = useNow();
  const out = c.source === 'bybit';
  const left = c.arriveAt - now;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bybit-3/40 px-3 py-2">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', out ? 'bg-rose/15 text-rose' : 'bg-emerald/15 text-emerald')}>
        {out ? <ArrowUpFromLine size={15} /> : <ArrowDownToLine size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="num text-sm font-semibold text-white">
            {out ? '−' : '+'}
            {fmtUsdt(c.amount)}
          </span>
          <span className="rounded bg-white/[0.07] px-1.5 py-px text-[10px] text-white/60">{NET_LABEL[c.network]}</span>
        </div>
        <div className="num truncate text-[11px] text-white/40">{out ? `Вывод → ${shortAddr(c.to)}${c.memo ? ` · MEMO ${c.memo}` : ''}` : `Пополнение от ${c.fromLabel}`}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-[11px] text-white/50">
        <LoaderCircle size={12} className="animate-spin text-amber" />
        <span className="num">{left < 1 ? '< 1 мин' : `≈ ${Math.ceil(left)} мин`}</span>
      </div>
    </div>
  );
}

function Stuck() {
  const list = useGame((s) => s.exchanges.bybit.stuckDeposits);
  const resolveStuck = useGame((s) => s.resolveStuck);
  if (!list.length) return null;
  return (
    <Card title="Зависшие депозиты" icon={<LifeBuoy size={16} />}>
      <p className="mb-3 text-xs leading-relaxed text-white/50">Перевод пришёл на общий адрес биржи без MEMO, поэтому не зачислен автоматически. Поддержка зачислит его вручную за 5 USDT.</p>
      <div className="space-y-2">
        {list.map((d) => (
          <div key={d.id} className="rounded-lg border border-rose/20 bg-rose/[0.05] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="num text-sm font-semibold text-white">{fmtUsdt(d.amount)}</span>
              <span className="rounded bg-white/[0.07] px-1.5 py-px text-[10px] text-white/60">{NET_LABEL[d.network]}</span>
              <span className="num ml-auto text-[11px] text-white/35">{shortDT(d.at)}</span>
            </div>
            {d.resolveAt ? (
              <StuckEta resolveAt={d.resolveAt} />
            ) : (
              <button type="button" className={cn(btnGhost, 'mt-2 w-full border-amber/30 text-amber')} onClick={() => resolveStuck('bybit', d.id)}>
                <LifeBuoy size={13} /> Обратиться в поддержку
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function StuckEta({ resolveAt }: { resolveAt: number }) {
  const now = useNow();
  const left = Math.max(0, resolveAt - now);
  const h = Math.floor(left / 60);
  const m = Math.ceil(left % 60);
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber">
      <LoaderCircle size={12} className="animate-spin" />
      Заявка на рассмотрении · зачисление через ≈ <span className="num">{h > 0 ? `${h} ч ${m} мин` : `${m} мин`}</span>, комиссия 5 USDT
    </div>
  );
}
