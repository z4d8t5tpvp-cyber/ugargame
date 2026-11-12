import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../game/store';
import { ChatList } from './tg/ChatList';
import { ChatView } from './tg/ChatView';
import { Profile } from './tg/Profile';
import { TgNavCtx, type TgNav } from './tg/shared';

export default function TelegramApp() {
  // The open chat lives in the store so notification deep links and unread suppression work.
  const chatId = useGame((s) => s.ui.tgChat);
  const setTgChat = useGame((s) => s.setTgChat);
  const tgRead = useGame((s) => s.tgRead);
  const userKey = useGame((s) => {
    let k = '';
    for (const id in s.tg) k += `${s.tg[id].username}\u0001${id}\u0002`;
    return k;
  });
  const [profile, setProfile] = useState<string | null>(null);

  const openChat = useCallback(
    (id: string) => {
      setTgChat(id);
      tgRead(id);
    },
    [setTgChat, tgRead],
  );

  const nav = useMemo<TgNav>(() => {
    const usernames: Record<string, string> = {};
    for (const p of userKey.split('\u0002')) {
      if (!p) continue;
      const [u, id] = p.split('\u0001');
      usernames[u] = id;
    }
    return { openChat, openProfile: setProfile, usernames };
  }, [userKey, openChat]);

  return (
    <TgNavCtx.Provider value={nav}>
      <div className="relative h-full w-full overflow-hidden bg-[#17212B] text-white">
        <ChatList onOpen={openChat} />
        <AnimatePresence>
          {chatId && (
            <motion.div
              key={chatId}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              className="absolute inset-0 z-20 shadow-[-8px_0_24px_rgba(0,0,0,.35)]"
            >
              <ChatView id={chatId} onBack={() => setTgChat(null)} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {profile && (
            <Profile
              key={profile}
              id={profile}
              onClose={() => setProfile(null)}
              onWrite={() => {
                const target = profile;
                setProfile(null);
                if (target !== chatId && useGame.getState().tg[target]?.visible) openChat(target);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </TgNavCtx.Provider>
  );
}
