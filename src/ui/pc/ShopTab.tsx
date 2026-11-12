import { useState } from 'react';
import { CarFront, CircleCheck, Heart, House, Lock, Monitor, Search, ShoppingCart, Smartphone, Star, Building, Truck } from 'lucide-react';
import { useGame } from '../../game/store';
import type { BankId, GameState } from '../../game/types';
import { BANKS, CHARACTERS, SHOP } from '../../game/data/static';
import { fmtRub, maskCard } from '../../game/util';
import { cn } from '../common/kit';
import { useLightResult } from './parts/lightResult';

type Item = (typeof SHOP)[number];
type Cat = 'all' | Item['cat'];

const CATS: { id: Cat; label: string }[] = [
  { id: 'all', label: 'Все товары' },
  { id: 'pc', label: 'Техника' },
  { id: 'phone', label: 'Телефоны' },
  { id: 'home', label: 'Недвижимость' },
  { id: 'car', label: 'Авто' },
  { id: 'service', label: 'Сервисы' },
];

const TILE: Record<Item['cat'], string> = {
  pc: 'from-[#E0E7FF] to-[#F5F3FF]',
  phone: 'from-[#F1F5F9] to-[#E2E8F0]',
  home: 'from-[#DCFCE7] to-[#F0FDF4]',
  car: 'from-[#FEF3C7] to-[#FFFBEB]',
  service: 'from-[#E0F2FE] to-[#F0F9FF]',
};

const SELLER: Record<string, { name: string; rating: number; reviews: number; ship: string }> = {
  pc1: { name: 'DNS · Новозаровск', rating: 4.8, reviews: 1243, ship: 'Самовывоз завтра' },
  pc2: { name: 'Ситилинк', rating: 4.9, reviews: 387, ship: 'Доставка и сборка за 2 дня' },
  phone1: { name: 're:Store', rating: 4.9, reviews: 5120, ship: 'Доставка завтра' },
  flat: { name: 'Циан · собственник', rating: 4.6, reviews: 18, ship: 'Заселение через 2 дня' },
  office: { name: 'Коворкинг «Сити»', rating: 4.7, reviews: 92, ship: 'Ключ-карта в день оплаты' },
  lada: { name: 'Авто.ру · частник', rating: 4.5, reviews: 7, ship: 'Осмотр и сделка в ГИБДД' },
  bmw: { name: 'Премиум Лизинг Москва', rating: 4.1, reviews: 31, ship: 'Выдача в салоне через 5 дней' },
  aml: { name: 'AML-скринер PRO', rating: 4.8, reviews: 642, ship: 'Доступ сразу после оплаты' },
};

function useOwned() {
  const hero = useGame((s) => s.hero);
  const office = useGame((s) => !!s.flags.officeRented);
  const aml = useGame((s) => !!s.flags.amlPro);
  return (id: string) =>
    (id === 'pc1' && hero.pcTier >= 1) ||
    (id === 'pc2' && hero.pcTier >= 2) ||
    (id === 'phone1' && hero.phoneTier >= 1) ||
    (id === 'flat' && hero.home !== 'room') ||
    (id === 'office' && office) ||
    (id === 'lada' && hero.car === 'lada') ||
    (id === 'bmw' && hero.car === 'bmw_leasing') ||
    (id === 'aml' && aml);
}

