// Central game types. All in-game strings are Russian; identifiers stay English.

export type BankId = 'sber' | 'tbank' | 'alfa';
/** Banks a counterparty may use (player only owns BankId ones). */
export type ExtBankId = BankId | 'vtb' | 'raif' | 'ozon' | 'pochta';
export type ExchangeId = 'bybit' | 'rapira';
export type Network = 'TRC20' | 'TON';
export type Difficulty = 'story' | 'realistic';
export type Speed = 0 | 1 | 2 | 5;

export type CharacterId =
  | 'artem' | 'marat' | 'danya' | 'pasha' | 'ivan' | 'kapul' | 'karim' | 'sanya' | 'grisha' | 'max' | 'lera';

export type PhoneAppId = 'sber' | 'tbank' | 'alfa' | 'wallet' | 'telegram' | 'avito' | 'auth';
export type PcAppId = 'browser' | 'files' | 'calc' | 'notes';
export type BrowserTab = 'bybit' | 'rapira' | 'sheet' | 'tax' | 'shop';

// ───────────────────────── Hero & world ─────────────────────────

export interface Hero {
  energy: number; // 0..100
  stress: number; // 0..100
  /** Temporary bonus to attentiveness (coffee, choices). Decays over time. */
  attentionBonus: number;
  lastSleepAt: number;
  location: 'novozarovsk' | 'moscow';
  pcTier: 0 | 1 | 2;
  phoneTier: 0 | 1;
  home: 'room' | 'flat' | 'office';
  car: null | 'lada' | 'bmw_leasing';
}

export interface Clipboard {
  kind: 'phone' | 'card' | 'address' | 'amount' | 'text' | 'memo' | 'key' | 'code';
  value: string;
  label: string;
  meta?: { name?: string; bank?: ExtBankId; network?: Network; orderId?: string };
  at: number;
}

export interface PhoneNotification {
  id: string;
  app: PhoneAppId | 'system' | 'sms';
  title: string;
  body: string;
  at: number;
  read: boolean;
  /** Optional deep link inside the app (chat id, route…). */
  link?: string;
}

export interface Toast {
  id: string;
  kind: 'info' | 'success' | 'warn' | 'error' | 'thought';
  text: string;
  createdAt: number; // real ms
}

export interface Sms {
  id: string;
  from: string; // "900", "+7 (905) 118-22-41", "Bybit", "Gosuslugi"
  text: string;
  at: number;
  fake?: boolean;
  read: boolean;
}

export interface AuthEntry {
  id: string;
  issuer: string; // "Bybit", "Rapira"
  account: string;
  secret: string;
}

// ───────────────────────── Banks ─────────────────────────

export type BankStatus = 'active' | 'cooling' | 'request115' | 'restricted115';

export type BankTxKind =
  | 'sbp_in' | 'sbp_out' | 'card_out' | 'me2me_in' | 'me2me_out' | 'retail' | 'salary'
  | 'refund_out' | 'refund_in' | 'subscription' | 'fraud' | 'exchange_in' | 'exchange_out' | 'loan_in' | 'loan_out';

export interface BankTx {
  id: string;
  at: number;
  amount: number; // signed RUB
  kind: BankTxKind;
  title: string; // counterparty masked name or merchant
  counterpartyBank?: string;
  phone?: string;
  comment?: string;
  fee?: number;
  /** Incoming transfers stay hidden until the statement is refreshed. */
  seen: boolean;
  refundable?: boolean;
  refunded?: boolean;
  receiptFileId?: string;
  ref?: PayRef;
}

export interface ComplianceRequest {
  id: string;
  openedAt: number;
  deadline: number;
  frozen: number; // RUB frozen on the account while the request is open
  reason: string;
  /** Operations the bank asks to explain. */
  ops: { at: number; amount: number; title: string }[];
  docs: string[]; // file ids sent
  status: 'open' | 'review' | 'closed' | 'failed';
  reviewAt?: number;
}

export interface BankAccount {
  id: BankId;
  opened: boolean;
  balance: number;
  status: BankStatus;
  statusUntil: number | null;
  statusReason?: string;
  trust: number; // 0..100
  risk: number; // riskScore115 0..100
  tier: 'basic' | 'premium';
  premiumUntil: number | null;
  monthKey: string;
  sbpOutMonth: number;
  inMonth: number;
  outMonth: number;
  retailMonth: number;
  lastInAt: number | null;
  lastRefresh: number;
  txs: BankTx[];
  request: ComplianceRequest | null;
  card: string;
  openedAt: number;
}

export interface Block161 {
  since: number;
  reason: string;
  appealFiled: boolean;
  resolveAt: number | null;
}

