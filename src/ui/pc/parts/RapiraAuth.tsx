import { useEffect, useState, type ReactNode } from 'react';
import { BadgeCheck, Camera, CircleCheck, IdCard, KeyRound, LoaderCircle, Lock, Mail, ScanFace, ShieldCheck, Smartphone } from 'lucide-react';
import { useGame } from '../../../game/store';
import { CopyBtn, cn, useResult } from '../../common/kit';
import { PLAYER_PHONE } from '../../../game/engine/banks';
import { fmtPhone } from '../../../game/util';
import { Callout, CodeInput, Field, Panel, RapiraLogo, TwoFABadge, groupBy4, rBtn, rBtnGhost, rInput } from './rapiraUi';

const EMAIL = 'tema.voronov@mail.ru';
const PHONE_MASKED = '+7 (953) •••-••-18';

// ───────── registration ─────────

export function RapiraSignUp() {
  const requestRegCode = useGame((s) => s.requestRegCode);
  const confirmReg = useGame((s) => s.confirmReg);
  const codeSent = useGame((s) => !!s.flags.regcode_rapira);
  const [pass, setPass] = useState('');
  const [agree, setAgree] = useState(false);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const res = useResult();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = () => {
    if (pass.length < 8) return res.show({ ok: false, error: 'Пароль должен быть не короче 8 символов' });
    if (!agree) return res.show({ ok: false, error: 'Подтвердите согласие с правилами платформы' });
    requestRegCode('rapira');
    setCooldown(60);
    res.clear();
  };
  const submit = () => {
    if (code.length !== 6) return res.show({ ok: false, error: 'Введите 6-значный код из SMS' });
    res.show(confirmReg('rapira', code), 'Аккаунт Rapira создан');
  };

  return (
    <div className="grid min-h-full gap-6 p-6 @3xl:grid-cols-[1fr_400px] @3xl:items-center @3xl:px-10">
      <div className="hidden @3xl:block">
        <h1 className="text-3xl leading-tight font-bold text-white">
          Российская криптобиржа <br />
          <span className="text-[#3B82F6]">с рублёвым стаканом</span>
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          Покупайте и продавайте USDT за рубли по спотовому курсу. Пополнение по СБП, вывод на карту российского банка, комиссия 0,1%.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-slate-300">
          {['Спот USDT/RUB, TON/USDT, BTC/USDT', 'Зачисление RUB по СБП за 1–2 минуты', 'Вывод USDT в сетях TRC-20 и TON'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CircleCheck size={15} className="text-[#3B82F6]" /> {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-[400px] rounded-2xl border border-slate-700/60 bg-[#131C2E] p-6 shadow-2xl shadow-black/40">
        <RapiraLogo />
        <h2 className="mt-4 text-lg font-semibold text-white">Регистрация</h2>
        <p className="mb-4 text-xs text-slate-400">Аккаунт физического лица — резидента РФ</p>
        <div className="space-y-3">
          <Field label="Эл. почта">
            <div className="relative">
              <Mail size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
              <input className={cn(rInput, 'pl-8')} value={EMAIL} readOnly />
            </div>
          </Field>
          <Field label="Телефон" right={<span className="text-slate-500">на него придёт SMS</span>}>
            <div className="relative">
              <Smartphone size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
              <input className={cn(rInput, 'num pl-8')} value={fmtPhone(PLAYER_PHONE)} readOnly />
            </div>
          </Field>
          <Field label="Пароль">
            <div className="relative">
              <Lock size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
              <input className={cn(rInput, 'pl-8')} type="password" placeholder="Минимум 8 символов" value={pass} onChange={(e) => setPass(e.target.value)} disabled={codeSent} />
            </div>
          </Field>
          <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-400">
            <input type="checkbox" className="mt-0.5 accent-[#3B82F6]" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={codeSent} />
            <span>
              Принимаю <span className="text-[#60A5FA]">правила платформы</span> и даю согласие на обработку персональных данных (152-ФЗ)
            </span>
          </label>
          {!codeSent ? (
            <button type="button" className={cn(rBtn, 'w-full py-2.5')} onClick={send}>
              Получить код по SMS
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/[0.06] p-3">
              <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                <Smartphone size={15} className="mt-0.5 shrink-0 text-[#60A5FA]" />
                <span>
                  SMS с кодом отправлено на <span className="num whitespace-nowrap">{PHONE_MASKED}</span>. Откройте сообщения на телефоне.
                </span>
              </div>
              <CodeInput value={code} onChange={setCode} onEnter={submit} />
              <button type="button" className={cn(rBtn, 'w-full py-2.5')} onClick={submit} disabled={code.length !== 6}>
                Подтвердить и создать аккаунт
              </button>
              <button
                type="button"
                disabled={cooldown > 0}
                className="w-full text-center text-xs text-slate-400 hover:text-[#60A5FA] disabled:hover:text-slate-400"
                onClick={() => {
                  requestRegCode('rapira');
                  setCooldown(60);
                }}
              >
                {cooldown > 0 ? `Повторная отправка через ${cooldown} с` : 'Отправить код ещё раз'}
              </button>
            </div>
          )}
          {res.node}
        </div>
      </div>
    </div>
  );
}

// ───────── KYC ─────────

export function RapiraKyc() {
  const kyc = useGame((s) => s.exchanges.rapira.kyc);
  const left = useGame((s) => {
    const r = s.exchanges.rapira.kycReadyAt;
    return r === null ? null : Math.max(1, Math.ceil(r - s.now));
  });
  const submitKyc = useGame((s) => s.submitKyc);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [agree, setAgree] = useState(false);
  const [shooting, setShooting] = useState(false);

  useEffect(() => {
    if (!shooting) return;
    const t = setTimeout(() => {
      setShooting(false);
      setStep(2);
    }, 1400);
    return () => clearTimeout(t);
  }, [shooting]);

  if (kyc === 'pending') {
    return (
      <div className="mx-auto max-w-[560px] p-6">
        <Panel title="Верификация личности" icon={<ScanFace size={16} />} right={<span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">На проверке</span>}>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/10">
              <LoaderCircle size={22} className="animate-spin text-[#60A5FA]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Проверяем документы через ЕСИА и базу Росфинмониторинга</div>
              {left !== null && <div className="num mt-0.5 text-xs text-slate-400">Осталось ≈ {left} мин игрового времени</div>}
              <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CircleCheck size={13} className="text-emerald-400" /> Паспорт РФ загружен</li>
                <li className="flex items-center gap-2"><CircleCheck size={13} className="text-emerald-400" /> Селфи с паспортом получено</li>
                <li className="flex items-center gap-2 text-slate-400"><LoaderCircle size={13} className="animate-spin text-[#60A5FA]" /> Проверка по перечню 115-ФЗ</li>
              </ul>
            </div>
          </div>
          <Callout className="mt-4">Пока идёт проверка, можно подключить двухфакторную защиту во вкладке «Безопасность» — без неё вывод средств недоступен.</Callout>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[620px] p-6">
      <Panel title="Верификация личности (KYC)" icon={<IdCard size={16} />} right={<span className="text-[11px] text-slate-500">Шаг {step + 1} из 3</span>}>
        <div className="mb-4 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-[#3B82F6]' : 'bg-slate-700')} />
          ))}
        </div>
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Торговля на бирже доступна только верифицированным пользователям. Данные передаются по защищённому каналу.</p>
            <div className="grid gap-3 @2xl:grid-cols-2">
              <Field label="Фамилия, имя, отчество"><input className={rInput} value="Воронов Артём Сергеевич" readOnly /></Field>
              <Field label="Дата рождения"><input className={cn(rInput, 'num')} value="17.03.2006" readOnly /></Field>
              <Field label="Паспорт: серия и номер"><input className={cn(rInput, 'num')} value="15 20 ••• •17" readOnly /></Field>
              <Field label="ИНН"><input className={cn(rInput, 'num')} value="324105827716" readOnly /></Field>
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-400">
              <input type="checkbox" className="mt-0.5 accent-[#3B82F6]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              Подтверждаю, что действую в своих интересах, не являюсь публичным должностным лицом и не действую по поручению третьих лиц
            </label>
            <button type="button" className={cn(rBtn, 'w-full')} disabled={!agree} onClick={() => setStep(1)}>
              Далее
            </button>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex aspect-[16/7] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 bg-[#0B1222] text-slate-400">
              {shooting ? <LoaderCircle size={30} className="animate-spin text-[#60A5FA]" /> : <Camera size={30} />}
              <span className="text-xs">{shooting ? 'Распознаём документ…' : 'Сделайте селфи с разворотом паспорта'}</span>
            </div>
            <button type="button" className={cn(rBtn, 'w-full')} disabled={shooting} onClick={() => setShooting(true)}>
              <Camera size={15} /> Сделать снимок веб-камерой
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <Callout tone="ok" icon={<BadgeCheck size={14} />}>
              Документ распознан: <b>Воронов Артём Сергеевич</b>, паспорт РФ. Совпадение лица 98%.
            </Callout>
            <button type="button" className={cn(rBtn, 'w-full')} onClick={() => submitKyc('rapira')}>
              Отправить на проверку
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ───────── security / 2FA ─────────

export function RapiraSecurity() {
  const twoFA = useGame((s) => s.exchanges.rapira.twoFA);
  const secret = useGame((s) => s.exchanges.rapira.twoFASecret);
  const link2FA = useGame((s) => s.link2FA);
  const [code, setCode] = useState('');
  const res = useResult();
  const bind = () => {
    if (code.length !== 6) return res.show({ ok: false, error: 'Введите 6-значный код из Authenticator' });
    if (res.show(link2FA('rapira', code), 'Google Authenticator привязан к Rapira')) setCode('');
  };

  return (
    <div className="mx-auto grid max-w-[900px] gap-4 p-4 @3xl:grid-cols-[1fr_280px]">
      <Panel title="Двухфакторная аутентификация (2FA)" icon={<KeyRound size={16} />} right={<TwoFABadge on={twoFA} />}>
        {twoFA ? (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10">
              <ShieldCheck size={22} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Google Authenticator подключён</div>
              <div className="text-xs text-slate-400">Код из приложения нужен для вывода RUB и USDT. Не сообщайте его никому — даже «поддержке».</div>
            </div>
          </div>
        ) : (
          <ol className="space-y-4">
            <Step n={1} title="Скопируйте секретный ключ">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-[#0B1222] px-3 py-2">
                <code className="num font-mono text-sm tracking-wider text-white select-text">{groupBy4(secret)}</code>
                <CopyBtn value={secret} label="Ключ 2FA Rapira" kind="key" className="ml-auto !text-[#60A5FA]" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">С этим ключом можно получить коды для вывода ваших средств. Храните его в секрете.</p>
            </Step>
            <Step n={2} title="Добавьте ключ на телефоне">
              <p className="text-xs leading-relaxed text-slate-400">
                Телефон → <b className="text-slate-200">Authenticator</b> → «+» → «Ввести ключ настройки». Название — <b className="text-slate-200">Rapira</b>, ключ — вставьте из буфера. Код обновляется каждые 30 секунд.
              </p>
            </Step>
            <Step n={3} title="Введите 6-значный код">
              <div className="flex gap-2">
                <CodeInput value={code} onChange={setCode} onEnter={bind} className="max-w-[200px]" />
                <button type="button" className={rBtn} onClick={bind} disabled={code.length !== 6}>
                  Подключить
                </button>
              </div>
            </Step>
            {res.node}
          </ol>
        )}
      </Panel>
      <Panel title="Настройки входа" icon={<Lock size={16} />}>
        <ul className="space-y-3 text-xs">
          <Row label="Пароль" value="Изменён при регистрации" ok />
          <Row label="Телефон" value={PHONE_MASKED} ok />
          <Row label="Эл. почта" value="tema.v•••@mail.ru" ok />
          <Row label="Антифишинговый код" value="Не задан" />
          <Row label="Белый список адресов" value="Выключен" />
        </ul>
        <button type="button" className={cn(rBtnGhost, 'mt-4 w-full text-xs')} disabled>
          Завершить другие сеансы
        </button>
      </Panel>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/15 text-xs font-bold text-[#60A5FA]">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 text-sm font-medium text-white">{title}</div>
        {children}
      </div>
    </li>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className={cn('num truncate', ok ? 'text-slate-200' : 'text-slate-500')}>{value}</span>
    </li>
  );
}
