import React from 'react';

interface InsufficientFundsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    requiredAmount: number;
    currency: 'stars' | 'gold';
}

export const InsufficientFundsModal: React.FC<InsufficientFundsModalProps> = ({
    isOpen,
    onClose,
    currentBalance,
    requiredAmount,
    currency
}) => {
    if (!isOpen) return null;

    const title = currency === 'gold' ? 'Insufficient Gold' : 'Insufficient Stars';
    const message = currency === 'gold'
        ? "You don't have enough Gold Bars for this transaction. Hit more Perfects to earn Gold!"
        : "Not enough Stars. Complete more tracks to earn Stars.";

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            ></div>

            {/* Modal */}
            <div
                className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">
                    {title}
                </h3>

                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    {message}
                </p>

                <div className="bg-black/40 rounded-xl p-4 border border-white/5 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Required</span>
                        <span className="text-red-400 font-bold tabular-nums">
                            {requiredAmount} {currency === 'gold' ? 'Gold Bars' : 'Stars'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Current Balance</span>
                        <span className={`${currentBalance >= requiredAmount ? 'text-green-400' : 'text-slate-300'} font-bold tabular-nums`}>
                            {currentBalance} {currency === 'gold' ? 'Gold Bars' : 'Stars'}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
