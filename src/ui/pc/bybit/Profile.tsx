import { useEffect, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BadgeCheck, CreditCard, Eye, EyeOff, FileDown, FolderOpen, KeyRound, Mail, ShieldCheck, Smartphone, Trophy } from 'lucide-react';
import { useGame } from '../../../game/store';
import { BANK_NAMES, fmtPrice, maskCard } from '../../../game/util';
import type { BankId } from '../../../game/types';
import { Avatar, CopyBtn, cn, useResult } from '../../common/kit';
import { btnGhost, btnPrimary, Callout, Card, CodeInput, groupBy4, inputCls, Label, Page, PLAYER_BANKS, Row } from './AssetsKit';
import { HERO_NAME, HERO_PHONE, KycForm, KycPending } from './ProfileKyc';

const EMAIL = 'tema.voronov@mail.ru';

export default function Profile() {
  const registered = useGame((s) => s.exchanges.bybit.registered);
  return <Page>{registered ? <Account /> : <SignUp />}</Page>;
}

// ───────── registration ─────────

function SignUp() {
  const requestRegCode = useGame((s) => s.requestRegCode);
  const confirmReg = useGame((s) => s.confirmReg);
  const codeSent = useGame((s) => !!s.flags.regcode_bybit);
  const [email, setEmail] = useState(EMAIL);
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [agree, setAgree] = useState(false);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const res = useResult();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const strength = Math.min(4, (pass.length >= 8 ? 1 : 0) + (/\d/.test(pass) ? 1 : 0) + (/[A-ZА-Я]/.test(pass) ? 1 : 0) + (/[^A-Za-zА-Яа-я0-9]/.test(pass) ? 1 : 0));
  const formOk = email.includes('@') && pass.length > 0 && agree;

  const sendCode = () => {
    if (!formOk) {
      res.show({ ok: false, error: !email.includes('@') ? 'Введите корректный адрес эл. почты' : !pass ? 'Придумайте пароль' : 'Примите условия использования' });
      return;
    }
    requestRegCode('bybit');
    setCooldown(60);
    res.clear();
  };
  const submit = () => {
    if (code.length !== 6) return res.show({ ok: false, error: 'Введите 6-значный код из SMS' });
    res.show(confirmReg('bybit', code), 'Аккаунт создан. Добро пожаловать на Bybit!');
  };

  return (
    <div className="flex min-h-full items-start justify-center py-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-white/[0.06] bg-bybit-2 p-6 shadow-2xl shadow-black/40">
        <div className="mb-1 text-[22px] font-black tracking-[0.12em] text-white">
          BYB<span className="text-amber">I</span>T
        </div>
        <h2 className="text-lg font-semibold text-white">Регистрация</h2>
        <p className="mb-5 text-xs text-white/45">Создайте аккаунт, чтобы торговать на P2P-рынке</p>

        <div className="space-y-3">
          <div>
            <Label>Эл. почта</Label>
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} disabled={codeSent} />
          </div>
          <div>
            <Label right="для SMS-кода">Номер телефона</Label>
            <input className={cn(inputCls, 'num')} value={HERO_PHONE} readOnly />
          </div>
          <div>
            <Label>Пароль</Label>
            <div className="relative">
              <input
                className={cn(inputCls, 'pr-9')}
                type={showPass ? 'text' : 'password'}
                value={pass}
                placeholder="Не менее 8 символов"
                onChange={(e) => setPass(e.target.value)}
                disabled={codeSent}
              />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80" onClick={() => setShowPass((v) => !v)} title={showPass ? 'Скрыть' : 'Показать'}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {pass && (
              <div className="mt-1.5 flex items-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cn('h-1 flex-1 rounded-full', i < Math.max(1, strength) ? (strength >= 3 ? 'bg-emerald' : strength === 2 ? 'bg-amber' : 'bg-rose') : 'bg-white/10')} />
                ))}
                <span className="ml-1 text-[10px] text-white/40">{strength >= 3 ? 'надёжный' : strength === 2 ? 'средний' : 'слабый'}</span>
              </div>
            )}
          </div>
          <input className={inputCls} placeholder="Реферальный код (необязательно)" disabled={codeSent} />
          <label className="flex cursor-pointer items-start gap-2 text-xs text-white/60">
            <input type="checkbox" className="mt-0.5 accent-[#F0B90B]" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={codeSent} />
            <span>
              Согласен с <span className="text-amber">условиями использования</span> и <span className="text-amber">политикой конфиденциальности</span>
            </span>
          </label>

          {!codeSent ? (
            <button type="button" className={cn(btnPrimary, 'w-full py-2.5')} onClick={sendCode}>
              Получить код
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-amber/20 bg-amber/[0.04] p-3">
              <div className="flex items-start gap-2 text-xs leading-relaxed text-white/70">
                <Smartphone size={15} className="mt-0.5 shrink-0 text-amber" />
                <span>
                  Код отправлен в SMS на <span className="num whitespace-nowrap">+7 (953) •••-••-18</span> — посмотрите на телефоне (приложение «SMS / Authenticator»)
                </span>
              </div>
              <CodeInput value={code} onChange={setCode} onEnter={submit} />
              <button type="button" className={cn(btnPrimary, 'w-full py-2.5')} onClick={submit} disabled={code.length !== 6}>
                Зарегистрироваться
              </button>
              <button
                type="button"
                className="w-full text-center text-xs text-white/45 hover:text-amber disabled:cursor-default disabled:hover:text-white/45"
                disabled={cooldown > 0}
                onClick={() => {
                  requestRegCode('bybit');
                  setCooldown(60);
                }}
              >
                {cooldown > 0 ? `Отправить код повторно через ${cooldown} с` : 'Отправить код повторно'}
              </button>
            </div>
          )}
          {res.node}
        </div>
      </div>
    </div>
  );
}

