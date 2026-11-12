import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, FastForward } from 'lucide-react';
import { useGame } from '../../game/store';
import { CUTSCENES, type CutLine } from '../../game/story/cutscenes';
import { chapterDef, accountingQuality } from '../../game/story/chapters';
import { CHARACTERS } from '../../game/data/static';
import { netWorth, profitSince } from '../../game/engine/core';
import { fmtRub } from '../../game/util';
import type { CharacterId, GameState } from '../../game/types';
import { cn } from '../common/kit';
import { SceneBackground } from './Scenes';

const EMO: Record<string, string> = { calm: '😌', angry: '😠', sad: '😔', happy: '😄', smirk: '😏', serious: '🧐', worried: '😟' };

export function Cutscene() {
  const cs = useGame((s) => s.cutscene);
  if (!cs) return null;
  return <CutsceneView key={cs.id} />;
}

function CutsceneView() {
  const id = useGame((s) => s.cutscene!.id);
  const lineIdx = useGame((s) => s.cutscene!.line);
  const def = CUTSCENES[id];
  const line: CutLine = def.lines[lineIdx];
  const text = useGame((s) => (typeof line.text === 'function' ? line.text(s) : line.text));
  const choicesJson = useGame((s) => JSON.stringify((line.choices ?? []).filter((c) => !c.if || c.if(s)).map((c) => ({ text: c.text, hint: c.hint }))));
  const choices = useMemo(() => JSON.parse(choicesJson) as { text: string; hint?: string }[], [choicesJson]);
  const bg = useMemo(() => {
    for (let i = lineIdx; i >= 0; i--) if (def.lines[i].bg) return def.lines[i].bg!;
    return def.bg;
  }, [def, lineIdx]);
  const [typed, setTyped] = useState(0);
  const [showTitle, setShowTitle] = useState(!!def.title);
  useEffect(() => setTyped(0), [lineIdx, text]);
  useEffect(() => {
    if (typed >= text.length) return;
    const t = setTimeout(() => setTyped((n) => Math.min(text.length, n + 2)), 28);
    return () => clearTimeout(t);
  }, [typed, text]);
  useEffect(() => {
    if (!showTitle) return;
    const t = setTimeout(() => setShowTitle(false), 2600);
    return () => clearTimeout(t);
  }, [showTitle]);
  const done = typed >= text.length;
  const advance = () => {
    if (showTitle) return setShowTitle(false);
    if (!done) return setTyped(text.length);
    if (choices.length) return;
    useGame.getState().cutsceneNext();
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const who = line.who;
  const isChar = who !== 'narrator' && who !== 'thought';
  const ch = isChar ? CHARACTERS[who as CharacterId] : null;
  return (
    <div className="fixed inset-0 z-[1000] select-none bg-black" onClick={advance}>
      <AnimatePresence mode="wait">
        <motion.div key={bg} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
          <SceneBackground bg={bg} />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-x-0 top-0 h-[9vh] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[9vh] bg-black" />
      {def.place && <div className="absolute top-[9vh] left-6 mt-3 text-xs tracking-wider text-white/50 uppercase">{def.place}</div>}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!choices.length) useGame.getState().cutsceneNext();
          else setTyped(text.length);
        }}
        className="absolute top-[9vh] right-6 mt-2 flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs text-white/60 hover:text-white"
      >
        <FastForward size={12} /> Далее
      </button>

      <AnimatePresence>
        {showTitle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70">
            <div className="text-xs tracking-[0.4em] text-amber-300/80 uppercase">P2P: С НУЛЯ</div>
            <div className="mt-3 text-3xl font-bold text-white">{def.title}</div>
            {def.place && <div className="mt-2 text-sm text-white/60">{def.place}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-[9vh] flex justify-center px-6 pb-6">
        <motion.div key={lineIdx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex w-full max-w-4xl items-end gap-5">
          {ch && (
            <div className="relative hidden shrink-0 sm:block">
              <div className="flex h-36 w-36 items-center justify-center rounded-3xl text-6xl shadow-2xl ring-2 ring-white/20" style={{ background: `linear-gradient(160deg, ${ch.color}, #0b0d12 120%)` }}>
                {who === 'artem' ? '🧑' : ch.emoji}
              </div>
              {line.emotion && <span className="absolute -right-2 -bottom-2 rounded-full bg-black/70 p-1.5 text-xl">{EMO[line.emotion]}</span>}
            </div>
          )}
          <div className={cn('min-h-[140px] flex-1 rounded-2xl border border-white/10 bg-black/70 p-5 backdrop-blur-md', !ch && 'mx-auto max-w-3xl')}>
            {ch && <div className="mb-1.5 text-sm font-bold" style={{ color: who === 'artem' ? '#60A5FA' : ch.color }}>{who === 'artem' ? 'Артём' : ch.name}</div>}
            {who === 'thought' && <div className="mb-1.5 text-sm font-bold text-violet-300">Артём (мысли)</div>}
            <div className={cn('text-[17px] leading-relaxed text-white/95', (who === 'narrator' || who === 'thought') && 'italic', who === 'thought' && 'text-violet-100')}>
              {text.slice(0, typed)}
              {!done && <span className="animate-blink">▍</span>}
            </div>
            {done && choices.length > 0 && (
              <div className="mt-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                {choices.map((c, i) => (
                  <button key={i} onClick={() => useGame.getState().cutsceneChoose(i)} className="group rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-left text-sm text-amber-50 transition hover:border-amber-300 hover:bg-amber-400/20">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={15} className="text-amber-300 transition group-hover:translate-x-0.5" />
                      {c.text}
                    </div>
                    {c.hint && <div className="mt-0.5 pl-6 text-xs text-amber-200/60">{c.hint}</div>}
                  </button>
                ))}
              </div>
            )}
            {done && !choices.length && <div className="mt-3 text-right text-xs text-white/40">нажмите, чтобы продолжить ▸</div>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ChapterCard() {
  const n = useGame((s) => (s.cutscene ? null : s.ui.chapterCard));
  const goalsJson = useGame((s) => JSON.stringify(chapterDef(s.chapter).goals.map((g) => (typeof g.text === 'function' ? g.text(s) : g.text))));
  if (!n) return null;
  const def = chapterDef(n);
  const goals = JSON.parse(goalsJson) as string[];
  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[520px] max-w-[92vw] rounded-3xl border border-white/10 bg-[#0e121b] p-8 text-center shadow-2xl">
        <div className="text-xs tracking-[0.4em] text-amber-300/80 uppercase">Глава {n} из 8</div>
        <div className="mt-2 text-3xl font-bold text-white">{def.title}</div>
        <div className="mt-1 text-sm text-white/55">{def.subtitle}</div>
        <div className="mt-6 space-y-2 text-left">
          {goals.map((g, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/85">
              <span className="text-amber-300">◆</span>
              {g}
            </div>
          ))}
        </div>
        <button onClick={() => useGame.getState().dismissChapterCard()} className="mt-7 rounded-xl bg-amber-400 px-8 py-2.5 text-sm font-bold text-black hover:bg-amber-300">
          Начать
        </button>
      </motion.div>
    </div>
  );
}

const ENDING_TEXT: Record<string, string> = {
  end_architect: 'Высокая чистая прибыль, чистый учёт и доверие Марата, Карима и Паши.',
  end_wolf: 'Капитал есть, но команда распалась — доверие потеряно.',
  end_crisis: 'Плечо, лизинг и иллюзия оборота привели к кассовому разрыву.',
  end_newstart: 'Капитал потерян, но честь и люди остались. Опыт — бесценен.',
};

export function EndingScreen() {
  const ending = useGame((s) => (s.cutscene || s.flags.endingSeen ? null : s.ending));
  const stats = useGame((s) => (ending ? statsJson(s) : ''));
  if (!ending) return null;
  const st = JSON.parse(stats) as Record<string, string>;
  const title = CUTSCENES[ending]?.title?.replace('Концовка: ', '') ?? '';
  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center bg-black/85 backdrop-blur">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-[640px] max-w-[94vw] rounded-3xl border border-white/10 bg-[#0e121b] p-8 shadow-2xl">
        <div className="text-center text-xs tracking-[0.4em] text-amber-300/80 uppercase">Финал</div>
        <div className="mt-2 text-center text-2xl font-bold text-white">{title}</div>
        <div className="mt-2 text-center text-sm text-white/60">{ENDING_TEXT[ending]}</div>
        <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
          {Object.entries(st).map(([k, v]) => (
            <div key={k} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-white/55">{k}</span>
              <span className="font-semibold text-white num">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-7 flex justify-center gap-3">
          <button onClick={() => useGame.getState().act((d) => void (d.flags.endingSeen = true))} className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15">
            Продолжить играть
          </button>
          <button onClick={() => useGame.getState().quitToMenu()} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-300">
            В главное меню
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function statsJson(s: GameState) {
  const p = profitSince(s, 0);
  return JSON.stringify({
    'Чистый капитал': fmtRub(netWorth(s)),
    'Оборот за игру': fmtRub(s.stats.turnover),
    'Прибыль до налога': fmtRub(p),
    'Качество учёта': `${accountingQuality(s)}%`,
    'Мошенников поймано': String(s.stats.scamsCaught),
    'Ошибок с мошенниками': String(s.stats.scamsMissed),
    'Доверие Марата': String(Math.round(s.characters.marat.trust)),
    'Доверие Паши': String(Math.round(s.characters.pasha.trust)),
  });
}
