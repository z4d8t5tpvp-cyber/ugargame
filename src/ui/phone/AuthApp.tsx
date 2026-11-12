import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, Copy, KeyRound, MessageSquare, Plus, QrCode, ShieldCheck, UserRound } from 'lucide-react';
import type { AuthEntry, Sms } from '../../game/types';
import { useGame } from '../../game/store';
import { shortDT, totp, totpSecondsLeft } from '../../game/util';
import { cn, PasteBtn, useResult } from '../common/kit';
import { Sheet } from './bank/ui';

type Tab = 'auth' | 'sms';

export default function AuthApp() {
  const unread = useGame((s) => s.sms.reduce((n, m) => n + (m.read ? 0 : 1), 0));
  // Open straight into SMS when something new arrived (registration codes etc.).
  const [tab, setTab] = useState<Tab>(() => (useGame.getState().sms.some((m) => !m.read) ? 'sms' : 'auth'));

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#131314] text-[#E3E3E3]">
      <div className="shrink-0 px-3 pt-2 pb-2">
        <div className="flex rounded-full bg-[#1E1F20] p-1">
          {(
            [
              ['auth', 'Authenticator', ShieldCheck],
              ['sms', 'SMS', MessageSquare],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn('relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition', tab === id ? 'bg-[#004A77] text-[#C2E7FF]' : 'text-[#C4C7C5]')}
            >
              <Icon size={15} />
              {label}
              {id === 'sms' && unread > 0 && tab !== 'sms' && <span className="min-w-[18px] rounded-full bg-[#F2B8B5] px-1 text-[10.5px] leading-[18px] font-bold text-[#601410]">{unread}</span>}
            </button>
          ))}
        </div>
      </div>
      {tab === 'auth' ? <AuthTab /> : <SmsTab />}
    </div>
  );
}

// ───────── Authenticator ─────────

/** Real-time second counter: TOTP codes rotate on wall-clock time, not game time. */
function useSecond() {
  const [sec, setSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setSec(Math.floor(Date.now() / 1000)), 250);
    return () => clearInterval(id);
  }, []);
  return sec;
}

