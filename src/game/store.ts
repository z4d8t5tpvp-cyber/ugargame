import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  BankId, BrowserTab, CharacterId, CharacterState, Clipboard, Difficulty, ExchangeAccount, ExchangeId, GameState, MyAd, Network, P2POrder, PcAppId, PhoneAppId, Speed, TaxRegime, Toast, WindowState,
} from './types';
import { BANKS, CHARACTERS, RETAIL, SHOP } from './data/static';
import { addFile, attention, emit, hero, ledger, netWorth, notify, profitSince, sms, taxRate, toast as toastFx, totalRub } from './engine/core';
import * as banks from './engine/banks';
import * as orders from './engine/orders';
import * as crypto from './engine/crypto';
import * as otc from './engine/otc';
import * as avito from './engine/avito';
import { marketStep, regenerateAds, repriceAds } from './engine/market';
import { choose, makeCtx, pushMsg, tgTick } from './story/ctx';
import './story/scripts';
import { initialChats, initialTgOrder } from './story/chats';
import { cutsceneChoose, cutsceneNext, directorTick, handleStoryScheduled, monthly, startChapter } from './story/director';
import { clamp, dayIndex, fmtRub, fmtUsdt, genCard, genSecret, genTonAddress, genTrcAddress, hourOf, randInt, round2, shortDT, totp, uid, BANK_SHORT } from './util';

type D = GameState;
export const SAVE_KEY = 'p2p-s-nulya-save-v1';

// ───────── initial state ─────────

const win = (x: number, y: number, w: number, h: number, open = false): WindowState => ({ open, minimized: false, maximized: false, x, y, w, h, z: 1 });

function bankInit(id: BankId, opened: boolean): GameState['banks'][BankId] {
  return {
    id,
    opened,
    balance: 0,
    status: 'active',
    statusUntil: null,
    trust: id === 'sber' ? 68 : 50,
    risk: id === 'sber' ? 8 : 12,
    tier: 'basic',
    premiumUntil: null,
    monthKey: '2026-09',
    sbpOutMonth: 0,
    inMonth: 0,
    outMonth: 0,
    retailMonth: 0,
    lastInAt: null,
    lastRefresh: 0,
    txs: [],
    request: null,
    card: genCard(id),
    openedAt: 0,
  };
}

function exInit(id: ExchangeId): ExchangeAccount {
  return {
    id,
    registered: false,
    kyc: 'none',
    kycReadyAt: null,
    twoFA: false,
    twoFASecret: genSecret(),
    usdt: 0,
    frozen: 0,
    rub: 0,
    ton: 0,
    btc: 0,
    completed: 0,
    cancelled: 0,
    appealsLost: 0,
    depositTrc20: genTrcAddress(),
    depositTon: genTonAddress(),
    tonMemo: String(randInt(100000000, 999999999)),
    ads: [],
    stuckDeposits: [],
  };
}

