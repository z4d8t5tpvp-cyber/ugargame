import { useEffect, useState, type ReactNode } from 'react';
import { BadgeCheck, Bell, Briefcase, Building, ChevronRight, CircleCheck, Clock, FileText, Gavel, Info, LoaderCircle, Scale, Search, ShieldCheck, Signature, Sparkles, TriangleAlert, UserRound } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGame } from '../../game/store';
import type { BankId, TaxRegime } from '../../game/types';
import { profitSince, taxRate } from '../../game/engine/core';
import { BANKS, CHARACTERS } from '../../game/data/static';
import { dateLong, fmtRub, maskCard } from '../../game/util';
import { cn } from '../common/kit';
import { useLightResult } from './parts/lightResult';

const BLUE = '#0D4CD3';
const BANK_IDS: BankId[] = ['sber', 'tbank', 'alfa'];

const REGIME_LABEL: Record<TaxRegime, string> = {
  none: 'Не выбран',
  npd: 'Налог на профессиональный доход (самозанятый)',
  ndfl: 'Физическое лицо · декларация 3-НДФЛ, 13%',
  ip_usn: 'ИП · УСН «Доходы минус расходы», 15%',
};

export default function TaxTab() {
  const chapter = useGame((s) => s.chapter);
  return (
    <div className="@container flex h-full min-h-0 flex-col bg-[#F5F7FA] text-[#0B1F33]">
      <GosHeader />
      <div className="scroll-thin scroll-light min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1000px] px-4 py-4">
          <div className="mb-1 flex items-center gap-1 text-xs text-[#66727F]">
            <span>Главная</span>
            <ChevronRight size={12} />
            <span>Налоги</span>
            <ChevronRight size={12} />
            <span className="text-[#0B1F33]">Мой бизнес и налоги</span>
          </div>
          <div className="mb-4 flex items-center gap-3">
            <h1 className="text-[22px] font-bold">Мой бизнес и налоги</h1>
            <span className="rounded-md bg-[#E1ECFF] px-2 py-0.5 text-[11px] font-semibold" style={{ color: BLUE }}>
              ФНС России
            </span>
          </div>
          {chapter < 3 ? (
            <Card>
              <div className="flex items-start gap-3">
                <Info size={20} style={{ color: BLUE }} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Раздел станет актуален, когда появятся доходы от сделок</div>
                  <p className="mt-1 text-sm text-[#66727F]">Здесь можно будет выбрать налоговый режим, рассчитать налог и подать декларацию.</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_290px]">
              <div className="min-w-0 space-y-4">
                <Penalty />
                <Block161 />
                <CurrentRegime />
                <Liability />
                <RegimeOptions />
                <Declaration />
              </div>
              <div className="space-y-4">
                <Profile />
                <Accountant />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────── chrome ─────────

function GosHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-5 border-b border-[#E1E5EB] bg-white px-5">
      <div className="flex items-center gap-1.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: BLUE }}>
          <span className="block h-3.5 w-3.5 rounded-sm border-2 border-white" />
        </span>
        <span className="text-[19px] font-bold tracking-tight">
          <span style={{ color: BLUE }}>гос</span>
          <span className="text-[#EE3F58]">услуги</span>
        </span>
      </div>
      <nav className="hidden gap-5 text-sm text-[#0B1F33] @3xl:flex">
        {['Заявления', 'Документы', 'Платежи', 'Помощь'].map((n) => (
          <span key={n} className="cursor-default hover:text-[#0D4CD3]">
            {n}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-4 text-[#66727F]">
        <Search size={18} />
        <Bell size={18} />
        <span className="flex items-center gap-2 text-sm text-[#0B1F33]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E1ECFF]" style={{ color: BLUE }}>
            <UserRound size={16} />
          </span>
          <span className="hidden @2xl:inline">Воронов А. С.</span>
        </span>
      </div>
    </header>
  );
}

function Card({ title, icon, children, className, right }: { title?: ReactNode; icon?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-[#E1E5EB] bg-white p-5 shadow-[0_1px_4px_rgba(11,31,51,0.06)]', className)}>
      {title && (
        <div className="mb-3 flex items-center gap-2">
          {icon && <span style={{ color: BLUE }}>{icon}</span>}
          <h2 className="text-[16px] font-bold">{title}</h2>
          {right && <div className="ml-auto">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const btnBlue = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const btnOutline = 'inline-flex items-center justify-center gap-1.5 rounded-lg border px-5 py-2.5 text-sm font-semibold transition hover:bg-[#F0F5FF] disabled:cursor-not-allowed disabled:opacity-40';

// ───────── profile & accountant ─────────

function Profile() {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E1ECFF]" style={{ color: BLUE }}>
          <UserRound size={22} />
        </span>
        <div className="min-w-0">
          <div className="font-semibold leading-tight">Воронов Артём Сергеевич</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-[#0B8A47]">
            <BadgeCheck size={13} /> Подтверждённая учётная запись
          </div>
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <Row k="ИНН" v="324105827716" />
        <Row k="СНИЛС" v="1••-•••-••• 47" />
        <Row k="Дата рождения" v="17.03.2006" />
        <Row k="Инспекция" v="УФНС по Брянской обл." />
      </dl>
    </Card>
  );
}

function Row({ k, v, bold, cls }: { k: string; v: ReactNode; bold?: boolean; cls?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[#66727F]">{k}</dt>
      <dd className={cn('num text-right', bold && 'font-bold', cls)}>{v}</dd>
    </div>
  );
}

function Accountant() {
  const hired = useGame((s) => s.tax.grishaHired);
  const g = CHARACTERS.grisha;
  return (
    <Card title="Бухгалтер" icon={<Briefcase size={18} />}>
      {hired ? (
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-lg" style={{ background: `${g.color}22` }}>
              {g.emoji}
            </span>
            <div>
              <div className="text-sm font-semibold">{g.name}</div>
              <div className="text-xs text-[#66727F]">{g.username} · доверенность выдана</div>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-[#40464B]">
            <li className="flex gap-1.5"><CircleCheck size={13} className="mt-px shrink-0 text-[#0B8A47]" /> Ведёт книгу доходов и расходов</li>
            <li className="flex gap-1.5"><CircleCheck size={13} className="mt-px shrink-0 text-[#0B8A47]" /> Готовит ответы банкам по 115-ФЗ</li>
            <li className="flex gap-1.5"><CircleCheck size={13} className="mt-px shrink-0 text-[#0B8A47]" /> Подаёт декларации в срок</li>
          </ul>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-[#66727F]">Бухгалтер не подключён. Справку об источниках дохода для банка и декларацию придётся готовить самостоятельно.</p>
      )}
    </Card>
  );
}

// ───────── status cards ─────────

function Penalty() {
  const penalty = useGame((s) => s.tax.penalty);
  const trap = useGame((s) => !!s.flags.npdTrap);
  if (!(penalty > 0)) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#F5B5BF] bg-[#FFF0F2] p-4">
      <TriangleAlert size={20} className="mt-0.5 shrink-0 text-[#E3203A]" />
      <div>
        <div className="font-semibold text-[#B0162B]">Требование об уплате налога, штрафа и пени</div>
        <p className="mt-1 text-sm text-[#40464B]">
          {trap ? 'НПД не применяется к доходам от операций с цифровой валютой. Доход пересчитан по ставке НДФЛ 13%, начислен штраф 20% и пени. ' : ''}
          Сумма к уплате: <b className="num">{fmtRub(penalty)}</b>. Будет включена в платёж при подаче декларации.
        </p>
      </div>
    </div>
  );
}

function CurrentRegime() {
  const t = useGame(useShallow((s) => ({ regime: s.tax.regime, pending: s.tax.ipPendingUntil, ipAt: s.tax.ipRegisteredAt, declared: s.tax.declared })));
  const tone = t.regime === 'none' ? 'warn' : 'ok';
  return (
    <Card title="Текущий налоговый режим" icon={<Building size={18} />}>
      <div className={cn('flex items-start gap-3 rounded-xl p-4', tone === 'warn' ? 'bg-[#FFF6E5]' : 'bg-[#EBF5EF]')}>
        {tone === 'warn' ? <TriangleAlert size={20} className="mt-0.5 shrink-0 text-[#E08A00]" /> : <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#0B8A47]" />}
        <div className="min-w-0">
          <div className="font-semibold">{REGIME_LABEL[t.regime]}</div>
          {t.regime === 'none' && <p className="mt-1 text-sm text-[#40464B]">Доход от продажи криптовалюты облагается налогом. Если его не задекларировать — штраф 20–40% от неуплаченной суммы и пени (ст. 119, 122 НК РФ).</p>}
          {t.regime === 'ip_usn' && t.ipAt !== null && <p className="mt-1 text-sm text-[#40464B]">ИП зарегистрирован {dateLong(t.ipAt)}. Налог считается с разницы между доходами и расходами — подходит для P2P с маленькой маржой.</p>}
          {t.regime === 'ndfl' && <p className="mt-1 text-sm text-[#40464B]">Декларация 3-НДФЛ подаётся по итогам года. Банкам сложнее объяснить регулярный оборот без статуса ИП.</p>}
          {t.regime === 'npd' && <p className="mt-1 text-sm text-[#40464B]">Чеки формируются в приложении «Мой налог».</p>}
          {t.declared && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[#0B8A47]">
              <CircleCheck size={13} /> Декларация подана
            </div>
          )}
        </div>
      </div>
      {t.pending !== null && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#C9D8F5] bg-[#F0F5FF] p-3 text-sm">
          <Clock size={18} style={{ color: BLUE }} className="shrink-0" />
          <span>
            Заявление на регистрацию ИП: готово <b>{dateLong(t.pending)}</b>
          </span>
        </div>
      )}
    </Card>
  );
}

function Liability() {
  const profit = useGame((s) => profitSince(s, 0));
  const rate = useGame((s) => taxRate(s));
  const t = useGame(useShallow((s) => ({ paid: s.tax.paidTotal, penalty: s.tax.penalty, regime: s.tax.regime })));
  const base = Math.max(0, profit);
  const tax = base * rate;
  const due = Math.max(0, tax - t.paid) + t.penalty;
  const pct = Math.round(rate * 100);
  return (
    <Card title="Расчёт налога за 2026 год" icon={<Scale size={18} />} right={<span className="text-xs text-[#66727F]">предварительно</span>}>
      <dl className="space-y-2 text-sm">
        <Row k="Доходы минус расходы по сделкам с USDT" v={fmtRub(profit)} cls={profit < 0 ? 'text-[#E3203A]' : undefined} />
        <Row k="Ставка" v={`${pct}%${t.regime === 'none' ? ' (НДФЛ по умолчанию)' : ''}`} />
        <Row k="Налог за год" v={fmtRub(tax)} />
        <Row k="Уже уплачено" v={`− ${fmtRub(t.paid)}`} />
        {t.penalty > 0 && <Row k="Штрафы и пени" v={`+ ${fmtRub(t.penalty)}`} cls="text-[#E3203A]" />}
      </dl>
      <div className="mt-3 flex items-baseline justify-between border-t border-[#E1E5EB] pt-3">
        <span className="font-semibold">К уплате</span>
        <span className={cn('num text-xl font-bold', due > 0 ? 'text-[#0B1F33]' : 'text-[#0B8A47]')}>{fmtRub(due)}</span>
      </div>
    </Card>
  );
}

// ───────── regime selection ─────────

function RegimeOptions() {
  const t = useGame(useShallow((s) => ({ regime: s.tax.regime, pending: s.tax.ipPendingUntil, ipAt: s.tax.ipRegisteredAt, trap: !!s.flags.npdTrap })));
  const registerTax = useGame((s) => s.registerTax);
  const [wizard, setWizard] = useState(false);
  const res = useLightResult();
  const ipFiled = t.pending !== null || t.ipAt !== null;

  return (
    <Card title="Выбрать налоговый режим" icon={<FileText size={18} />}>
      <div className="grid gap-3 @2xl:grid-cols-3">
        {/* NPD — the attractive (and wrong) choice */}
        <div className={cn('relative flex flex-col rounded-xl border-2 p-4', t.trap ? 'border-[#E1E5EB] opacity-70' : 'border-[#0B8A47] bg-gradient-to-br from-[#EBF9F0] to-white')}>
          {!t.trap && (
            <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-[#0B8A47] px-2 py-0.5 text-[10px] font-bold text-white">
              <Sparkles size={11} /> Популярно у P2P-трейдеров
            </span>
          )}
          <div className="mt-1 text-[15px] font-bold">Самозанятость (НПД)</div>
          <div className="num mt-1 text-2xl font-bold text-[#0B8A47]">4–6%</div>
          <ul className="mt-2 flex-1 space-y-1 text-xs text-[#40464B]">
            <li>✓ Регистрация за 5 минут в «Мой налог»</li>
            <li>✓ Без деклараций и отчётов</li>
            <li>✓ Ставка в 2–3 раза ниже НДФЛ</li>
          </ul>
          <p className="mt-2 text-[9px] leading-tight text-[#9AA3AD]">Ограничения применения — ст. 4 и 6 Федерального закона № 422-ФЗ</p>
          {t.trap ? (
            <div className="mt-2 text-xs font-semibold text-[#E3203A]">ФНС отказала в применении НПД</div>
          ) : t.regime === 'npd' ? (
            <div className="mt-2 text-xs font-semibold text-[#0B8A47]">Текущий режим</div>
          ) : (
            <button type="button" className={cn(btnBlue, 'mt-3 bg-[#0B8A47]')} disabled={ipFiled} onClick={() => res.show(registerTax('npd'))}>
              Стать самозанятым
            </button>
          )}
        </div>

        <div className="flex flex-col rounded-xl border-2 border-[#E1E5EB] p-4">
          <div className="text-[15px] font-bold">3-НДФЛ как физлицо</div>
          <div className="num mt-1 text-2xl font-bold">13%</div>
          <ul className="mt-2 flex-1 space-y-1 text-xs text-[#40464B]">
            <li>• Налог с разницы между продажей и покупкой</li>
            <li>• Декларация раз в год</li>
            <li>• Банкам нечем подтвердить регулярный доход</li>
          </ul>
          {t.regime === 'ndfl' ? (
            <div className="mt-3 text-xs font-semibold text-[#0B8A47]">Текущий режим</div>
          ) : (
            <button type="button" className={cn(btnOutline, 'mt-3')} style={{ color: BLUE, borderColor: BLUE }} disabled={t.regime === 'ip_usn'} onClick={() => res.show(registerTax('ndfl'))}>
              Выбрать
            </button>
          )}
        </div>

        <div className="flex flex-col rounded-xl border-2 p-4" style={{ borderColor: t.regime === 'ip_usn' ? '#0B8A47' : '#C9D8F5' }}>
          <div className="text-[15px] font-bold">ИП на УСН «Доходы минус расходы»</div>
          <div className="num mt-1 text-2xl font-bold" style={{ color: BLUE }}>
            15%
          </div>
          <ul className="mt-2 flex-1 space-y-1 text-xs text-[#40464B]">
            <li>• Налог только с маржи, а не с оборота</li>
            <li>• Статус ИП понятен банкам и комплаенсу</li>
            <li>• Регистрация 1–3 рабочих дня</li>
          </ul>
          {t.regime === 'ip_usn' ? (
            <div className="mt-3 text-xs font-semibold text-[#0B8A47]">Текущий режим</div>
          ) : t.pending !== null ? (
            <div className="mt-3 text-xs font-semibold" style={{ color: BLUE }}>
              Заявление на рассмотрении
            </div>
          ) : (
            <button type="button" className={cn(btnBlue, 'mt-3')} style={{ background: BLUE }} onClick={() => setWizard(true)}>
              Зарегистрировать ИП
            </button>
          )}
        </div>
      </div>
      {res.node && <div className="mt-3">{res.node}</div>}
      {wizard && <IpWizard onClose={() => setWizard(false)} />}
    </Card>
  );
}

const OKVED = [
  { code: '66.12', title: 'Деятельность брокерская по сделкам с ценными бумагами и товарами' },
  { code: '62.09', title: 'Деятельность, связанная с использованием вычислительной техники и информационных технологий, прочая' },
];

function IpWizard({ onClose }: { onClose: () => void }) {
  const registerTax = useGame((s) => s.registerTax);
  const [step, setStep] = useState(0);
  const [okved, setOkved] = useState<string[]>(['66.12']);
  const [usn, setUsn] = useState<'inc' | 'inc_exp' | 'osno' | null>(null);
  const [signing, setSigning] = useState(false);
  const res = useLightResult();

  useEffect(() => {
    if (!signing) return;
    const t = setTimeout(() => {
      setSigning(false);
      if (res.show(registerTax('ip_usn'))) setTimeout(onClose, 2500);
    }, 1600);
    return () => clearTimeout(t);
  }, [signing]);

  const steps = ['Сведения и ОКВЭД', 'Налоговый режим', 'Подпись'];
  return (
    <div className="mt-4 rounded-xl border border-[#C9D8F5] bg-[#F8FAFF] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold">Заявление о регистрации ИП (форма Р21001)</div>
        <button type="button" className="text-xs text-[#66727F] hover:text-[#0B1F33]" onClick={onClose}>
          Отменить
        </button>
      </div>
      <ol className="mb-4 flex gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn('num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', i < step ? 'bg-[#0B8A47] text-white' : i === step ? 'text-white' : 'bg-[#E1E5EB] text-[#66727F]')} style={i === step ? { background: BLUE } : undefined}>
              {i < step ? '✓' : i + 1}
            </span>
            <span className={cn('truncate text-xs', i === step ? 'font-semibold' : 'text-[#66727F]')}>{s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-3 text-sm">
          <div className="grid gap-2 @2xl:grid-cols-2">
            <Ro label="ФИО" v="Воронов Артём Сергеевич" />
            <Ro label="ИНН" v="324105827716" />
            <Ro label="Адрес регистрации" v="Брянская обл., г. Новозаровск, ул. Мира, д. 14, кв. 37" wide />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-[#40464B]">Виды деятельности (ОКВЭД 2)</div>
            {OKVED.map((o, i) => (
              <label key={o.code} className="mb-1.5 flex cursor-pointer items-start gap-2 rounded-lg border border-[#E1E5EB] bg-white p-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[#0D4CD3]"
                  checked={okved.includes(o.code)}
                  onChange={(e) => setOkved((s) => (e.target.checked ? [...s, o.code] : s.filter((c) => c !== o.code)))}
                />
                <span>
                  <b className="num">{o.code}</b> {o.title}
                  {i === 0 && <span className="ml-1 text-xs text-[#66727F]">(основной)</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" className={btnBlue} style={{ background: BLUE }} disabled={!okved.length} onClick={() => setStep(1)}>
              Далее
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2 text-sm">
          {(
            [
              ['inc', 'УСН «Доходы» — 6%', 'Налог с каждого поступления на карту'],
              ['inc_exp', 'УСН «Доходы минус расходы» — 15%', 'Налог с разницы: продажа минус покупка USDT и комиссии'],
              ['osno', 'Общая система (ОСНО)', 'НДФЛ 13% + НДС, полный бухучёт'],
            ] as const
          ).map(([id, title, desc]) => (
            <label key={id} className={cn('flex cursor-pointer items-start gap-2 rounded-lg border bg-white p-3', usn === id ? 'border-[#0D4CD3] ring-1 ring-[#0D4CD3]' : 'border-[#E1E5EB]')}>
              <input type="radio" name="usn" className="mt-1 accent-[#0D4CD3]" checked={usn === id} onChange={() => setUsn(id)} />
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="block text-xs text-[#66727F]">{desc}</span>
              </span>
            </label>
          ))}
          {usn === 'inc' && (
            <div className="rounded-lg bg-[#FFF6E5] p-3 text-xs text-[#40464B]">
              📊 <b>Карим:</b> «6% с оборота при марже 0,5% — это минус 5,5% на каждой сделке. Для P2P только “доходы минус расходы”».
            </div>
          )}
          {usn === 'osno' && <div className="rounded-lg bg-[#FFF6E5] p-3 text-xs text-[#40464B]">Для перепродажи USDT общая система избыточна: НДС, книга покупок и продаж, обязательный бухгалтер.</div>}
          <div className="flex justify-between pt-1">
            <button type="button" className={btnOutline} style={{ color: BLUE, borderColor: BLUE }} onClick={() => setStep(0)}>
              Назад
            </button>
            <button type="button" className={btnBlue} style={{ background: BLUE }} disabled={usn !== 'inc_exp'} onClick={() => setStep(2)}>
              Далее
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3 text-sm">
          <dl className="space-y-1.5 rounded-lg border border-[#E1E5EB] bg-white p-3">
            <Row k="Форма" v="Р21001 + уведомление 26.2-1" />
            <Row k="ОКВЭД" v={okved.join(', ')} />
            <Row k="Режим" v="УСН «Доходы минус расходы», 15%" />
            <Row k="Госпошлина" v="0 ₽ (подача онлайн)" />
            <Row k="Способ подписи" v="Госключ (УНЭП)" />
          </dl>
          {signing ? (
            <div className="flex items-center gap-2 rounded-lg bg-[#F0F5FF] p-3 text-xs" style={{ color: BLUE }}>
              <LoaderCircle size={16} className="animate-spin" /> Формируем электронную подпись через Госключ…
            </div>
          ) : (
            <div className="flex justify-between">
              <button type="button" className={btnOutline} style={{ color: BLUE, borderColor: BLUE }} onClick={() => setStep(1)}>
                Назад
              </button>
              <button type="button" className={btnBlue} style={{ background: BLUE }} onClick={() => setSigning(true)}>
                <Signature size={16} /> Подписать через Госключ и отправить
              </button>
            </div>
          )}
          {res.node}
        </div>
      )}
    </div>
  );
}

function Ro({ label, v, wide }: { label: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? '@2xl:col-span-2' : undefined}>
      <div className="text-[11px] text-[#66727F]">{label}</div>
      <div className="rounded-lg border border-[#E1E5EB] bg-[#F5F7FA] px-3 py-2 text-sm">{v}</div>
    </div>
  );
}

// ───────── declaration ─────────

function Declaration() {
  const t = useGame(useShallow((s) => ({ regime: s.tax.regime, declared: s.tax.declared })));
  const banks = useGame((s) => s.banks);
  const declareTax = useGame((s) => s.declareTax);
  const opened = BANK_IDS.filter((id) => banks[id].opened);
  const [bank, setBank] = useState<BankId | null>(null);
  const res = useLightResult();
  const target = bank && opened.includes(bank) ? bank : opened[0] ?? null;
  const legal = t.regime === 'ndfl' || t.regime === 'ip_usn';

  return (
    <Card title={t.regime === 'ip_usn' ? 'Декларация по УСН и уплата налога' : 'Декларация 3-НДФЛ и уплата налога'} icon={<FileText size={18} />} right={t.declared ? <span className="rounded-full bg-[#EBF5EF] px-2.5 py-0.5 text-xs font-semibold text-[#0B8A47]">Подана</span> : undefined}>
      {!legal ? (
        <p className="text-sm text-[#66727F]">Сначала выберите законный режим: ИП на УСН или 3-НДФЛ как физлицо. Самозанятость не подходит для доходов от криптовалюты.</p>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-[#40464B]">Списать налог с карты</div>
          <div className="grid gap-2 @2xl:grid-cols-3">
            {opened.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setBank(id)}
                className={cn('flex items-center gap-2 rounded-xl border-2 bg-white p-2.5 text-left transition', target === id ? 'border-[#0D4CD3]' : 'border-[#E1E5EB] hover:border-[#C9D8F5]')}
              >
                <span className="h-7 w-7 shrink-0 rounded-lg" style={{ background: BANKS[id].color }} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">
                    {BANKS[id].name} <span className="num font-normal text-[#66727F]">{maskCard(banks[id].card)}</span>
                  </span>
                  <span className="num block text-xs text-[#66727F]">{fmtRub(banks[id].balance)}</span>
                </span>
              </button>
            ))}
          </div>
          <button type="button" className={cn(btnBlue, 'w-full')} style={{ background: BLUE }} disabled={!target} onClick={() => target && res.show(declareTax(target))}>
            <Gavel size={16} /> Подать декларацию и уплатить налог
          </button>
          <p className="text-[11px] text-[#66727F]">Платёж поступит в УФК (ФНС России). Квитанция об уплате укрепит доверие банков при проверках по 115-ФЗ.</p>
          {res.node}
        </div>
      )}
    </Card>
  );
}

// ───────── 161-ФЗ ─────────

function Block161() {
  const b = useGame((s) => s.block161);
  const now = useGame((s) => Math.floor(s.now));
  const grisha = useGame((s) => s.tax.grishaHired);
  const appeal161 = useGame((s) => s.appeal161);
  const wait161 = useGame((s) => s.wait161);
  const res = useLightResult();
  if (!b) return null;
  const progress = b.resolveAt ? Math.min(1, Math.max(0, (now - b.since) / (b.resolveAt - b.since))) : 0;
  return (
    <Card className="border-[#F5B5BF]" title="Заявление в ЦБ РФ по 161-ФЗ" icon={<TriangleAlert size={18} className="text-[#E3203A]" />}>
      <p className="text-sm text-[#40464B]">
        С {dateLong(b.since)} ваши карты внесены в базу данных Банка России о случаях переводов без согласия клиента. Причина: <i>{b.reason}</i>
      </p>
      {!b.appealFiled ? (
        <div className="mt-3 space-y-3">
          <ul className="space-y-1 text-xs text-[#40464B]">
            <li>• Заявление рассматривается Банком России до 15 рабочих дней</li>
            <li>• Приложите чеки и выгрузку ордеров с биржи — они подтверждают законность переводов</li>
            <li>• {grisha ? 'Пакет документов подготовит ваш бухгалтер' : 'Подготовка пакета юристом — 15 000 ₽'}</li>
          </ul>
          <button
            type="button"
            className={btnBlue}
            style={{ background: BLUE }}
            onClick={() => {
              appeal161();
              res.show({ ok: true }, 'Заявление направлено в Банк России');
            }}
          >
            Подать заявление об исключении из базы
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold" style={{ color: BLUE }}>
              Заявление на рассмотрении
            </span>
            {b.resolveAt && <span className="text-xs text-[#66727F]">решение до {dateLong(b.resolveAt)}</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#E1E5EB]">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: BLUE }} />
          </div>
          <button type="button" className={btnOutline} style={{ color: BLUE, borderColor: BLUE }} onClick={() => res.show(wait161(), 'Решение получено')}>
            <Clock size={15} /> Ждать решения
          </button>
        </div>
      )}
      {res.node && <div className="mt-2">{res.node}</div>}
    </Card>
  );
}
