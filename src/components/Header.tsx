
import React from 'react';
import ReactDOM from 'react-dom';
import type { UserStats } from '../types';
import { Settings } from './Settings';


interface HeaderProps {
  user: UserStats;
  currentScreen: 'collection' | 'game' | 'settings';
  setScreen: (screen: 'collection' | 'game' | 'settings') => void;
  hasAnalysis: boolean;
  onUpdateProfile: (name: string) => void;
  onLogout: () => void;
  onUpgrade: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user, currentScreen, setScreen, onUpdateProfile, onLogout, onUpgrade
}) => {
  const [activePopup, setActivePopup] = React.useState<'shop' | 'help' | 'settings' | null>(null);

  const closePopup = () => setActivePopup(null);

  const popupTitles: Record<string, string> = {
    settings: 'Settings',
    shop: 'Shop',
    help: 'Game Guide',
  };

  const popupOverlay = activePopup ? ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-[#0a0a1a]/95 backdrop-blur-3xl animate-in fade-in duration-500"
      onClick={closePopup}
    >
      <div
        className="w-full h-full flex flex-col animate-in slide-in-from-bottom-8 duration-500 ease-out"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky Top Bar */}
        <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-black text-white uppercase tracking-widest">
            {popupTitles[activePopup]}
          </h2>
          <button
            onClick={closePopup}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8">
          <div className="max-w-2xl mx-auto">

            {/* Settings Content */}
            {activePopup === 'settings' && (
              <Settings
                user={user}
                onUpdateProfile={onUpdateProfile}
                onLogout={onLogout}
                onUpgrade={onUpgrade}
              />
            )}

            {/* Shop Content */}
            {activePopup === 'shop' && (
              <div className="space-y-4">
                {[
                  { icon: '❤️', name: '10 Hearts', price: '$0.99', desc: 'Extra lives for revives' },
                  { icon: '🛡️', name: '20 Shields', price: '$0.99', desc: 'Increased damage protection' },
                  { icon: '🟡', name: '100 Gold', price: '$0.99', desc: 'Currency for custom themes' },
                  { icon: '⭐', name: '20 Stars', price: '$0.99', desc: 'Unlock music upload slots' },
                ].map((item, i) => (
                  <button key={i} className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-5">
                      <span className="text-3xl">{item.icon}</span>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-black text-white uppercase tracking-wider">{item.name}</span>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{item.desc}</span>
                      </div>
                    </div>
                    <span className="text-base font-black text-green-400">{item.price}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Help Content */}
            {activePopup === 'help' && (
              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-5">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">How to Play</h4>
                  <p className="text-xs text-white/60 leading-relaxed">Upload any audio file. Our engine analyzes the rhythm and generates beat-synced tiles. Tap the tiles as they enter the target zone to maintain your combo and rack up points!</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Hearts', value: 'Earned by completing songs. Used for revives.' },
                    { label: 'Shields', value: 'Your health pool. Exchange hearts for shields.' },
                    { label: 'Gold', value: 'Perfect hits earn gold. Build combos!' },
                    { label: 'Stars', value: 'Earn to unlock uploads. 10 stars = 1 upload.' },
                    { label: 'Leveling', value: 'Accumulate 10,000 EXP to advance.' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-xs font-black text-white uppercase tracking-wider">{item.label}</span>
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider text-right max-w-[60%]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Sticky Bottom Close */}
        {activePopup !== 'settings' && (
          <div className="shrink-0 flex justify-center px-6 py-5 border-t border-white/5">
            <button
              onClick={closePopup}
              className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-full hover:scale-105 active:scale-95 transition-all tracking-[0.2em]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <header className="w-full">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-[10px] font-black text-white uppercase tracking-[0.3em] leading-none mb-1.5 flex items-center">
              <span className="truncate max-w-[100px]">{user.username || 'AGENT'}</span>
              <span className="text-blue-500 italic ml-2 shrink-0">LEVEL {user.level}</span>
            </h1>
            <div className="w-36 h-1.5 bg-white/5 rounded-full overflow-hidden relative shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-white/5 opacity-50"></div>
              <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 relative z-10" style={{ width: `${(user.exp % 10000) / 100}%` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>
            <p className="text-[8px] font-black text-white/20 tabular-nums mt-1.5 tracking-[0.2em] leading-none">
              {(user.exp % 10000).toLocaleString()} / 10,000 EXP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xl p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActivePopup('shop')}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activePopup === 'shop' ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            title="Shop"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          <button
            onClick={() => setActivePopup('help')}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activePopup === 'help' ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            title="Help & Guide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={() => setScreen('collection')}
            title="Archives"
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${currentScreen === 'collection' ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
          </button>

          <button
            onClick={() => setActivePopup('settings')}
            title="Settings"
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activePopup === 'settings' ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </button>
        </div>
      </div>

      {popupOverlay}
    </header>
  );
};