export function createInitialState(difficulty: Difficulty): GameState {
  const now = 19 * 60 + 40;
  const characters = {} as Record<CharacterId, CharacterState>;
  for (const c of Object.values(CHARACTERS)) characters[c.id] = { id: c.id, trust: c.trust, riskAppetite: c.riskAppetite, inTeam: false, met: c.id === 'danya' || c.id === 'lera' };
  const d: GameState = {
    version: 1,
    started: true,
    difficulty,
    now,
    rt: 0,
    speed: 1,
    chapter: 1,
    chapterStartedAt: now,
    ending: null,
    hero: { energy: 62, stress: 55, attentionBonus: 0, lastSleepAt: now - 14 * 60, location: 'novozarovsk', pcTier: 0, phoneTier: 0, home: 'room', car: null },
    clipboard: null,
    notifications: [],
    toasts: [],
    sms: [
      { id: uid('sms'), from: '900', text: 'СБЕРБАНК. Покупка 430р ПЯТЕРОЧКА Баланс: 3700.00р', at: now - 300, read: true },
      { id: uid('sms'), from: 'MTS', text: 'Баланс 112 р. Пополните счёт, чтобы оставаться на связи.', at: now - 900, read: true },
    ],
    auth: [],
    banks: { sber: bankInit('sber', true), tbank: bankInit('tbank', false), alfa: bankInit('alfa', false) },
    block161: null,
    payees: {},
    files: [],
    exchanges: { bybit: exInit('bybit'), rapira: exInit('rapira') },
    market: { base: 90.42, anchor: 90.5, lastShockAt: 0, ads: [], nextRefreshAt: 0, history: [], rapiraSpot: 90.3, tonUsd: 3.12, btcUsd: 98400, news: [] },
    orders: [],
    wallet: { unlocked: false, usdtTrc20: 0, usdtTon: 0, trx: 0, ton: 0, addressTrc20: genTrcAddress(), addressTon: genTonAddress(), history: [], amlUnlocked: false },
    chain: [],
    addresses: {},
    avito: { listings: [], chats: [], unlockedJobs: [] },
    job: { activeJob: null, doneToday: [] },
    tg: initialChats(),
    tgOrder: [],
    tgPending: {},
    tgQueue: [],
    characters,
    otc: [],
    ledger: [],
    book: { qty: 0, avg: 0 },
    obligations: [],
    stats: { turnover: 0, scamsCaught: 0, scamsMissed: 0, receiptsSaved: 0, transfers: 0, nightTrades: 0, maxNetWorth: 3700, ch4Profit0: 0, ch7Profit0: 0 },
    flags: { lastDay: 0 },
    fired: {},
    scheduled: [],
    cutscene: null,
    tax: { regime: 'none', ipRegisteredAt: null, ipPendingUntil: null, paidTotal: 0, declared: false, penalty: 0, grishaHired: false },
    notes: 'ПЛАН\n— собрать 10 000 ₽ (Барахолка, подработки)\n— не вестись на ссылки «Авито Доставки»\n— узнать у Сани про P2P\n\n',
    ui: {
      windows: { browser: win(104, 8, 3000, 3000), files: win(140, 60, 680, 460), calc: win(620, 50, 300, 440), notes: win(110, 40, 440, 400, true) },
      zTop: 5,
      browserTab: 'bybit',
      bybitView: 'market',
      focusOrderId: null,
      phoneApp: null,
      phoneLocked: false,
      buzz: 0,
      sound: true,
      hints: true,
      questOpen: false,
      chapterCard: null,
      tgChat: null,
    },
  };
  d.tgOrder = initialTgOrder(d);
  const s = d.banks.sber;
  s.balance = 3700;
  s.openedAt = -400 * 1440;
  s.txs = [
    { id: uid('tx'), at: now - 300, amount: -430, kind: 'retail', title: 'Пятёрочка', seen: true },
    { id: uid('tx'), at: now - 1600, amount: 1500, kind: 'sbp_in', title: 'Галина Николаевна В.', comment: 'На обеды', seen: true, counterpartyBank: 'Сбербанк' },
    { id: uid('tx'), at: now - 2900, amount: -199, kind: 'retail', title: 'Яндекс Плюс', seen: true },
    { id: uid('tx'), at: now - 4400, amount: -1250, kind: 'retail', title: 'Магнит', seen: true },
    { id: uid('tx'), at: now - 7000, amount: 3200, kind: 'salary', title: 'ИП Кузьмин (разовая работа)', seen: true },
  ];
  s.retailMonth = 1879;
  s.outMonth = 1879;
  for (let i = 0; i < 24; i++) d.market.history.push({ at: now - (24 - i) * 10, v: round2(90.42 + Math.sin(i / 3) * 0.15) });
  regenerateAds(d, true);
  crypto.makeDepositAddresses(d);
  return d;
}

// ───────── world simulation ─────────

const FOCUS_RATE: Record<Speed, number> = { 0: 0, 1: 1 / 10, 2: 1 / 5, 5: 1 / 2 };
/** Game minutes per real second outside of deals (1x ≈ a game day per 48 real minutes). */
const SPEED_RATE: Record<Speed, number> = { 0: 0, 1: 0.5, 2: 1.5, 5: 5 };

export function needsFocus(d: D) {
  return d.orders.some((o) => (o.status === 'pending_payment' || o.status === 'paid' || o.status === 'appeal'));
}

function simulate(d: D, dtMin: number) {
  const prevDay = dayIndex(d.now);
  d.now += dtMin;
  marketStep(d, dtMin);
  if (d.now >= d.market.nextRefreshAt) regenerateAds(d);
  else repriceAds(d);
  orders.ordersTick(d, dtMin);
  banks.bankTick(d);
  crypto.chainTick(d);
  crypto.stuckTick(d);
  otc.otcTick(d);
  avito.avitoTick(d, dtMin);
  // KYC & IP registration timers
  for (const ex of Object.values(d.exchanges)) {
    if (ex.kyc === 'pending' && ex.kycReadyAt !== null && d.now >= ex.kycReadyAt) {
      ex.kyc = 'verified';
      notify(d, 'system', ex.id === 'bybit' ? 'Bybit' : 'Rapira', 'Верификация пройдена ✅ P2P-торговля доступна.');
      if (ex.id === 'bybit' && d.tg.bybit_bot.visible) pushMsg(d, 'bybit_bot', { from: 'bybit_bot', kind: 'text', text: '✅ Ваша личность подтверждена (KYC уровень 1). Лимит P2P: до 2 000 000 ₽ в сутки.' });
      emit(d, { type: 'exchange', what: 'kyc' });
    }
  }
  if (d.tax.ipPendingUntil !== null && d.now >= d.tax.ipPendingUntil) {
    d.tax.ipPendingUntil = null;
    d.tax.ipRegisteredAt = d.now;
    d.tax.regime = 'ip_usn';
    notify(d, 'system', 'Госуслуги', 'ФНС: вы зарегистрированы как ИП. Режим — УСН «Доходы минус расходы» 15%.');
    toastFx(d, 'success', 'ИП зарегистрировано!');
  }
  if (d.job.activeJob && d.now >= d.job.activeJob.until) avito.jobFinish(d);
  runScheduled(d);
  // Hero physiology
  if (!d.flags.sleeping) {
    hero(d, { energy: -dtMin / 14 });
    if (hourOf(d.now) < 6) hero(d, { stress: dtMin / 60 });
  }
  if (d.hero.attentionBonus !== 0) d.hero.attentionBonus = d.hero.attentionBonus > 0 ? Math.max(0, d.hero.attentionBonus - dtMin / 90) : Math.min(0, d.hero.attentionBonus + dtMin / 90);
  if (dayIndex(d.now) !== prevDay) {
    banks.bankDaily(d);
    avito.newDayReset(d);
    monthly(d);
  }
  const nw = netWorth(d);
  if (nw > d.stats.maxNetWorth) d.stats.maxNetWorth = nw;
}

