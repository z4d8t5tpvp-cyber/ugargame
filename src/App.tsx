import { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';
import { useGame } from './game/store';
import TitleScreen from './ui/TitleScreen';
import Desktop from './ui/shell/Desktop';
import Taskbar from './ui/shell/Taskbar';
import QuestBar from './ui/shell/QuestBar';
import Phone from './ui/shell/Phone';
import { ChapterCard, Cutscene, EndingScreen } from './ui/cutscene/Cutscene';
import { useGameLoop, useSoundEffects } from './ui/common/hooks';

export default function App() {
  const hydrated = useGame((s) => s.hydrated);
  const menu = useGame((s) => s.menu || !s.started);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1100 || window.innerHeight < 600);
  const [forced, setForced] = useState(false);
  useEffect(() => {
    const h = () => setNarrow(window.innerWidth < 1100 || window.innerHeight < 600);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  if (!hydrated) return <div className="h-full bg-[#07090E]" />;
  if (narrow && !forced)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#07090E] p-8 text-center text-white">
        <Monitor size={42} className="text-emerald-300" />
        <div className="text-xl font-bold">P2P: С НУЛЯ</div>
        <div className="max-w-sm text-sm text-white/60">Игра — это рабочий стол из компьютера и телефона. Откройте её на экране от 1280×720 или разверните окно браузера.</div>
        <button onClick={() => setForced(true)} className="rounded-lg bg-white/10 px-4 py-2 text-xs text-white/80">Всё равно открыть</button>
      </div>
    );
  return menu ? <TitleScreen /> : <Game />;
}

function Game() {
  useGameLoop();
  useSoundEffects();
  return (
    <div className="flex h-full w-full gap-3 bg-[#07090E] p-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 flex-col rounded-[16px] bg-gradient-to-b from-[#20242d] to-[#101319] p-[9px] shadow-[0_20px_60px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/5">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px] bg-black">
            <div className="relative min-h-0 flex-1">
              <Desktop />
            </div>
            <QuestBar />
            <Taskbar />
          </div>
          <div className="pointer-events-none absolute bottom-[1px] left-1/2 -translate-x-1/2 text-[8px] tracking-[0.35em] text-white/20">VORONOV</div>
        </div>
      </div>
      <div className="h-full shrink-0">
        <Phone />
      </div>
      <Cutscene />
      <ChapterCard />
      <EndingScreen />
    </div>
  );
}
