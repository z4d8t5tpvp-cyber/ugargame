import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, LoaderCircle, RefreshCw, ScanFace, ShieldCheck } from 'lucide-react';
import { useGame } from '../../../game/store';
import { cn } from '../../common/kit';
import { btnGhost, btnPrimary, Callout, Card, inputCls, Label } from './AssetsKit';

export const HERO_PHONE = '+7 (953) 271-44-18';
export const HERO_NAME = 'Воронов Артём Сергеевич';

export function KycForm() {
  const submitKyc = useGame((s) => s.submitKyc);
  const [shot, setShot] = useState<'none' | 'flash' | 'done'>('none');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const takePhoto = () => {
    setShot('flash');
    timer.current = setTimeout(() => setShot('done'), 420);
  };

  return (
    <Card title="Верификация личности (уровень 1)" icon={<ScanFace size={16} />} right={<span className="text-[11px] text-white/40">≈ 2 минуты</span>}>
      <Callout tone="info" className="mb-4">
        Без верификации недоступны P2P-сделки и вывод средств. Данные проверяются автоматически по паспорту РФ.
      </Callout>

      <div className="grid grid-cols-2 gap-3">
        <Field label="ФИО (как в паспорте)" value={HERO_NAME} className="col-span-2" />
        <Field label="Дата рождения" value="03.05.2006" />
        <Field label="Гражданство" value="Российская Федерация" />
        <Field label="Документ" value="Паспорт РФ" />
        <Field label="Серия и номер" value="15 20 482193" mono />
      </div>

      <div className="mt-4">
        <Label right={shot === 'done' ? <span className="text-emerald">готово</span> : 'обязательно'}>Селфи для проверки «живости»</Label>
        <div className="relative mx-auto aspect-[4/3] max-h-[230px] w-full max-w-[320px] overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(ellipse_at_center,#2a3242_0%,#0c0f15_75%)]">
          {shot === 'done' ? (
            <FacePhoto />
          ) : (
            <>
              <div className="absolute left-1/2 top-[46%] h-[68%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-amber/70" />
              <div className="absolute inset-x-0 bottom-2 text-center text-[11px] text-white/55">Расположите лицо в овале и смотрите в камеру</div>
            </>
          )}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/70">
            <span className={cn('h-1.5 w-1.5 rounded-full', shot === 'done' ? 'bg-white/40' : 'animate-pulse bg-rose')} />
            {shot === 'done' ? 'Снимок' : 'Веб-камера'}
          </div>
          {shot === 'done' && (
            <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald px-2 py-0.5 text-[10px] font-semibold text-black">
              <Check size={11} strokeWidth={3} /> Фото сделано
            </div>
          )}
          <AnimatePresence>
            {shot === 'flash' && <motion.div key="flash" className="absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />}
          </AnimatePresence>
        </div>
        <div className="mt-2 flex justify-center">
          {shot === 'done' ? (
            <button type="button" className={btnGhost} onClick={() => setShot('none')}>
              <RefreshCw size={13} /> Переснять
            </button>
          ) : (
            <button type="button" className={btnGhost} onClick={takePhoto} disabled={shot === 'flash'}>
              <Camera size={14} /> Сделать селфи
            </button>
          )}
        </div>
      </div>

      <button type="button" className={cn(btnPrimary, 'mt-4 w-full py-2.5')} disabled={shot !== 'done'} onClick={() => submitKyc('bybit')}>
        Отправить на проверку
      </button>
      {shot !== 'done' && <p className="mt-1.5 text-center text-[11px] text-white/35">Сначала сделайте селфи</p>}
    </Card>
  );
}

function Field({ label, value, className, mono }: { label: string; value: string; className?: string; mono?: boolean }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <input className={cn(inputCls, mono && 'num font-mono tracking-wider')} value={value} readOnly />
    </div>
  );
}

function FacePhoto() {
  return (
    <svg viewBox="0 0 320 240" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="kyc-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b4456" />
          <stop offset="1" stopColor="#1a1f29" />
        </linearGradient>
        <radialGradient id="kyc-skin" cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#d9b49a" />
          <stop offset="1" stopColor="#9c7560" />
        </radialGradient>
      </defs>
      <rect width="320" height="240" fill="url(#kyc-bg)" />
      <rect x="20" y="30" width="70" height="110" rx="4" fill="#4a5468" opacity="0.5" />
      {/* hoodie */}
      <path d="M70 240 C80 180 120 165 160 165 C200 165 240 180 250 240 Z" fill="#2d3340" />
      <path d="M138 168 L160 200 L182 168" fill="none" stroke="#1d222c" strokeWidth="4" />
      {/* neck + head */}
      <rect x="146" y="140" width="28" height="30" rx="8" fill="#a98068" />
      <ellipse cx="160" cy="108" rx="40" ry="50" fill="url(#kyc-skin)" />
      <path d="M118 98 C118 58 145 50 162 52 C190 54 206 72 202 100 C196 82 182 74 160 74 C140 74 126 82 118 98 Z" fill="#3a2a22" />
      <ellipse cx="145" cy="110" rx="4" ry="2.6" fill="#2a1f1a" />
      <ellipse cx="176" cy="110" rx="4" ry="2.6" fill="#2a1f1a" />
      <path d="M152 136 C157 139 164 139 169 136" fill="none" stroke="#7a5244" strokeWidth="2" strokeLinecap="round" />
      {/* detection box */}
      <g fill="none" stroke="#0ECB81" strokeWidth="2">
        <path d="M112 54 v-10 h12 M208 54 v-10 h-12 M112 162 v10 h12 M208 162 v10 h-12" />
      </g>
    </svg>
  );
}

export function KycPending() {
  const readyAt = useGame((s) => s.exchanges.bybit.kycReadyAt);
  const left = useGame((s) => (readyAt === null ? null : Math.max(1, Math.ceil(readyAt - s.now))));
  return (
    <Card title="Верификация личности (уровень 1)" icon={<ScanFace size={16} />} right={<span className="rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-semibold text-amber">На проверке</span>}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber/10">
          <LoaderCircle size={22} className="animate-spin text-amber" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Документы на проверке. Обычно 5–10 минут</div>
          {left !== null && <div className="num mt-0.5 text-xs text-white/50">Осталось ≈ {left} мин игрового времени</div>}
          <ul className="mt-3 space-y-1.5 text-xs">
            <PendingStep done>Паспортные данные получены</PendingStep>
            <PendingStep done>Селфи загружено</PendingStep>
            <PendingStep>Сверка с базой и проверка «живости»</PendingStep>
          </ul>
        </div>
      </div>
      <Callout tone="info" className="mt-4">
        Время в игре идёт само. Чтобы не ждать, ускорьте его кнопкой <b>5x</b> на панели задач внизу экрана — придёт уведомление, когда проверка завершится.
      </Callout>
    </Card>
  );
}

function PendingStep({ done, children }: { done?: boolean; children: ReactNode }) {
  return (
    <li className={cn('flex items-center gap-2', done ? 'text-white/70' : 'text-white/45')}>
      {done ? <ShieldCheck size={13} className="text-emerald" /> : <LoaderCircle size={13} className="animate-spin text-amber" />}
      {children}
    </li>
  );
}
