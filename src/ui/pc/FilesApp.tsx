import { useMemo, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Landmark,
  Monitor,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Signature,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useGame } from '../../game/store';
import type { BankId, ExtBankId, GameFile, GameFileKind } from '../../game/types';
import { scoreDocs } from '../../game/engine/banks';
import { BANKS } from '../../game/data/static';
import { BANK_SHORT, fmtRub, shortDT } from '../../game/util';
import { cn, useResult } from '../common/kit';
import { LinesView, ReceiptView } from './parts/DocView';

type FolderId = 'all' | 'receipts' | 'exports' | 'docs';
const BANK_IDS: BankId[] = ['sber', 'tbank', 'alfa'];

const FOLDERS: { id: FolderId; label: string; kinds: GameFileKind[] | null }[] = [
  { id: 'all', label: 'Все файлы', kinds: null },
  { id: 'receipts', label: 'Чеки', kinds: ['receipt'] },
  { id: 'exports', label: 'Выгрузки ордеров', kinds: ['order_export', 'statement'] },
  { id: 'docs', label: 'Документы', kinds: ['tax_doc', 'contract', 'audit'] },
];

const KIND: Record<GameFileKind, { type: string; icon: ReactNode }> = {
  receipt: { type: 'Чек (PDF)', icon: <Receipt size={15} className="text-emerald-400" /> },
  order_export: { type: 'Выгрузка ордеров (PDF)', icon: <FileSpreadsheet size={15} className="text-amber-300" /> },
  statement: { type: 'Выписка (PDF)', icon: <FileSpreadsheet size={15} className="text-sky-300" /> },
  tax_doc: { type: 'Справка (PDF)', icon: <FileCheck size={15} className="text-[#60CDFF]" /> },
  contract: { type: 'Договор (PDF)', icon: <Signature size={15} className="text-violet-300" /> },
  audit: { type: 'Отчёт (PDF)', icon: <ShieldCheck size={15} className="text-teal-300" /> },
};

