import { BatteryMedium, CheckCircle2, Clock, Lock } from 'lucide-react';
import { useGame } from '../../../game/store';
import { JOBS, type JobDef } from '../../../game/data/static';
import { clockStr, fmtRub } from '../../../game/util';
import { cn } from '../../common/kit';
import { useLightResult } from './shared';

function LightBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#EDEDED]">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

function ActiveShift() {
  const job = useGame((s) => s.job.activeJob);
  const now = useGame((s) => s.now);
  if (!job) return null;
  const def = JOBS.find((j) => j.id === job.id);
  const total = (def?.hours ?? 1) * 60;
  const p = 1 - (job.until - now) / total;
  return (
    <div className="rounded-2xl bg-[#1A1A1A] p-3.5 text-white shadow-md">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#97CF26]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#97CF26]" /> На смене
      </div>
      <div className="mt-1 text-[15px] font-semibold leading-snug">
        На смене: {job.title} · до {clockStr(job.until)}
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-[#97CF26] transition-all duration-500" style={{ width: `${Math.max(0, Math.min(1, p)) * 100}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-white/60">
        <span>Время на смене идёт быстрее</span>
        <span>+{fmtRub(job.pay)} на Сбер</span>
      </div>
    </div>
  );
}

function JobCard({ job }: { job: JobDef }) {
  const locked = useGame((s) => !!job.requires && !s.flags[job.requires]);
  const done = useGame((s) => s.job.doneToday.includes(job.id));
  const busy = useGame((s) => !!s.job.activeJob);
  const active = useGame((s) => s.job.activeJob?.id === job.id);
  const doJob = useGame((s) => s.doJob);
  const res = useLightResult();
  return (
    <div className={cn('rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,.08)]', (locked || done) && 'opacity-75')}>
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F2F1F0] text-[26px]">{job.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-snug text-[#1A1A1A]">{job.title}</div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-[#8F8F8F]">{job.desc}</div>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[#4D4D4D]">
        <span>{job.hours} ч</span>·<span className="font-semibold text-[#4B7A00]">+{fmtRub(job.pay)}</span>·<span>−{Math.abs(job.energy)} энергии</span>
      </div>
      <div className="mt-0.5 text-[11.5px] text-[#9B9B9B]">Оплата: {job.payer}</div>
      <div className="mt-2.5">
        {locked ? (
          <div className="flex items-center gap-1.5 rounded-xl bg-[#F2F1F0] px-3 py-2.5 text-[13px] text-[#4D4D4D]">
            <Lock size={15} /> Договоритесь с Даней в Telegram
          </div>
        ) : done ? (
          <div className="flex items-center gap-1.5 rounded-xl bg-[#EAF6D8] px-3 py-2.5 text-[13px] font-medium text-[#4B7A00]">
            <CheckCircle2 size={15} /> Сегодня уже отработано
          </div>
        ) : active ? (
          <div className="flex items-center gap-1.5 rounded-xl bg-[#E5F6FF] px-3 py-2.5 text-[13px] font-medium text-[#0088CC]">
            <Clock size={15} /> Вы на этой смене
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => res.show(doJob(job.id), `Смена началась: ${job.title}`)}
            className="h-10 w-full rounded-xl bg-[#00AAFF] text-[14px] font-semibold text-white transition hover:bg-[#0099E6] active:scale-[0.99] disabled:bg-[#B5E4FF]"
          >
            Выйти на смену
          </button>
        )}
      </div>
      {res.node && <div className="mt-2">{res.node}</div>}
    </div>
  );
}

export function Jobs() {
  const energy = useGame((s) => Math.round(s.hero.energy));
  return (
    <div className="space-y-3 p-3">
      <ActiveShift />
      <div className="rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,.08)]">
        <div className="mb-1.5 flex items-center justify-between text-[13px]">
          <span className="flex items-center gap-1.5 font-medium text-[#1A1A1A]">
            <BatteryMedium size={16} className="text-[#97CF26]" /> Ваша энергия
          </span>
          <span className="num font-semibold text-[#1A1A1A]">{energy}/100</span>
        </div>
        <LightBar value={energy / 100} color={energy < 25 ? '#FF6163' : energy < 50 ? '#FFB021' : '#97CF26'} />
        <div className="mt-1.5 text-[11.5px] leading-snug text-[#9B9B9B]">Деньги за смену приходят на Сбер сразу после окончания. Одна смена каждого вида в день.</div>
      </div>
      {JOBS.map((j) => (
        <JobCard key={j.id} job={j} />
      ))}
    </div>
  );
}