function runScheduled(d: D) {
  if (!d.scheduled.length) return;
  const due = d.scheduled.filter((e) => e.at <= d.now);
  if (!due.length) return;
  d.scheduled = d.scheduled.filter((e) => e.at > d.now);
  for (const e of due) {
    const p = e.payload ?? {};
    if (handleStoryScheduled(d, e.type, p)) continue;
    switch (e.type) {
      case 'scam_reveal': case 'victim_complaint': case 'drop_consequence': case 'order_refund_in': case 'late_refund':
        orders.handleOrderEvent(d, e.type, p);
        break;
      case 'otc_fake_guarantor': case 'tether_freeze':
        otc.otcEvent(d, e.type, p);
        break;
      case 'otc_audit': {
        const who = p.who as 'karim' | 'pasha';
        const text = otc.otcAuditReport(d, String(p.id), who);
        if (text) makeCtx(d).say(who, { from: who, text }, 0);
        break;
      }
      case 'rapira_credit':
        d.exchanges.rapira.rub = round2(d.exchanges.rapira.rub + Number(p.amount));
        notify(d, 'system', 'Rapira', `Пополнение RUB: +${fmtRub(Number(p.amount))}`);
        break;
      case 'rapira_payout':
        banks.incoming(d, p.bank as BankId, Number(p.amount), { title: 'ООО «РАПИРА ПЭЙ»', kind: 'exchange_in', comment: 'Вывод с биржи' });
        break;
      case 'cash_deposit':
        banks.incoming(d, p.bank as BankId, Number(p.amount), { title: 'Внесение наличных', kind: 'salary', comment: `Остаток со счёта ${String(p.from)}`, seen: true });
        break;
      case 'scam_payment_reveal':
        toastFx(d, 'error', `Продавец не отпустит монеты: вы перевели ${fmtRub(Number(p.amount))} на «другую карту» из чата. Это мошенник.`);
        break;
      case 'stranger_return': {
        const bank = p.bank as BankId;
        if (d.banks[bank].opened) banks.incoming(d, bank, Number(p.amount), { title: maskFull(String(p.name)), kind: 'refund_in', comment: 'Вы ошиблись номером, возвращаю' });
        break;
      }
      case 'npd_trap': {
        const profit = Math.max(0, profitSince(d, 0));
        // Fine only; the unpaid tax itself is charged by the declaration.
        const penalty = round2(profit * 0.13 * 0.2 + 5000);
        d.tax.penalty += penalty;
        d.tax.regime = 'none';
        d.flags.npdTrap = true;
        notify(d, 'system', 'ФНС России', `Требование: НПД не применяется к операциям с цифровой валютой. Штраф ${fmtRub(penalty)}; налог 13% — к уплате с декларацией.`);
        sms(d, 'FNS', `Требование об уплате налога и штрафа: ${fmtRub(penalty)}. Подробности в личном кабинете.`);
        toastFx(d, 'error', 'Ловушка самозанятости: ФНС доначислила налог и штраф');
        hero(d, { stress: 18 });
        break;
      }
    }
  }
}

const maskFull = (full: string) => {
  const [l, f, p] = full.split(' ');
  return f ? `${f} ${p ?? ''} ${l[0]}.`.replace('  ', ' ') : full;
};

/** Fast-forward the world (sleep, jobs, waiting). Chunks keep events ordered. */
function skip(d: D, minutes: number) {
  let left = minutes;
  while (left > 0) {
    const step = Math.min(5, left);
    simulate(d, step);
    tgTick(d);
    directorTick(d);
    left -= step;
    if (d.cutscene) break;
  }
}

// ───────── store ─────────