function AuthTab() {
  const entries = useGame((s) => s.auth);
  const sec = useSecond();
  const left = totpSecondsLeft(sec * 1000);
  const [copied, setCopied] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = (e: AuthEntry) => {
    const code = totp(e.secret, sec * 1000);
    useGame.getState().copy({ kind: 'code', value: code, label: `Код ${e.issuer}` });
    setCopied(e.id);
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-4 pt-1 pb-2">
        <GoogleMark />
        <span className="text-[18px] font-medium text-[#E3E3E3]">Authenticator</span>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-24">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center px-8 pt-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1E1F20]">
              <KeyRound size={28} className="text-[#A8C7FA]" />
            </div>
            <div className="mt-4 text-[15px] font-medium">Нет аккаунтов</div>
            <div className="mt-1.5 text-[12.5px] leading-snug text-[#C4C7C5]">Добавьте аккаунт: скопируйте ключ 2FA на бирже и вставьте его здесь</div>
            <button onClick={() => setForm(true)} className="mt-5 rounded-full bg-[#A8C7FA] px-5 py-2.5 text-[13.5px] font-semibold text-[#062E6F] active:bg-[#8AB4F8]">
              Ввести ключ настройки
            </button>
          </div>
        ) : (
          entries.map((e) => {
            const code = totp(e.secret, sec * 1000);
            const urgent = left <= 5;
            return (
              <button key={e.id} onClick={() => copy(e)} className="flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 text-left active:bg-white/[0.04]">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-[#C4C7C5]">
                    {e.issuer}: <span className="text-[#8E918F]">{e.account}</span>
                  </div>
                  <div className={cn('mt-0.5 text-[34px] leading-tight font-normal tracking-[0.06em] num transition-colors', urgent ? 'text-[#F2B8B5]' : 'text-[#A8C7FA]')}>
                    {code.slice(0, 3)} {code.slice(3)}
                  </div>
                  <div className="h-4 text-[11.5px]">
                    <AnimatePresence>
                      {copied === e.id && (
                        <motion.span initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1 font-medium text-[#6DD58C]">
                          <Check size={12} /> Скопировано
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <Countdown left={left} urgent={urgent} />
              </button>
            );
          })
        )}
      </div>

      {entries.length > 0 && (
        <div className="pointer-events-none absolute right-0 bottom-3 left-0 flex justify-center">
          <AnimatePresence>
            {copied && (
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} className="rounded-lg bg-[#E3E3E3] px-3.5 py-2 text-[12.5px] font-medium text-[#1F1F1F] shadow-lg">
                Код скопирован в буфер обмена
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <button
        onClick={() => setMenu(true)}
        title="Добавить код"
        className="absolute right-4 bottom-14 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#004A77] text-[#C2E7FF] shadow-[0_6px_16px_rgba(0,0,0,0.5)] active:bg-[#005A8F]"
      >
        <Plus size={26} />
      </button>

      <Sheet open={menu} onClose={() => setMenu(false)} panelClass="bg-[#1E1F20] text-[#E3E3E3]">
        <div className="space-y-1">
          <button disabled className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left opacity-50">
            <QrCode size={22} className="text-[#A8C7FA]" />
            <div>
              <div className="text-[14px] font-medium">Сканировать QR-код</div>
              <div className="text-[11.5px] text-[#C4C7C5]">Камера недоступна — экран монитора бликует</div>
            </div>
          </button>
          <button
            onClick={() => {
              setMenu(false);
              setForm(true);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left active:bg-white/[0.05]"
          >
            <KeyRound size={22} className="text-[#A8C7FA]" />
            <div>
              <div className="text-[14px] font-medium">Ввести ключ настройки</div>
              <div className="text-[11.5px] text-[#C4C7C5]">Скопируйте ключ 2FA на бирже и вставьте его</div>
            </div>
          </button>
        </div>
      </Sheet>

      <AnimatePresence>{form && <AddKeyForm onClose={() => setForm(false)} />}</AnimatePresence>
    </>
  );
}

function Countdown({ left, urgent }: { left: number; urgent: boolean }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0 -rotate-90">
      <circle cx="13" cy="13" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle
        cx="13"
        cy="13"
        r={r}
        fill="none"
        stroke={urgent ? '#F2B8B5' : '#A8C7FA'}
        strokeWidth="4"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - left / 30)}
        style={{ transition: left === 30 ? 'none' : 'stroke-dashoffset 1s linear, stroke .3s' }}
      />
    </svg>
  );
}

function AddKeyForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('Bybit');
  const [key, setKey] = useState('');
  const res = useResult();
  const submit = () => {
    const r = useGame.getState().addAuth(name.trim(), key);
    if (res.show(r, 'Аккаунт добавлен')) setTimeout(onClose, 700);
  };
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col bg-[#131314]"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
    >
      <div className="flex h-12 shrink-0 items-center gap-1 px-1.5">
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-white/10" title="Назад">
          <ChevronLeft size={24} />
        </button>
        <span className="text-[16px] font-medium">Введите данные аккаунта</span>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-3 pb-6">
        <label className="block">
          <span className="mb-1.5 block px-1 text-[12px] text-[#C4C7C5]">Аккаунт</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 32))}
            className="h-12 w-full rounded-xl border border-[#8E918F] bg-transparent px-3.5 text-[15px] outline-none focus:border-[#A8C7FA]"
          />
        </label>
        <div>
          <span className="mb-1.5 block px-1 text-[12px] text-[#C4C7C5]">Ваш ключ</span>
          <div className="flex items-center rounded-xl border border-[#8E918F] pr-1.5 focus-within:border-[#A8C7FA]">
            <input
              value={key}
              onChange={(e) => setKey(e.target.value.slice(0, 64))}
              placeholder="Ключ настройки 2FA"
              className="h-12 min-w-0 flex-1 bg-transparent px-3.5 font-mono text-[14px] tracking-wide uppercase outline-none placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-[#8E918F]"
            />
            <PasteBtn onPaste={(v) => setKey(v.trim())} className="h-9 rounded-lg! bg-[#004A77] px-2.5! text-[#C2E7FF]">
              Вставить
            </PasteBtn>
          </div>
          <div className="mt-1.5 px-1 text-[11.5px] leading-snug text-[#8E918F]">Ключ из 16+ символов показывается на бирже при подключении Google Authenticator.</div>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[#1E1F20] px-3.5 py-3 text-[13.5px]">
          <span className="text-[#C4C7C5]">Тип ключа</span>
          <span className="font-medium">По времени</span>
        </div>
        <div className="[&>div]:rounded-xl [&>div]:px-3.5 [&>div]:py-2.5 [&>div]:text-[13px]">{res.node}</div>
        <button
          onClick={submit}
          disabled={!key.trim()}
          className="h-11 w-full rounded-full bg-[#A8C7FA] text-[14px] font-semibold text-[#062E6F] active:bg-[#8AB4F8] disabled:opacity-40"
        >
          Добавить
        </button>
      </div>
    </motion.div>
  );
}

function GoogleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.5 L20.5 7.25 L12 12 Z" fill="#4285F4" />
      <path d="M20.5 7.25 L20.5 16.75 L12 12 Z" fill="#34A853" />
      <path d="M20.5 16.75 L12 21.5 L12 12 Z" fill="#FBBC04" />
      <path d="M12 21.5 L3.5 16.75 L12 12 Z" fill="#EA4335" />
      <path d="M3.5 16.75 L3.5 7.25 L12 12 Z" fill="#4285F4" opacity=".75" />
      <path d="M3.5 7.25 L12 2.5 L12 12 Z" fill="#34A853" opacity=".75" />
      <circle cx="12" cy="12" r="3.4" fill="#131314" />
    </svg>
  );
}

