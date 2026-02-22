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
        <div className={`flex ${compact ? 'items-center gap-2' : 'flex-col gap-3'} w-full relative`}>
            {compact ? (
                <button
                    onClick={() => setShowExchangeMenu(!showExchangeMenu)}
                    className="flex items-center gap-3 px-3 hover:bg-white/5 rounded-full p-2 transition-colors border border-transparent hover:border-white/10"
                >
                    <div
                        onClick={(e) => { e.stopPropagation(); onShowShop(); }}
                        className="flex items-center gap-1.5 cursor-pointer hover:scale-110 transition-transform"
                        title="Hearts - Tap to Buy"
                    >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-sm font-black text-white tabular-nums">{hearts}</span>
                    </div>
                    <div
                        onClick={(e) => { e.stopPropagation(); onShowShop(); }}
                        className="flex items-center gap-1.5 cursor-pointer hover:scale-110 transition-transform"
                        title="Shields - Tap to Buy"
                    >
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-sm font-black text-white tabular-nums">{shields}</span>
                    </div>
                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                    <div className="flex items-center gap-1.5" title="Gold">
                        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" strokeWidth={2.5} />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v8m0-8c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z" />
                        </svg>
                        <span className="text-sm font-black text-yellow-100 tabular-nums">{(user.perfects || 0).toLocaleString()}</span>
                    </div>
                    <div className={`text-[10px] text-slate-500 transition-transform duration-200 ${showExchangeMenu ? 'rotate-180' : ''}`}>▼</div>
                </button>
            ) : (
                <div className="space-y-1.5 w-full">
                    <div onClick={onShowShop} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[8px] font-black uppercase tracking-[.2em] text-blue-200/40">Life Threads</span>
                                <span className="text-xs font-black text-white uppercase tracking-widest">Hearts</span>
                            </div>
                        </div>
                        <span className="text-lg font-black text-white tabular-nums">{hearts}</span>
                    </div>

                    <div onClick={onShowShop} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[8px] font-black uppercase tracking-[.2em] text-blue-200/40">Defensive Layers</span>
                                <span className="text-xs font-black text-white uppercase tracking-widest">Shields</span>
                            </div>
                        </div>
                        <span className="text-lg font-black text-white tabular-nums">{shields}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="9" />
                                    <text x="12" y="16" textAnchor="middle" fill="black" fontSize="12" fontWeight="900">G</text>
                                </svg>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[8px] font-black uppercase tracking-[.2em] text-blue-200/40">Refinement Wealth</span>
                                <span className="text-xs font-black text-white uppercase tracking-widest">Gold</span>
                            </div>
                        </div>
                        <span className="text-lg font-black text-yellow-500 tabular-nums">{(user.perfects || 0).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-400/20 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[8px] font-black uppercase tracking-[.2em] text-blue-200/40">Universal Recognition</span>
                                <span className="text-xs font-black text-white uppercase tracking-widest">Stars</span>
                            </div>
                        </div>
                        <span className="text-lg font-black text-yellow-100 tabular-nums">{user.stars || 0}</span>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/5">
                        <button
                            onClick={() => onExchange()}
                            className="w-full p-3 bg-white text-black rounded-2xl font-black uppercase text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-between group"
                        >
                            <div className="flex flex-col text-left">
                                <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Trade Resources</span>
                                <span className="text-[10px]">Gold ➜ Stars</span>
                            </div>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Dropdown Menu for compact mode */}
            {compact && showExchangeMenu && (
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
