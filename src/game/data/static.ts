import type { BankId, CharacterId, ExtBankId } from '../types';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  short: string;
  username: string;
  role: string;
  bio: string;
  color: string;
  emoji: string;
  trust: number;
  riskAppetite: number;
  tgId: number;
  regYear: number;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  artem: { id: 'artem', name: 'Артём Воронов', short: 'Артём', username: '@tema_voronov', role: 'Это вы', bio: 'Новозаровск. 20 лет.', color: '#3B82F6', emoji: '🧑', trust: 100, riskAppetite: 50, tgId: 5512903311, regYear: 2019 },
  marat: { id: 'marat', name: 'Марат KMI', short: 'Марат', username: '@marat_kmi', role: 'Наставник и стратегический партнёр', bio: 'Считаю, потом действую. Без рекламы и понтов.', color: '#64748B', emoji: '🧭', trust: 30, riskAppetite: 25, tgId: 284113902, regYear: 2016 },
  danya: { id: 'danya', name: 'Даня ММА', short: 'Даня', username: '@danya_octagon32', role: 'Друг детства, боец', bio: '🥊 ММА | Новозаровск 32 | Не сдаваться', color: '#EF4444', emoji: '🥊', trust: 75, riskAppetite: 92, tgId: 1093847712, regYear: 2018 },
  pasha: { id: 'pasha', name: 'Паша Борец', short: 'Паша', username: '@pavel_wrest', role: 'Безопасность, чтение людей', bio: 'Вольная борьба. Слово дороже денег.', color: '#78716C', emoji: '🤼', trust: 70, riskAppetite: 35, tgId: 902817364, regYear: 2017 },
  ivan: { id: 'ivan', name: 'Иван Ролекс', short: 'Иван', username: '@ivan_luxury_p2p', role: 'Статус и агрессивный рост', bio: '⌚️ Rolex | 🚘 BMW | VIP P2P | Москва-Сити', color: '#EAB308', emoji: '⌚', trust: 45, riskAppetite: 88, tgId: 6012984421, regYear: 2022 },
  kapul: { id: 'kapul', name: 'Капул', short: 'Капул', username: '@kapul_connect', role: 'Связи и OTC-сделки', bio: 'Знаю всех. Свожу людей. OTC от 1 млн.', color: '#A855F7', emoji: '🤝', trust: 50, riskAppetite: 75, tgId: 5129033818, regYear: 2020 },
  karim: { id: 'karim', name: 'Карим', short: 'Карим', username: '@karim_quant', role: 'Финансовый аналитик', bio: 'Excel > эмоции. Считаю риски.', color: '#14B8A6', emoji: '📊', trust: 55, riskAppetite: 15, tgId: 771203345, regYear: 2017 },
  sanya: { id: 'sanya', name: 'Саня Лимит', short: 'Саня', username: '@sanya_sbp_king', role: 'Знакомый по P2P', bio: 'СБП, лимиты, банки — спрашивай. Карты в блоке — норма жизни 😅', color: '#22C55E', emoji: '💳', trust: 60, riskAppetite: 70, tgId: 1654092217, regYear: 2019 },
  grisha: { id: 'grisha', name: 'Гриша Бухгалтер', short: 'Гриша', username: '@grisha_tax_audit', role: 'Налоги и комплаенс', bio: 'Бухучёт, 115-ФЗ, 161-ФЗ, ответы банкам. ИП/ООО под ключ.', color: '#0EA5E9', emoji: '🧾', trust: 50, riskAppetite: 10, tgId: 438110027, regYear: 2016 },
  max: { id: 'max', name: 'Макс Ноль', short: 'Макс', username: '@max_zero_arb', role: 'Главный конкурент', bio: 'Лучший курс в стакане. Всегда на 1 копейку лучше 😉', color: '#F43F5E', emoji: '🎯', trust: 10, riskAppetite: 85, tgId: 6698120044, regYear: 2025 },
  lera: { id: 'lera', name: 'Лера', short: 'Лера', username: '@lera_mrz', role: 'Бывшая девушка', bio: '✨', color: '#F472B6', emoji: '💔', trust: 0, riskAppetite: 0, tgId: 1188290034, regYear: 2020 },
};

