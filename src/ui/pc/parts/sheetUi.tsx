import type { ReactNode } from 'react';
import { Baseline, Bold, ChevronDown, CloudCheck, Italic, Lock, Menu, MessageSquare, PaintRoller, Plus, Printer, Redo2, Search, Star, Strikethrough, Undo2 } from 'lucide-react';
import { cn } from '../../common/kit';

export interface Cell {
  v?: ReactNode;
  /** Text shown in the formula bar (formula or raw value). */
  f?: string;
  cls?: string;
  align?: 'left' | 'right' | 'center';
  bg?: string;
  /** Editable control rendered instead of the value. */
  input?: ReactNode;
  span?: number;
}
export interface Col {
  w: number;
  align?: 'left' | 'right' | 'center';
}
export type Sel = { r: number; c: number };

export const colName = (i: number) => String.fromCharCode(65 + i);

export function SheetsIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size * 0.75} height={size} viewBox="0 0 24 32" aria-hidden>
      <path d="M15 0H2.5A2.5 2.5 0 0 0 0 2.5v27A2.5 2.5 0 0 0 2.5 32h19a2.5 2.5 0 0 0 2.5-2.5V9z" fill="#0F9D58" />
      <path d="M15 0v6.5A2.5 2.5 0 0 0 17.5 9H24z" fill="#87CEAC" />
      <rect x="5" y="14" width="14" height="11" rx="1" fill="#F1F1F1" />
      <path d="M5 17.5h14M5 21h14M10.5 14v11" stroke="#0F9D58" strokeWidth="1.3" />
    </svg>
  );
}

const MENU = ['Файл', 'Правка', 'Вид', 'Вставка', 'Формат', 'Данные', 'Инструменты', 'Расширения', 'Справка'];