export interface Actions {
  act: <T>(fn: (d: D) => T) => T;
  newGame: (difficulty: Difficulty) => void;
  quitToMenu: () => void;
  tick: (realSec: number) => void;
  setSpeed: (s: Speed) => void;
  sleep: () => { ok: boolean; error?: string };
  skipHours: (h: number) => { ok: boolean; error?: string };
  toast: (kind: Toast['kind'], text: string) => void;
  dismissToast: (id: string) => void;
  copy: (c: Omit<Clipboard, 'at'>) => void;
  // ui
  openWindow: (id: PcAppId) => void;
  closeWindow: (id: PcAppId) => void;
  minimizeWindow: (id: PcAppId) => void;
  focusWindow: (id: PcAppId) => void;
  moveWindow: (id: PcAppId, x: number, y: number) => void;
  resizeWindow: (id: PcAppId, w: number, h: number) => void;
  toggleMaximize: (id: PcAppId) => void;
  setBrowserTab: (t: BrowserTab) => void;
  setBybitView: (v: GameState['ui']['bybitView']) => void;
  focusOrder: (id: string | null) => void;
  phoneOpen: (app: PhoneAppId | null) => void;
  phoneLock: (locked: boolean) => void;
  setTgChat: (id: string | null) => void;
  readNotifs: (app?: string) => void;
  dismissNotif: (id: string) => void;
  dismissChapterCard: () => void;
  toggleQuest: () => void;
  toggleSound: () => void;
  toggleHints: () => void;
  setNotes: (t: string) => void;
  // bank
  openBank: (id: BankId) => void;
  transfer: (p: banks.TransferParams) => banks.TransferResult;
  saveReceipt: (bank: BankId, txId: string) => string | null;
  refreshStatement: (bank: BankId) => number;
  refund: (bank: BankId, txId: string) => banks.TransferResult;
  retail: (bank: BankId, itemId: string) => banks.TransferResult;
  buyPremium: (bank: BankId) => banks.TransferResult;
  sendDocs: (bank: BankId, fileIds: string[]) => { ok: boolean; error?: string };
  closeRestricted: (bank: BankId) => { ok: boolean; error?: string; info?: string };
  appeal161: () => void;
  wait161: () => { ok: boolean; error?: string };
  // exchange
  requestRegCode: (ex: ExchangeId) => void;
  confirmReg: (ex: ExchangeId, code: string) => { ok: boolean; error?: string };
  submitKyc: (ex: ExchangeId) => void;
  link2FA: (ex: ExchangeId, code: string) => { ok: boolean; error?: string };
  takeAd: (p: orders.TakeParams) => { ok: boolean; error?: string; orderId?: string };
  markPaid: (id: string) => { ok: boolean; error?: string };
  attachReceipt: (id: string, fileId: string) => { ok: boolean; error?: string };
  cancelOrder: (id: string) => { ok: boolean; error?: string };
  releaseOrder: (id: string, code: string) => { ok: boolean; error?: string };
  openAppeal: (id: string, reason: NonNullable<P2POrder['appeal']>['reason']) => { ok: boolean; error?: string };
  sendOrderChat: (id: string, text: string) => void;
  createAd: (a: Omit<MyAd, 'id' | 'createdAt' | 'remainingUsdt' | 'active' | 'exchange'>) => { ok: boolean; error?: string };
  removeAd: (id: string) => void;
  toggleAd: (id: string) => void;
  editAdPrice: (id: string, price: number) => void;
  exportOrders: () => string;
  resolveStuck: (ex: ExchangeId, id: string) => void;
  withdraw: (p: crypto.WithdrawParams) => { ok: boolean; error?: string; info?: string };
  rapiraWithdrawRub: (bank: BankId, amount: number, code: string) => { ok: boolean; error?: string; info?: string };
  spotTrade: (pair: 'USDT/RUB' | 'TON/USDT' | 'BTC/USDT', side: 'buy' | 'sell', amount: number) => { ok: boolean; error?: string; info?: string };
  rapiraDepositRequisites: () => { holder: string; phone: string; bank: 'tbank' };
  // wallet
  walletSend: (p: crypto.WalletSendParams) => { ok: boolean; error?: string; info?: string };
  walletSwap: (network: Network, amount: number) => { ok: boolean; error?: string };
  amlCheck: (address: string) => ReturnType<typeof crypto.amlCheck>;
  addAuth: (issuer: string, secret: string) => { ok: boolean; error?: string };
  // avito & jobs
  listItem: (itemId: string, price: number) => { ok: boolean; error?: string };
  unlistItem: (itemId: string) => void;
  avitoReply: (chatId: string, action: 'agree' | 'decline' | 'report' | 'meet_only') => void;
  avitoRead: (chatId: string) => void;
  phishSubmit: (chatId: string) => void;
  doJob: (jobId: string) => { ok: boolean; error?: string };
  // telegram
  tgChoose: (chatId: string, optionId: string) => void;
  tgRead: (chatId: string) => void;
  // otc
  otcAccept: (id: string) => { ok: boolean; error?: string };
  otcDecline: (id: string) => { ok: boolean; error?: string };
  otcAudit: (id: string, who: 'karim' | 'pasha') => void;
  // story
  cutsceneNext: () => void;
  cutsceneChoose: (idx: number) => void;
  markSheetOpened: () => void;
  // shop & tax
  buyShop: (itemId: string, bank: BankId) => { ok: boolean; error?: string };
  registerTax: (regime: TaxRegime) => { ok: boolean; error?: string; info?: string };
  declareTax: (bank: BankId) => { ok: boolean; error?: string; info?: string };
}

export type Store = GameState & Actions & { hydrated: boolean; menu: boolean; resume: () => void };

// Throttled localStorage: the world ticks several times a second.
let pending: { name: string; value: string } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const flush = () => {
  if (pending) {
    try {
      localStorage.setItem(pending.name, pending.value);
    } catch {
      /* quota — keep playing */
    }
  }
  pending = null;
  timer = null;
};
const throttledStorage: StateStorage = {
  getItem: (n) => localStorage.getItem(n),
  setItem: (name, value) => {
    pending = { name, value };
    if (!timer) timer = setTimeout(flush, 2500);
  },
  removeItem: (n) => localStorage.removeItem(n),
};
if (typeof window !== 'undefined') window.addEventListener('beforeunload', flush);
export const flushSave = flush;

