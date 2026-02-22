import React from 'react';
import type { UserStats } from '../types';

interface ResourceShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserStats;
    onBuyShields: () => void;
    onWatchAd: () => void;
}

export const ResourceShopModal: React.FC<ResourceShopModalProps> = ({
    isOpen, onClose, user, onBuyShields, onWatchAd
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="w-full max-w-sm bg-[#1e1b4b]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_22px_70px_4px_rgba(0,0,0,0.56)] animate-in zoom-in-95 fade-in duration-300 relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-white shrink-0 rounded-xl flex items-center justify-center mb-2 shadow-xl">
                        <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-widest whitespace-nowrap">Resource Shop</h3>
                    <p className="text-[9px] text-blue-200/40 uppercase tracking-[0.2em] font-bold mt-1">Acquire GAV3NA Boosts</p>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={onWatchAd}
                        className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[8px] font-black uppercase tracking-[.2em] text-blue-200/40">Life threads</span>
                                <span className="text-xs font-black text-white uppercase tracking-widest">+5 Hearts</span>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded">Free</span>
                    </button>

                    <button
                        onClick={onBuyShields}
                        disabled={user.exp < 250}
                        className={`w-full flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl transition-all group ${user.exp < 250 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[8px] font-black uppercase tracking-[.2em] text-blue-200/40">Defensive layers</span>
                                <span className="text-xs font-black text-white uppercase tracking-widest">+3 Shields</span>
                            </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${user.exp >= 250 ? 'bg-white/10 text-white' : 'bg-red-500/10 text-red-500'}`}>
                            {user.exp >= 250 ? '250 exp' : 'Locked'}
                        </span>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-6 py-4 text-blue-200/40 font-bold uppercase text-[10px] tracking-[0.3em] hover:text-white transition-colors border border-white/5 rounded-2xl"
                >
                    Dismiss Shop
                </button>
            </div>
        </div>
    );
};