export default function ShopTab() {
  const [cat, setCat] = useState<Cat>('all');
  const [q, setQ] = useState('');
  const [bank, setBank] = useState<BankId | null>(null);
  const banks = useGame((s) => s.banks);
  const opened = (['sber', 'tbank', 'alfa'] as BankId[]).filter((id) => banks[id].opened);
  const payFrom = bank && opened.includes(bank) ? bank : opened.slice().sort((a, b) => banks[b].balance - banks[a].balance)[0] ?? null;
  const query = q.trim().toLowerCase();
  const items = SHOP.filter((i) => (cat === 'all' || i.cat === cat) && (!query || `${i.title} ${i.desc}`.toLowerCase().includes(query)));

  return (
    <div className="@container flex h-full min-h-0 flex-col bg-[#F2F3F7] text-[#1A1A1A]">
      <header className="shrink-0 bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#C026D3] px-4 pt-2.5 pb-2 text-white">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 items-baseline gap-1.5">
            <span className="text-[20px] font-black tracking-tight">НовоМаркет</span>
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">премиум</span>
          </div>
          <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl bg-white">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Искать на НовоМаркете" className="min-w-0 flex-1 px-3 py-1.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF]" />
            <span className="m-0.5 flex items-center rounded-lg bg-[#7C3AED] px-3">
              <Search size={16} />
            </span>
          </div>
          <div className="hidden items-center gap-4 text-[11px] @3xl:flex">
            <span className="flex flex-col items-center"><Heart size={18} />Избранное</span>
            <span className="flex flex-col items-center"><ShoppingCart size={18} />Корзина</span>
          </div>
        </div>
        <nav className="scroll-thin mt-2 flex gap-1 overflow-x-auto">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-medium transition', cat === c.id ? 'bg-white text-[#6D28D9]' : 'text-white/90 hover:bg-white/15')}
            >
              {c.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="scroll-thin scroll-light min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1100px] space-y-3 p-3">
          <Setup />
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
            <span className="text-xs font-semibold text-[#6B7280]">Оплата картой:</span>
            {opened.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setBank(id)}
                className={cn('flex items-center gap-2 rounded-xl border-2 px-2.5 py-1 text-left transition', payFrom === id ? 'border-[#7C3AED] bg-[#F5F3FF]' : 'border-[#E5E7EB] hover:border-[#C4B5FD]')}
              >
                <span className="h-5 w-7 rounded" style={{ background: BANKS[id].color }} />
                <span>
                  <span className="block text-[11px] font-semibold">
                    {BANKS[id].name} <span className="num font-normal text-[#6B7280]">{maskCard(banks[id].card)}</span>
                  </span>
                  <span className="num block text-[11px] text-[#6B7280]">{fmtRub(banks[id].balance)}</span>
                </span>
              </button>
            ))}
          </div>
          {items.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#6B7280]">По запросу «{q}» ничего не нашлось</div>
          ) : (
            <div className="grid gap-3 @2xl:grid-cols-2 @4xl:grid-cols-3">
              {items.map((i) => (i.id === 'bmw' ? <BmwCard key={i.id} item={i} payFrom={payFrom} /> : <ItemCard key={i.id} item={i} payFrom={payFrom} />))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────── current setup ─────────

const PC_LABEL = ['Старый ноутбук, 8 ГБ', 'Ryzen 5 / 32 ГБ', 'Ryzen 9 + 2 монитора'];
const HOME_LABEL: Record<GameState['hero']['home'], string> = { room: 'Комната в Новозаровске', flat: 'Студия в Москве', office: 'Офис' };
const CAR_LABEL = { none: 'Нет — автобус №32', lada: 'Lada Vesta', bmw_leasing: 'BMW M5 (лизинг)' };

function Setup() {
  const hero = useGame((s) => s.hero);
  const office = useGame((s) => !!s.flags.officeRented);
  const owned = useOwned();
  const monthly = SHOP.reduce((s, i) => s + (i.monthly && owned(i.id) ? i.monthly : 0), 0);
  const cells = [
    { icon: <Monitor size={16} />, label: 'Компьютер', v: PC_LABEL[hero.pcTier] },
    { icon: <Smartphone size={16} />, label: 'Телефон', v: hero.phoneTier ? 'iPhone 15 Pro' : 'Старый Android' },
    { icon: <House size={16} />, label: 'Жильё', v: HOME_LABEL[hero.home] },
    { icon: <Building size={16} />, label: 'Офис', v: office ? 'Коворкинг «Сити»' : 'Нет' },
    { icon: <CarFront size={16} />, label: 'Авто', v: CAR_LABEL[hero.car ?? 'none'] },
  ];
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold">Ваш сетап</span>
        <span className="text-xs text-[#6B7280]">
          Постоянные расходы: <b className={cn('num', monthly ? 'text-[#DC2626]' : 'text-[#1A1A1A]')}>{fmtRub(monthly)}/мес</b>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-5">
        {cells.map((c) => (
          <div key={c.label} className="rounded-xl bg-[#F7F7FB] px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
              <span className="text-[#7C3AED]">{c.icon}</span>
              {c.label}
            </div>
            <div className="mt-0.5 truncate text-xs font-semibold">{c.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── product cards ─────────

function useBuy(item: Item, payFrom: BankId | null) {
  const buyShop = useGame((s) => s.buyShop);
  const chapter = useGame((s) => s.chapter);
  const owned = useOwned()(item.id);
  const [confirm, setConfirm] = useState(false);
  const res = useLightResult();
  const locked = chapter < item.minChapter;
  const buy = () => {
    if (!payFrom) return res.show({ ok: false, error: 'Нет открытой карты для оплаты' });
    res.show(buyShop(item.id, payFrom), 'Оплачено. Заказ оформлен');
    setConfirm(false);
  };
  return { owned, locked, confirm, setConfirm, buy, res };
}

function Price({ item, dark }: { item: Item; dark?: boolean }) {
  return (
    <div>
      <div className={cn('num text-[20px] leading-tight font-black', dark ? 'text-white' : 'text-[#1A1A1A]')}>{fmtRub(item.price)}</div>
      {item.monthly ? <div className={cn('num text-xs font-semibold', dark ? 'text-amber-300' : 'text-[#DC2626]')}>+ {fmtRub(item.monthly)}/мес</div> : <div className="text-xs text-transparent">—</div>}
    </div>
  );
}

function BuyArea({ b, item, payFrom, dark }: { b: ReturnType<typeof useBuy>; item: Item; payFrom: BankId | null; dark?: boolean }) {
  const banks = useGame((s) => s.banks);
  if (b.owned)
    return (
      <div className={cn('flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold', dark ? 'bg-white/10 text-emerald-300' : 'bg-[#ECFDF5] text-[#059669]')}>
        <CircleCheck size={16} /> {item.monthly ? 'Оформлено' : 'Куплено'}
      </div>
    );
  if (b.locked)
    return (
      <div className={cn('flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold', dark ? 'bg-white/10 text-white/50' : 'bg-[#F3F4F6] text-[#9CA3AF]')}>
        <Lock size={15} /> Доступно с главы {item.minChapter}
      </div>
    );
  if (b.confirm && payFrom)
    return (
      <div className={cn('space-y-2 rounded-xl p-2.5 text-xs', dark ? 'bg-white/10 text-white/80' : 'bg-[#F5F3FF] text-[#4B5563]')}>
        <div>
          Списать <b className="num">{fmtRub(item.price)}</b> с карты {BANKS[payFrom].name} <span className="num">{maskCard(banks[payFrom].card)}</span>?
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={b.buy} className="rounded-lg bg-[#7C3AED] py-1.5 font-semibold text-white hover:bg-[#6D28D9]">
            Оплатить
          </button>
          <button type="button" onClick={() => b.setConfirm(false)} className={cn('rounded-lg py-1.5 font-semibold', dark ? 'bg-white/10 hover:bg-white/20' : 'bg-white hover:bg-[#EDE9FE]')}>
            Отмена
          </button>
        </div>
      </div>
    );
  return (
    <button type="button" onClick={() => b.setConfirm(true)} className={cn('w-full rounded-xl py-2 text-sm font-bold transition', dark ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black hover:brightness-105' : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]')}>
      {item.monthly ? 'Оформить' : 'Купить'}
    </button>
  );
}

function Rating({ id, dark }: { id: string; dark?: boolean }) {
  const s = SELLER[id];
  if (!s) return null;
  return (
    <div className={cn('flex items-center gap-1 text-[11px]', dark ? 'text-white/60' : 'text-[#6B7280]')}>
      <Star size={12} className="fill-amber-400 text-amber-400" />
      <span className="num font-semibold">{s.rating.toFixed(1)}</span>
      <span>· {s.reviews} отзывов · {s.name}</span>
    </div>
  );
}

function ItemCard({ item, payFrom }: { item: Item; payFrom: BankId | null }) {
  const b = useBuy(item, payFrom);
  return (
    <article className={cn('flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md', b.locked && 'opacity-75')}>
      <div className={cn('relative flex h-28 items-center justify-center bg-gradient-to-br', TILE[item.cat])}>
        <span className={cn('text-[56px] drop-shadow-sm', b.locked && 'grayscale')}>{item.emoji}</span>
        {b.owned && <span className="absolute top-2 left-2 rounded-full bg-[#059669] px-2 py-0.5 text-[10px] font-bold text-white">У вас есть</span>}
        {b.locked && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            <Lock size={10} /> Глава {item.minChapter}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Price item={item} />
        <h3 className="text-sm leading-snug font-semibold">{item.title}</h3>
        <p className="flex-1 text-xs leading-relaxed text-[#6B7280]">{item.desc}</p>
        <Rating id={item.id} />
        {SELLER[item.id] && (
          <div className="flex items-center gap-1 text-[11px] text-[#059669]">
            <Truck size={12} /> {SELLER[item.id].ship}
          </div>
        )}
        <div className="mt-1">
          <BuyArea b={b} item={item} payFrom={payFrom} />
        </div>
        {b.res.node}
      </div>
    </article>
  );
}

function BmwCard({ item, payFrom }: { item: Item; payFrom: BankId | null }) {
  const b = useBuy(item, payFrom);
  const ivan = CHARACTERS.ivan;
  const karim = CHARACTERS.karim;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#0C0A09] text-white shadow-lg ring-2 ring-amber-400/70 @2xl:col-span-2 @4xl:col-span-1">
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.45),transparent_65%)]">
        <span className={cn('text-[60px] drop-shadow-[0_6px_18px_rgba(251,191,36,0.5)]', b.locked && 'grayscale')}>{item.emoji}</span>
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-2 py-0.5 text-[10px] font-black text-black">
          {ivan.emoji} Предложение Ивана Ролекса
        </span>
        <span className="absolute top-2 right-2 rounded-full bg-[#DC2626] px-2 py-0.5 text-[10px] font-bold">ХИТ</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Price item={item} dark />
        <h3 className="text-sm leading-snug font-semibold">{item.title}</h3>
        <p className="text-xs leading-relaxed text-white/60">{item.desc}</p>
        <Rating id={item.id} dark />
        <div className="mt-1 flex gap-2 rounded-xl border border-[#14B8A6]/40 bg-[#14B8A6]/10 p-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm" style={{ background: `${karim.color}33` }}>
            {karim.emoji}
          </span>
          <div className="text-[11px] leading-snug text-white/80">
            <b className="text-[#5EEAD4]">{karim.name}:</b> «Лизинг 240 000 ₽/мес — это кассовый разрыв при первой заморозке»
          </div>
        </div>
        <div className="mt-1">
          <BuyArea b={b} item={item} payFrom={payFrom} dark />
        </div>
        {b.res.node}
      </div>
    </article>
  );
}
