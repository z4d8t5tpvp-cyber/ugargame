import { useState } from 'react';
import { ArrowLeft, ArrowRight, Lock, RotateCw, X } from 'lucide-react';
import { useGame } from '../../game/store';
import type { BrowserTab } from '../../game/types';
import { cn } from '../common/kit';
import BybitTab from '../pc/BybitTab';
import RapiraTab from '../pc/RapiraTab';
import SheetTab from '../pc/SheetTab';
import TaxTab from '../pc/TaxTab';
import ShopTab from '../pc/ShopTab';

const TABS: Record<BrowserTab, { title: string; url: string; icon: React.ReactNode }> = {
  bybit: { title: 'Bybit P2P', url: 'https://www.bybit-p2p.com/ru-RU/fiat/trade/otc', icon: <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#F0B90B] text-[8px] font-black text-black">B</span> },
  rapira: { title: 'Rapira — биржа', url: 'https://rapira.net/exchange/USDT_RUB', icon: <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#3B82F6] text-[8px] font-black text-white">R</span> },
  sheet: { title: 'Финмодель Карима и Марата KMI', url: 'https://docs.google.com/spreadsheets/d/1KMi-finmodel/edit', icon: <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#0F9D58] text-[9px] font-black text-white">▦</span> },
  tax: { title: 'Госуслуги · ФНС', url: 'https://lkfl2.nalog.ru/lkfl/business', icon: <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#0D4CD3] text-[8px] font-black text-white">Г</span> },
  shop: { title: 'Магазин имущества', url: 'https://market.novozarovsk-shop.ru/premium', icon: <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#A855F7] text-[8px] font-black text-white">М</span> },
};

export function useVisibleTabs(): BrowserTab[] {
  const rapira = useGame((s) => !!s.flags.rapiraUnlocked);
  const sheet = useGame((s) => !!s.flags.sheetUnlocked);
  const chapter = useGame((s) => s.chapter);
  const tabs: BrowserTab[] = ['bybit'];
  if (rapira) tabs.push('rapira');
  if (sheet) tabs.push('sheet');
  if (chapter >= 3) tabs.push('tax');
  if (chapter >= 2) tabs.push('shop');
  return tabs;
}

export default function BrowserApp() {
  const tab = useGame((s) => s.ui.browserTab);
  const setTab = useGame((s) => s.setBrowserTab);
  const tabs = useVisibleTabs();
  const [reload, setReload] = useState(0);
  const active = tabs.includes(tab) ? tab : 'bybit';
  const t = TABS[active];
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-end gap-0.5 bg-[#0b0e14] px-2 pt-1.5">
        {tabs.map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn('group flex h-full max-w-[210px] min-w-0 items-center gap-2 rounded-t-md px-3 text-xs transition', id === active ? 'bg-[#1c2230] text-white' : 'text-white/55 hover:bg-white/5')}
          >
            {TABS[id].icon}
            <span className="truncate">{TABS[id].title}</span>
            <X size={11} className="ml-1 shrink-0 opacity-0 group-hover:opacity-40" />
          </button>
        ))}
      </div>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-black/40 bg-[#1c2230] px-2">
        <ArrowLeft size={15} className="text-white/30" />
        <ArrowRight size={15} className="text-white/30" />
        <button title="Обновить" onClick={() => setReload((r) => r + 1)} className="rounded p-1 text-white/60 hover:bg-white/10">
          <RotateCw size={14} />
        </button>
        <div className="flex h-6 flex-1 items-center gap-2 rounded-full bg-[#0f131b] px-3 text-xs text-white/60">
          <Lock size={11} className="text-emerald-400" />
          <span className="truncate">{t.url}</span>
        </div>
      </div>
      <div key={`${active}-${reload}`} className="relative min-h-0 flex-1 overflow-hidden">
        {active === 'bybit' && <BybitTab />}
        {active === 'rapira' && <RapiraTab />}
        {active === 'sheet' && <SheetTab />}
        {active === 'tax' && <TaxTab />}
        {active === 'shop' && <ShopTab />}
      </div>
    </div>
  );
}
