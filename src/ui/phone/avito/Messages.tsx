import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Ban, CheckCircle2, ChevronLeft, CreditCard, EllipsisVertical, Flag, Loader2, Lock, MapPin, MessageCircle, RotateCw, ShieldCheck, Truck, XCircle } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { AvitoChat } from '../../../game/types';
import { AVITO_ITEMS } from '../../../game/data/static';
import { clockStr, digits, fmtRub } from '../../../game/util';
import { cn } from '../../common/kit';
import { AvitoLogo, BuyerAvatar } from './shared';

const URL_RE = /((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i;
const itemOf = (id: string) => AVITO_ITEMS.find((i) => i.id === id);

const STATE_LABEL: Record<AvitoChat['state'], string | null> = {
  open: null,
  agreed: 'Встреча назначена',
  done: 'Продано',
  closed: 'Диалог закрыт',
  scammed: 'Аккаунт удалён',
};

export function MessagesList({ onOpen }: { onOpen: (id: string) => void }) {
  const chats = useGame((s) => s.avito.chats);
  if (!chats.length)
    return (
      <div className="flex flex-col items-center px-8 py-16 text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#E5F6FF] text-[#00AAFF]">
          <MessageCircle size={30} />
        </div>
        <div className="text-[15px] font-semibold text-[#1A1A1A]">Пока нет сообщений</div>
        <div className="mt-1 text-[13px] leading-snug text-[#8F8F8F]">Разместите вещи во вкладке «Мои вещи» — покупатели напишут сюда.</div>
      </div>
    );
  return (
    <div className="bg-white">
      {chats.map((c) => {
        const item = itemOf(c.itemId);
        const last = c.messages[c.messages.length - 1];
        const label = STATE_LABEL[c.state];
        return (
          <button key={c.id} type="button" onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#F7F7F7]">
            <div className="relative">
              <BuyerAvatar name={c.buyer} size={48} />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-md bg-[#F2F1F0] text-[14px] ring-2 ring-white">{item?.emoji}</span>
            </div>
            <div className="min-w-0 flex-1 border-b border-[#EFEFEF] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-semibold text-[#1A1A1A]">{c.buyer}</span>
                <span className="ml-auto shrink-0 text-[12px] text-[#8F8F8F]">{last && clockStr(last.at)}</span>
              </div>
              <div className="truncate text-[12.5px] text-[#8F8F8F]">{item?.title}</div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className={cn('min-w-0 flex-1 truncate text-[13.5px]', c.unread ? 'font-medium text-[#1A1A1A]' : 'text-[#4D4D4D]')}>
                  {last ? `${last.from === 'me' ? 'Вы: ' : ''}${last.text}` : ''}
                </span>
                {c.unread > 0 ? (
                  <span className="min-w-[20px] shrink-0 rounded-full bg-[#00AAFF] px-1.5 text-center text-[11.5px] font-semibold leading-5 text-white">{c.unread}</span>
                ) : (
                  label && <span className={cn('shrink-0 text-[11px] font-medium', c.state === 'done' ? 'text-[#7AB51D]' : c.state === 'agreed' ? 'text-[#00AAFF]' : 'text-[#B5B5B5]')}>{label}</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MsgText({ text, phish, onLink }: { text: string; phish: boolean; onLink: (url: string) => void }) {
  if (!phish) return <>{text}</>;
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} onClick={() => onLink(p)} className="cursor-pointer break-all text-[#0A84FF] underline underline-offset-2">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function AvitoChatView({ id, onBack, onLink }: { id: string; onBack: () => void; onLink: (url: string) => void }) {
  const chat = useGame((s) => s.avito.chats.find((c) => c.id === id));
  const listingPrice = useGame((s) => {
    const c = s.avito.chats.find((x) => x.id === id);
    return c ? s.avito.listings.find((l) => l.itemId === c.itemId)?.price : undefined;
  });
  const avitoRead = useGame((s) => s.avitoRead);
  const avitoReply = useGame((s) => s.avitoReply);
  const [confirmReport, setConfirmReport] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const count = chat?.messages.length ?? 0;
  const unread = chat?.unread ?? 0;

  useEffect(() => {
    if (unread > 0) avitoRead(id);
  }, [unread, id, avitoRead]);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: count > 0 ? 'smooth' : 'auto' });
  }, [count, chat?.state]);

  if (!chat) return null;
  const item = itemOf(chat.itemId);
  const price = listingPrice ?? chat.offer;
  const reply = (a: Parameters<typeof avitoReply>[1]) => {
    avitoReply(id, a);
    setConfirmReport(false);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#F5F5F5]">
      <div className="flex h-[52px] shrink-0 items-center gap-2 bg-white px-1.5 shadow-[0_1px_0_#EFEFEF]">
        <button type="button" onClick={onBack} className="rounded-full p-2 text-[#1A1A1A] transition hover:bg-black/5">
          <ArrowLeft size={21} />
        </button>
        <BuyerAvatar name={chat.buyer} size={34} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-[#1A1A1A]">{chat.buyer}</div>
          <div className="text-[11.5px] text-[#8F8F8F]">{chat.state === 'scammed' ? 'Пользователь удалён' : 'Частное лицо · на Барахолке с 2025'}</div>
        </div>
        <EllipsisVertical size={20} className="mr-1 text-[#8F8F8F]" />
      </div>
      <div className="flex shrink-0 items-center gap-2.5 border-b border-[#EFEFEF] bg-white px-3 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F2F1F0] text-[22px]">{item?.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] text-[#1A1A1A]">{item?.title}</div>
          <div className="text-[14px] font-bold text-[#1A1A1A]">{fmtRub(price)}</div>
        </div>
      </div>

      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {chat.messages.map((m, i) =>
          m.from === 'system' ? (
            <div key={i} className="flex justify-center py-1">
              <span className="max-w-[85%] rounded-xl bg-[#E8E8E8] px-3 py-1.5 text-center text-[12px] leading-snug text-[#4D4D4D]">{m.text}</span>
            </div>
          ) : (
            <div key={i} className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[82%] rounded-2xl px-3 py-2 text-[14px] leading-snug text-[#1A1A1A]', m.from === 'me' ? 'rounded-br-md bg-[#D6EFFF]' : 'rounded-bl-md bg-white shadow-[0_1px_1px_rgba(0,0,0,.06)]')}>
                <span className="whitespace-pre-wrap break-words">
                  <MsgText text={m.text} phish={m.link === 'phish'} onLink={onLink} />
                </span>
                <span className="ml-2 inline-block translate-y-0.5 text-[10.5px] text-[#9B9B9B]">{clockStr(m.at)}</span>
              </div>
            </div>
          ),
        )}
      </div>

      <div className="shrink-0 border-t border-[#EFEFEF] bg-white p-2.5">
        {chat.state === 'open' &&
          (confirmReport ? (
            <div className="space-y-2">
              <div className="text-center text-[13px] text-[#1A1A1A]">Пожаловаться на {chat.buyer}? Пользователь будет заблокирован.</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => reply('report')} className="rounded-xl bg-[#FF6163] py-2.5 text-[14px] font-semibold text-white">
                  Пожаловаться
                </button>
                <button type="button" onClick={() => setConfirmReport(false)} className="rounded-xl bg-[#F2F1F0] py-2.5 text-[14px] font-semibold text-[#1A1A1A]">
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => reply('agree')} className="col-span-2 rounded-xl bg-[#00AAFF] py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#0099E6]">
                Договориться о встрече{chat.offer !== price ? ` за ${fmtRub(chat.offer)}` : ''}
              </button>
              <button type="button" onClick={() => reply('meet_only')} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#E5F6FF] py-2.5 text-[14px] font-semibold text-[#0088CC] transition hover:bg-[#D6EFFF]">
                <MapPin size={15} /> Только личная встреча
              </button>
              <button type="button" onClick={() => reply('decline')} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#F2F1F0] py-2.5 text-[13.5px] font-semibold text-[#1A1A1A] transition hover:bg-[#E8E8E8]">
                <XCircle size={15} /> Отказать
              </button>
              <button type="button" onClick={() => setConfirmReport(true)} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#FFF0F0] py-2.5 text-[13.5px] font-semibold text-[#E54848] transition hover:bg-[#FFE3E3]">
                <Flag size={15} /> Пожаловаться
              </button>
            </div>
          ))}
        {chat.state === 'agreed' && (
          <div className="flex items-center gap-2.5 rounded-xl bg-[#E5F6FF] px-3 py-2.5 text-[13.5px] text-[#1A1A1A]">
            <MapPin size={18} className="shrink-0 text-[#00AAFF]" />
            <div>
              <div className="font-semibold">Встреча в {chat.meetAt ? clockStr(chat.meetAt) : '—'} у подъезда</div>
              <div className="text-[12px] text-[#8F8F8F]">ул. Ленина 14, 1-й подъезд · оплата по СБП при встрече</div>
            </div>
          </div>
        )}
        {chat.state === 'done' && (
          <div className="flex items-center gap-2.5 rounded-xl bg-[#EAF6D8] px-3 py-2.5 text-[13.5px] font-medium text-[#3F6B00]">
            <CheckCircle2 size={18} className="shrink-0" /> Продано ✅ — деньги придут на Сбер по СБП
          </div>
        )}
        {chat.state === 'closed' && (
          <div className="flex items-center justify-center gap-2 py-1.5 text-[13px] text-[#8F8F8F]">
            <Ban size={15} /> Диалог закрыт
          </div>
        )}
        {chat.state === 'scammed' && (
          <div className="flex items-center gap-2.5 rounded-xl bg-[#FFE8E8] px-3 py-2.5 text-[13px] font-medium text-[#D93636]">
            <XCircle size={18} className="shrink-0" /> Собеседник удалил аккаунт. Проверьте выписку в Сбере.
          </div>
        )}
      </div>
    </div>
  );
}

const onlyDigits = (v: string, max: number) => digits(v).slice(0, max);

export function PhishPage({ url, chatId, onBack }: { url: string; chatId: string; onBack: () => void }) {
  const chat = useGame((s) => s.avito.chats.find((c) => c.id === chatId));
  const listingPrice = useGame((s) => {
    const c = s.avito.chats.find((x) => x.id === chatId);
    return c ? s.avito.listings.find((l) => l.itemId === c.itemId)?.price : undefined;
  });
  const phishSubmit = useGame((s) => s.phishSubmit);
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [sms, setSms] = useState('');
  const [stage, setStage] = useState<'form' | 'loading' | 'error'>('form');
  // Scammer deleted the site after a successful phish.
  const [dead] = useState(() => chat?.state === 'scammed');
  useEffect(() => {
    if (stage !== 'loading') return;
    const t = setTimeout(() => setStage('error'), 2200);
    return () => clearTimeout(t);
  }, [stage]);

  const domain = url.split('/')[0];
  const path = url.slice(domain.length);
  const item = chat ? itemOf(chat.itemId) : undefined;
  const price = listingPrice ?? chat?.offer ?? 0;
  const ready = card.length === 16 && exp.length === 4 && cvc.length === 3;

  return (
    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute inset-0 z-30 flex flex-col bg-white">
      <div className="shrink-0 bg-[#F2F2F2] px-2 pb-2 pt-1.5">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onBack} className="rounded-full p-1.5 text-[#1A1A1A] transition hover:bg-black/5">
            <ChevronLeft size={22} />
          </button>
          <div className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-white px-2.5 shadow-[0_0_0_1px_rgba(0,0,0,.05)]">
            <Lock size={13} className="shrink-0 text-[#4D4D4D]" />
            <span className="truncate text-[13.5px]">
              <span className="text-[#1A1A1A]">{domain}</span>
              <span className="text-[#9B9B9B]">{path}</span>
            </span>
          </div>
          <RotateCw size={17} className="mx-1 shrink-0 text-[#4D4D4D]" />
        </div>
      </div>

      {dead ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="text-[44px]">😕</div>
          <div className="mt-2 text-[16px] font-semibold text-[#1A1A1A]">Не удаётся получить доступ к сайту</div>
          <div className="mt-1 text-[13px] text-[#8F8F8F]">Не удалось найти IP-адрес сервера {domain}.</div>
          <div className="mt-2 font-mono text-[11px] text-[#B5B5B5]">DNS_PROBE_FINISHED_NXDOMAIN</div>
        </div>
      ) : (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#F7F7F7]">
          <div className="flex items-center justify-between bg-white px-4 py-3 shadow-[0_1px_0_#EFEFEF]">
            <AvitoLogo size="sm" label="Авито" />
            <span className="flex items-center gap-1 rounded-full bg-[#EAF6D8] px-2 py-0.5 text-[11px] font-semibold text-[#4B7A00]">
              <Truck size={12} /> Доставка
            </span>
          </div>

          {stage === 'form' && (
            <div className="p-4">
              <h1 className="text-[20px] font-bold leading-tight text-[#1A1A1A]">Авито Доставка — Получение оплаты</h1>
              <div className="mt-1 text-[13px] text-[#8F8F8F]">Заказ № {(chatId.replace(/\D/g, '') + '4417302').slice(0, 8)}</div>

              <div className="mt-3 rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F2F1F0] text-[24px]">{item?.emoji}</div>
                  <div className="min-w-0 text-[13px] leading-snug text-[#1A1A1A]">{item?.title}</div>
                </div>
                <div className="mt-3 rounded-xl bg-[#EAF6D8] px-3 py-2.5">
                  <div className="text-[22px] font-bold text-[#1A1A1A]">{fmtRub(price)}</div>
                  <div className="text-[12.5px] text-[#4B7A00]">ожидает зачисления</div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#4D4D4D]">
                  <ShieldCheck size={14} className="text-[#97CF26]" /> Покупатель оплатил заказ. Безопасная сделка.
                </div>
              </div>

              <div className="mt-4 text-[15px] font-semibold text-[#1A1A1A]">Карта для зачисления</div>
              <div className="mt-2 space-y-2.5">
                <label className="block">
                  <span className="text-[12px] text-[#8F8F8F]">Номер карты</span>
                  <div className="mt-1 flex h-11 items-center gap-2 rounded-xl border border-[#E0E0E0] bg-white px-3 focus-within:border-[#00AAFF]">
                    <CreditCard size={17} className="text-[#B5B5B5]" />
                    <input
                      value={card.replace(/(\d{4})(?=\d)/g, '$1 ')}
                      onChange={(e) => setCard(onlyDigits(e.target.value, 16))}
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      className="num min-w-0 flex-1 bg-transparent text-[15px] text-[#1A1A1A] outline-none placeholder:text-[#C8C8C8]"
                    />
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="text-[12px] text-[#8F8F8F]">Срок действия</span>
                    <input
                      value={exp.length > 2 ? `${exp.slice(0, 2)}/${exp.slice(2)}` : exp}
                      onChange={(e) => setExp(onlyDigits(e.target.value, 4))}
                      inputMode="numeric"
                      placeholder="ММ/ГГ"
                      className="num mt-1 h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-[15px] text-[#1A1A1A] outline-none placeholder:text-[#C8C8C8] focus:border-[#00AAFF]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-[#8F8F8F]">CVC</span>
                    <input
                      value={cvc}
                      onChange={(e) => setCvc(onlyDigits(e.target.value, 3))}
                      inputMode="numeric"
                      type="password"
                      placeholder="•••"
                      className="num mt-1 h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-[15px] text-[#1A1A1A] outline-none placeholder:text-[#C8C8C8] focus:border-[#00AAFF]"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[12px] text-[#8F8F8F]">Код из SMS</span>
                  <input
                    value={sms}
                    onChange={(e) => setSms(onlyDigits(e.target.value, 6))}
                    inputMode="numeric"
                    placeholder="Придёт на номер, привязанный к карте"
                    className="num mt-1 h-11 w-full rounded-xl border border-[#E0E0E0] bg-white px-3 text-[15px] text-[#1A1A1A] outline-none placeholder:text-[13px] placeholder:text-[#C8C8C8] focus:border-[#00AAFF]"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={!ready}
                onClick={() => {
                  phishSubmit(chatId);
                  setStage('loading');
                }}
                className="mt-4 h-12 w-full rounded-xl bg-[#97CF26] text-[15.5px] font-bold text-white transition hover:bg-[#8BC21C] disabled:opacity-50"
              >
                Получить {fmtRub(price)}
              </button>
              <div className="mt-3 flex items-center justify-center gap-3 text-[10.5px] font-bold tracking-wide text-[#B5B5B5]">
                <span>VISA</span>
                <span>Mastercard</span>
                <span>МИР</span>
                <span className="flex items-center gap-0.5">
                  <Lock size={10} /> SSL
                </span>
              </div>
              <div className="mt-4 text-center text-[10.5px] leading-snug text-[#C0C0C0]">© 2026 Авито Доставка. Средства зачисляются в течение 5 минут.</div>
            </div>
          )}

          {stage === 'loading' && (
            <div className="flex flex-col items-center px-8 py-24 text-center">
              <Loader2 size={38} className="animate-spin text-[#00AAFF]" />
              <div className="mt-4 text-[15px] font-semibold text-[#1A1A1A]">Обработка платежа…</div>
              <div className="mt-1 text-[12.5px] text-[#8F8F8F]">Не закрывайте страницу</div>
            </div>
          )}

          {stage === 'error' && (
            <div className="flex flex-col items-center px-8 py-20 text-center">
              <XCircle size={44} className="text-[#FF6163]" />
              <div className="mt-3 text-[16px] font-semibold text-[#1A1A1A]">Ошибка зачисления</div>
              <div className="mt-1 text-[13px] leading-snug text-[#8F8F8F]">Платёж отклонён банком-эмитентом. Код ошибки 0x51. Повторите попытку позже.</div>
              <button type="button" onClick={onBack} className="mt-5 rounded-xl bg-[#F2F1F0] px-5 py-2.5 text-[14px] font-semibold text-[#1A1A1A]">
                Вернуться
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
