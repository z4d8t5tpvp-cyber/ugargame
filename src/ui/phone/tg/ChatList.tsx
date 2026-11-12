import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, CheckCheck, Menu, Pencil, Search } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { TgChat, TgFolder } from '../../../game/types';
import { dayIndex } from '../../../game/util';
import { Avatar, cn } from '../../common/kit';
import { listTime, msgPreview, parseTyping, typingKey, typingText } from './shared';

const FOLDERS: { id: 'all' | TgFolder; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'personal', label: 'Личка' },
  { id: 'p2p', label: 'Чаты P2P' },
  { id: 'otc', label: 'OTC Гаранты' },
  { id: 'bots', label: 'Боты' },
];

const lastAt = (c: TgChat) => c.messages[c.messages.length - 1]?.at ?? -Infinity;

export function ChatList({ onOpen }: { onOpen: (id: string) => void }) {
  const tg = useGame((s) => s.tg);
  const order = useGame((s) => s.tgOrder);
  const pendingKey = useGame((s) => Object.keys(s.tgPending).join(','));
  const tKey = useGame((s) => typingKey(s));
  const today = useGame((s) => dayIndex(s.now));
  const [folder, setFolder] = useState<'all' | TgFolder>('all');

  const chats = useMemo(() => {
    const seen = new Set<string>();
    const out: TgChat[] = [];
    for (const id of order) {
      const c = tg[id];
      if (c?.visible && !seen.has(id)) {
        seen.add(id);
        out.push(c);
      }
    }
    const rest = Object.values(tg)
      .filter((c) => c.visible && !seen.has(c.id))
      .sort((a, b) => lastAt(b) - lastAt(a));
    return [...out, ...rest];
  }, [tg, order]);

  const typing = useMemo(() => {
    const m: Record<string, ReturnType<typeof parseTyping>[number]> = {};
    for (const t of parseTyping(tKey)) m[t.chatId] ??= t;
    return m;
  }, [tKey]);
  const pending = useMemo(() => new Set(pendingKey ? pendingKey.split(',') : []), [pendingKey]);

  const counts = useMemo(() => {
    const r: Record<string, number> = { all: 0, personal: 0, p2p: 0, otc: 0, bots: 0 };
    for (const c of chats)
      if (c.unread > 0) {
        r.all++;
        r[c.folder]++;
      }
    return r;
  }, [chats]);

  const shown = folder === 'all' ? chats : chats.filter((c) => c.folder === folder);

  return (
    <div className="relative flex h-full w-full flex-col bg-[#17212B]">
      <div className="shrink-0 bg-[#17212B] shadow-[0_1px_0_rgba(0,0,0,.35)]">
        <div className="flex h-12 items-center gap-3 px-3">
          <Menu size={21} className="text-white/75" />
          <span className="flex-1 text-[18px] font-semibold text-white">Telegram</span>
          <Search size={20} className="text-white/75" />
        </div>
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-2">
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFolder(f.id)}
              className={cn('relative flex shrink-0 items-center gap-1.5 px-2.5 pb-2.5 pt-1 text-[13.5px] font-medium transition', folder === f.id ? 'text-[#6AB3F3]' : 'text-[#7F91A4] hover:text-white/80')}
            >
              {f.label}
              {counts[f.id] > 0 && (
                <span className={cn('min-w-[18px] rounded-full px-1 text-center text-[11px] font-semibold leading-[18px]', folder === f.id ? 'bg-[#5288C1] text-white' : 'bg-[#7F91A4]/40 text-white/90')}>{counts[f.id]}</span>
              )}
              {folder === f.id && <motion.span layoutId="tg-folder" className="absolute inset-x-1.5 bottom-0 h-[3px] rounded-t-full bg-[#6AB3F3]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 && <div className="px-6 py-16 text-center text-[13.5px] text-[#7F91A4]">В этой папке пока нет чатов</div>}
        {shown.map((c) => {
          const last = c.messages[c.messages.length - 1];
          const t = typing[c.id];
          const hasChoice = pending.has(c.id) && !t;
          return (
            <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 px-3 py-[7px] text-left transition hover:bg-white/[0.04] active:bg-white/[0.07]">
              <Avatar name={c.title} color={c.color} emoji={c.emoji} size={52} />
              <div className="min-w-0 flex-1 border-b border-black/30 pb-[9px] pt-[3px]">
                <div className="flex items-center gap-1">
                  <span className="truncate text-[15px] font-semibold text-white">{c.title}</span>
                  {c.verified && <BadgeCheck size={15} fill="#3E9BEB" color="#fff" className="shrink-0" />}
                  <span className="ml-auto flex shrink-0 items-center gap-0.5 pl-2 text-[12px] text-[#7F91A4]">
                    {last?.from === 'me' && <CheckCheck size={14} className="text-[#6AB3F3]" />}
                    {last && listTime(last.at, today)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={cn('min-w-0 flex-1 truncate text-[14px]', t || hasChoice ? 'text-[#6AB3F3]' : 'text-[#7F91A4]')}>
                    {t ? typingText(t, c.kind === 'group') : hasChoice ? 'Ждёт вашего ответа' : last ? msgPreview(last, c) : 'Нет сообщений'}
                  </span>
                  {c.unread > 0 && <span className="min-w-[22px] shrink-0 rounded-full bg-[#5288C1] px-1.5 text-center text-[12px] font-semibold leading-[22px] text-white">{c.unread}</span>}
                </div>
              </div>
            </button>
          );
        })}
        <div className="h-20" />
      </div>
      <div className="pointer-events-none absolute bottom-6 right-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5288C1] text-white shadow-lg shadow-black/40">
          <Pencil size={22} />
        </div>
      </div>
    </div>
  );
}
