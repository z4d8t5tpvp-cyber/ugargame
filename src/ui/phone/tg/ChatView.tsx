import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, CheckCheck, ChevronDown, EllipsisVertical, Mic, Paperclip, Phone, Pin, Smile } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { TgChat, TgMessage } from '../../../game/types';
import { clockStr, dayIndex } from '../../../game/util';
import { Avatar, cn } from '../../common/kit';
import { DealCard } from './DealCard';
import { FileCard, TgText, VideoCircle, VoiceBubble } from './Media';
import { chatSubtitle, dayLabel, nameColor, parseTyping, TG, TG_PATTERN, typingKey, typingText, useTgNav } from './shared';

type Item = { type: 'day'; key: string; at: number } | { type: 'msg'; key: string; m: TgMessage; first: boolean; last: boolean };

function TimeStamp({ m, mine, overlay }: { m: TgMessage; mine: boolean; overlay?: boolean }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-0.5 text-[11px] leading-none', overlay ? 'rounded-full bg-black/45 px-1.5 py-1 text-white/90' : mine ? 'text-[#7DA8D3]' : 'text-[#6D7F8F]')}
    >
      {clockStr(m.at)}
      {mine && <CheckCheck size={14} className={overlay ? 'text-white' : 'text-[#6AB3F3]'} />}
    </span>
  );
}

const Bubble = memo(function Bubble({ m, kind, first, last }: { m: TgMessage; kind: TgChat['kind']; first: boolean; last: boolean }) {
  const mine = m.from === 'me';
  const group = kind === 'group' || kind === 'channel';
  const showName = group && !mine && first && !!m.fromName;
  const showAvatar = kind === 'group' && !mine;

  if (m.kind === 'system')
    return (
      <div className="my-1.5 flex justify-center px-6">
        <span className="rounded-full bg-black/35 px-3 py-1 text-center text-[12.5px] leading-snug text-white/85">{m.text}</span>
      </div>
    );

  const time = <TimeStamp m={m} mine={mine} />;
  let body: ReactNode;
  let bare = false;
  if (m.kind === 'video') {
    bare = true;
    body = <VideoCircle m={m} time={<TimeStamp m={m} mine={mine} overlay />} />;
  } else if (m.kind === 'voice') body = <VoiceBubble m={m} mine={mine} time={time} />;
  else if (m.kind === 'file')
    body = (
      <>
        <FileCard m={m} mine={mine} />
        <div className="flex justify-end px-2.5 pb-1.5 pt-1">{time}</div>
      </>
    );
  else if (m.kind === 'deal' && m.dealId)
    body = (
      <>
        <DealCard dealId={m.dealId} fallback={m.text} />
        <div className="flex justify-end px-2.5 pb-1.5">{time}</div>
      </>
    );
  else
    body = (
      <div className="relative px-2.5 pb-1.5 pt-[5px] text-[14.5px] leading-[1.35] text-white">
        <TgText text={m.text} />
        <span className={cn('inline-block', mine ? 'w-[58px]' : 'w-[40px]')} />
        <span className="absolute bottom-1.5 right-2">{time}</span>
      </div>
    );

  return (
    <div className={cn('flex items-end gap-1.5 px-2', mine ? 'justify-end' : 'justify-start', last ? 'mb-2' : 'mb-[3px]')}>
      {showAvatar && (last ? <Avatar name={m.fromName ?? '?'} color={nameColor(m.from)} size={34} /> : <div className="w-[34px] shrink-0" />)}
      <div
        className={cn(
          'min-w-0',
          bare ? '' : 'overflow-hidden rounded-[17px] shadow-[0_1px_1px_rgba(0,0,0,.25)]',
          !bare && (m.kind === 'deal' ? 'max-w-[95%]' : 'max-w-[86%]'),
          !bare && last && (mine ? 'rounded-br-[5px]' : 'rounded-bl-[5px]'),
        )}
        style={bare ? undefined : { background: mine ? TG.mine : TG.theirs }}
      >
        {showName && (
          <div className={cn('truncate px-2.5 pt-1.5 text-[13px] font-semibold', bare && 'pb-1')} style={{ color: nameColor(m.from) }}>
            {m.fromName}
          </div>
        )}
        {body}
      </div>
    </div>
  );
});

