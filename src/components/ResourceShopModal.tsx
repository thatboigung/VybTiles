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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            ></div>

            <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Resource Shop</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={onWatchAd}
                        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl group transition-all active:scale-[0.98] border border-transparent hover:border-white/10"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xl">❤️</div>
                            <div className="flex flex-col text-left">
                                <span className="text-white font-bold text-sm">+5 Hearts</span>
                                <span className="text-xs text-slate-500 group-hover:text-slate-400">Watch Ad</span>
                            </div>
                        </div>
                        <span className="text-green-400 text-xs font-black bg-green-500/10 px-2 py-1 rounded">FREE</span>
                    </button>

                    <button
                        onClick={onBuyShields}
                        className={`w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl group transition-all active:scale-[0.98] border border-transparent hover:border-white/10 text-left ${user.exp < 250 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 text-xl">🛡️</div>
                            <div className="flex flex-col text-left">
                                <span className="text-white font-bold text-sm">+3 Shields</span>
                                <span className="text-xs text-slate-500 group-hover:text-slate-400">Cost: 250 EXP</span>
                            </div>
                        </div>
                        <span className={`text-xs font-black px-2 py-1 rounded ${user.exp >= 250 ? 'bg-white/10 text-white' : 'bg-red-500/10 text-red-500'}`}>
                            {user.exp >= 250 ? 'BUY' : 'LOCKED'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
