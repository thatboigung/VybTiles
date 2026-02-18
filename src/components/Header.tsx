
import React from 'react';
import type { UserStats } from '../types';


interface HeaderProps {
  user: UserStats;
  currentScreen: 'collection' | 'game' | 'settings';
  setScreen: (screen: 'collection' | 'game' | 'settings') => void;
  hasAnalysis: boolean;

}

export const Header: React.FC<HeaderProps> = ({
  user, currentScreen, setScreen
}) => {
  const [activePopup, setActivePopup] = React.useState<'shop' | 'help' | null>(null);

  const closePopup = () => setActivePopup(null);

  return (
    <header className="bg-transparent sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between ">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
              {user.username || 'AGENT'} <span className="text-white italic ml-2">LVL {user.level}</span>
            </h1>
            <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden shadow-inner ring-1 ring-white/10">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-1000" style={{ width: `${(user.exp % 10000) / 100}%` }}></div>
            </div>
            <p className="text-[9px] font-bold text-slate-500 tabular-nums mt-0.5 text-right w-full tracking-widest leading-none">
              {(user.exp % 10000).toLocaleString()} / 10000 EXP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Shop Button */}
          <button
            onClick={() => setActivePopup('shop')}
            className={`w-10 h-10 flex items-center justify-center rounded-[8px] transition-all ${activePopup === 'shop' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
            title="Shop"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          {/* Help Button */}
          <button
            onClick={() => setActivePopup('help')}
            className={`w-10 h-10 flex items-center justify-center rounded-[8px] transition-all ${activePopup === 'help' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
            title="Help & Guide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={() => setScreen('collection')}
            title="Archives"
            className={`w-10 h-10 flex items-center justify-center rounded-[8px] transition-all ${currentScreen === 'collection' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
          </button>

          <button
            onClick={() => setScreen('settings')}
            title="Settings"
            className={`w-10 h-10 flex items-center justify-center rounded-[8px] transition-all ${currentScreen === 'settings' ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Global Popup Overlay */}
      {activePopup && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-out"
          onClick={closePopup}
        >
          <div
            className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_22px_70px_4px_rgba(0,0,0,0.56)] animate-in zoom-in-90 slide-in-from-bottom-10 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8">
              {activePopup === 'shop' && (
                <>
                  <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-white shrink-0 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                      <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Marketplace</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mt-1">Acquire Resources</p>
                  </div>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar pr-1">
                    {[
                      { icon: '❤️', name: '10 Hearts', price: '$0.99' },
                      { icon: '🛡️', name: '20 Shields', price: '$0.99' },
                      { icon: '🟡', name: '100 Gold', price: '$0.99', isGold: true },
                      { icon: '⭐', name: '20 Stars', price: '$0.99', isStar: true },
                    ].map((item, i) => (
                      <button key={i} className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.icon}</span>
                          <span className="text-xs font-black text-white uppercase tracking-wider">{item.name}</span>
                        </div>
                        <span className="text-xs font-black text-green-400 group-hover:scale-110 transition-transform">{item.price}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activePopup === 'help' && (
                <>
                  <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-white shrink-0 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                      <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Protocol Guide</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mt-1">Mission Parameters</p>
                  </div>

                  <div className="space-y-4 text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="mb-2"><strong className="text-white">Hearts:</strong> Earned by completing songs. Used for revives.</p>
                      <p className="mb-2"><strong className="text-white">Shields:</strong> Your health. Exchange hearts for shields.</p>
                      <p className="mb-2"><strong className="text-white">Gold:</strong> Perfect hits earn gold. Build combos!</p>
                      <p className="mb-2"><strong className="text-white">Stars:</strong> Earn to unlock uploads. 10 stars = 1 upload.</p>
                      <p><strong className="text-white">Leveling:</strong> Accumulate 10,000 EXP to advance.</p>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={closePopup}
                className="w-full mt-8 py-5 px-6 bg-white text-black font-black uppercase text-xs rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg active:shadow-none"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
