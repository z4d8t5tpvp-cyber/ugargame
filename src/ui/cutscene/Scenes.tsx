import type { SceneBg } from '../../game/story/cutscenes';

/** CSS-only atmospheric backgrounds for cutscenes. */
export function SceneBackground({ bg }: { bg: SceneBg }) {
  switch (bg) {
    case 'rain_street':
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg,#0a1020 0%,#16213a 55%,#0b0f18 100%)' }}>
          <Building left="4%" w="34%" h="62%" />
          <Building left="62%" w="40%" h="70%" />
          <div className="absolute bottom-0 h-[22%] w-full" style={{ background: 'linear-gradient(180deg,#121a2b,#06080d)' }} />
          <div className="absolute bottom-[18%] left-[44%] h-3 w-3 rounded-full bg-[#ffeaa0] shadow-[0_0_60px_30px_rgba(255,220,140,.45)]" />
          <div className="absolute bottom-[19%] left-[48%] h-3 w-3 rounded-full bg-[#ffeaa0] shadow-[0_0_60px_30px_rgba(255,220,140,.45)]" />
          <div className="absolute bottom-[6%] left-[40%] h-[10%] w-[16%] rounded-[50%] bg-[#ffe7a0]/10 blur-xl" />
          <Rain />
        </div>
      );
    case 'room_night':
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(60% 50% at 50% 55%, #1b3b6b 0%, #0b1220 45%, #04060a 100%)' }}>
          <div className="absolute top-[30%] left-1/2 h-[30%] w-[34%] -translate-x-1/2 rounded-md border-[10px] border-[#11141b] bg-[#0f2547] shadow-[0_0_120px_40px_rgba(59,130,246,.25)]">
            <div className="m-3 h-2 w-1/2 rounded bg-sky-300/30" />
            <div className="mx-3 h-2 w-1/3 rounded bg-emerald-300/30" />
          </div>
          <div className="absolute bottom-0 h-[28%] w-full bg-[#07090d]" />
          <div className="absolute right-[12%] bottom-[28%] h-[14%] w-[7%] rounded-t bg-[#0e1118]" />
          <Rain light />
        </div>
      );
    case 'chat':
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(160deg,#0e1621,#17212b 60%,#1f3247)' }}>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="absolute rounded-2xl bg-[#2b5278]/40 animate-float" style={{ left: `${8 + ((i * 13) % 80)}%`, top: `${10 + ((i * 17) % 70)}%`, width: 120 + (i % 3) * 60, height: 34, animationDelay: `${i * 0.7}s` }} />
          ))}
        </div>
      );
    case 'train':
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg,#0b1020,#1a2338 60%,#0b0e14)' }}>
          {[...Array(14)].map((_, i) => (
            <div key={i} className="absolute h-[2px] rounded bg-amber-200/60" style={{ top: `${35 + (i % 7) * 6}%`, width: 80 + (i % 4) * 40, animation: `rain ${2 + (i % 3)}s linear infinite`, left: `${(i * 11) % 100}%`, transform: 'rotate(90deg)' }} />
          ))}
          <div className="absolute inset-x-[10%] top-[20%] bottom-[25%] rounded-3xl border-[14px] border-[#1c2433]" />
        </div>
      );
    case 'moscow_cafe':
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(70% 60% at 30% 40%, #5a3a22 0%, #2a1a10 50%, #0e0906 100%)' }}>
          {[...Array(16)].map((_, i) => (
            <div key={i} className="absolute rounded-full blur-md animate-float" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 70}%`, width: 30 + (i % 4) * 18, height: 30 + (i % 4) * 18, background: i % 2 ? 'rgba(255,190,110,.25)' : 'rgba(255,230,170,.18)', animationDelay: `${i * 0.4}s` }} />
          ))}
          <div className="absolute bottom-0 h-[30%] w-full" style={{ background: 'linear-gradient(180deg,transparent,#0b0705)' }} />
        </div>
      );
    case 'office_day':
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg,#9cc3e8 0%,#dbe8f3 60%,#c9d3dc 100%)' }}>
          <Glass dark={false} />
        </div>
      );
    case 'office_night':
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg,#05070d 0%,#0b1324 70%,#05070d 100%)' }}>
          <Glass dark />
          <div className="absolute top-[40%] left-1/2 h-[24%] w-[26%] -translate-x-1/2 rounded bg-[#ff6a3d]/20 blur-2xl" />
        </div>
      );
    case 'boardroom':
      return (
        <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg,#141821 0%,#1e2430 50%,#0c0f15 100%)' }}>
          <Glass dark />
          <div className="absolute bottom-[8%] left-1/2 h-[30%] w-[80%] -translate-x-1/2" style={{ background: 'linear-gradient(180deg,#3a2a1c,#1d140d)', clipPath: 'polygon(30% 0,70% 0,100% 100%,0 100%)' }} />
        </div>
      );
    case 'end_good':
      return <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 40%, #1f6f5a 0%, #0b2a24 50%, #04100d 100%)' }}><Glass dark /></div>;
    case 'end_wolf':
      return <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 40%, #2b3a55 0%, #0d1424 55%, #04060b 100%)' }}><Glass dark /></div>;
    case 'end_crisis':
      return <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 40%, #6b1f1f 0%, #2a0b0b 55%, #0b0303 100%)' }}><Rain /></div>;
    case 'end_new':
      return <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#2a3550 0%,#c47b4d 70%,#f2b27a 100%)' }} />;
  }
}

function Building({ left, w, h }: { left: string; w: string; h: string }) {
  return (
    <div className="absolute bottom-[20%] overflow-hidden bg-[#0d1322]" style={{ left, width: w, height: h }}>
      <div className="flex flex-wrap content-start gap-x-[22px] gap-y-[26px] p-6">
        {[...Array(140)].map((_, i) => (
          <div key={i} className="h-[22px] w-[16px] rounded-[2px]" style={{ background: (i * 7) % 9 === 0 ? '#e9c46a' : (i * 5) % 13 === 0 ? '#5b7aa8' : '#151c2c', opacity: (i * 7) % 9 === 0 ? 0.75 : 0.9 }} />
        ))}
      </div>
    </div>
  );
}

function Glass({ dark }: { dark: boolean }) {
  return (
    <div className="absolute inset-x-0 top-0 bottom-[30%] overflow-hidden opacity-60">
      <div className="flex flex-wrap content-start gap-[6px] p-[6px]">
        {[...Array(400)].map((_, i) => (
          <div key={i} className="h-[34px] w-[26px]" style={{ background: dark ? ((i * 13) % 9 === 0 ? '#f5d38a' : (i * 5) % 11 === 0 ? '#7aa2d6' : '#0c1426') : (i * 7) % 6 === 0 ? '#ffffff' : '#b9d0e6', opacity: dark ? 0.8 : 0.5 }} />
        ))}
      </div>
    </div>
  );
}

function Rain({ light = false }: { light?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {[...Array(light ? 40 : 90)].map((_, i) => (
        <span
          key={i}
          className="absolute top-0 w-px bg-gradient-to-b from-transparent to-sky-200/50 animate-rain"
          style={{ left: `${(i * 37) % 100}%`, height: 60 + (i % 5) * 20, animationDelay: `${((i * 13) % 20) / 20}s`, animationDuration: `${0.5 + (i % 4) * 0.15}s`, opacity: light ? 0.25 : 0.6 }}
        />
      ))}
    </div>
  );
}