const blankState = (): GameState => ({ ...createInitialState('story'), started: false });

export const useGame = create<Store>()(
  persist(
    immer((set, get) => {
      const act = <T,>(fn: (d: D) => T): T => {
        let r!: T;
        set((d) => {
          r = fn(d as unknown as D);
        });
        return r;
      };
      const noOrders = (d: D) => !d.orders.some((o) => ['pending_payment', 'paid', 'appeal'].includes(o.status));
      return {
        ...blankState(),
        hydrated: false,
        menu: true,
        resume: () => set((d) => void (d.menu = false)),
        act,
        newGame: (difficulty) =>
          set((d) => {
            const fresh = createInitialState(difficulty);
            Object.assign(d, fresh);
            d.menu = false;
            startChapter(d as unknown as D, 1);
          }),
        quitToMenu: () => {
          flush();
          set((d) => {
            d.menu = true;
          });
        },
        tick: (realSec) =>
          set((d) => {
            const s = d as unknown as D;
            if (d.menu || !s.started || s.cutscene) return;
            if (s.speed === 0) return;
            const dt = Math.min(realSec, 0.5);
            s.rt += dt;
            let rate: number = SPEED_RATE[s.speed];
            if (s.job.activeJob) rate = 30;
            else if (needsFocus(s)) rate = FOCUS_RATE[s.speed];
            simulate(s, rate * dt);
            tgTick(s);
            directorTick(s);
            if (s.hero.energy <= 0 && noOrders(s) && !s.job.activeJob && !s.cutscene) {
              toastFx(s, 'warn', 'Артём вырубился прямо за столом от усталости…');
              hero(s, { stress: 10 });
              doSleep(s);
            }
          }),
        setSpeed: (sp) => set((d) => void (d.speed = sp)),
        sleep: () =>
          act((d) => {
            if (!noOrders(d)) return { ok: false, error: 'Нельзя спать с открытыми ордерами' };
            if (d.job.activeJob) return { ok: false, error: 'Сейчас идёт смена' };
            doSleep(d);
            return { ok: true };
          }),
        skipHours: (h) =>
          act((d) => {
            if (!noOrders(d)) return { ok: false, error: 'Сначала закройте ордера' };
            d.flags.sleeping = true;
            skip(d, h * 60);
            d.flags.sleeping = false;
            return { ok: true };
          }),
        toast: (kind, text) => set((d) => toastFx(d as unknown as D, kind, text)),
        dismissToast: (id) => set((d) => void (d.toasts = d.toasts.filter((t) => t.id !== id))),
        copy: (c) =>
          set((d) => {
            d.clipboard = { ...c, at: d.now };
          }),
        openWindow: (id) =>
          set((d) => {
            const w = d.ui.windows[id];
            w.open = true;
            w.minimized = false;
            w.z = ++d.ui.zTop;
            if (id === 'browser' && d.ui.browserTab === 'sheet') d.flags.sheetOpened = true;
          }),
        closeWindow: (id) => set((d) => void (d.ui.windows[id].open = false)),
        minimizeWindow: (id) => set((d) => void (d.ui.windows[id].minimized = true)),
        focusWindow: (id) =>
          set((d) => {
            const w = d.ui.windows[id];
            if (w.z !== d.ui.zTop) w.z = ++d.ui.zTop;
            w.minimized = false;
          }),
        moveWindow: (id, x, y) =>
          set((d) => {
            d.ui.windows[id].x = x;
            d.ui.windows[id].y = y;
          }),
        resizeWindow: (id, w, h) =>
          set((d) => {
            d.ui.windows[id].w = w;
            d.ui.windows[id].h = h;
          }),
        toggleMaximize: (id) => set((d) => void (d.ui.windows[id].maximized = !d.ui.windows[id].maximized)),
        setBrowserTab: (t) =>
          set((d) => {
            d.ui.browserTab = t;
            if (t === 'sheet') d.flags.sheetOpened = true;
          }),
        setBybitView: (v) => set((d) => void (d.ui.bybitView = v)),
        focusOrder: (id) => set((d) => void (d.ui.focusOrderId = id)),
        phoneOpen: (app) =>
          set((d) => {
            d.ui.phoneApp = app;
            if (app) for (const n of d.notifications) if (n.app === app) n.read = true;
          }),
        phoneLock: (locked) => set((d) => void (d.ui.phoneLocked = locked)),
        setTgChat: (id) =>
          set((d) => {
            d.ui.tgChat = id;
            if (id && d.tg[id]) d.tg[id].unread = 0;
          }),
        readNotifs: (app) => set((d) => void d.notifications.forEach((n) => (!app || n.app === app) && (n.read = true))),
        dismissNotif: (id) => set((d) => void (d.notifications = d.notifications.filter((n) => n.id !== id))),
        dismissChapterCard: () => set((d) => void (d.ui.chapterCard = null)),
        toggleQuest: () => set((d) => void (d.ui.questOpen = !d.ui.questOpen)),
        toggleSound: () => set((d) => void (d.ui.sound = !d.ui.sound)),
        toggleHints: () => set((d) => void (d.ui.hints = !d.ui.hints)),
        setNotes: (t) => set((d) => void (d.notes = t)),

        openBank: (id) => set((d) => banks.openBank(d as unknown as D, id)),
        transfer: (p) => act((d) => banks.sendTransfer(d, p)),
        saveReceipt: (bank, txId) => act((d) => banks.saveReceipt(d, bank, txId)?.id ?? null),
        refreshStatement: (bank) => act((d) => banks.refreshStatement(d, bank)),
        refund: (bank, txId) => act((d) => banks.refundTx(d, bank, txId)),
        retail: (bank, itemId) => act((d) => banks.retailPurchase(d, bank, itemId)),
        buyPremium: (bank) => act((d) => banks.buyPremium(d, bank)),
        sendDocs: (bank, ids) => act((d) => banks.sendDocs(d, bank, ids)),
        closeRestricted: (bank) => act((d) => banks.closeRestricted(d, bank)),
        appeal161: () => set((d) => banks.file161Appeal(d as unknown as D)),
        wait161: () =>
          act((d) => {
            if (!d.block161?.resolveAt) return { ok: false, error: 'Сначала подайте заявление в ЦБ' };
            if (!noOrders(d)) return { ok: false, error: 'Сначала закройте ордера' };
            d.flags.sleeping = true;
            skip(d, Math.max(0, d.block161.resolveAt - d.now) + 1);
            d.flags.sleeping = false;
            d.hero.energy = 80;
            if (d.flags.lawyerFeeDue) {
              const fee = Number(d.flags.lawyerFeeDue);
              const paid = (['sber', 'tbank', 'alfa'] as BankId[]).some((b) => banks.spend(d, b, fee, 'Юрист: заявление в ЦБ').ok);
              if (paid) delete d.flags.lawyerFeeDue;
            }
            return { ok: true };
          }),

        requestRegCode: (ex) =>
          set((d) => {
            const code = String(randInt(100000, 999999));
            d.flags[`regcode_${ex}`] = code;
            sms(d as unknown as D, ex === 'bybit' ? 'Bybit' : 'Rapira', `Код подтверждения: ${code}. Никому не сообщайте этот код.`);
          }),
        confirmReg: (ex, code) =>
          act((d) => {
            if (String(d.flags[`regcode_${ex}`] ?? '') !== code.trim()) return { ok: false, error: 'Неверный код из SMS' };
            d.exchanges[ex].registered = true;
            emit(d, { type: 'exchange', what: 'registered' });
            return { ok: true };
          }),
        submitKyc: (ex) =>
          set((d) => {
            const e = d.exchanges[ex];
            e.kyc = 'pending';
            e.kycReadyAt = d.now + (d.difficulty === 'story' ? 4 : 8);
          }),
        link2FA: (ex, code) =>
          act((d) => {
            const e = d.exchanges[ex];
            const ok = [totp(e.twoFASecret), totp(e.twoFASecret, Date.now() - 30000)].includes(code.replace(/\s/g, ''));
            if (!ok) return { ok: false, error: 'Неверный код. Убедитесь, что добавили ключ в Authenticator.' };
            e.twoFA = true;
            notify(d, 'system', ex === 'bybit' ? 'Bybit' : 'Rapira', 'Google Authenticator привязан.');
            emit(d, { type: 'exchange', what: '2fa' });
            return { ok: true };
          }),
        takeAd: (p) => act((d) => orders.takeAd(d, p)),
        markPaid: (id) => act((d) => orders.markPaid(d, id)),
        attachReceipt: (id, fileId) => act((d) => orders.attachReceipt(d, id, fileId)),
        cancelOrder: (id) => act((d) => orders.cancelOrder(d, id)),
        releaseOrder: (id, code) => act((d) => orders.releaseOrder(d, id, code)),
        openAppeal: (id, reason) => act((d) => orders.openAppeal(d, id, reason)),
        sendOrderChat: (id, text) => set((d) => orders.sendOrderChat(d as unknown as D, id, text)),
        createAd: (a) => act((d) => orders.createMyAd(d, a)),
        removeAd: (id) => set((d) => orders.removeMyAd(d as unknown as D, id)),
        toggleAd: (id) =>
          set((d) => {
            const ad = d.exchanges.bybit.ads.find((a) => a.id === id);
            if (ad) ad.active = !ad.active;
          }),
        editAdPrice: (id, price) =>
          set((d) => {
            const ad = d.exchanges.bybit.ads.find((a) => a.id === id);
            if (ad && price > 0) {
              ad.price = round2(price);
              ad.undercutBy = undefined;
            }
          }),
        exportOrders: () =>
          act((d) => {
            const done = d.orders.filter((o) => o.status === 'completed').slice(0, 60);
            const f = addFile(d, {
              name: `Выгрузка_ордеров_Bybit_${shortDT(d.now).slice(0, 5).replace('.', '-')}.pdf`,
              kind: 'order_export',
              lines: [
                'Bybit P2P — история ордеров',
                `Пользователь: Воронов Артём Сергеевич · KYC подтверждён`,
                `Сформировано: ${shortDT(d.now)}`,
                '',
                ...done.map((o) => `${shortDT(o.createdAt)} · №${o.num.slice(-8)} · ${o.side === 'buy' ? 'Покупка' : 'Продажа'} ${fmtUsdt(o.usdt)} × ${o.price.toFixed(2)} = ${fmtRub(o.rub, 2)} · ${o.cp.fullName}`),
              ],
            });
            return f.id;
          }),
        resolveStuck: (ex, id) => set((d) => crypto.resolveStuck(d as unknown as D, ex, id)),
        withdraw: (p) => act((d) => crypto.exchangeWithdraw(d, p)),
        rapiraWithdrawRub: (bank, amount, code) => act((d) => crypto.rapiraWithdrawRub(d, bank, amount, code)),
        spotTrade: (pair, side, amount) => act((d) => crypto.spotTrade(d, pair, side, amount)),
        rapiraDepositRequisites: () =>
          act((d) => {
            const phone = '74951204490';
            if (!d.payees[phone]) d.payees[phone] = { key: phone, holder: 'ООО «РАПИРА ПЭЙ»', bank: 'tbank', phone, ref: { kind: 'rapira_deposit', id: 'rapira' } };
            return { holder: 'ООО «РАПИРА ПЭЙ»', phone, bank: 'tbank' as const };
          }),

        walletSend: (p) => act((d) => crypto.walletSend(d, p)),
        walletSwap: (n, a) => act((d) => crypto.walletSwap(d, n, a)),
        amlCheck: (address) => act((d) => crypto.amlCheck(d, address)),
        addAuth: (issuer, secret) =>
          act((d) => {
            const s = secret.replace(/\s/g, '').toUpperCase();
            if (s.length < 16) return { ok: false, error: 'Ключ слишком короткий' };
            const owner = (Object.values(d.exchanges) as ExchangeAccount[]).find((e) => e.twoFASecret === s);
            const label = owner ? (owner.id === 'bybit' ? 'Bybit' : 'Rapira') : issuer || 'Аккаунт';
            if (d.auth.some((a) => a.secret === s)) return { ok: false, error: 'Этот ключ уже добавлен' };
            d.auth.push({ id: uid('auth'), issuer: label, account: 'tema.voronov@mail.ru', secret: s });
            return { ok: true };
          }),

        listItem: (itemId, price) => act((d) => avito.listItem(d, itemId, price)),
        unlistItem: (itemId) => set((d) => avito.unlistItem(d as unknown as D, itemId)),
        avitoReply: (chatId, action) => set((d) => avito.avitoReply(d as unknown as D, chatId, action)),
        avitoRead: (chatId) =>
          set((d) => {
            const c = d.avito.chats.find((x) => x.id === chatId);
            if (c) c.unread = 0;
          }),
        phishSubmit: (chatId) => set((d) => void avito.phishSubmit(d as unknown as D, chatId)),
        doJob: (jobId) => act((d) => avito.doJob(d, jobId)),

        tgChoose: (chatId, optionId) => set((d) => choose(d as unknown as D, chatId, optionId)),
        tgRead: (chatId) =>
          set((d) => {
            if (d.tg[chatId]) d.tg[chatId].unread = 0;
          }),

        otcAccept: (id) => act((d) => otc.otcAccept(d, id)),
        otcDecline: (id) => act((d) => otc.otcDecline(d, id)),
        otcAudit: (id, who) => set((d) => otc.otcAudit(d as unknown as D, id, who)),

        cutsceneNext: () => set((d) => cutsceneNext(d as unknown as D)),
        cutsceneChoose: (i) => set((d) => cutsceneChoose(d as unknown as D, i)),
        markSheetOpened: () => set((d) => void (d.flags.sheetOpened = true)),

        buyShop: (itemId, bank) =>
          act((d) => {
            const item = SHOP.find((s) => s.id === itemId);
            if (!item) return { ok: false, error: 'Нет такого товара' };
            if (d.chapter < item.minChapter) return { ok: false, error: `Доступно с главы ${item.minChapter}` };
            const owned = (itemId === 'pc1' && d.hero.pcTier >= 1) || (itemId === 'pc2' && d.hero.pcTier >= 2) || (itemId === 'phone1' && d.hero.phoneTier >= 1) || (itemId === 'flat' && d.hero.home !== 'room') || (itemId === 'office' && d.flags.officeRented) || (itemId === 'lada' && d.hero.car === 'lada') || (itemId === 'bmw' && d.hero.car === 'bmw_leasing') || (itemId === 'aml' && d.flags.amlPro);
            if (owned) return { ok: false, error: 'Уже куплено' };
            const r = banks.spend(d, bank, item.price, item.title);
            if (!r.ok) return r;
            const c = makeCtx(d);
            switch (itemId) {
              case 'pc1': d.hero.pcTier = 1; break;
              case 'pc2': d.hero.pcTier = 2; break;
              case 'phone1': d.hero.phoneTier = 1; break;
              case 'flat': d.hero.home = 'flat'; d.hero.location = 'moscow'; hero(d, { stress: -10 }); break;
              case 'office': d.flags.officeRented = true; for (const id of ['karim', 'pasha', 'danya', 'ivan', 'kapul'] as CharacterId[]) if (d.characters[id].inTeam) c.trust(id, 5); break;
              case 'lada': d.hero.car = 'lada'; c.trust('marat', 5); break;
              case 'bmw': d.hero.car = 'bmw_leasing'; c.trust('ivan', 15); c.trust('marat', -10); c.trust('karim', -10); d.flags.bmw = true; break;
              case 'aml': d.flags.amlPro = true; d.wallet.amlUnlocked = true; break;
            }
            emit(d, { type: 'shop', itemId });
            return { ok: true };
          }),
        registerTax: (regime) =>
          act((d) => {
            if (d.chapter < 3) return { ok: false, error: 'Пока рано: сначала появятся доходы' };
            if (regime === 'npd') {
              if (d.flags.npdTrap) return { ok: false, error: 'ФНС уже отказала в применении НПД' };
              if (d.tax.ipPendingUntil || d.tax.ipRegisteredAt) return { ok: false, error: 'У вас уже ИП или заявление на регистрацию' };
              d.tax.regime = 'npd';
              d.scheduled.push({ id: uid('ev'), at: d.now + 1440, type: 'npd_trap' });
              emit(d, { type: 'tax', regime });
              return { ok: true, info: 'Вы зарегистрированы как самозанятый в «Мой налог».' };
            }
            if (regime === 'ip_usn') {
              if (d.tax.ipPendingUntil || d.tax.ipRegisteredAt) return { ok: false, error: 'Заявление уже подано' };
              d.tax.ipPendingUntil = d.now + (d.difficulty === 'story' ? 1 : 3) * 1440;
              emit(d, { type: 'tax', regime });
              return { ok: true, info: `Заявление Р21001 отправлено в ФНС. Срок регистрации — ${d.difficulty === 'story' ? 1 : 3} рабочих дня.` };
            }
            if (regime === 'ndfl') {
              if (d.tax.regime === 'ip_usn') return { ok: false, error: 'У вас уже ИП' };
              d.tax.regime = 'ndfl';
              return { ok: true, info: 'Режим: физлицо, декларация 3-НДФЛ (13%)' };
            }
            return { ok: false };
          }),
        declareTax: (bank) =>
          act((d) => {
            const profit = Math.max(0, profitSince(d, 0));
            const due = round2(Math.max(0, profit * taxRate(d) - d.tax.paidTotal) + d.tax.penalty);
            if (d.tax.regime === 'none' || d.tax.regime === 'npd') return { ok: false, error: 'Сначала выберите законный налоговый режим (ИП УСН или 3-НДФЛ)' };
            if (due <= 0) {
              d.tax.declared = true;
              return { ok: true, info: 'Налог к уплате: 0 ₽. Декларация подана.' };
            }
            const r = banks.spend(d, bank, due, d.tax.regime === 'ip_usn' ? 'УФК (ФНС России): налог УСН' : 'УФК (ФНС России): НДФЛ');
            if (!r.ok) return r;
            d.tax.paidTotal = round2(d.tax.paidTotal + due - d.tax.penalty);
            d.tax.penalty = 0;
            d.tax.declared = true;
            ledger(d, { kind: 'tax', rub: 0, turnover: 0, usdt: 0, note: `Уплачен налог ${fmtRub(due)}` });
            for (const b of Object.values(d.banks)) b.trust = clamp(b.trust + 6);
            return { ok: true, info: `Декларация подана, налог ${fmtRub(due)} уплачен.` };
          }),
      };
    }),
    {
      name: SAVE_KEY,
      version: 1,
      storage: createJSONStorage(() => throttledStorage),
      partialize: (s) => {
        const { toasts: _t, hydrated: _h, menu: _m, ...rest } = s as Store;
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) if (typeof v !== 'function') out[k] = v;
        return out as unknown as Store;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.toasts = [];
        // Hydration from localStorage runs synchronously inside create(), before `useGame` is assigned.
        setTimeout(() => useGame.setState({ hydrated: true, toasts: [] }), 0);
      },
    },
  ),
);

function doSleep(d: D) {
  const h = hourOf(d.now);
  // Wake at 08:00; short naps if it's daytime.
  const target = h >= 8 && h < 18 ? d.now + 120 : (Math.floor(d.now / 1440) + (h >= 8 ? 1 : 0)) * 1440 + 8 * 60;
  const minutes = Math.max(30, target - d.now);
  d.flags.sleeping = true;
  skip(d, minutes);
  d.flags.sleeping = false;
  const full = minutes >= 360;
  d.hero.energy = full ? 100 : clamp(d.hero.energy + 30);
  hero(d, { stress: full ? -18 : -6 });
  d.hero.lastSleepAt = d.now;
  d.hero.attentionBonus = Math.max(0, d.hero.attentionBonus);
  toastFx(d, 'info', full ? 'Новый день. Энергия восстановлена.' : 'Короткий сон: +30 энергии.');
}

export const selectAttention = (s: GameState) => attention(s);
export const selectTotalRub = (s: GameState) => totalRub(s);
export const retailItems = RETAIL;
export const bankDefs = BANKS;
export { BANK_SHORT };
