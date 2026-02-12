
import React from 'react';
import type { UserStats } from '../types';
import { CurrencyBar } from './CurrencyBar';

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
  const [showHelpMenu, setShowHelpMenu] = React.useState(false);
  const [showShopMenu, setShowShopMenu] = React.useState(false);

  return (
    <header className="bg-[#0a0a0a]/80 backdrop-blur-xl  sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-center gap-40 mt-10">
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

            {/* Help and Shop Dropdowns */}
            <div className="flex items-center gap-2 mt-2 relative">
              {/* Help Button */}
              <div className="relative">
                <button
                  onClick={() => setShowHelpMenu(!showHelpMenu)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                  title="Help & Guide"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase tracking-wider">Help</span>
                </button>

                {/* Help Dropdown */}
                {showHelpMenu && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50 max-h-96 overflow-y-auto no-scrollbar">
                    <div className="p-4 space-y-3">
                      <div className="border-b border-white/10 pb-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Game Guide</h3>
                      </div>
                      <div className="space-y-2 text-[10px] text-slate-300">
                        <p><strong className="text-white">❤️ Hearts:</strong> Earned by completing songs. Used for revives.</p>
                        <p><strong className="text-white">🛡️ Shields:</strong> Your health. Exchange hearts for shields.</p>
                        <p><strong className="text-white">🪙 Gold:</strong> Perfect hits earn gold. Build combos for multipliers!</p>
                        <p><strong className="text-white">⭐ Stars:</strong> Complete songs to earn. 10 stars = 1 upload.</p>
                        <p><strong className="text-white">Level Up:</strong> 10,000 EXP per level. Unlock difficulties!</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Shop Button */}
              <div className="relative">
                <button
                  onClick={() => setShowShopMenu(!showShopMenu)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                  title="Shop"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase tracking-wider">Shop</span>
                </button>

                {/* Shop Dropdown */}
                {showShopMenu && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                    <div className="p-3 border-b border-white/10">
                      <p className="text-[10px] font-black text-white uppercase tracking-wider">Currency Packages</p>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">Demo Mode</p>
                    </div>
                    <div className="p-2 space-y-1 max-h-80 overflow-y-auto no-scrollbar">
                      {/* Hearts */}
                      <button className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">❤️</span>
                            <span className="text-[10px] font-bold text-white">10 Hearts</span>
                          </div>
                          <span className="text-[10px] font-black text-green-400">$0.99</span>
                        </div>
                      </button>
                      {/* Shields */}
                      <button className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🛡️</span>
                            <span className="text-[10px] font-bold text-white">20 Shields</span>
                          </div>
                          <span className="text-[10px] font-black text-green-400">$0.99</span>
                        </div>
                      </button>
                      {/* Gold */}
                      <button className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                            <span className="text-[10px] font-bold text-white">100 Gold</span>
                          </div>
                          <span className="text-[10px] font-black text-green-400">$0.99</span>
                        </div>
                      </button>
                      {/* Stars */}
                      <button className="w-full text-left p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                            <span className="text-[10px] font-bold text-white">20 Stars</span>
                          </div>
                          <span className="text-[10px] font-black text-green-400">$0.99</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 sm:gap-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-200 relative">
          <CurrencyBar
            user={user}
            hearts={hearts}
            shields={shields}
            onExchange={onExchange}
            onShowShop={onShowShop}
          />
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

      {/* Mobile Currency Bar */}
      <div className="md:hidden w-full border-t border-white/5 bg-black/20 backdrop-blur-md py-2 flex justify-center">
        <CurrencyBar
          user={user}
          hearts={hearts}
          shields={shields}
          onExchange={onExchange}
          onShowShop={onShowShop}
          compact={true}
        />
      </div>

    </header >
  );
};
