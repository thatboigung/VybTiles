
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
  const expProgress = (user.exp % 1000) / 10;

  return (
    <header className="bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
              {user.username || 'AGENT'} <span className="text-white italic ml-2">LVL {user.level}</span>
            </h1>
            <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden shadow-inner ring-1 ring-white/10">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-1000" style={{ width: `${expProgress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 sm:gap-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
          <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
};