// ───────── SMS ─────────

const senderName = (from: string) => (from === '900' ? '900 · СберБанк' : from);
const codeIn = (text: string) => /код[^\d]{0,40}(\d{4,8})/i.exec(text)?.[1] ?? null;

function SmsTab() {
  const list = useGame((s) => s.sms);
  const unread = useGame((s) => s.sms.reduce((n, m) => n + (m.read ? 0 : 1), 0));
  // Ids that were unread when they reached the screen keep their dot for this visit.
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (unread === 0) return;
    const ids = useGame.getState().sms.filter((m) => !m.read).map((m) => m.id);
    setFresh((prev) => new Set([...prev, ...ids]));
    useGame.getState().act((d) => {
      d.sms.forEach((m) => (m.read = true));
      d.notifications.forEach((n) => {
        if (n.app === 'sms') n.read = true;
      });
    });
  }, [unread]);

  return (
    <>
      <div className="flex shrink-0 items-baseline justify-between px-4 pt-1 pb-2">
        <span className="text-[18px] font-medium">Сообщения</span>
        <span className="text-[11.5px] text-[#8E918F]">{list.length > 0 ? `${list.length} шт.` : ''}</span>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {list.length === 0 ? (
          <div className="flex flex-col items-center px-8 pt-16 text-center">
            <MessageSquare size={30} className="text-[#8E918F]" />
            <div className="mt-3 text-[14px] text-[#C4C7C5]">Сообщений пока нет</div>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((m) => (
              <SmsCard key={m.id} m={m} dot={fresh.has(m.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SmsCard({ m, dot }: { m: Sms; dot: boolean }) {
  const [copied, setCopied] = useState(false);
  const code = codeIn(m.text);
  const isSber = m.from === '900';
  const letter = (m.from.replace(/[^A-Za-zА-Яа-яЁё0-9+]/g, '')[0] ?? '?').toUpperCase();
  return (
    <motion.div initial={dot ? { opacity: 0, y: -6 } : false} animate={{ opacity: 1, y: 0 }} className={cn('rounded-2xl px-3.5 py-3', dot ? 'bg-[#1F2733]' : 'bg-[#1E1F20]')}>
      <div className="flex items-center gap-2.5">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold', isSber ? 'bg-[#21A038] text-white' : 'bg-[#3C4043] text-[#E3E3E3]')}>
          {isSber ? <Check size={16} strokeWidth={3} /> : letter === '+' ? <UserRound size={16} /> : letter}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-semibold">{senderName(m.from)}</span>
            {dot && <span className="h-2 w-2 shrink-0 rounded-full bg-[#A8C7FA]" />}
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-[#8E918F] num">{shortDT(m.at)}</span>
      </div>
      <div className="mt-1.5 text-[13px] leading-snug break-words whitespace-pre-line text-[#D7D9D7]">{m.text}</div>
      {code && (
        <button
          onClick={() => {
            useGame.getState().copy({ kind: 'code', value: code, label: `Код из SMS (${m.from})` });
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold', copied ? 'bg-[#6DD58C]/15 text-[#6DD58C]' : 'bg-[#004A77] text-[#C2E7FF]')}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Скопировано' : `Скопировать код ${code}`}
        </button>
      )}
    </motion.div>
  );
}