// ───────── registered account ─────────

function Account() {
  const kyc = useGame((s) => s.exchanges.bybit.kyc);
  return (
    <>
      <Header />
      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {kyc === 'none' && <KycForm />}
          {kyc === 'pending' && <KycPending />}
          {kyc === 'verified' && <KycDone />}
          <Security />
        </div>
        <div className="space-y-4">
          <Stats />
          <ExportCard />
          <PayMethods />
        </div>
      </div>
    </>
  );
}

function uidFrom(seed: string) {
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 900000000;
  return String(100000000 + h);
}

function Header() {
  const kyc = useGame((s) => s.exchanges.bybit.kyc);
  const twoFA = useGame((s) => s.exchanges.bybit.twoFA);
  const seed = useGame((s) => s.exchanges.bybit.depositTrc20);
  const uid = uidFrom(seed);
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.06] bg-gradient-to-r from-bybit-2 via-bybit-2 to-amber/[0.06] p-4">
      <Avatar name="Артём Воронов" color="#D9A20A" size={52} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-white">tema_voronov</span>
          {kyc === 'verified' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-[11px] font-semibold text-emerald">
              <BadgeCheck size={12} /> KYC: подтверждён
            </span>
          ) : (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/50">{kyc === 'pending' ? 'KYC: на проверке' : 'KYC: не пройден'}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/45">
          <span className="inline-flex items-center gap-1">
            UID <span className="num text-white/70">{uid}</span>
            <CopyBtn value={uid} label="UID Bybit" className="!px-1">
              {' '}
            </CopyBtn>
          </span>
          <span>{EMAIL}</span>
          <span>Обычный пользователь</span>
        </div>
      </div>
      <div className="ml-auto flex gap-2 text-[11px]">
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1', twoFA ? 'bg-emerald/10 text-emerald' : 'bg-rose/10 text-rose')}>
          <ShieldCheck size={13} />
          {twoFA ? 'Защита: высокая' : 'Защита: низкая'}
        </span>
      </div>
    </div>
  );
}