/** What a payment to some requisites means for the game world. */
export type PayRef =
  | { kind: 'order'; id: string }
  | { kind: 'otc'; id: string }
  | { kind: 'rapira_deposit'; id: string }
  | { kind: 'scam'; id: string }
  | { kind: 'stranger'; id: string }
  | { kind: 'friend'; id: CharacterId }
  | { kind: 'misc'; id: string };

export interface Payee {
  key: string; // digits of phone or card
  holder: string; // full name or organisation
  bank: ExtBankId;
  phone?: string;
  card?: string;
  ref: PayRef;
}

// ───────────────────────── Files (PC folder) ─────────────────────────

export interface Receipt {
  bank: BankId;
  amount: number;
  fee: number;
  recipient: string; // masked
  recipientPhone: string;
  recipientBank: string;
  comment?: string;
  at: number;
  txId: string;
  op: string; // operation number
}

export type GameFileKind = 'receipt' | 'order_export' | 'tax_doc' | 'contract' | 'audit' | 'statement';

export interface GameFile {
  id: string;
  name: string;
  kind: GameFileKind;
  at: number;
  receipt?: Receipt;
  /** Free-form lines rendered by the file viewer. */
  lines?: string[];
  sentTo: string[];
}

// ───────────────────────── Exchanges & P2P ─────────────────────────

export interface Merchant {
  nick: string;
  fullName: string; // "Соколов Денис Викторович"
  masked: string; // "Денис Викторович С."
  completion: number; // %
  orders: number;
  regDays: number;
  verified: boolean;
  online: boolean;
  color: string;
  isMax?: boolean;
}

export interface Ad {
  id: string;
  exchange: ExchangeId;
  /** Merchant side: 'sell' — merchant sells USDT (player buys); 'buy' — merchant buys USDT. */
  side: 'sell' | 'buy';
  merchant: Merchant;
  price: number;
  availableUsdt: number;
  minRub: number;
  maxRub: number;
  banks: ExtBankId[];
  terms: string;
  tier: 'local' | 'moscow';
  /** Relative offset from the fair price; keeps the ad tracking the market. */
  off?: number;
}

export type OrderStatus = 'pending_payment' | 'paid' | 'completed' | 'cancelled' | 'appeal';

export type OrderScenario =
  | 'legit' | 'slow_release'
  | 'requisites_third_party' | 'pay_elsewhere' // player buys
  | 'late_pay' | 'fake_receipt' | 'third_party' | 'underpay'; // player sells

export interface OrderChatMsg {
  id: string;
  from: 'me' | 'cp' | 'system' | 'support';
  text: string;
  at: number;
  attachment?: { name: string; kind: 'receipt_img' | 'pdf'; fake?: boolean; fileId?: string };
}

export interface P2POrder {
  id: string;
  num: string;
  exchange: ExchangeId;
  /** Player perspective: 'buy' = player buys USDT and pays RUB. */
  side: 'buy' | 'sell';
  viaMyAd: boolean;
  adId?: string;
  price: number;
  usdt: number;
  rub: number;
  /** Maker fee in USDT (charged to the player only when trading via own ad). */
  feeUsdt: number;
  cp: Merchant;
  /** Sell: player's bank the buyer pays into. */
  playerBank: BankId | null;
  /** Buy: requisites the player must pay to. */
  req?: { holder: string; phone: string; bank: ExtBankId };
  scenario: OrderScenario;
  status: OrderStatus;
  createdAt: number;
  deadline: number;
  paidAt?: number;
  /** Buy: RUB the player actually sent to the order requisites. */
  paidRub: number;
  /** Sell: RUB that actually reached the player's bank for this order. */
  receivedRub: number;
  receiptFileId?: string;
  cpMarkedPaid: boolean;
  appeal?: { reason: 'not_received' | 'third_party' | 'paid_not_released' | 'other'; openedAt: number; resolveAt: number };
  refunded?: boolean;
  chat: OrderChatMsg[];
  outcome?: string;
  closedAt?: number;
  pnlRub?: number;
  /** Internal state-machine stage and the game minute of its next step. */
  stage: string;
  nextAt: number;
}

export interface MyAd {
  id: string;
  exchange: ExchangeId;
  side: 'sell' | 'buy'; // player sells / buys USDT
  price: number;
  totalUsdt: number;
  remainingUsdt: number;
  minRub: number;
  maxRub: number;
  banks: BankId[];
  active: boolean;
  createdAt: number;
  undercutBy?: number; // price of Max's undercut ad
}

