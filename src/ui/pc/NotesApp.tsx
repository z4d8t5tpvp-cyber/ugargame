import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { useGame } from '../../game/store';
import { cn } from '../common/kit';

const RULES = [
  'Считай чистую прибыль, а не оборот.',
  'ФИО отправителя = ФИО на бирже.',
  'Никаких третьих лиц — только апелляция и возврат.',
  'Сохраняй каждый чек.',
  'Не гоняй деньги транзитом: пришло — подожди.',
  'Резерв под налог — святое.',
  'Не рискуй деньгами, которые не можешь потерять.',
];

const MENU = ['Файл', 'Правка', 'Формат', 'Вид', 'Справка'];

export default function NotesApp() {
  const notes = useGame((s) => s.notes);
  const setNotes = useGame((s) => s.setNotes);
  const rules = useGame((s) => !!s.flags.sheetUnlocked);
  const [pos, setPos] = useState({ line: 1, col: 1 });
  const [folded, setFolded] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content so the pinned rules and the text scroll as one page.
  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    const fit = () => {
      el.style.height = '0px';
      el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
    };
    fit();
    // Re-wrap when the window is resized.
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== w) {
        w = el.clientWidth;
        fit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [notes]);

  const caret = () => {
    const el = ta.current;
    if (!el) return;
    const before = el.value.slice(0, el.selectionStart).split('\n');
    setPos({ line: before.length, col: before[before.length - 1].length + 1 });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-[#1A1A1A]">
      <div className="flex h-7 shrink-0 items-center gap-0.5 border-b border-[#E5E5E5] bg-[#F9F9F9] px-1 text-[12px]">
        {MENU.map((m) => (
          <span key={m} className="cursor-default rounded px-2 py-0.5 hover:bg-[#E5F1FB]">
            {m}
          </span>
        ))}
      </div>
      <div className="scroll-thin scroll-light min-h-0 flex-1 overflow-auto" onClick={() => ta.current?.focus()}>
        {rules && (
          <div className="border-b border-dashed border-[#D4D4D4] bg-[#FAFAF5] px-3 py-2 font-mono text-[12.5px] leading-[1.55]" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setFolded((f) => !f)} className="flex w-full items-center gap-1.5 text-left font-bold text-[#1A1A1A]">
              {folded ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              ПРАВИЛА МАРАТА KMI
              <span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-[#8A8A8A]">
                <Lock size={10} /> только чтение
              </span>
            </button>
            {!folded && (
              <ol className="mt-1 select-text">
                {RULES.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[#8A8A8A]">{i + 1}.</span>
                    <span>{r}</span>
                  </li>
                ))}
                <li className="mt-1 text-[#8A8A8A]">{'// нарушил правило — запиши, какое и почему'}</li>
              </ol>
            )}
          </div>
        )}
        <textarea
          ref={ta}
          value={notes}
          spellCheck={false}
          onChange={(e) => {
            setNotes(e.target.value);
            caret();
          }}
          onSelect={caret}
          onKeyUp={caret}
          onClick={caret}
          placeholder="Пишите здесь…"
          className={cn('block w-full resize-none overflow-hidden bg-transparent px-3 py-2 font-mono text-[12.5px] leading-[1.55] text-[#1A1A1A] outline-none placeholder:text-[#B0B0B0]')}
        />
      </div>
      <div className="flex h-6 shrink-0 items-center border-t border-[#E5E5E5] bg-[#F3F3F3] text-[11px] text-[#505050]">
        <span className="num px-3">
          Стр {pos.line}, стлб {pos.col}
        </span>
        <span className="ml-auto border-l border-[#DADADA] px-3">100%</span>
        <span className="border-l border-[#DADADA] px-3">Windows (CRLF)</span>
        <span className="border-l border-[#DADADA] px-3">UTF-8</span>
      </div>
    </div>
  );
}
