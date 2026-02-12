
import React from 'react';
import type { UserStats } from '../types';

interface HeaderProps {
  user: UserStats;
  currentScreen: 'collection' | 'game' | 'settings';
  setScreen: (screen: 'collection' | 'game' | 'settings') => void;
  hasAnalysis: boolean;
  onExchange: () => void;
  onShowShop: () => void;
  hearts: number;
  shields: number;
}

export const Header: React.FC<HeaderProps> = ({
  user, currentScreen, setScreen, onExchange, onShowShop, hearts, shields
}) => {
  const [showExchangeMenu, setShowExchangeMenu] = React.useState(false);

  return (
    <header className="bg-[#0a0a0a]/80 backdrop-blur-xl  sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-center gap-40">
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

        <div className="hidden md:flex items-center gap-3 sm:gap-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-200 relative">

          {/* Currency Display with Dropdown */}
          <div className="flex items-center gap-3 mr-2 relative">
            <button
              onClick={() => setShowExchangeMenu(!showExchangeMenu)}
              className="flex items-center gap-4 hover:bg-white/5 rounded-full p-2 pr-4 transition-colors border border-transparent hover:border-white/10"
            >
              <div
                onClick={(e) => { e.stopPropagation(); onShowShop(); }}
                className="flex items-center gap-1.5 cursor-pointer hover:scale-110 transition-transform"
                title="Hearts - Tap to Buy"
              >
                <span className="text-red-500 text-lg drop-shadow-md">❤️</span>
                <span className="text-sm font-black text-white tabular-nums">{hearts}</span>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); onShowShop(); }}
                className="flex items-center gap-1.5 cursor-pointer hover:scale-110 transition-transform"
                title="Shields - Tap to Buy"
              >
                <span className="text-blue-500 text-lg drop-shadow-md">🛡️</span>
                <span className="text-sm font-black text-white tabular-nums">{shields}</span>
              </div>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
              <div
                className="flex items-center gap-1.5"
                title="Gold (Perfects)"
              >
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                <span className="text-sm font-black text-yellow-100 tabular-nums">{(user.perfects || 0).toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
              <div
                className="flex items-center gap-1.5"
                title="Stars"
              >
                <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                <span className="text-sm font-black text-yellow-100 tabular-nums">{user.stars || 0}</span>
              </div>
              <div className={`text-[10px] text-slate-500 transition-transform duration-200 ${showExchangeMenu ? 'rotate-180' : ''}`}>▼</div>
            </button>

            {/* Dropdown Menu */}
            {showExchangeMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                <button
                  onClick={() => { onExchange(); setShowExchangeMenu(false); }}
                  className="w-full text-left p-3 hover:bg-white/5 transition-colors group"
                >
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Exchange</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-yellow-600">100 Gold</span>
                    <span className="text-[10px] text-slate-600">➜</span>
                    <span className="text-xs font-bold text-yellow-400">10 Stars</span>
                  </div>
                </button>
              </div>
            )}
          </div>

        </div >

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
      </div >

    </header >
  );
};
