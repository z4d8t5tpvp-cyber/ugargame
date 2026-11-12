import { useState, type ReactNode } from 'react';
import { Check, Clock, Handshake, ScanSearch, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { useGame } from '../../../game/store';
import type { OtcDeal } from '../../../game/types';
import { otcTotal } from '../../../game/engine/otc';
import { BANK_NAMES, clockStr, fmtPhone, fmtRub, fmtUsdt, round2, shortAddr } from '../../../game/util';
import { cn, CopyBtn, useResult } from '../../common/kit';
import { TgText } from './Media';
import { useTgNav } from './shared';

const STATUS: Record<OtcDeal['status'], { text: string; cls: string }> = {
  offered: { text: 'Предложение', cls: 'bg-sky-500/15 text-sky-300' },
  accepted: { text: 'Принята', cls: 'bg-sky-500/15 text-sky-300' },
  paying: { text: 'Ожидает оплаты', cls: 'bg-amber-500/15 text-amber-300' },
  awaiting_usdt: { text: 'Ждём USDT', cls: 'bg-amber-500/15 text-amber-300' },
  done: { text: 'Завершена', cls: 'bg-emerald-500/15 text-emerald-300' },
  declined: { text: 'Отклонена', cls: 'bg-white/10 text-white/60' },
  failed: { text: 'Провалена', cls: 'bg-rose-500/15 text-rose-300' },
  expired: { text: 'Истекла', cls: 'bg-white/10 text-white/50' },
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-[3px] text-[12.5px]">
      <span className="shrink-0 text-white/50">{label}</span>
      <span className="min-w-0 text-right text-white/90">{children}</span>
    </div>
  );
}