function TypingBubble({ name, from, group }: { name: string; from: string; group: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 flex items-end gap-1.5 px-2">
      {group && <Avatar name={name || '?'} color={nameColor(from)} size={34} />}
      <div className="flex items-center gap-1 rounded-[17px] rounded-bl-[5px] px-3.5 py-3" style={{ background: TG.theirs }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot h-2 w-2 rounded-full bg-[#7F91A4]" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </motion.div>
  );
}

export function ChatView({ id, onBack }: { id: string; onBack: () => void }) {
  const chat = useGame((s) => s.tg[id]);
  const pending = useGame((s) => s.tgPending[id]);
  const tKey = useGame((s) => typingKey(s, id));
  const today = useGame((s) => dayIndex(s.now));
  const online = useGame((s) => {
    const c = s.tg[id];
    if (!c || c.kind !== 'private') return false;
    for (let i = c.messages.length - 1; i >= 0; i--) {
      const m = c.messages[i];
      if (m.from !== 'me' && m.kind !== 'system') return s.now - m.at < 20;
    }
    return false;
  });
  const tgChoose = useGame((s) => s.tgChoose);
  const tgRead = useGame((s) => s.tgRead);
  const { openProfile } = useTgNav();
  const [pinOpen, setPinOpen] = useState(false);

  const typing = parseTyping(tKey)[0];
  const msgs = chat?.messages;
  const count = msgs?.length ?? 0;
  const unread = chat?.unread ?? 0;

  useEffect(() => {
    if (unread > 0) tgRead(id);
  }, [unread, id, tgRead]);

  const items = useMemo(() => {
    const out: Item[] = [];
    if (!msgs) return out;
    let prevDay: number | null = null;
    msgs.forEach((m, i) => {
      const d = dayIndex(m.at);
      if (d !== prevDay) {
        out.push({ type: 'day', key: `d${d}`, at: m.at });
        prevDay = d;
      }
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      const same = (o?: TgMessage) => !!o && o.from === m.from && o.kind !== 'system' && m.kind !== 'system' && dayIndex(o.at) === d;
      out.push({ type: 'msg', key: m.id, m, first: !same(prev), last: !same(next) });
    });
    return out;
  }, [msgs]);

  // Scroll: stick to bottom unless the player scrolled up to re-read.
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const programmatic = useRef(0);
  const [jump, setJump] = useState(false);
  const toBottom = (smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    programmatic.current = performance.now();
    atBottom.current = true;
    setJump(false);
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };
  useLayoutEffect(() => {
    toBottom(false);
  }, [id]);
  const lastMine = msgs?.[count - 1]?.from === 'me';
  useEffect(() => {
    if (atBottom.current || lastMine) toBottom(true);
  }, [count, !!typing, !!pending, lastMine]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || performance.now() - programmatic.current < 500) return;
    const b = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    atBottom.current = b;
    setJump(!b);
  };

  if (!chat) return null;
  const group = chat.kind === 'group';

  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: TG.bg }}>
      <div className="z-10 flex h-[54px] shrink-0 items-center gap-2 bg-[#17212B] pl-1 pr-2 shadow-[0_1px_2px_rgba(0,0,0,.4)]">
        <button type="button" onClick={onBack} className="rounded-full p-2 text-white/80 transition hover:bg-white/10">
          <ArrowLeft size={21} />
        </button>
        <button type="button" onClick={() => openProfile(id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <Avatar name={chat.title} color={chat.color} emoji={chat.emoji} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-[15.5px] font-semibold text-white">{chat.title}</span>
              {chat.verified && <BadgeCheck size={15} fill="#3E9BEB" color="#fff" className="shrink-0" />}
            </div>
            <div className={cn('truncate text-[12.5px]', typing || (online && chat.kind === 'private') ? 'text-[#6AB3F3]' : 'text-[#7F91A4]')}>
              {typing ? typingText(typing, group) : chatSubtitle(chat, online)}
            </div>
          </div>
        </button>
        {chat.kind === 'private' && <Phone size={19} className="shrink-0 text-white/70" />}
        <EllipsisVertical size={20} className="shrink-0 text-white/70" />
      </div>

      {chat.pinned && (
        <button type="button" onClick={() => setPinOpen((v) => !v)} className="z-10 flex shrink-0 items-start gap-2 border-t border-black/30 bg-[#17212B] px-3 py-1.5 text-left shadow-[0_1px_2px_rgba(0,0,0,.35)]">
          <span className="mt-0.5 h-[34px] w-[2px] shrink-0 rounded-full bg-[#6AB3F3]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#6AB3F3]">Закреплённое сообщение</span>
            <span className={cn('block text-[13px] text-white/85', pinOpen ? 'whitespace-pre-wrap' : 'truncate')}>{chat.pinned}</span>
          </span>
          <Pin size={16} className="mt-1 shrink-0 rotate-45 text-[#7F91A4]" />
        </button>
      )}

      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: TG_PATTERN, backgroundSize: '180px 180px' }} />
        <div ref={scrollRef} onScroll={onScroll} className="no-scrollbar relative h-full overflow-y-auto pb-1 pt-2">
          {count === 0 && (
            <div className="mx-auto mt-16 max-w-[240px] rounded-2xl bg-black/30 px-4 py-4 text-center text-[13px] leading-snug text-white/80">
              {chat.kind === 'bot' ? (
                <>
                  <div className="mb-1 font-semibold text-white">Что умеет этот бот?</div>
                  {chat.bio}
                </>
              ) : (
                <>
                  <div className="mb-1 text-2xl">👋</div>
                  Здесь пока нет сообщений
                </>
              )}
            </div>
          )}
          {items.map((it) =>
            it.type === 'day' ? (
              <div key={it.key} className="my-2 flex justify-center">
                <span className="rounded-full bg-black/35 px-2.5 py-0.5 text-[12.5px] font-medium text-white/85">{dayLabel(it.at, today)}</span>
              </div>
            ) : (
              <Bubble key={it.key} m={it.m} kind={chat.kind} first={it.first} last={it.last} />
            ),
          )}
          <AnimatePresence>{typing && <TypingBubble key="typing" name={typing.name} from={typing.from} group={group} />}</AnimatePresence>
        </div>
        <AnimatePresence>
          {jump && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => toBottom(true)}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#17212B] text-white/80 shadow-lg shadow-black/40"
            >
              <ChevronDown size={22} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {pending && (
          <motion.div
            key={pending.nodeId}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="scroll-thin z-10 max-h-[46%] shrink-0 space-y-1.5 overflow-y-auto border-t border-black/30 bg-[#17212B] px-2 pb-1 pt-2"
          >
            {pending.options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => tgChoose(id, o.id)}
                className="w-full rounded-lg bg-[#2A3A4D] px-3 py-2.5 text-center text-[14px] font-medium leading-snug text-white shadow-[0_1px_0_rgba(0,0,0,.35)] transition hover:bg-[#33475E] active:scale-[0.99]"
              >
                {o.text}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="z-10 flex h-[50px] shrink-0 items-center gap-2.5 bg-[#17212B] px-3">
        <Smile size={22} className="shrink-0 text-[#7F91A4]" />
        <input
          disabled
          placeholder={pending ? 'Выберите ответ выше…' : 'Сообщение'}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#6D7F8F] disabled:cursor-not-allowed"
        />
        <Paperclip size={21} className="shrink-0 rotate-45 text-[#7F91A4]" />
        <Mic size={21} className="shrink-0 text-[#7F91A4]" />
      </div>
    </div>
  );
}
