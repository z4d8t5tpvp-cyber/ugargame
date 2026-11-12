import type { BankId, ExtBankId } from '../../../game/types';

/** Per-bank visual tokens. Class strings are literal so Tailwind can pick them up. */
export interface BankTheme {
  id: BankId;
  dark: boolean;
  hex: string;
  /** App root: background + base text colour. */
  app: string;
  /** Header bar of inner screens. */
  bar: string;
  /** Raised card surface. */
  surface: string;
  /** Text input surface (sits on the app background). */
  input: string;
  muted: string;
  faint: string;
  line: string;
  divide: string;
  primary: string;
  ghost: string;
  accent: string;
  accentBg: string;
  chipOn: string;
  chipOff: string;
  sheet: string;
  pos: string;
  /** Hover/active row highlight. */
  press: string;
  /** Background of the dashboard top area (inline style). */
  hero: string;
  heroText: string;
  heroMuted: string;
  /** Card face gradient (inline style). */
  cardFace: string;
  cardText: string;
  /** Highlight colour for freshly appeared statement rows. */
  fresh: string;
  product: string;
  snack: string;
}

export const THEMES: Record<BankId, BankTheme> = {
  sber: {
    id: 'sber',
    dark: false,
    hex: '#21A038',
    app: 'bg-[#F2F3F5] text-[#1F1F22]',
    bar: 'bg-white text-[#1F1F22] shadow-[0_1px_0_rgba(0,0,0,0.06)]',
    surface: 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
    input: 'bg-white text-[#1F1F22] placeholder:text-[#A3A8AF] ring-1 ring-black/[0.06] focus:ring-2 focus:ring-[#21A038]/50',
    muted: 'text-[#7A7F87]',
    faint: 'text-[#A3A8AF]',
    line: 'border-black/[0.07]',
    divide: 'divide-black/[0.06]',
    primary: 'bg-[#21A038] text-white active:bg-[#1A8A30] disabled:bg-[#21A038]/40',
    ghost: 'bg-[#21A038]/10 text-[#178A2E] active:bg-[#21A038]/20',
    accent: 'text-[#21A038]',
    accentBg: 'bg-[#21A038]/10 text-[#21A038]',
    chipOn: 'bg-[#21A038] text-white ring-[#21A038]',
    chipOff: 'bg-white text-[#1F1F22] ring-black/10',
    sheet: 'bg-white text-[#1F1F22]',
    pos: 'text-[#1E9A35]',
    press: 'active:bg-black/[0.04]',
    hero: 'linear-gradient(180deg, #21A038 0%, #1A9132 72%, #F2F3F5 72%)',
    heroText: 'text-white',
    heroMuted: 'text-white/75',
    cardFace: 'radial-gradient(120% 140% at 100% 0%, #3FD567 0%, #1E9E3A 45%, #0C6B33 100%)',
    cardText: 'text-white',
    fresh: 'rgba(33,160,56,0.18)',
    product: 'СберКарта',
    snack: 'bg-white',
  },
  tbank: {
    id: 'tbank',
    dark: true,
    hex: '#FFDD2D',
    app: 'bg-black text-white',
    bar: 'bg-black text-white',
    surface: 'bg-[#1C1C1E]',
    input: 'bg-[#1C1C1E] text-white placeholder:text-[#636366] ring-1 ring-white/[0.06] focus:ring-2 focus:ring-[#FFDD2D]/60',
    muted: 'text-[#8E8E93]',
    faint: 'text-[#636366]',
    line: 'border-white/10',
    divide: 'divide-white/[0.08]',
    primary: 'bg-[#FFDD2D] text-black active:bg-[#F2CF14] disabled:bg-[#FFDD2D]/30 disabled:text-black/60',
    ghost: 'bg-white/10 text-white active:bg-white/15',
    accent: 'text-[#FFDD2D]',
    accentBg: 'bg-[#FFDD2D]/15 text-[#FFDD2D]',
    chipOn: 'bg-[#FFDD2D] text-black ring-[#FFDD2D]',
    chipOff: 'bg-[#1C1C1E] text-white ring-white/10',
    sheet: 'bg-[#1C1C1E] text-white',
    pos: 'text-[#32D74B]',
    press: 'active:bg-white/[0.06]',
    hero: 'linear-gradient(180deg, #000 0%, #000 100%)',
    heroText: 'text-white',
    heroMuted: 'text-white/55',
    cardFace: 'linear-gradient(135deg, #3A3A3C 0%, #1A1A1A 45%, #050505 100%)',
    cardText: 'text-white',
    fresh: 'rgba(255,221,45,0.22)',
    product: 'Т-Банк Black',
    snack: 'bg-[#2C2C2E]',
  },
  alfa: {
    id: 'alfa',
    dark: false,
    hex: '#EF3124',
    app: 'bg-white text-[#0B0B0B]',
    bar: 'bg-white text-[#0B0B0B] shadow-[0_1px_0_rgba(0,0,0,0.06)]',
    surface: 'bg-[#F3F4F5]',
    input: 'bg-[#F3F4F5] text-[#0B0B0B] placeholder:text-[#A0A4AC] focus:ring-2 focus:ring-[#EF3124]/45',
    muted: 'text-[#6F7480]',
    faint: 'text-[#A0A4AC]',
    line: 'border-black/[0.07]',
    divide: 'divide-black/[0.07]',
    primary: 'bg-[#EF3124] text-white active:bg-[#D3271B] disabled:bg-[#EF3124]/40',
    ghost: 'bg-[#0B0B0B]/[0.06] text-[#0B0B0B] active:bg-[#0B0B0B]/10',
    accent: 'text-[#EF3124]',
    accentBg: 'bg-[#EF3124]/10 text-[#EF3124]',
    chipOn: 'bg-[#0B0B0B] text-white ring-[#0B0B0B]',
    chipOff: 'bg-white text-[#0B0B0B] ring-black/10',
    sheet: 'bg-white text-[#0B0B0B]',
    pos: 'text-[#0E9F4F]',
    press: 'active:bg-black/[0.04]',
    hero: 'linear-gradient(180deg, #fff 0%, #fff 100%)',
    heroText: 'text-[#0B0B0B]',
    heroMuted: 'text-[#6F7480]',
    cardFace: 'radial-gradient(130% 130% at 0% 0%, #FF5A4E 0%, #EF3124 45%, #B5150D 100%)',
    cardText: 'text-white',
    fresh: 'rgba(239,49,36,0.14)',
    product: 'Альфа-Карта',
    snack: 'bg-white',
  },
};

/** Logo colours of counterparty banks (for recipient chips). */
export const EXT_STYLE: Record<ExtBankId, { bg: string; fg: string; letter: string }> = {
  sber: { bg: '#21A038', fg: '#fff', letter: 'С' },
  tbank: { bg: '#FFDD2D', fg: '#111', letter: 'Т' },
  alfa: { bg: '#EF3124', fg: '#fff', letter: 'А' },
  vtb: { bg: '#0A2896', fg: '#fff', letter: 'В' },
  raif: { bg: '#FEE600', fg: '#111', letter: 'Р' },
  ozon: { bg: '#005BFF', fg: '#fff', letter: 'О' },
  pochta: { bg: '#1C2C78', fg: '#fff', letter: 'П' },
};

/** Public requisites (BIC / correspondent account) to make the «Реквизиты» screen feel real. */
export const BANK_REQ: Record<BankId, { bic: string; corr: string; legal: string }> = {
  sber: { bic: '044525225', corr: '30101810400000000225', legal: 'ПАО Сбербанк' },
  tbank: { bic: '044525974', corr: '30101810145250000974', legal: 'АО «ТБанк»' },
  alfa: { bic: '044525593', corr: '30101810200000000593', legal: 'АО «Альфа-Банк»' },
};
