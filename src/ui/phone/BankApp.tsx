import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BankId } from '../../game/types';
import { useGame } from '../../game/store';
import { cn, useResult } from '../common/kit';
import { THEMES } from './bank/theme';
import { BankCtx, ResultSlot, type BankCtxValue, type Res, type Route } from './bank/ui';
import { Block161Screen, HomeScreen, Onboarding } from './bank/Home';
import { HistoryScreen, TxSheet } from './bank/History';
import { SelfTransferScreen, TransferScreen } from './bank/Transfer';
import { RequisitesScreen, RetailScreen } from './bank/Extra';

export default function BankApp({ bank }: { bank: BankId }) {
  const opened = useGame((s) => s.banks[bank].opened);
  const blocked = useGame((s) => !!s.block161);
  const [route, setRoute] = useState<Route>('home');
  const [txId, setTxId] = useState<string | null>(null);
  const res = useResult();
  const showRef = useRef(res.show);
  showRef.current = res.show;
  const notify = useCallback((r: Res, okText?: string) => void showRef.current(r, okText), []);
  const t = THEMES[bank];

  // Closing a restricted account flips `opened` back to false: reset navigation.
  useEffect(() => {
    if (!opened) {
      setRoute('home');
      setTxId(null);
    }
  }, [opened]);

  const ctx = useMemo<BankCtxValue>(() => ({ bank, t, go: setRoute, openTx: setTxId, notify }), [bank, t, notify]);

  let screen;
  if (!opened) screen = <Onboarding />;
  else if (route === 'home') screen = blocked ? <Block161Screen /> : <HomeScreen />;
  else if (route === 'sbp') screen = <TransferScreen method="sbp" />;
  else if (route === 'card') screen = <TransferScreen method="card" />;
  else if (route === 'self') screen = <SelfTransferScreen />;
  else if (route === 'retail') screen = <RetailScreen />;
  else if (route === 'history') screen = <HistoryScreen />;
  else screen = <RequisitesScreen />;

  const key = opened ? route : 'onboarding';

  return (
    <BankCtx.Provider value={ctx}>
      <div className={cn('relative h-full w-full overflow-hidden text-[14px]', t.app)}>
        <motion.div
          key={key}
          className="absolute inset-0"
          initial={{ opacity: 0, x: key === 'home' ? -18 : 26 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {screen}
        </motion.div>

        {opened && <TxSheet id={txId} onClose={() => setTxId(null)} />}

        <AnimatePresence>
          {res.node && (
            <motion.div
              className="absolute inset-x-3 bottom-3 z-50"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={res.clear}
            >
              <div className={cn('overflow-hidden rounded-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)]', t.snack)}>
                <ResultSlot node={res.node} dark={t.dark} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BankCtx.Provider>
  );
}
