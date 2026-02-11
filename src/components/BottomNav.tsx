import React from 'react';

interface BottomNavProps {
    currentScreen: 'collection' | 'game' | 'settings';
    setScreen: (screen: 'collection' | 'game' | 'settings') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, setScreen }) => {
    return (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-8 shadow-2xl">
            <button
                onClick={() => setScreen('collection')}
                className={`flex flex-col items-center gap-1 transition-colors ${currentScreen === 'collection' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
            </button>

            <div className="w-px h-6 bg-white/10"></div>

            <button
                onClick={() => setScreen('settings')}
                className={`flex flex-col items-center gap-1 transition-colors ${currentScreen === 'settings' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
            </button>
        </div>
    );
};
