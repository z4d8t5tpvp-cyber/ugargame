import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BatteryMedium, KeyRound, Lock, MessageSquareText, ScanFace, Send, ShoppingBag, Signal, Wallet, Wifi } from 'lucide-react';
import { useGame } from '../../game/store';
import type { PhoneAppId, PhoneNotification } from '../../game/types';
import { clamp, clockStr, dateStr } from '../../game/util';
import { cn } from '../common/kit';
import BankApp from '../phone/BankApp';
import TelegramApp from '../phone/TelegramApp';
import AvitoApp from '../phone/AvitoApp';
import WalletApp from '../phone/WalletApp';
import AuthApp from '../phone/AuthApp';

interface AppDef {
  id: PhoneAppId;
  name: string;
  bg: string;
  icon: React.ReactNode;
}

const APP_DEFS: AppDef[] = [
  { id: 'sber', name: 'СберБанк', bg: 'linear-gradient(135deg,#1db954,#0f8a3c)', icon: <span className="text-[22px] font-black text-white">С</span> },
  { id: 'tbank', name: 'Т-Банк', bg: '#FFDD2D', icon: <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black/90 text-[18px] font-black text-[#FFDD2D]">Т</span> },
  { id: 'alfa', name: 'Альфа', bg: '#EF3124', icon: <span className="text-[24px] font-black text-white">А</span> },
  { id: 'telegram', name: 'Telegram', bg: 'linear-gradient(135deg,#37aee2,#1e96c8)', icon: <Send size={24} className="-ml-0.5 text-white" /> },
  { id: 'avito', name: 'Барахолка', bg: '#ffffff', icon: <ShoppingBag size={24} className="text-[#00AAFF]" /> },
  { id: 'wallet', name: 'Tonkeeper', bg: 'linear-gradient(135deg,#1c2a3c,#0b121b)', icon: <Wallet size={22} className="text-[#45AEF5]" /> },
  { id: 'auth', name: 'SMS · 2FA', bg: 'linear-gradient(135deg,#4285F4,#2b5fd0)', icon: <div className="flex items-center gap-0.5"><KeyRound size={16} className="text-white" /><MessageSquareText size={14} className="text-white/80" /></div> },
];

export default function Phone() {
  const app = useGame((s) => s.ui.phoneApp);
  const locked = useGame((s) => s.ui.phoneLocked);
  const buzz = useGame((s) => s.ui.buzz);
  const [shake, setShake] = useState(false);
  const lastTouch = useRef(Date.now());
  useEffect(() => {
    if (!buzz) return;
    setShake(true);
    const t = setTimeout(() => setShake(false), 520);
    return () => clearTimeout(t);
  }, [buzz]);
  // Auto-lock after a while without touching the phone.
  useEffect(() => {
    const id = setInterval(() => {
      const s = useGame.getState();
      if (!s.ui.phoneLocked && Date.now() - lastTouch.current > 150000 && !s.cutscene) s.phoneLock(true);
    }, 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex h-full items-center justify-center">
      <div
        onPointerDown={() => (lastTouch.current = Date.now())}
        className={cn('relative aspect-[380/780] h-full max-h-[820px] rounded-[46px] bg-[#0b0b0d] p-[11px] shadow-[0_0_0_2px_#2a2c33,0_30px_80px_-20px_rgba(0,0,0,.8)]', shake && 'animate-shake')}
      >
        <div className="absolute top-24 -left-[3px] h-8 w-[3px] rounded-l bg-[#2a2c33]" />
        <div className="absolute top-36 -left-[3px] h-14 w-[3px] rounded-l bg-[#2a2c33]" />
        <div className="absolute top-32 -right-[3px] h-20 w-[3px] rounded-r bg-[#2a2c33]" />
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[36px] bg-black">
          <StatusBar dark={locked || !app || app === 'tbank' || app === 'telegram' || app === 'wallet' || app === 'auth'} />
          <div className="relative min-h-0 flex-1">
            {locked ? <LockScreen /> : app ? <AppHost app={app} /> : <Home />}
          </div>
          {!locked && (
            <button onClick={() => useGame.getState().phoneOpen(null)} className={cn('flex h-[22px] shrink-0 items-center justify-center', app ? 'bg-black' : 'bg-transparent')} title="Домой">
              <span className="h-[5px] w-28 rounded-full bg-white/70" />
            </button>
          )}
          <Banner />
        </div>
      </div>
    </div>
  );
}

function StatusBar({ dark }: { dark: boolean }) {
  const now = useGame((s) => Math.floor(s.now));
  const battery = useGame((s) => Math.round(clamp(100 - (s.now - s.hero.lastSleepAt) / 16, 7, 100)));
  return (
    <div className={cn('relative flex h-[34px] shrink-0 items-center justify-between px-6 text-[13px] font-semibold', dark ? 'bg-black text-white' : 'bg-white text-black')}>
      <span className="num">{clockStr(now)}</span>
      <div className="absolute top-[7px] left-1/2 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center gap-1">
        <Signal size={13} />
        <span className="text-[10px]">LTE</span>
        <Wifi size={13} className="opacity-40" />
        <span className="ml-1 text-[11px] num">{battery}%</span>
        <BatteryMedium size={16} className={battery < 20 ? 'text-rose-400' : ''} />
      </div>
    </div>
  );
}

function useBadges(): Record<PhoneAppId, number> {
  const tg = useGame((s) => Object.values(s.tg).reduce((a, c) => a + (c.visible ? c.unread : 0), 0));
  const avito = useGame((s) => s.avito.chats.reduce((a, c) => a + c.unread, 0));
  const sms = useGame((s) => s.sms.filter((m) => !m.read).length);
  const notif = useGame((s) => JSON.stringify(['sber', 'tbank', 'alfa', 'wallet'].map((a) => s.notifications.filter((n) => n.app === a && !n.read).length)));
  const [sber, tbank, alfa, wallet] = JSON.parse(notif) as number[];
  return { sber, tbank, alfa, wallet, telegram: tg, avito, auth: sms };
}

function Home() {
  const walletOn = useGame((s) => s.wallet.unlocked);
  const now = useGame((s) => Math.floor(s.now));
  const moscow = useGame((s) => s.hero.location === 'moscow');
  const badges = useBadges();
  const apps = APP_DEFS.filter((a) => a.id !== 'wallet' || walletOn);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(120% 70% at 20% 0%, #3b2d6b 0%, transparent 60%), radial-gradient(120% 80% at 100% 100%, #0e4b5e 0%, transparent 55%), #0b0c1a' }}>
      <div className="px-5 pt-6 text-white">
        <div className="text-[44px] leading-none font-light num">{clockStr(now)}</div>
        <div className="mt-1 text-sm text-white/70">{dateStr(now)} · {moscow ? 'Москва, +7°' : 'Новозаровск, +9° дождь'}</div>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-x-2 gap-y-4 px-4">
        {apps.map((a) => (
          <button key={a.id} onClick={() => useGame.getState().phoneOpen(a.id)} className="flex flex-col items-center gap-1">
            <div className="relative flex aspect-square w-[54px] items-center justify-center rounded-[14px] shadow-lg" style={{ background: a.bg }}>
              {a.icon}
              {badges[a.id] > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] rounded-full bg-[#ff3b30] px-1 text-center text-[10px] leading-[18px] font-bold text-white">{badges[a.id] > 99 ? '99+' : badges[a.id]}</span>}
            </div>
            <span className="max-w-full truncate text-[10.5px] text-white/90">{a.name}</span>
          </button>
        ))}
      </div>
      <div className="absolute right-3 bottom-3 left-3 rounded-2xl bg-white/10 p-3 text-[11px] leading-snug text-white/75 backdrop-blur">
        Совет: копируйте реквизиты на компьютере — они попадают в общий буфер. В банке на телефоне жмите «Вставить из буфера».
      </div>
    </div>
  );
}

function AppHost({ app }: { app: PhoneAppId }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      {(app === 'sber' || app === 'tbank' || app === 'alfa') && <BankApp key={app} bank={app} />}
      {app === 'telegram' && <TelegramApp />}
      {app === 'avito' && <AvitoApp />}
      {app === 'wallet' && <WalletApp />}
      {app === 'auth' && <AuthApp />}
    </div>
  );
}

function LockScreen() {
  const now = useGame((s) => Math.floor(s.now));
  const json = useGame((s) => JSON.stringify(s.notifications.filter((n) => !n.read).slice(0, 4)));
  const notes = JSON.parse(json) as PhoneNotification[];
  const [scanning, setScanning] = useState(false);
  const unlock = () => {
    setScanning(true);
    setTimeout(() => useGame.getState().phoneLock(false), 450);
  };
  return (
    <button onClick={unlock} className="absolute inset-0 flex flex-col items-center text-white" style={{ background: 'linear-gradient(180deg,#141a33,#05060c)' }}>
      <Lock size={16} className="mt-4 opacity-70" />
      <div className="mt-2 text-[64px] leading-none font-extralight num">{clockStr(now)}</div>
      <div className="text-sm text-white/70">{dateStr(now)}</div>
      <div className="mt-6 w-full space-y-2 px-3">
        {notes.map((n) => (
          <div key={n.id} className="rounded-2xl bg-white/12 p-2.5 text-left backdrop-blur">
            <div className="text-[11px] font-semibold">{n.title}</div>
            <div className="line-clamp-2 text-[11px] text-white/75">{n.body}</div>
          </div>
        ))}
      </div>
      <div className="mt-auto mb-8 flex flex-col items-center gap-2 text-xs text-white/60">
        <ScanFace size={30} className={cn(scanning ? 'text-emerald-400' : 'text-white/70')} />
        {scanning ? 'Face ID…' : 'Нажмите, чтобы разблокировать'}
      </div>
    </button>
  );
}

const APP_OF: Record<string, PhoneAppId | null> = { sber: 'sber', tbank: 'tbank', alfa: 'alfa', telegram: 'telegram', avito: 'avito', wallet: 'wallet', sms: 'auth', system: null };

function Banner() {
  const json = useGame((s) => JSON.stringify(s.notifications[0] ?? null));
  const n = JSON.parse(json) as PhoneNotification | null;
  const [shown, setShown] = useState<PhoneNotification | null>(null);
  const seen = useRef<string | null>(n?.id ?? null);
  useEffect(() => {
    if (!n || n.id === seen.current) return;
    seen.current = n.id;
    const s = useGame.getState();
    const target = APP_OF[n.app];
    if (target && s.ui.phoneApp === target && !s.ui.phoneLocked && (target !== 'telegram' || s.ui.tgChat === n.link)) return;
    setShown(n);
  }, [json]);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 4200);
    return () => clearTimeout(t);
  }, [shown]);
  const open = () => {
    if (!shown) return;
    const s = useGame.getState();
    const target = APP_OF[shown.app];
    if (target) {
      s.phoneLock(false);
      if (target === 'telegram' && shown.link) s.setTgChat(shown.link);
      s.phoneOpen(target);
    } else if (shown.title.startsWith('Bybit')) {
      s.openWindow('browser');
      s.setBrowserTab('bybit');
      s.setBybitView('orders');
    }
    setShown(null);
  };
  return (
    <AnimatePresence>
      {shown && (
        <motion.button
          key={shown.id}
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          onClick={open}
          className="absolute top-9 right-2 left-2 z-50 rounded-2xl bg-[#1d1f26]/95 p-2.5 text-left text-white shadow-2xl ring-1 ring-white/10 backdrop-blur"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-white/50">
            <span className="h-3 w-3 rounded" style={{ background: APP_DEFS.find((a) => a.id === APP_OF[shown.app])?.bg ?? '#666' }} />
            {shown.app === 'sms' ? 'Сообщения' : APP_DEFS.find((a) => a.id === APP_OF[shown.app])?.name ?? 'Уведомление'} · сейчас
          </div>
          <div className="mt-0.5 truncate text-[12px] font-semibold">{shown.title}</div>
          <div className="line-clamp-2 text-[11.5px] text-white/80">{shown.body}</div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