export interface ExchangeAccount {
  id: ExchangeId;
  registered: boolean;
  kyc: 'none' | 'pending' | 'verified';
  kycReadyAt: number | null;
  twoFA: boolean;
  twoFASecret: string;
  usdt: number; // available
  frozen: number; // escrow + ads
  rub: number; // rapira only: RUB balance
  ton: number; // spot holdings
  btc: number;
  completed: number;
  cancelled: number;
  appealsLost: number;
  depositTrc20: string;
  depositTon: string;
  tonMemo: string;
  ads: MyAd[];
  stuckDeposits: { id: string; amount: number; network: Network; at: number; resolveAt: number | null }[];
}

export interface MarketState {
  base: number; // fair USDT/RUB
  anchor: number; // mean-reversion anchor
  lastShockAt: number;
  ads: Ad[];
  nextRefreshAt: number;
  history: { at: number; v: number }[];
  rapiraSpot: number; // rapira USDT/RUB mid
  tonUsd: number;
  btcUsd: number;
  news: { id: string; at: number; text: string; impact: number }[];
}

// ───────────────────────── Crypto wallet ─────────────────────────

export interface ChainTx {
  id: string;
  at: number;
  network: Network;
  amount: number; // USDT
  from: string;
  to: string;
  memo?: string;
  direction: 'in' | 'out';
  status: 'pending' | 'done' | 'stuck';
  feeUsdt: number;
  arriveAt: number;
  note?: string;
}

export interface CryptoWallet {
  unlocked: boolean;
  usdtTrc20: number;
  usdtTon: number;
  trx: number;
  ton: number;
  addressTrc20: string;
  addressTon: string;
  history: ChainTx[];
  amlUnlocked: boolean;
}

/** In-flight on-chain transfer between any two parties. */
export interface PendingChain {
  id: string;
  network: Network;
  amount: number;
  to: string;
  memo?: string;
  arriveAt: number;
  fromLabel: string;
  source: 'wallet' | ExchangeId | 'otc';
  otcId?: string;
}

export interface AddressInfo {
  address: string;
  network: Network;
  owner: string;
  kind: 'my_wallet' | 'exchange_deposit' | 'otc' | 'scam' | 'external';
  exchange?: ExchangeId;
  aml: { risk: number; tags: string[] };
}

// ───────────────────────── Avito & jobs ─────────────────────────

export interface AvitoListing {
  itemId: string;
  price: number;
  listedAt: number;
  views: number;
  status: 'active' | 'reserved' | 'sold';
}

export interface AvitoChat {
  id: string;
  itemId: string;
  buyer: string;
  kind: 'legit' | 'haggle' | 'scam' | 'courier_scam';
  offer: number;
  messages: { from: 'me' | 'buyer' | 'system'; text: string; at: number; link?: string }[];
  state: 'open' | 'agreed' | 'done' | 'closed' | 'scammed';
  meetAt?: number;
  unread: number;
}

export interface JobState {
  activeJob: { id: string; until: number; pay: number; title: string } | null;
  doneToday: string[];
}

// ───────────────────────── Telegram ─────────────────────────

export type TgFolder = 'personal' | 'p2p' | 'otc' | 'bots';

export interface TgMessage {
  id: string;
  from: 'me' | 'system' | string; // CharacterId or free name for group members
  fromName?: string;
  at: number;
  kind: 'text' | 'voice' | 'video' | 'file' | 'deal' | 'system';
  text: string;
  duration?: number; // voice/video seconds
  scene?: 'watch' | 'car' | 'restaurant' | 'yacht' | 'gym' | 'office';
  file?: { name: string; kind: 'xlsx' | 'pdf'; fileId?: string };
  dealId?: string;
}

export interface TgChat {
  id: string;
  title: string;
  kind: 'private' | 'group' | 'channel' | 'bot';
  folder: TgFolder;
  characterId?: CharacterId;
  username: string;
  bio: string;
  tgId: number;
  regYear: number;
  verified?: boolean;
  color: string;
  emoji?: string;
  members?: number;
  messages: TgMessage[];
  unread: number;
  typingUntil: number | null;
  pinned?: string;
  visible: boolean;
}

export interface TgPending {
  chatId: string;
  scriptId: string;
  nodeId: string;
  options: { id: string; text: string }[];
}

export interface TgQueued {
  chatId: string;
  /** Real-time seconds (GameState.rt) when the message is delivered. */
  at: number;
  msg: Omit<TgMessage, 'id' | 'at'>;
  /** Script continuation to run after this message is delivered. */
  then?: { scriptId: string; nodeId: string; stage: 'choices' | 'next' };
  silent?: boolean;
}

// ───────────────────────── Characters ─────────────────────────

export interface CharacterState {
  id: CharacterId;
  trust: number;
  riskAppetite: number;
  inTeam: boolean;
  met: boolean;
  /** Left for Max Nol */
  poached?: boolean;
}

