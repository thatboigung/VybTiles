import React, { useState } from 'react';
import type { UserStats } from '../types';

interface CurrencyBarProps {
    user: UserStats;
    hearts: number;
    shields: number;
    onExchange: () => void;
    onShowShop: () => void;
    compact?: boolean;
}

export const CurrencyBar: React.FC<CurrencyBarProps> = ({
    user, hearts, shields, onExchange, onShowShop, compact = false
}) => {
    const [showExchangeMenu, setShowExchangeMenu] = useState(false);

    return (
        <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'} relative`}>
            <button
                onClick={() => setShowExchangeMenu(!showExchangeMenu)}
                className={`flex items-center ${compact ? 'gap-3 px-3' : 'gap-4 pr-4'} hover:bg-white/5 rounded-full p-2 transition-colors border border-transparent hover:border-white/10`}
            >
                <div
                    onClick={(e) => { e.stopPropagation(); onShowShop(); }}
                    className="flex items-center gap-1.5 cursor-pointer hover:scale-110 transition-transform"
                    title="Hearts - Tap to Buy"
                >
                    <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-sm font-black text-white tabular-nums">{hearts}</span>
                </div>
                <div
                    onClick={(e) => { e.stopPropagation(); onShowShop(); }}
                    className="flex items-center gap-1.5 cursor-pointer hover:scale-110 transition-transform"
                    title="Shields - Tap to Buy"
                >
                    <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-sm font-black text-white tabular-nums">{shields}</span>
                </div>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <div
                    className="flex items-center gap-1.5"
                    title="Gold (Perfects)"
                >
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth={2.5} />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v8m0-8c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z" />
                    </svg>
                    <span className="text-sm font-black text-yellow-100 tabular-nums">{(user.perfects || 0).toLocaleString()}</span>
                </div>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <div
                    className="flex items-center gap-1.5"
                    title="Stars"
                >
                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
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
    );
};
