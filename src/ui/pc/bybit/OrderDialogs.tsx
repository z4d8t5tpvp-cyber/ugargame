import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, FileText, FolderOpen, KeyRound, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { P2POrder } from '../../../game/types';
import { useGame } from '../../../game/store';
import { digits, fmtRub, fmtUsdt, shortDT } from '../../../game/util';
import { cn, PasteBtn, useResult } from '../../common/kit';
import { Modal } from './OrderParts';

type Result = { ok: boolean; error?: string; info?: string };

/** File-dialog style picker of PDF receipts saved from bank apps. */
export function ReceiptPicker({ order, onClose, onDone }: { order: P2POrder; onClose: () => void; onDone: (r: Result) => void }) {
  const files = useGame((s) => s.files);
  const orders = useGame((s) => s.orders);
  const attach = useGame((s) => s.attachReceipt);
  const res = useResult();
  const [sel, setSel] = useState<string | null>(order.receiptFileId ?? null);

  const receipts = useMemo(() => files.filter((f) => f.kind === 'receipt' && f.receipt).sort((a, b) => b.at - a.at), [files]);
  const usedBy = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orders) if (o.receiptFileId && o.id !== order.id) m.set(o.receiptFileId, o.num.slice(-6));
    return m;
  }, [orders, order.id]);

  const confirm = (id: string | null) => {
    if (!id) return;
    const r = attach(order.id, id);
    if (r.ok) onDone(r);
    else res.show(r);
  };

  return (
    <Modal title="Прикрепить PDF-чек" onClose={onClose} width={600}>
      <div className="mb-2 flex items-center gap-1 rounded-md bg-bybit px-2.5 py-1.5 text-xs text-white/55">
        <FolderOpen size={14} className="text-amber" />
        Этот компьютер <ChevronRight size={12} /> Документы <ChevronRight size={12} /> <span className="text-white/85">Чеки и Ордера</span>
      </div>
      {receipts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-xs leading-relaxed text-white/45">
          В папке нет PDF-чеков.
          <br />
          Сохраните чек в приложении банка на телефоне: История → операция → «Сохранить PDF-чек».
        </div>
      ) : (
        <div className="scroll-thin max-h-[300px] overflow-auto rounded-lg border border-white/[0.06]">
          <div className="sticky top-0 grid grid-cols-[minmax(0,1.6fr)_110px_minmax(0,1.4fr)_88px] gap-2 bg-bybit-3 px-3 py-1.5 text-[11px] text-white/40">
            <span>Имя</span>
            <span className="text-right">Сумма</span>
            <span>Получатель</span>
            <span className="text-right">Дата</span>
          </div>
          {receipts.map((f) => {
            const r = f.receipt!;
            const used = usedBy.get(f.id);
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => setSel(f.id)}
                onDoubleClick={() => confirm(f.id)}
                className={cn(
                  'grid w-full grid-cols-[minmax(0,1.6fr)_110px_minmax(0,1.4fr)_88px] items-center gap-2 border-t border-white/[0.04] px-3 py-2 text-left text-xs transition',
                  sel === f.id ? 'bg-amber/10' : 'hover:bg-white/[0.04]',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText size={15} className="shrink-0 text-rose" />
                  <span className="min-w-0">
                    <span className="block truncate text-white/90">{f.name}</span>
                    {used && <span className="block text-[10px] text-white/35">прикреплён к ордеру …{used}</span>}
                  </span>
                </span>
                <span className="num text-right font-semibold text-white">{fmtRub(r.amount, 2)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-white/80">{r.recipient}</span>
                  <span className="block truncate text-[10px] text-white/40">{r.recipientBank}</span>
                </span>
                <span className="num text-right text-white/50">{shortDT(f.at)}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-2 text-[11px] text-white/35">
        Ордер: {fmtRub(order.rub, 2)}
        {order.req ? ` · получатель ${order.req.holder}` : ''}
      </div>
      {res.node && <div className="mt-2">{res.node}</div>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-9 rounded-lg bg-white/[0.06] px-4 text-sm text-white/75 hover:bg-white/10">
          Отмена
        </button>
        <button
          type="button"
          disabled={!sel}
          onClick={() => confirm(sel)}
          className="h-9 rounded-lg bg-amber px-4 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40"
        >
          Прикрепить
        </button>
      </div>
    </Modal>
  );
}

/** Release escrow: explicit statement check + Google Authenticator code. */
export function ReleaseDialog({ order, onClose, onDone }: { order: P2POrder; onClose: () => void; onDone: (r: Result) => void }) {
  const twoFA = useGame((s) => s.exchanges.bybit.twoFA);
  const release = useGame((s) => s.releaseOrder);
  const setView = useGame((s) => s.setBybitView);
  const res = useResult();
  const [code, setCode] = useState('');
  const [checked, setChecked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const can = checked && code.length === 6;
  const submit = () => {
    if (!can) return;
    const r = release(order.id, code);
    if (r.ok) onDone({ ok: true, info: `Вы отпустили ${fmtUsdt(order.usdt)}. Сделка завершена.` });
    else {
      res.show(r);
      setCode('');
    }
  };

  return (
    <Modal title="Отпустить USDT" onClose={onClose}>
      {!twoFA ? (
        <div className="space-y-3">
          <div className="flex gap-2 rounded-lg bg-amber/10 px-3 py-2.5 text-sm text-amber">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            Привяжите Google Authenticator в Профиле — без кода 2FA биржа не отпустит средства.
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              setView('profile');
            }}
            className="h-9 w-full rounded-lg bg-amber text-sm font-semibold text-black hover:brightness-110"
          >
            Перейти в Профиль
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-bybit px-3 py-2.5 text-xs text-white/70">
            Вы отпускаете <span className="num font-semibold text-white">{fmtUsdt(order.usdt)}</span> покупателю{' '}
            <span className="font-semibold text-white">{order.cp.nick}</span>
            {order.feeUsdt > 0 && (
              <>
                {' '}
                + комиссия мейкера <span className="num">{fmtUsdt(order.feeUsdt)}</span>
              </>
            )}
            . Операция необратима: вернуть USDT после отпуска невозможно.
          </div>
          {!order.cpMarkedPaid && (
            <div className="flex gap-2 rounded-lg bg-rose/10 px-3 py-2 text-xs text-rose">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              Покупатель ещё не отметил ордер как оплаченный.
            </div>
          )}
          <label className="flex cursor-pointer gap-2.5 rounded-lg border border-white/10 px-3 py-2.5 text-xs leading-relaxed text-white/80 hover:border-white/20">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#F0B90B]" />
            <span>
              Я проверил выписку в банке: поступило <span className="num font-semibold text-white">{fmtRub(order.rub, 2)}</span> от{' '}
              <span className="font-semibold text-white">{order.cp.fullName}</span>
            </span>
          </label>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-white/55">
              <span className="flex items-center gap-1.5">
                <KeyRound size={13} /> Введите 6-значный код Google Authenticator
              </span>
              <PasteBtn onPaste={(v) => setCode(digits(v).slice(0, 6))} className="text-amber hover:bg-white/10" />
            </div>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(digits(e.target.value).slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              className="num h-12 w-full rounded-lg border border-white/10 bg-bybit text-center text-2xl tracking-[0.5em] text-white outline-none placeholder:text-white/20 focus:border-amber/70"
            />
            <div className="mt-1 text-[11px] text-white/35">Код в приложении Authenticator на телефоне, обновляется каждые 30 секунд.</div>
          </div>
          {res.node}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg bg-white/[0.06] px-4 text-sm text-white/75 hover:bg-white/10">
              Отмена
            </button>
            <button
              type="button"
              disabled={!can}
              onClick={submit}
              className="h-10 flex-1 rounded-lg bg-amber text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40"
            >
              Подтвердить и отпустить
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const TONE = {
  emerald: 'bg-emerald text-white',
  rose: 'bg-rose text-white',
  amber: 'bg-amber text-black',
} as const;

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Назад',
  tone = 'amber',
  onConfirm,
  onClose,
  onDone,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: keyof typeof TONE;
  onConfirm: () => Result;
  onClose: () => void;
  onDone: (r: Result) => void;
}) {
  const res = useResult();
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3 text-sm leading-relaxed text-white/75">{children}</div>
      {res.node && <div className="mt-3">{res.node}</div>}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onClose} className="h-10 rounded-lg bg-white/[0.06] px-4 text-sm text-white/75 hover:bg-white/10">
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            const r = onConfirm();
            if (r.ok) onDone(r);
            else res.show(r);
          }}
          className={cn('h-10 flex-1 rounded-lg text-sm font-semibold hover:brightness-110', TONE[tone])}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
