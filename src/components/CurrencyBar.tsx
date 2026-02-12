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
                    <span className={`${compact ? 'text-base' : 'text-lg'} text-red-500 drop-shadow-md`}>❤️</span>
                    <span className="text-sm font-black text-white tabular-nums">{hearts}</span>
                </div>
                <div
                    onClick={(e) => { e.stopPropagation(); onShowShop(); }}
                    className="flex items-center gap-1.5 cursor-pointer hover:scale-110 transition-transform"
                    title="Shields - Tap to Buy"
                >
                    <span className={`${compact ? 'text-base' : 'text-lg'} text-blue-500 drop-shadow-md`}>🛡️</span>
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
    );
};