export function DealCard({ dealId, fallback }: { dealId: string; fallback: string }) {
  const deal = useGame((s) => s.otc.find((x) => x.id === dealId));
  const amlUnlocked = useGame((s) => s.wallet.amlUnlocked);
  const karimIn = useGame((s) => s.characters.karim.inTeam);
  const pashaIn = useGame((s) => s.characters.pasha.inTeam);
  const karimAsked = useGame((s) => s.scheduled.some((e) => e.type === 'otc_audit' && e.payload?.id === dealId && e.payload?.who === 'karim'));
  const pashaAsked = useGame((s) => s.scheduled.some((e) => e.type === 'otc_audit' && e.payload?.id === dealId && e.payload?.who === 'pasha'));
  const guarantorChat = useGame((s) => (deal ? Object.values(s.tg).find((c) => c.username === deal.guarantor)?.id : undefined));
  const otcAccept = useGame((s) => s.otcAccept);
  const otcDecline = useGame((s) => s.otcDecline);
  const otcAudit = useGame((s) => s.otcAudit);
  const phoneOpen = useGame((s) => s.phoneOpen);
  const { openProfile } = useTgNav();
  const res = useResult();
  const [amlHelp, setAmlHelp] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!deal)
    return (
      <div className="w-[260px] px-2.5 py-2 text-[13.5px] text-white/90">
        <TgText text={fallback} />
      </div>
    );

  const total = otcTotal(deal);
  const discount = (1 - deal.price / deal.marketPrice) * 100;
  const st = STATUS[deal.status];
  const remaining = Math.max(0, round2(total - deal.paidRub));

  return (
    <div className="w-[284px] max-w-full overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5288C1]/25 text-[#6AB3F3]">
          <Handshake size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-white">{deal.title}</div>
          <div className="text-[11px] text-white/45">OTC-сделка · через гаранта</div>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold', st.cls)}>{st.text}</span>
      </div>

      <div className="px-3 pt-2">
        <div className="text-[14px] font-semibold leading-snug text-white">
          Продаёт {fmtUsdt(deal.usdt)} по {deal.price.toFixed(2)} ₽
        </div>
        <div className="mt-0.5 text-[12px] text-white/55">
          Рынок {deal.marketPrice.toFixed(2)} ₽ · <span className="font-semibold text-emerald-300">−{discount.toFixed(1)}%</span>
        </div>
        <div className="mt-2 rounded-lg bg-black/25 px-2.5 py-1.5">
          <div className="text-[10.5px] uppercase tracking-wide text-white/40">Сумма сделки</div>
          <div className="num text-[18px] font-bold text-white">{fmtRub(total, 2)}</div>
        </div>
        <div className="mt-2">
          <Row label="Клиент">
            <span className="inline-flex items-center gap-1">
              <UserRound size={12} className="text-white/40" />
              {deal.clientName}
            </span>
          </Row>
          <Row label="Кошелёк клиента">
            <span className="inline-flex flex-wrap items-center justify-end gap-1">
              <span className="font-mono text-[12px]">{shortAddr(deal.clientWallet)}</span>
              <CopyBtn value={deal.clientWallet} label={`Кошелёк клиента OTC (TRC-20)`} kind="address" meta={{ network: 'TRC20' }} className="px-1 py-0 text-[11px]">
                <span className="sr-only">Скопировать</span>
              </CopyBtn>
            </span>
          </Row>
          <Row label="Сеть">USDT · TRC-20</Row>
          <Row label="Гарант">
            <button
              type="button"
              disabled={!guarantorChat}
              onClick={() => guarantorChat && openProfile(guarantorChat)}
              className="font-mono text-[12px] text-[#6AB3F3] hover:underline disabled:no-underline"
            >
              {deal.guarantor}
            </button>
          </Row>
          {deal.status === 'offered' && (
            <Row label="Действует до">
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-white/40" />
                {clockStr(deal.expiresAt)}
              </span>
            </Row>
          )}
        </div>
      </div>

      {deal.status === 'offered' && (
        <div className="mt-2 space-y-1.5 px-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-white/40">Проверки перед сделкой</div>
          <button
            type="button"
            onClick={() => setAmlHelp((v) => !v)}
            className="flex w-full items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-2 text-left text-[12.5px] text-white transition hover:bg-white/10"
          >
            <ScanSearch size={15} className="shrink-0 text-[#6AB3F3]" />
            <span className="flex-1">Проверить кошелёк (AML)</span>
            {deal.amlChecked && <Check size={15} className="text-emerald-400" />}
          </button>
          {amlHelp && (
            <div className="rounded-lg bg-black/25 px-2.5 py-2 text-[12px] leading-snug text-white/70">
              {amlUnlocked ? (
                <>
                  Скопируйте адрес → Tonkeeper → AML-скринер
                  <button type="button" onClick={() => phoneOpen('wallet')} className="mt-1 flex items-center gap-1 font-medium text-[#6AB3F3] hover:underline">
                    <Wallet size={13} /> Открыть Tonkeeper
                  </button>
                </>
              ) : (
                'AML-скринер откроется в Tonkeeper после встречи с Маратом'
              )}
            </div>
          )}
          {karimIn && (
            <button
              type="button"
              disabled={karimAsked || deal.audited}
              onClick={() => otcAudit(deal.id, 'karim')}
              className="flex w-full items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-2 text-left text-[12.5px] text-white transition enabled:hover:bg-white/10 disabled:opacity-80"
            >
              <span className="w-[15px] shrink-0 text-center">📊</span>
              <span className="flex-1">Аудит Карима</span>
              {deal.audited ? <Check size={15} className="text-emerald-400" /> : karimAsked && <span className="text-[11px] text-white/45">запрошен</span>}
            </button>
          )}
          {pashaIn && (
            <button
              type="button"
              disabled={pashaAsked || deal.pashaChecked}
              onClick={() => otcAudit(deal.id, 'pasha')}
              className="flex w-full items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-2 text-left text-[12.5px] text-white transition enabled:hover:bg-white/10 disabled:opacity-80"
            >
              <ShieldCheck size={15} className="shrink-0 text-[#6AB3F3]" />
              <span className="flex-1">Проверка Паши</span>
              {deal.pashaChecked ? <Check size={15} className="text-emerald-400" /> : pashaAsked && <span className="text-[11px] text-white/45">запрошена</span>}
            </button>
          )}
        </div>
      )}

      {deal.status === 'paying' && deal.payTo && (
        <div className="mx-3 mt-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-2.5 py-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-200/80">Реквизиты гаранта</div>
          <Row label="Получатель">{deal.payTo.holder}</Row>
          <Row label="Банк">{BANK_NAMES[deal.payTo.bank]}</Row>
          <Row label="Телефон">
            <span className="inline-flex flex-wrap items-center justify-end gap-1">
              <span className="num">{fmtPhone(deal.payTo.phone)}</span>
              <CopyBtn value={deal.payTo.phone} label={`Телефон гаранта (${deal.payTo.holder})`} kind="phone" meta={{ name: deal.payTo.holder, bank: deal.payTo.bank }} className="px-1 py-0 text-[11px]">
                <span className="sr-only">Скопировать</span>
              </CopyBtn>
            </span>
          </Row>
          <Row label="К оплате">
            <span className="inline-flex flex-wrap items-center justify-end gap-1">
              <span className="num font-semibold">{fmtRub(remaining, 2)}</span>
              <CopyBtn value={String(remaining)} label="Сумма OTC-сделки" kind="amount" className="px-1 py-0 text-[11px]">
                <span className="sr-only">Скопировать</span>
              </CopyBtn>
            </span>
          </Row>
          {deal.paidRub > 0 && <Row label="Уже оплачено">{fmtRub(deal.paidRub, 2)}</Row>}
          <div className="mt-1 text-[11.5px] leading-snug text-white/55">Переведите по СБП из приложения банка. USDT придут на ваш TRC-20 кошелёк после подтверждения гаранта.</div>
        </div>
      )}

      {deal.notes.length > 0 && (
        <div className="mx-3 mt-2 space-y-1">
          {deal.notes.map((n, i) => (
            <div key={i} className={cn('rounded-md px-2 py-1 text-[12px] leading-snug', deal.status === 'failed' ? 'bg-rose-500/10 text-rose-200' : 'bg-white/[0.05] text-white/75')}>
              {n}
            </div>
          ))}
        </div>
      )}

      {res.node && <div className="mx-3 mt-2">{res.node}</div>}

      {deal.status === 'offered' && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-white/10 p-2">
          {confirm ? (
            <>
              <button
                type="button"
                onClick={() => {
                  res.show(otcAccept(deal.id), 'Сделка принята — оплатите гаранту');
                  setConfirm(false);
                }}
                className="col-span-2 rounded-lg bg-emerald-500 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-400"
              >
                Подтвердить: {fmtRub(total)}
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="col-span-2 rounded-lg py-1 text-[12px] text-white/55 hover:text-white">
                Отмена
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setConfirm(true)} className="rounded-lg bg-[#5288C1] py-2 text-[13px] font-semibold text-white transition hover:bg-[#5f97d1]">
                Принять
              </button>
              <button type="button" onClick={() => res.show(otcDecline(deal.id), 'Вы отказались от сделки')} className="rounded-lg bg-white/10 py-2 text-[13px] font-semibold text-white/85 transition hover:bg-white/15">
                Отказаться
              </button>
            </>
          )}
        </div>
      )}
      {deal.status === 'paying' && deal.paidRub === 0 && (
        <div className="mt-2 border-t border-white/10 p-2">
          <button type="button" onClick={() => res.show(otcDecline(deal.id), 'Вы отказались от сделки')} className="w-full rounded-lg bg-white/10 py-1.5 text-[12.5px] font-medium text-white/80 transition hover:bg-white/15">
            Отказаться
          </button>
        </div>
      )}
      {deal.status !== 'offered' && !(deal.status === 'paying' && deal.paidRub === 0) && <div className="h-2" />}
    </div>
  );
}
