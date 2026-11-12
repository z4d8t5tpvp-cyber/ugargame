import { createContext, useContext } from 'react';
import type { GameState, TgChat, TgMessage } from '../../../game/types';
import { clockStr, dateLong, dateStr, dayIndex, pad2, plural, shortDT } from '../../../game/util';

export interface TgNav {
  openChat: (id: string) => void;
  openProfile: (id: string) => void;
  /** username (with @) → chat id */
  usernames: Record<string, string>;
}
export const TgNavCtx = createContext<TgNav>({ openChat: () => {}, openProfile: () => {}, usernames: {} });
export const useTgNav = () => useContext(TgNavCtx);

export const TG = {
  header: '#17212B',
  bg: '#0E1621',
  accent: '#5288C1',
  link: '#6AB3F3',
  mine: '#2B5278',
  theirs: '#182533',
  sub: '#7F91A4',
};

const NAME_COLORS = ['#FC5C51', '#FA790F', '#E6B325', '#0FB297', '#0FC9D6', '#3CA5EC', '#895DD5', '#D54FAF'];
export const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};
export const nameColor = (key: string) => NAME_COLORS[hashStr(key) % NAME_COLORS.length];

/** Seeded pseudo-random sequence in 0..1. */
export const seeded = (seed: number) => {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
};

export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${pad2(Math.floor(sec % 60))}`;

export function msgPreview(m: TgMessage, chat: TgChat): string {
  const body =
    m.kind === 'voice'
      ? '🎤 Голосовое сообщение'
      : m.kind === 'video'
        ? '📹 Видеосообщение'
        : m.kind === 'file'
          ? `📎 ${m.file?.name ?? m.text}`
          : m.kind === 'deal'
            ? '🤝 OTC-сделка'
            : m.text.replace(/\s+/g, ' ');
  if (m.from === 'me') return `Вы: ${body}`;
  if ((chat.kind === 'group') && m.fromName && m.kind !== 'system') return `${m.fromName}: ${body}`;
  return body;
}

/** Chat-list style time: today → HH:MM, this week → weekday, older → dd.mm */
export function listTime(at: number, today: number) {
  const d = dayIndex(at);
  if (d === today) return clockStr(at);
  if (today - d < 7 && today - d > 0) return dateStr(at).split(',')[0];
  return shortDT(at).split(' ')[0];
}

export function dayLabel(at: number, today: number) {
  const d = dayIndex(at);
  if (d === today) return 'Сегодня';
  if (d === today - 1) return 'Вчера';
  return dateLong(at).replace(/ \d{4}$/, '');
}

export interface TypingInfo {
  chatId: string;
  name: string;
  kind: TgMessage['kind'];
  from: string;
}

/** Primitive key of chats where someone is "typing" — next queued message due within 3 real seconds. */
export function typingKey(s: GameState, chatId?: string) {
  const out: string[] = [];
  for (const q of s.tgQueue) {
    if (q.silent || q.msg.kind === 'system' || q.msg.from === 'me') continue;
    if (chatId && q.chatId !== chatId) continue;
    const dt = q.at - s.rt;
    if (dt > 0 && dt < 3) out.push(`${q.chatId}\u0001${q.msg.fromName ?? ''}\u0001${q.msg.kind}\u0001${q.msg.from}`);
  }
  return out.join('\u0002');
}
export function parseTyping(key: string): TypingInfo[] {
  if (!key) return [];
  return key.split('\u0002').map((p) => {
    const [chatId, name, kind, from] = p.split('\u0001');
    return { chatId, name, kind: kind as TgMessage['kind'], from };
  });
}
export function typingText(t: TypingInfo, group: boolean) {
  const verb = t.kind === 'voice' ? 'записывает аудио…' : t.kind === 'video' ? 'записывает видео…' : t.kind === 'file' ? 'отправляет файл…' : 'печатает…';
  return group && t.name ? `${t.name} ${verb}` : verb;
}

export function chatSubtitle(chat: TgChat, online: boolean) {
  if (chat.kind === 'group') {
    const n = chat.members ?? 0;
    return `${n.toLocaleString('ru-RU')} ${plural(n, 'участник', 'участника', 'участников')}`;
  }
  if (chat.kind === 'channel') {
    const n = chat.members ?? 0;
    return `${n.toLocaleString('ru-RU')} ${plural(n, 'подписчик', 'подписчика', 'подписчиков')}`;
  }
  if (chat.kind === 'bot') return 'бот';
  return online ? 'в сети' : 'был(а) недавно';
}

const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'><g fill='none' stroke='#9DB4CC' stroke-opacity='0.07' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M14 34 L46 20 L38 52 L31 40 Z M31 40 L46 20'/><circle cx='128' cy='30' r='11'/><path d='M124 30 h8 M128 24 v12'/><path d='M84 82 l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2 z'/><path d='M150 104 c0 -7 10 -7 10 0 c0 -7 10 -7 10 0 c0 8 -10 13 -10 16 c0 -3 -10 -8 -10 -16 z'/><rect x='20' y='118' width='34' height='24' rx='8'/><path d='M28 142 l-4 9 10 -9'/><path d='M110 150 q10 -14 20 0 t20 0'/><circle cx='64' cy='160' r='4'/><path d='M150 60 l10 6 -10 6 z'/></g></svg>`;
export const TG_PATTERN = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
