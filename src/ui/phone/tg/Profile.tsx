import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AtSign, BadgeCheck, Bell, CalendarDays, Fingerprint, Info, MessageCircle, Phone, Users } from 'lucide-react';
import { useGame } from '../../../game/store';
import { plural } from '../../../game/util';
import { Avatar, CopyBtn } from '../../common/kit';
import { chatSubtitle } from './shared';

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-2.5">
      <div className="mt-0.5 text-[#7F91A4]">{icon}</div>
      <div className="min-w-0 flex-1 border-b border-white/5 pb-2.5">
        <div className="text-[14.5px] leading-snug text-white">{children}</div>
        <div className="mt-0.5 text-[12.5px] text-[#7F91A4]">{label}</div>
      </div>
    </div>
  );
}

export function Profile({ id, onClose, onWrite }: { id: string; onClose: () => void; onWrite: () => void }) {
  const chat = useGame((s) => s.tg[id]);
  if (!chat) return null;
  const group = chat.kind === 'group' || chat.kind === 'channel';
  const n = chat.members ?? 0;
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="absolute inset-0 z-30 flex flex-col bg-[#0E1621]"
    >
      <div className="relative shrink-0 bg-[#17212B] pb-5">
        <div className="flex h-12 items-center gap-2 px-2">
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/80 transition hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <span className="text-[16px] font-semibold text-white">{chat.kind === 'channel' ? 'Канал' : chat.kind === 'group' ? 'Группа' : 'Профиль'}</span>
        </div>
        <div className="flex flex-col items-center px-4 pt-1">
          <Avatar name={chat.title} color={chat.color} emoji={chat.emoji} size={92} className="shadow-xl shadow-black/30" />
          <div className="mt-3 flex items-center gap-1.5 text-center text-[19px] font-semibold text-white">
            {chat.title}
            {chat.verified && <BadgeCheck size={19} fill="#3E9BEB" color="#fff" className="shrink-0" />}
          </div>
          <div className="mt-0.5 text-[13px] text-[#7F91A4]">{chatSubtitle(chat, false)}</div>
        </div>
        {!group && (
          <div className="mt-4 grid grid-cols-3 gap-2 px-4">
            {[
              { icon: <MessageCircle size={18} />, label: 'Чат', on: onWrite },
              { icon: <Phone size={18} />, label: 'Звонок' },
              { icon: <Bell size={18} />, label: 'Звук' },
            ].map((b) => (
              <button key={b.label} type="button" onClick={b.on} className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.06] py-2 text-[11.5px] text-[#6AB3F3] transition hover:bg-white/10">
                {b.icon}
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mt-2 bg-[#17212B] py-1">
          <div className="px-4 pb-1 pt-2 text-[13.5px] font-semibold text-[#6AB3F3]">Информация</div>
          <InfoRow icon={<AtSign size={20} />} label="Имя пользователя">
            <span className="flex items-center gap-2">
              <span className="break-all font-mono text-[15px] tracking-wide text-white">{chat.username}</span>
              <CopyBtn value={chat.username} label={`Юзернейм ${chat.username}`} className="shrink-0 px-1 py-0 text-[11px]">
                <span className="sr-only">Скопировать</span>
              </CopyBtn>
            </span>
          </InfoRow>
          {chat.bio && (
            <InfoRow icon={<Info size={20} />} label={group ? 'Описание' : 'О себе'}>
              <span className="whitespace-pre-wrap">{chat.bio}</span>
            </InfoRow>
          )}
          <InfoRow icon={<Fingerprint size={20} />} label="ID">
            <span className="font-mono text-[14px]">{chat.tgId}</span>
          </InfoRow>
          {group && (
            <InfoRow icon={<Users size={20} />} label={chat.kind === 'channel' ? 'Подписчики' : 'Участники'}>
              {n.toLocaleString('ru-RU')} {chat.kind === 'channel' ? plural(n, 'подписчик', 'подписчика', 'подписчиков') : plural(n, 'участник', 'участника', 'участников')}
            </InfoRow>
          )}
        </div>

        <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#17212B] px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5288C1]/20 text-[#6AB3F3]">
            <CalendarDays size={22} />
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-wide text-[#7F91A4]">{group ? 'Создан' : 'Аккаунт создан'}</div>
            <div className="num text-[24px] font-bold leading-tight text-white">{chat.regYear}</div>
          </div>
        </div>

        <div className="p-3">
          <button type="button" onClick={onWrite} className="w-full rounded-xl bg-[#5288C1] py-2.5 text-[14.5px] font-semibold text-white transition hover:bg-[#5f97d1]">
            {chat.kind === 'channel' ? 'Открыть канал' : 'Написать'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