export const TEAM_CANDIDATES: CharacterId[] = ['karim', 'pasha', 'danya', 'ivan', 'kapul'];

export interface BankDef {
  id: BankId;
  name: string;
  app: string;
  color: string;
  accent: string;
  text: string;
  premiumName: string;
  premiumPrice: number;
  basicLimit: number;
  premiumLimit: number;
}

export const BANKS: Record<BankId, BankDef> = {
  sber: { id: 'sber', name: 'Сбербанк', app: 'СберБанк Онлайн', color: '#21A038', accent: '#10B981', text: '#FFFFFF', premiumName: 'СберПрайм+', premiumPrice: 399, basicLimit: 100000, premiumLimit: 500000 },
  tbank: { id: 'tbank', name: 'Т-Банк', app: 'Т-Банк', color: '#FFDD2D', accent: '#FACC15', text: '#111111', premiumName: 'Т-Pro', premiumPrice: 399, basicLimit: 100000, premiumLimit: 500000 },
  alfa: { id: 'alfa', name: 'Альфа-Банк', app: 'Альфа-Банк', color: '#EF3124', accent: '#EF4444', text: '#FFFFFF', premiumName: 'Альфа-Смарт', premiumPrice: 299, basicLimit: 100000, premiumLimit: 500000 },
};

export const SBP_OVER_LIMIT_FEE = 0.01; // 1% above the free monthly limit
export const SBP_MAX_SINGLE = 1_000_000;
export const ME2ME_LIMIT = 30_000_000;

export const EXT_BANKS: ExtBankId[] = ['sber', 'tbank', 'alfa', 'vtb', 'raif', 'ozon'];

export interface RetailItem {
  id: string;
  title: string;
  price: number;
  energy: number;
  stress: number;
  attention: number;
  emoji: string;
}

export const RETAIL: RetailItem[] = [
  { id: 'pyat', title: 'Пятёрочка — продукты', price: 650, energy: 15, stress: -2, attention: 0, emoji: '🛒' },
  { id: 'coffee', title: 'Кофе с собой', price: 250, energy: 8, stress: -3, attention: 8, emoji: '☕' },
  { id: 'shawarma', title: 'Шаурма у вокзала', price: 320, energy: 12, stress: -4, attention: 0, emoji: '🌯' },
  { id: 'gkh', title: 'ЖКХ и интернет', price: 1500, energy: 0, stress: -6, attention: 0, emoji: '🏠' },
  { id: 'mobile', title: 'Мобильная связь', price: 450, energy: 0, stress: -1, attention: 0, emoji: '📶' },
  { id: 'gym', title: 'Абонемент в зал (разово)', price: 400, energy: -10, stress: -14, attention: 4, emoji: '🏋️' },
];

export interface AvitoItemDef {
  id: string;
  title: string;
  desc: string;
  fair: number; // fair market price
  emoji: string;
}

export const AVITO_ITEMS: AvitoItemDef[] = [
  { id: 'ps4', title: 'PlayStation 4 Slim 500 ГБ + геймпад', desc: 'Работает идеально, без коробки. Самовывоз — Новозаровск, ул. Ленина.', fair: 11000, emoji: '🎮' },
  { id: 'jacket', title: 'Зимняя куртка The North Face, р. L', desc: 'Носил два сезона, тёплая, без дефектов.', fair: 3500, emoji: '🧥' },
  { id: 'jbl', title: 'Колонка JBL Charge 4', desc: 'Держит заряд, звук отличный. Зарядка в комплекте.', fair: 2800, emoji: '🔊' },
  { id: 'bike', title: 'Велосипед Stels Navigator 26"', desc: 'Требует подкачки колёс, в остальном норм.', fair: 5500, emoji: '🚲' },
];

