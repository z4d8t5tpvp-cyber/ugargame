import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, RotateCcw, ShieldCheck, Swords } from 'lucide-react';
import { SAVE_KEY, useGame } from '../game/store';
import type { Difficulty } from '../game/types';
import { cn } from './common/kit';

export default function TitleScreen() {
  const started = useGame((s) => s.started);
  const chapter = useGame((s) => s.chapter);
  const [step, setStep] = useState<'main' | 'difficulty' | 'help'>('main');
  const [confirm, setConfirm] = useState(false);
  const hasSave = started && typeof localStorage !== 'undefined' && !!localStorage.getItem(SAVE_KEY);

  const start = (d: Difficulty) => {
    if (hasSave && !confirm) {
      setConfirm(true);
      return;
    }
    useGame.getState().newGame(d);
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#07090E]">
      <Ticker />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(14,203,129,.10),transparent_70%)]" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-[560px] max-w-[94vw] text-center">
        <div className="text-xs tracking-[0.5em] text-emerald-300/70 uppercase">симулятор P2P-трейдера</div>
        <h1 className="mt-3 text-6xl font-black tracking-tight text-white">
          P2P: <span className="bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">С НУЛЯ</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/60">
          Новозаровск, 3 700 ₽ на карте и старый компьютер. Каждый перевод — руками через банк, каждый чек — в папку, каждое ФИО — сверить. Восемь глав, четыре концовки.
        </p>

        {step === 'main' && (
          <div className="mx-auto mt-8 flex w-72 flex-col gap-2.5">
            {hasSave && (
              <button onClick={() => useGame.getState().resume()} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3 text-sm font-bold text-black hover:bg-emerald-300">
                <Play size={16} /> Продолжить · глава {chapter}
              </button>
            )}
            <button onClick={() => setStep('difficulty')} className={cn('flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold', hasSave ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-emerald-400 text-black hover:bg-emerald-300')}>
              <RotateCcw size={16} /> Новая игра
            </button>
            <button onClick={() => setStep('help')} className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">
              <BookOpen size={16} /> Как играть
            </button>
          </div>
        )}

        {step === 'difficulty' && (
          <div className="mt-8 grid grid-cols-2 gap-3 text-left">
            <DiffCard icon={<ShieldCheck size={18} />} title="Сюжетный" text="Меньше мошенников, мягче банки, длиннее таймеры и ниже цели. Чтобы спокойно пройти историю." onClick={() => start('story')} />
            <DiffCard icon={<Swords size={18} />} title="Реалистичный" text="Таймер ордера 15 минут, жёсткий 115-ФЗ, больше скама, цель — миллион оборота. Как в жизни." onClick={() => start('realistic')} />
            {confirm && <div className="col-span-2 rounded-lg bg-amber-400/10 p-3 text-center text-xs text-amber-200">Текущее сохранение будет перезаписано. Нажмите режим ещё раз, чтобы подтвердить.</div>}
            <button onClick={() => { setStep('main'); setConfirm(false); }} className="col-span-2 mt-1 text-xs text-white/50 hover:text-white">← Назад</button>
          </div>
        )}

        {step === 'help' && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-[13px] leading-relaxed text-white/75">
            <ul className="list-disc space-y-1.5 pl-4">
              <li>Слева — компьютер Артёма: браузер с биржей Bybit, папка с чеками, калькулятор и блокнот. Окна можно двигать и сворачивать.</li>
              <li>Справа — телефон: банки, Telegram, Барахолка, кошелёк Tonkeeper, SMS и Authenticator.</li>
              <li>Покупка USDT: откройте сделку → «Скопировать номер» → телефон → банк → «Вставить из буфера» → сверьте ФИО → переведите → сохраните PDF-чек → прикрепите чек в ордере → «Я оплатил».</li>
              <li>Продажа: дождитесь оплаты → в банке «Обновить выписку» → проверьте сумму и ФИО → код из Authenticator → «Отпустить USDT». Не верьте чекам и SMS!</li>
              <li>Банки следят за транзитом, ночными операциями и отсутствием бытовых трат (115-ФЗ). Перевод от третьего лица — апелляция и возврат, иначе блокировка по 161-ФЗ.</li>
              <li>Время: пауза, 1x, 2x, 5x внизу справа. Во время сделок время замедляется. Сон — через «Пуск». Игра сохраняется автоматически.</li>
            </ul>
            <button onClick={() => setStep('main')} className="mt-4 text-xs text-white/50 hover:text-white">← Назад</button>
          </div>
        )}
        <div className="mt-10 text-[11px] text-white/25">Все персонажи, банки-двойники и события вымышлены. Игра обучает финансовой и цифровой гигиене.</div>
      </motion.div>
    </div>
  );
}

function DiffCard({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-400/50 hover:bg-emerald-400/10">
      <div className="flex items-center gap-2 font-bold text-white">
        <span className="text-emerald-300">{icon}</span>
        {title}
      </div>
      <div className="mt-1.5 text-xs leading-relaxed text-white/55">{text}</div>
    </button>
  );
}

function Ticker() {
  const rows = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ p: (90.2 + Math.random() * 1.6).toFixed(2), side: i % 2 ? 'sell' : 'buy', a: Math.round(500 + Math.random() * 9000) })), []);
  const [off, setOff] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setOff((o) => (o + 1) % 26), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-y-0 left-6 hidden w-40 flex-col justify-center gap-1 font-mono text-[11px] opacity-25 md:flex">
      {rows.map((_, i) => {
        const r = rows[(i + off) % rows.length];
        return (
          <div key={i} className="flex justify-between">
            <span className={r.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>{r.p}</span>
            <span className="text-white/60">{r.a} USDT</span>
          </div>
        );
      })}
    </div>
  );
}