function KycDone() {
  return (
    <Card title="Верификация личности" icon={<BadgeCheck size={16} />} right={<span className="rounded-full bg-emerald/15 px-2 py-0.5 text-[11px] font-semibold text-emerald">KYC: подтверждён</span>}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald/15 text-emerald">
          <BadgeCheck size={20} />
        </div>
        <div className="flex-1 text-xs">
          <div className="text-sm font-semibold text-white">{HERO_NAME}</div>
          <div className="mt-0.5 text-white/45">Уровень 1 · Россия · паспорт •• 2193</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-bybit-3/60 px-3 py-2">
              <div className="text-white/40">Лимит P2P в сутки</div>
              <div className="num mt-0.5 font-semibold text-white">2 000 000 ₽</div>
            </div>
            <div className="rounded-lg bg-bybit-3/60 px-3 py-2">
              <div className="text-white/40">Вывод криптовалюты</div>
              <div className="num mt-0.5 font-semibold text-white">до 1 000 000 USDT</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ───────── security / 2FA ─────────

function Security() {
  const twoFA = useGame((s) => s.exchanges.bybit.twoFA);
  return (
    <Card title="Безопасность" icon={<ShieldCheck size={16} />}>
      <div className="divide-y divide-white/[0.05]">
        <SecRow icon={<Mail size={15} />} title="Эл. почта" sub={EMAIL} ok />
        <SecRow icon={<Smartphone size={15} />} title="SMS-подтверждение" sub="+7 (953) •••-••-18" ok />
        <SecRow icon={<KeyRound size={15} />} title="Google Authenticator" sub={twoFA ? 'Коды для вывода и отпускания USDT' : 'Нужен для продажи USDT и вывода средств'} ok={twoFA} />
      </div>
      {twoFA ? (
        <Callout tone="ok" className="mt-3">
          Google Authenticator привязан. При отпускании USDT и выводе вводите 6-значный код из приложения на телефоне.
        </Callout>
      ) : (
        <TwoFASetup />
      )}
    </Card>
  );
}

function SecRow({ icon, title, sub, ok }: { icon: ReactNode; title: string; sub: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bybit-3 text-white/60">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-white">{title}</div>
        <div className="truncate text-[11px] text-white/40">{sub}</div>
      </div>
      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', ok ? 'bg-emerald/15 text-emerald' : 'bg-rose/15 text-rose')}>{ok ? 'Привязано' : 'Не привязано'}</span>
    </div>
  );
}

function TwoFASetup() {
  const secret = useGame((s) => s.exchanges.bybit.twoFASecret);
  const link2FA = useGame((s) => s.link2FA);
  const [code, setCode] = useState('');
  const res = useResult();
  const bind = () => {
    if (code.length !== 6) return res.show({ ok: false, error: 'Введите 6-значный код из Authenticator' });
    if (res.show(link2FA('bybit', code), 'Google Authenticator привязан')) setCode('');
  };
  return (
    <ol className="mt-3 space-y-3">
      <Step n={1} title="Скопируйте ключ настройки">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-bybit px-3 py-2">
          <code className="num select-text font-mono text-sm tracking-wider text-white">{groupBy4(secret)}</code>
          <CopyBtn value={secret} label="Ключ 2FA Bybit" kind="key" className="ml-auto" />
        </div>
        <p className="mt-1 text-[11px] text-white/35">Никому не показывайте ключ — с ним можно получить коды для вывода ваших средств.</p>
      </Step>
      <Step n={2} title="Добавьте ключ на телефоне">
        <p className="text-xs leading-relaxed text-white/55">
          На телефоне: <b className="text-white/80">Authenticator</b> → «+» → «Ввести ключ» → вставьте ключ. Появится строка «Bybit» с кодом, который меняется каждые 30 секунд.
        </p>
      </Step>
      <Step n={3} title="Введите 6-значный код из приложения">
        <div className="flex gap-2">
          <CodeInput value={code} onChange={setCode} onEnter={bind} className="max-w-[200px]" />
          <button type="button" className={btnPrimary} onClick={bind} disabled={code.length !== 6}>
            Привязать
          </button>
        </div>
      </Step>
      {res.node}
    </ol>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/15 text-xs font-bold text-amber">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 text-sm font-medium text-white">{title}</div>
        {children}
      </div>
    </li>
  );
}

// ───────── stats / export / payment methods ─────────

function Stats() {
  const completed = useGame((s) => s.exchanges.bybit.completed);
  const cancelled = useGame((s) => s.exchanges.bybit.cancelled);
  const lost = useGame((s) => s.exchanges.bybit.appealsLost);
  const bookQty = useGame((s) => s.book.qty);
  const avg = useGame((s) => s.book.avg);
  const total = completed + cancelled;
  const rate = total ? (completed / total) * 100 : null;
  return (
    <Card title="Статистика P2P" icon={<Trophy size={16} />}>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Сделок завершено" value={String(completed)} />
        <Stat label="Отменено" value={String(cancelled)} tone={cancelled ? 'text-rose' : undefined} />
        <Stat label="Процент исполнения" value={rate === null ? '—' : `${rate.toFixed(rate === 100 ? 0 : 1)}%`} tone={rate !== null && rate < 90 ? 'text-amber' : 'text-emerald'} />
      </div>
      <div className="mt-3 border-t border-white/[0.05] pt-2">
        <Row label="Проиграно апелляций">
          <span className={lost ? 'text-rose' : undefined}>{lost}</span>
        </Row>
        {bookQty > 0 && <Row label="Средняя цена покупки USDT">{fmtPrice(avg)} ₽</Row>}
      </div>
      {rate !== null && rate < 90 && <p className="mt-2 text-[11px] text-white/40">Покупатели реже выбирают объявления продавцов с низким процентом исполнения.</p>}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-bybit-3/60 px-3 py-2">
      <div className={cn('num text-lg font-semibold text-white', tone)}>{value}</div>
      <div className="text-[11px] leading-tight text-white/40">{label}</div>
    </div>
  );
}

function ExportCard() {
  const exportOrders = useGame((s) => s.exportOrders);
  const openWindow = useGame((s) => s.openWindow);
  const completed = useGame((s) => s.exchanges.bybit.completed);
  const [file, setFile] = useState<string | null>(null);
  const run = () => {
    const id = exportOrders();
    setFile(useGame.getState().files.find((f) => f.id === id)?.name ?? 'Выгрузка ордеров.pdf');
  };
  return (
    <Card title="Документы" icon={<FileDown size={16} />}>
      <p className="mb-3 text-xs leading-relaxed text-white/50">
        Выгрузка завершённых ордеров с ФИО контрагентов. Пригодится, если банк запросит пояснения по 115-ФЗ о происхождении поступлений.
      </p>
      <button type="button" className={cn(btnGhost, 'w-full py-2 text-sm')} onClick={run}>
        <FileDown size={15} /> Экспорт истории ордеров (PDF)
      </button>
      {completed === 0 && !file && <p className="mt-2 text-[11px] text-white/35">Пока нет завершённых ордеров — выгрузка будет пустой.</p>}
      {file && (
        <Callout
          tone="ok"
          className="mt-3"
          action={
            <button type="button" className={btnGhost} onClick={() => openWindow('files')}>
              <FolderOpen size={13} /> Открыть
            </button>
          }
        >
          <div className="font-medium">{file}</div>
          Файл сохранён в папку «Чеки и Ордера» на рабочем столе
        </Callout>
      )}
    </Card>
  );
}

function PayMethods() {
  const items = useGame(useShallow((s) => PLAYER_BANKS.filter((b) => s.banks[b].opened).map((b) => `${b}|${s.banks[b].card}`)));
  return (
    <Card title="Способы оплаты P2P" icon={<CreditCard size={16} />}>
      {items.length === 0 ? (
        <p className="text-xs text-white/40">Нет открытых банковских счетов.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const [b, card] = it.split('|') as [BankId, string];
            return (
              <div key={b} className="flex items-center gap-3 rounded-lg bg-bybit-3/50 px-3 py-2">
                <div className={cn('h-7 w-7 shrink-0 rounded-md', b === 'sber' ? 'bg-[#21A038]' : b === 'tbank' ? 'bg-[#FFDD2D]' : 'bg-[#EF3124]')} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{BANK_NAMES[b]}</div>
                  <div className="num truncate text-[11px] text-white/40">
                    {HERO_NAME} · СБП {HERO_PHONE} · карта {maskCard(card)}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-white/35">Покупатель увидит эти реквизиты в ордере. Принимайте оплату только от владельца аккаунта.</p>
        </div>
      )}
    </Card>
  );
}