export interface JobDef {
  id: string;
  title: string;
  desc: string;
  hours: number;
  pay: number;
  energy: number;
  stress: number;
  emoji: string;
  requires?: string; // flag
  payer: string;
}

export const JOBS: JobDef[] = [
  { id: 'gym', title: 'Помочь Дане в зале', desc: 'Убрать зал, протереть маты, подержать лапы новичкам.', hours: 4, pay: 1500, energy: -18, stress: -10, emoji: '🥊', requires: 'job_gym', payer: 'Даниил Сергеевич Р.' },
  { id: 'warehouse', title: 'Разгрузка фуры — склад «Магнит»', desc: 'Смена 6 часов. Оплата на карту в тот же день.', hours: 6, pay: 2200, energy: -35, stress: 6, emoji: '📦', payer: 'ООО «Тандер»' },
  { id: 'courier', title: 'Курьер на велосипеде', desc: 'Доставка заказов по Новозаровску, 3 часа.', hours: 3, pay: 950, energy: -16, stress: 2, emoji: '🚴', payer: 'ООО «Курьер Сервис»' },
  { id: 'pcfix', title: 'Почистить ноутбук соседке', desc: 'Тамара Ивановна снова «сломала интернет».', hours: 2, pay: 700, energy: -6, stress: -2, emoji: '💻', payer: 'Тамара Ивановна Л.' },
];

export interface ShopItemDef {
  id: string;
  cat: 'pc' | 'phone' | 'home' | 'car' | 'service';
  title: string;
  desc: string;
  price: number;
  monthly?: number;
  minChapter: number;
  emoji: string;
}

export const SHOP: ShopItemDef[] = [
  { id: 'pc1', cat: 'pc', title: 'Апгрейд ПК: Ryzen 5 / 32 ГБ / SSD', desc: 'Убирает лаги при 4+ окнах. Нагрузка ЦП падает в 3 раза.', price: 68000, minChapter: 2, emoji: '🖥️' },
  { id: 'pc2', cat: 'pc', title: 'Рабочая станция: Ryzen 9 + 2 монитора', desc: 'Максимальная скорость работы, без ограничений по окнам.', price: 185000, minChapter: 4, emoji: '🖥️' },
  { id: 'phone1', cat: 'phone', title: 'Смартфон iPhone 15 Pro', desc: 'Быстрый Face ID, батарея держит весь день.', price: 98000, minChapter: 3, emoji: '📱' },
  { id: 'flat', cat: 'home', title: 'Квартира-студия в Москве (аренда)', desc: 'Переезд из Новозаровска. Аренда 65 000 ₽/мес, первый месяц + залог.', price: 130000, monthly: 65000, minChapter: 4, emoji: '🏙️' },
  { id: 'office', cat: 'home', title: 'Офис в коворкинге «Сити»', desc: 'Рабочее место для команды. +доверие команды, +10 к внимательности.', price: 90000, monthly: 90000, minChapter: 5, emoji: '🏢' },
  { id: 'lada', cat: 'car', title: 'Lada Vesta (б/у, 2021)', desc: 'Скромно и надёжно. Марат одобряет.', price: 890000, minChapter: 5, emoji: '🚗' },
  { id: 'bmw', cat: 'car', title: 'BMW M5 в лизинг (предложение Ивана)', desc: 'Первый взнос 600 000 ₽, затем 240 000 ₽/мес. «Статус решает всё» — Иван.', price: 600000, monthly: 240000, minChapter: 5, emoji: '🏎️' },
  { id: 'aml', cat: 'service', title: 'AML-скринер PRO (подписка)', desc: 'Проверка кошельков на связь с даркнетом и украденными средствами.', price: 4900, minChapter: 4, emoji: '🛡️' },
];