const sizeKb = (f: GameFile) => {
  let h = 0;
  for (const c of f.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return f.kind === 'receipt' ? 38 + (h % 27) : 22 + (f.lines?.length ?? 4) * 2 + (h % 18);
};

export default function FilesApp() {
  const files = useGame((s) => s.files);
  const banks = useGame((s) => s.banks);
  const openReq = useGame(useShallow((s) => BANK_IDS.filter((id) => s.banks[id].request?.status === 'open')));
  const [folder, setFolder] = useState<FolderId>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const res = useResult();

  const fdef = FOLDERS.find((f) => f.id === folder)!;
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return files.filter((f) => (!fdef.kinds || fdef.kinds.includes(f.kind)) && (!query || f.name.toLowerCase().includes(query)));
  }, [files, fdef, q]);
  const count = (fd: (typeof FOLDERS)[number]) => (fd.kinds ? files.filter((f) => fd.kinds!.includes(f.kind)).length : files.length);
  const sel = selected.filter((id) => files.some((f) => f.id === id));
  const focused = files.find((f) => f.id === focus) ?? null;
  const allChecked = list.length > 0 && list.every((f) => sel.includes(f.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const selKb = files.filter((f) => sel.includes(f.id)).reduce((s, f) => s + sizeKb(f), 0);
  const reviewing = BANK_IDS.filter((id) => banks[id].request?.status === 'review');

  return (
    <div className="@container relative flex h-full min-h-0 flex-col bg-[#191919] text-[12px] text-[#E4E4E4]">
      {/* command bar */}
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[#2B2B2B] bg-[#202020] px-2">
        <button
          type="button"
          disabled={!sel.length || !openReq.length}
          onClick={() => setSending(true)}
          title={!openReq.length ? 'Нет активных запросов от банков' : !sel.length ? 'Отметьте файлы флажками' : undefined}
          className="flex items-center gap-1.5 rounded-md bg-[#60CDFF] px-3 py-1.5 font-semibold text-black transition hover:bg-[#7FD7FF] disabled:cursor-not-allowed disabled:bg-[#2D2D2D] disabled:text-white/35"
        >
          <Send size={14} /> Отправить в банк ▸{sel.length > 0 && <span className="num rounded bg-black/15 px-1">{sel.length}</span>}
        </button>
        <span className="mx-1 h-5 w-px bg-[#3A3A3A]" />
        <ToolBtn onClick={() => setSelected(allChecked ? sel.filter((id) => !list.some((f) => f.id === id)) : [...new Set([...sel, ...list.map((f) => f.id)])])} disabled={!list.length}>
          {allChecked ? 'Снять выделение' : 'Выделить все'}
        </ToolBtn>
        {sel.length > 0 && <ToolBtn onClick={() => setSelected([])}>Очистить ({sel.length})</ToolBtn>}
        <div className="ml-auto hidden items-center gap-1 text-white/45 @xl:flex">
          <Download size={14} />
          <span>Загрузки браузера сохраняются сюда</span>
        </div>
      </div>

      {/* address bar */}
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-[#2B2B2B] bg-[#1C1C1C] px-2">
        <ArrowLeft size={14} className="text-white/30" />
        <ArrowRight size={14} className="text-white/30" />
        <button type="button" title="Вверх" onClick={() => setFolder('all')} className="rounded p-0.5 text-white/60 hover:bg-white/10">
          <ArrowUp size={14} />
        </button>
        <RefreshCw size={13} className="mx-0.5 text-white/40" />
        <div className="flex h-6 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded border border-[#3A3A3A] bg-[#2B2B2B] px-2 whitespace-nowrap text-white/80">
          <Monitor size={13} className="shrink-0 text-white/50" />
          <ChevronRight size={12} className="shrink-0 text-white/40" />
          <span className="hidden @xl:inline">Документы</span>
          <ChevronRight size={12} className="hidden shrink-0 text-white/40 @xl:inline" />
          <span className="truncate">Чеки и Ордера (115-ФЗ)</span>
          {folder !== 'all' && (
            <>
              <ChevronRight size={12} className="shrink-0 text-white/40" />
              <span className="truncate">{fdef.label}</span>
            </>
          )}
        </div>
        <div className="flex h-6 w-40 shrink-0 items-center gap-1 rounded border border-[#3A3A3A] bg-[#2B2B2B] px-2 @max-md:w-28">
          <Search size={12} className="shrink-0 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-white/35" />
          {q && (
            <button type="button" onClick={() => setQ('')} className="text-white/40 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* bank requests */}
      {openReq.length > 0 && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/[0.08] px-3 py-2">
          {openReq.map((id) => {
            const r = banks[id].request!;
            return (
              <div key={id} className="mb-1 flex items-start gap-2 last:mb-0">
                <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-amber-200">
                    {BANKS[id].name}: запрос документов по 115-ФЗ · ответить до {shortDT(r.deadline)} · заморожено {fmtRub(r.frozen)}
                  </div>
                  {r.ops.length > 0 && (
                    <div className="mt-0.5 truncate text-[11px] text-amber-100/60">
                      Пояснить операции: {r.ops.slice(0, 3).map((o) => `${shortDT(o.at)} · ${fmtRub(Math.abs(o.amount))} · ${o.title}`).join('; ')}
                      {r.ops.length > 3 ? ` и ещё ${r.ops.length - 3}` : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="mt-1 pl-6 text-[11px] text-white/55">Банку нужны: чеки по операциям, выгрузка ордеров с биржи и справка об источниках дохода от бухгалтера. Отметьте файлы флажками и нажмите «Отправить в банк».</div>
        </div>
      )}
      {reviewing.length > 0 && (
        <div className="shrink-0 border-b border-[#2B2B2B] bg-[#60CDFF]/[0.06] px-3 py-1.5 text-[11px] text-[#9FE0FF]">
          {reviewing.map((id) => `${BANKS[id].name}: документы на проверке до ${shortDT(banks[id].request!.reviewAt ?? banks[id].request!.deadline)}`).join(' · ')}
        </div>
      )}
      {res.node && <div className="shrink-0 px-3 pt-2">{res.node}</div>}

      <div className="relative flex min-h-0 flex-1">
        {/* nav tree */}
        <aside className="scroll-thin hidden w-44 shrink-0 overflow-y-auto border-r border-[#2B2B2B] bg-[#1C1C1C] py-2 @lg:block">
          <TreeItem icon={<Monitor size={14} className="text-sky-300" />} label="Этот компьютер" muted />
          <TreeItem icon={<HardDrive size={14} className="text-white/50" />} label="Локальный диск (C:)" muted indent={1} />
          <TreeItem icon={<FolderOpen size={14} className="text-amber-300" />} label="Чеки и Ордера (115-ФЗ)" indent={1} onClick={() => setFolder('all')} />
          {FOLDERS.map((fd) => (
            <TreeItem
              key={fd.id}
              indent={2}
              active={folder === fd.id}
              onClick={() => setFolder(fd.id)}
              icon={folder === fd.id ? <FolderOpen size={14} className="text-amber-300" /> : <Folder size={14} className="text-amber-300/80" />}
              label={fd.label}
              count={count(fd)}
            />
          ))}
        </aside>

        {/* file list */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-1 overflow-x-auto border-b border-[#2B2B2B] px-2 py-1 @lg:hidden">
            {FOLDERS.map((fd) => (
              <button key={fd.id} type="button" onClick={() => setFolder(fd.id)} className={cn('shrink-0 rounded px-2 py-0.5', folder === fd.id ? 'bg-[#2D2D2D] text-white' : 'text-white/55')}>
                {fd.label} <span className="num text-white/35">{count(fd)}</span>
              </button>
            ))}
          </div>
          {files.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="scroll-thin min-h-0 flex-1 overflow-auto">
              <table className="w-full table-fixed border-collapse">
                <thead className="sticky top-0 z-[1] bg-[#191919]">
                  <tr className="text-left text-[11px] text-white/50">
                    <th className="w-8 py-1.5 pl-2 font-normal">
                      <input type="checkbox" className="accent-[#60CDFF]" checked={allChecked} onChange={() => setSelected(allChecked ? [] : list.map((f) => f.id))} />
                    </th>
                    <th className="py-1.5 font-normal">Имя</th>
                    <th className="w-[84px] py-1.5 font-normal">Изменён</th>
                    <th className="hidden w-[140px] py-1.5 font-normal @3xl:table-cell">Тип</th>
                    <th className="hidden w-[60px] py-1.5 pr-3 text-right font-normal @2xl:table-cell">Размер</th>
                    <th className="hidden w-[110px] py-1.5 font-normal @xl:table-cell">Отправлено</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((f) => {
                    const checked = sel.includes(f.id);
                    return (
                      <tr
                        key={f.id}
                        onClick={() => setFocus(f.id)}
                        onDoubleClick={() => toggle(f.id)}
                        className={cn('cursor-default border-b border-transparent', focus === f.id ? 'bg-[#2E3B47]' : checked ? 'bg-[#262E35]' : 'hover:bg-[#2D2D2D]')}
                      >
                        <td className="py-1 pl-2" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="accent-[#60CDFF]" checked={checked} onChange={() => toggle(f.id)} />
                        </td>
                        <td className="py-1 pr-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {KIND[f.kind].icon}
                            <span className="truncate">{f.name}</span>
                          </div>
                        </td>
                        <td className="num py-1 text-white/55">{shortDT(f.at)}</td>
                        <td className="hidden truncate py-1 text-white/55 @3xl:table-cell">{KIND[f.kind].type}</td>
                        <td className="num hidden py-1 pr-3 text-right text-white/55 @2xl:table-cell">{sizeKb(f)} КБ</td>
                        <td className="hidden py-1 @xl:table-cell">
                          <SentBadges to={f.sentTo} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <div className="p-6 text-center text-white/40">{q ? 'Ничего не найдено' : 'Эта папка пуста'}</div>}
            </div>
          )}
          <div className="flex h-6 shrink-0 items-center gap-3 border-t border-[#2B2B2B] bg-[#1C1C1C] px-3 text-[11px] text-white/45">
            <span>Элементов: {list.length}</span>
            {sel.length > 0 && (
              <span>
                Выбрано: {sel.length} ({selKb} КБ)
              </span>
            )}
          </div>
        </div>

        {/* preview pane */}
        {focused && (
          <div className="absolute inset-0 z-10 flex flex-col border-l border-[#2B2B2B] bg-[#202020] @3xl:static @3xl:w-[340px] @3xl:shrink-0">
            <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#2B2B2B] px-2">
              <button type="button" onClick={() => setFocus(null)} className="rounded p-1 text-white/60 hover:bg-white/10" title="Закрыть просмотр">
                <X size={14} />
              </button>
              <span className="min-w-0 flex-1 truncate font-medium">{focused.name}</span>
              <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-white/70 hover:bg-white/10">
                <input type="checkbox" className="accent-[#60CDFF]" checked={sel.includes(focused.id)} onChange={() => toggle(focused.id)} />
                Выбрать
              </label>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-auto bg-[#2B2B2B] p-4">
              {focused.kind === 'receipt' && focused.receipt ? <ReceiptView r={focused.receipt} /> : <LinesView file={focused} />}
              {focused.sentTo.length > 0 && (
                <div className="mt-3 text-center text-[11px] text-white/45">
                  Отправлено: <SentBadges to={focused.sentTo} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {sending && (
        <SendDialog
          ids={sel}
          banks={openReq}
          onClose={() => setSending(false)}
          onDone={(r) => {
            setSending(false);
            if (res.show(r, 'Документы отправлены. Банк рассмотрит их в течение 4 часов.')) setSelected([]);
          }}
        />
      )}
    </div>
  );
}

function ToolBtn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-md px-2.5 py-1.5 text-white/80 transition hover:bg-white/10 disabled:opacity-35">
      {children}
    </button>
  );
}

function TreeItem({ icon, label, count, active, muted, indent = 0, onClick }: { icon: ReactNode; label: string; count?: number; active?: boolean; muted?: boolean; indent?: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{ paddingLeft: 8 + indent * 12 }}
      className={cn('relative flex w-full items-center gap-1.5 py-1 pr-2 text-left', active ? 'bg-[#2D2D2D] text-white' : muted ? 'text-white/45' : 'text-white/80 hover:bg-[#2A2A2A]')}
    >
      {active && <span className="absolute top-1 bottom-1 left-0.5 w-[3px] rounded-full bg-[#60CDFF]" />}
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="num text-[10px] text-white/35">{count}</span>}
    </button>
  );
}

function SentBadges({ to }: { to: string[] }) {
  if (!to.length) return <span className="text-white/25">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {to.map((b) => (
        <span key={b} className="rounded bg-emerald-500/15 px-1.5 py-px text-[10px] font-medium text-emerald-300">
          {BANK_SHORT[b as ExtBankId] ?? b}
        </span>
      ))}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <FolderOpen size={44} className="text-amber-300/60" />
      <div className="text-sm font-semibold text-white/80">Папка пуста</div>
      <p className="max-w-sm text-[11px] leading-relaxed text-white/45">
        Чеки появляются здесь, когда вы сохраняете их в банковском приложении на телефоне: История операций → операция → «Сохранить PDF-чек». Выгрузку ордеров делают на Bybit: Профиль → «Экспорт истории ордеров (PDF)».
      </p>
    </div>
  );
}

function SendDialog({ ids, banks, onClose, onDone }: { ids: string[]; banks: BankId[]; onClose: () => void; onDone: (r: { ok: boolean; error?: string }) => void }) {
  const [bank, setBank] = useState<BankId>(banks[0]);
  const score = useGame(useShallow((s) => scoreDocs(s, ids)));
  const names = useGame(useShallow((s) => s.files.filter((f) => ids.includes(f.id)).map((f) => f.name)));
  const sendDocs = useGame((s) => s.sendDocs);
  const pct = Math.round(score.chance * 100);
  const color = pct >= 70 ? 'bg-emerald-400' : pct >= 45 ? 'bg-amber-400' : 'bg-rose-400';
  const tips = [
    score.receipts < 3 && 'Добавьте чеки по операциям, о которых спрашивает банк',
    !score.exports && 'Нет выгрузки ордеров с биржи (Bybit → Профиль → «Экспорт истории ордеров»)',
    !score.tax && 'Нет справки об источниках дохода — её готовит бухгалтер',
  ].filter(Boolean) as string[];
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-lg border border-[#3A3A3A] bg-[#2B2B2B] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[#3A3A3A] px-4 py-2.5">
          <Landmark size={15} className="text-[#60CDFF]" />
          <span className="font-semibold">Отправка документов в банк</span>
          <button type="button" onClick={onClose} className="ml-auto rounded p-1 text-white/50 hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1 text-[11px] text-white/50">Банк с открытым запросом</div>
            <div className="flex flex-wrap gap-2">
              {banks.map((id) => (
                <button key={id} type="button" onClick={() => setBank(id)} className={cn('flex items-center gap-2 rounded-md border px-3 py-1.5', bank === id ? 'border-[#60CDFF] bg-[#60CDFF]/10' : 'border-[#3A3A3A] hover:bg-white/5')}>
                  <span className="h-3 w-3 rounded-sm" style={{ background: BANKS[id].color }} />
                  {BANKS[id].name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] text-white/50">Вложения ({names.length})</div>
            <ul className="scroll-thin max-h-24 space-y-0.5 overflow-auto rounded border border-[#3A3A3A] bg-[#202020] p-2 text-[11px] text-white/75">
              {names.map((n, i) => (
                <li key={i} className="flex items-center gap-1.5 truncate">
                  <FileText size={11} className="shrink-0 text-white/40" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-[#3A3A3A] bg-[#202020] p-3">
            <div className="text-[12px] text-white/85">
              Чеков: <b className="num">{score.receipts}</b>, выгрузок: <b className="num">{score.exports}</b>, справка: <b>{score.tax ? 'да' : 'нет'}</b>, вероятность одобрения ~<b className="num">{pct}%</b>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
            </div>
            {tips.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-[11px] text-amber-200/80">
                {tips.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-1.5 text-white/80 hover:bg-white/10">
              Отмена
            </button>
            <button type="button" onClick={() => onDone(sendDocs(bank, ids))} className="rounded-md bg-[#60CDFF] px-4 py-1.5 font-semibold text-black hover:bg-[#7FD7FF]">
              Отправить в {BANKS[bank].name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