export function SheetHeader({ title }: { title: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2 bg-[#F9FBFD] px-3 pt-2 pb-1">
      <SheetsIcon />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[17px] leading-tight text-[#1F1F1F]">{title}</span>
          <Star size={15} className="shrink-0 text-[#444746]" />
          <CloudCheck size={15} className="shrink-0 text-[#444746]" />
        </div>
        <div className="scroll-thin scroll-light flex gap-0.5 overflow-x-auto text-[13px] text-[#1F1F1F]">
          {MENU.map((m) => (
            <span key={m} className="shrink-0 cursor-default rounded px-1.5 py-0.5 hover:bg-[#E8EAED]">
              {m}
            </span>
          ))}
          <span className="ml-2 shrink-0 self-center text-xs whitespace-nowrap text-[#5F6368] underline decoration-dotted">Последнее изменение: Карим, только что</span>
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 @3xl:flex">
        <MessageSquare size={18} className="text-[#444746]" />
        <div className="flex -space-x-1.5">
          {[
            ['К', '#14B8A6'],
            ['М', '#22C55E'],
            ['А', '#3B82F6'],
          ].map(([l, c]) => (
            <span key={l} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white" style={{ background: c }}>
              {l}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#C2E7FF] px-4 py-2 text-[13px] font-medium text-[#001D35]">
          <Lock size={14} /> Настройки доступа
        </span>
      </div>
    </div>
  );
}

const I = ({ children }: { children: ReactNode }) => <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded px-1 text-[#444746] hover:bg-[#E1E5EA]">{children}</span>;
const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-[#C7C7C7]" />;

export function SheetToolbar() {
  return (
    <div className="mx-2 flex h-9 shrink-0 items-center gap-0.5 overflow-hidden rounded-full bg-[#EDF2FA] px-2 text-[13px]">
      <I><Search size={15} /></I>
      <I><Undo2 size={15} /></I>
      <I><Redo2 size={15} /></I>
      <I><Printer size={15} /></I>
      <I><PaintRoller size={15} /></I>
      <I><span className="flex items-center gap-0.5">100% <ChevronDown size={12} /></span></I>
      <Sep />
      <I>₽</I>
      <I>%</I>
      <I>.0</I>
      <I>.00</I>
      <I>123</I>
      <Sep />
      <I><span className="flex items-center gap-1">По умолчанию <ChevronDown size={12} /></span></I>
      <Sep />
      <I>−</I>
      <span className="flex h-6 w-8 shrink-0 items-center justify-center rounded border border-[#747775] text-xs">10</span>
      <I>+</I>
      <Sep />
      <I><Bold size={15} /></I>
      <I><Italic size={15} /></I>
      <I><Strikethrough size={15} /></I>
      <I><Baseline size={15} /></I>
    </div>
  );
}

export function FormulaBar({ cellRef, text }: { cellRef: string; text: string }) {
  return (
    <div className="mt-1 flex h-7 shrink-0 items-center border-y border-[#E1E3E1] bg-white text-[13px]">
      <div className="flex h-full w-20 shrink-0 items-center justify-between border-r border-[#E1E3E1] px-2 text-[#1F1F1F]">
        {cellRef}
        <ChevronDown size={12} className="text-[#5F6368]" />
      </div>
      <span className="px-2 font-serif text-[15px] text-[#5F6368] italic">fx</span>
      <div className="min-w-0 flex-1 truncate pr-2 font-mono text-[12px] text-[#1F1F1F] select-text">{text}</div>
    </div>
  );
}

export function SheetTabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string }[]; active: T; onChange: (t: T) => void }) {
  return (
    <div className="flex h-9 shrink-0 items-stretch gap-0.5 border-t border-[#E1E3E1] bg-[#F9FBFD] px-2">
      <span className="flex w-8 items-center justify-center text-[#444746]">
        <Plus size={16} />
      </span>
      <span className="flex w-8 items-center justify-center text-[#444746]">
        <Menu size={16} />
      </span>
      <div className="scroll-thin scroll-light flex min-w-0 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-1 px-3 text-[13px] whitespace-nowrap transition',
              t.id === active ? 'rounded-b-md bg-[#E1E9F7] font-medium text-[#0B57D0]' : 'text-[#444746] hover:bg-[#EEF0F2]',
            )}
          >
            {t.label}
            {t.id === active && <ChevronDown size={12} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Spreadsheet grid with sticky headers. Extra empty rows/cols are padded to look like a real sheet. */
export function Grid({ cols, rows, sel, onSel, minRows = 28, extraCols = 2 }: { cols: Col[]; rows: Cell[][]; sel: Sel; onSel: (s: Sel) => void; minRows?: number; extraCols?: number }) {
  const allCols: Col[] = [...cols, ...Array.from({ length: extraCols }, () => ({ w: 100 }))];
  const total = Math.max(minRows, rows.length + 4);
  return (
    <table className="border-separate border-spacing-0 text-[13px] text-[#1F1F1F]" style={{ tableLayout: 'fixed', width: 46 + allCols.reduce((s, c) => s + c.w, 0) }}>
      <colgroup>
        <col style={{ width: 46 }} />
        {allCols.map((c, i) => (
          <col key={i} style={{ width: c.w }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className="sticky top-0 left-0 z-30 h-[22px] border-r border-b border-[#C4C7C5] bg-[#F8F9FA]" />
          {allCols.map((_, i) => (
            <th
              key={i}
              className={cn('sticky top-0 z-20 h-[22px] border-r border-b border-[#C4C7C5] text-center text-[11px] font-normal', sel.c === i ? 'bg-[#D3E3FD] font-semibold text-[#0B57D0]' : 'bg-[#F8F9FA] text-[#444746]')}
            >
              {colName(i)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: total }, (_, r) => {
          const row = rows[r];
          let skip = 0;
          return (
            <tr key={r}>
              <td className={cn('sticky left-0 z-10 h-[23px] border-r border-b border-[#C4C7C5] text-center text-[11px]', sel.r === r ? 'bg-[#D3E3FD] font-semibold text-[#0B57D0]' : 'bg-[#F8F9FA] text-[#444746]')}>{r + 1}</td>
              {allCols.map((col, c) => {
                if (skip > 0) {
                  skip--;
                  return null;
                }
                const cell = row?.[c];
                const span = cell?.span ?? 1;
                skip = span - 1;
                const selected = sel.r === r && sel.c === c;
                const align = cell?.align ?? col.align ?? 'left';
                return (
                  <td
                    key={c}
                    colSpan={span}
                    onMouseDown={() => onSel({ r, c })}
                    className={cn(
                      'relative h-[23px] overflow-hidden border-r border-b border-[#E2E3E3] px-1.5 whitespace-nowrap',
                      align === 'right' && 'text-right',
                      align === 'center' && 'text-center',
                      cell?.cls,
                    )}
                    style={{ background: cell?.bg, textOverflow: 'ellipsis' }}
                  >
                    {cell?.input ?? cell?.v}
                    {selected && <span className="pointer-events-none absolute inset-0 border-2 border-[#1A73E8]" />}
                    {selected && <span className="pointer-events-none absolute -right-[3px] -bottom-[3px] h-[6px] w-[6px] border border-white bg-[#1A73E8]" />}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Text for the formula bar from a cell. */
export function cellText(cell: Cell | undefined) {
  if (!cell) return '';
  if (cell.f !== undefined) return cell.f;
  if (typeof cell.v === 'string' || typeof cell.v === 'number') return String(cell.v);
  return '';
}