// ───────────────────────── OTC ─────────────────────────

export interface OtcDeal {
  id: string;
  from: CharacterId;
  title: string;
  side: 'buy' | 'sell'; // player buys USDT from client / sells to client
  usdt: number;
  price: number;
  marketPrice: number;
  clientName: string;
  clientWallet: string;
  guarantor: string; // username used by the deal
  guarantorReal: boolean;
  dirty: boolean; // funds tainted (AML)
  liar: boolean; // middleman lies (Pasha can spot)
  audited: boolean;
  amlChecked: boolean;
  pashaChecked: boolean;
  status: 'offered' | 'accepted' | 'paying' | 'awaiting_usdt' | 'done' | 'declined' | 'failed' | 'expired';
  expiresAt: number;
  payTo?: { holder: string; phone: string; bank: ExtBankId };
  paidRub: number;
  notes: string[];
}

// ───────────────────────── Ledger & economics ─────────────────────────

export interface LedgerEntry {
  id: string;
  at: number;
  chapter: number;
  kind: 'p2p_buy' | 'p2p_sell' | 'spot' | 'otc' | 'fee_sbp' | 'fee_maker' | 'fee_spot' | 'gas' | 'loss' | 'income' | 'expense' | 'tax';
  rub: number; // signed effect on profit (0 for buys)
  turnover: number;
  usdt: number;
  note: string;
}

export interface Obligation {
  id: string;
  from: CharacterId;
  amount: number;
  sharePct: number;
  takenAt: number;
  returned: boolean;
}

// ───────────────────────── Story ─────────────────────────

export interface CutsceneState {
  id: string;
  line: number;
}

export interface Scheduled {
  id: string;
  at: number;
  type: string;
  payload?: Record<string, unknown>;
}

export type TaxRegime = 'none' | 'npd' | 'ndfl' | 'ip_usn';

export interface TaxState {
  regime: TaxRegime;
  ipRegisteredAt: number | null;
  ipPendingUntil: number | null;
  paidTotal: number;
  declared: boolean;
  penalty: number;
  grishaHired: boolean;
}

export interface WindowState {
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

export interface UiState {
  windows: Record<PcAppId, WindowState>;
  zTop: number;
  browserTab: BrowserTab;
  bybitView: 'market' | 'orders' | 'ads' | 'profile' | 'assets';
  focusOrderId: string | null;
  phoneApp: PhoneAppId | null;
  phoneLocked: boolean;
  buzz: number; // increments trigger vibration
  sound: boolean;
  hints: boolean;
  questOpen: boolean;
  chapterCard: number | null;
  tgChat: string | null;
}

export interface GameState {
  version: number;
  started: boolean;
  difficulty: Difficulty;
  now: number; // game minutes since 2026-09-14 00:00
  /** Unpaused real-time seconds; paces chat messages independently of game speed. */
  rt: number;
  speed: Speed;
  chapter: number; // 1..8
  chapterStartedAt: number;
  ending: string | null;

  hero: Hero;
  clipboard: Clipboard | null;
  notifications: PhoneNotification[];
  toasts: Toast[];
  sms: Sms[];
  auth: AuthEntry[];

  banks: Record<BankId, BankAccount>;
  block161: Block161 | null;
  payees: Record<string, Payee>;
  files: GameFile[];

  exchanges: Record<ExchangeId, ExchangeAccount>;
  market: MarketState;
  orders: P2POrder[];

  wallet: CryptoWallet;
  chain: PendingChain[];
  addresses: Record<string, AddressInfo>;

  avito: { listings: AvitoListing[]; chats: AvitoChat[]; unlockedJobs: string[] };
  job: JobState;

  tg: Record<string, TgChat>;
  tgOrder: string[]; // chat ids by last activity
  tgPending: Record<string, TgPending>;
  tgQueue: TgQueued[];

  characters: Record<CharacterId, CharacterState>;
  otc: OtcDeal[];

  ledger: LedgerEntry[];
  /** Weighted-average cost basis of held USDT. */
  book: { qty: number; avg: number };
  obligations: Obligation[];
  stats: {
    turnover: number;
    scamsCaught: number;
    scamsMissed: number;
    receiptsSaved: number;
    transfers: number;
    nightTrades: number;
    maxNetWorth: number;
    ch4Profit0: number;
    ch7Profit0: number;
  };

  flags: Record<string, boolean | number | string>;
  fired: Record<string, boolean>;
  scheduled: Scheduled[];
  cutscene: CutsceneState | null;
  tax: TaxState;
  notes: string;
  ui: UiState;
}
