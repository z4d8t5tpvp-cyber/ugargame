import { useMemo } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Lightbulb, Target, Zap } from 'lucide-react';
import { useGame } from '../../game/store';
import { chapterDef, hintFor } from '../../game/story/chapters';
import { fmtRub } from '../../game/util';
import { Bar, cn } from '../common/kit';

type GoalView = { id: string; text: string; done: boolean; p?: [number, number]; optional?: boolean };

/** Chapter goals + contextual hint, docked above the taskbar so it never covers windows. */
export default function QuestBar() {
  const chapter = useGame((s) => s.chapter);
  const open = useGame((s) => s.ui.questOpen);
  // Serialized so the selector result is stable between ticks.
  const goalsJson = useGame((s) =>
    JSON.stringify(chapterDef(s.chapter).goals.map((g) => ({ id: g.id, text: typeof g.text === 'function' ? g.text(s) : g.text, done: g.done(s), p: g.progress?.(s), optional: g.optional }))),
  );
  const goals = useMemo(() => JSON.parse(goalsJson) as GoalView[], [goalsJson]);
  const hint = useGame((s) => (s.ui.hints ? hintFor(s) : null));
  const tired = useGame((s) => s.hero.energy < 22);
  const ending = useGame((s) => !!s.ending);
  const def = chapterDef(chapter);
  const required = goals.filter((g) => !g.optional);
  const doneCount = required.filter((g) => g.done).length;
  const next = goals.find((g) => !g.done && !g.optional);

  return (
    <div className="relative z-[250] shrink-0 border-t border-white/10 bg-[#0c111b]/95">
      <button onClick={() => useGame.getState().toggleQuest()} className="flex min-h-[34px] w-full items-center gap-3 px-3 py-1.5 text-left">
        <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">ГЛАВА {chapter}</span>
        <span className="shrink-0 text-xs font-semibold text-white">{def.title}</span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-white/45">
          <Target size={12} />
          {ending ? 'финал пройден' : `${doneCount}/${required.length}`}
        </span>
        <span className="min-w-0 flex-1 text-[11.5px] leading-snug">
          {hint ? (
            <span className="flex items-start gap-1.5 text-sky-100/90">
              <Lightbulb size={13} className="mt-0.5 shrink-0 text-sky-300" />
              <span className="line-clamp-2">{hint}</span>
            </span>
          ) : next ? (
            <span className="truncate text-white/65">Цель: {next.text}</span>
          ) : null}
        </span>
        {tired && (
          <span className="flex shrink-0 items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-200" title="Поешьте (банк → платежи) или лягте спать («Пуск»)">
            <Zap size={11} /> устал
          </span>
        )}
        <span className="shrink-0 text-white/40">{open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}</span>
      </button>
      {open && (
        <div className="absolute right-2 bottom-full mb-2 w-[380px] max-w-[70%] rounded-xl border border-white/10 bg-[#0d1119]/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="mb-2 text-[11px] text-white/45">{def.subtitle}</div>
          <div className="space-y-2.5">
            {goals.map((g) => (
              <div key={g.id} className="text-xs">
                <div className={cn('flex items-start gap-2', g.done ? 'text-emerald-300/80 line-through decoration-emerald-500/40' : 'text-white/85')}>
                  {g.done ? <CheckCircle2 size={14} className="mt-px shrink-0 text-emerald-400" /> : <Circle size={14} className="mt-px shrink-0 text-white/30" />}
                  <span>
                    {g.text}
                    {g.optional && <span className="ml-1 text-white/35">(необязательно)</span>}
                  </span>
                </div>
                {g.p && !g.done && (
                  <div className="mt-1 ml-6">
                    <Bar value={g.p[0] / g.p[1]} color="#F0B90B" />
                    <div className="mt-0.5 text-[10px] text-white/40 num">{g.p[1] > 100 ? `${fmtRub(g.p[0])} / ${fmtRub(g.p[1])}` : `${g.p[0]} / ${g.p[1]}`}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {tired && <div className="mt-3 rounded-lg bg-rose-500/10 p-2 text-[11px] text-rose-200/90">Артём устал: внимательность падает. Поешьте (банк → «Платежи») или лягте спать («Пуск» → «Лечь спать»).</div>}
        </div>
      )}
    </div>
  );
}
