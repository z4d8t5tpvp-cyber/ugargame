import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Briefcase, MessageCircle, Search, Tag } from 'lucide-react';
import { useGame } from '../../game/store';
import { cn } from '../common/kit';
import { Items } from './avito/Items';
import { Jobs } from './avito/Jobs';
import { AvitoChatView, MessagesList, PhishPage } from './avito/Messages';
import { AvitoLogo } from './avito/shared';

type Tab = 'items' | 'messages' | 'jobs';

export default function AvitoApp() {
  const [tab, setTab] = useState<Tab>('items');
  const [chatId, setChatId] = useState<string | null>(null);
  const [phish, setPhish] = useState<string | null>(null);
  const unread = useGame((s) => s.avito.chats.reduce((n, c) => n + c.unread, 0));
  const onShift = useGame((s) => !!s.job.activeJob);

  const tabs: { id: Tab; label: string; icon: typeof Tag; badge?: number; dot?: boolean }[] = [
    { id: 'items', label: 'Мои вещи', icon: Tag },
    { id: 'messages', label: 'Сообщения', icon: MessageCircle, badge: unread },
    { id: 'jobs', label: 'Подработки', icon: Briefcase, dot: onShift },
  ];

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#F5F5F5] text-[#1A1A1A]">
      <div className="shrink-0 bg-white px-3 pb-2.5 pt-2 shadow-[0_1px_0_#EFEFEF]">
        <div className="flex items-center justify-between">
          <AvitoLogo />
          <Bell size={20} className="text-[#1A1A1A]" />
        </div>
        <div className="mt-2 flex h-9 items-center gap-2 rounded-xl bg-[#F2F1F0] px-3 text-[13.5px] text-[#9B9B9B]">
          <Search size={16} />
          Поиск в Новозаровске
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {tab === 'items' && <Items />}
        {tab === 'messages' && <MessagesList onOpen={setChatId} />}
        {tab === 'jobs' && <Jobs />}
      </div>

      <div className="flex h-[54px] shrink-0 items-stretch border-t border-[#EFEFEF] bg-white">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn('relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition', on ? 'text-[#00AAFF]' : 'text-[#9B9B9B] hover:text-[#4D4D4D]')}>
              <span className="relative">
                <Icon size={22} strokeWidth={on ? 2.3 : 1.9} />
                {!!t.badge && <span className="absolute -right-2.5 -top-1.5 min-w-[17px] rounded-full bg-[#FF6163] px-1 text-center text-[10px] font-bold leading-[17px] text-white ring-2 ring-white">{t.badge}</span>}
                {t.dot && <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#97CF26] ring-2 ring-white" />}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {chatId && (
          <motion.div key={chatId} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }} className="absolute inset-0 z-20">
            <AvitoChatView id={chatId} onBack={() => setChatId(null)} onLink={setPhish} />
          </motion.div>
        )}
      </AnimatePresence>
      {phish && chatId && <PhishPage url={phish} chatId={chatId} onBack={() => setPhish(null)} />}
    </div>
  );
}
