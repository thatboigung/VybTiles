import React from 'react';

interface RechargeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>

                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-4">
                    System Depleted
                </h3>

                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    Insufficient energy reserves to initiate neural sync. <br />
                    Please wait for automatic recharge or watch an ad to restore power immediately.
                </p>

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                >
                    Acknowledge
                </button>
            </div>
        </div>
    );
};
