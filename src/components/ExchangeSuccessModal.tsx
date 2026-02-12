import React, { useEffect } from 'react';

interface ExchangeSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    starsGained: number;
    cost: number;
}

export const ExchangeSuccessModal: React.FC<ExchangeSuccessModalProps> = ({
    isOpen, onClose, starsGained, cost
}) => {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(onClose, 2000); // Auto-close after 2s
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
            <div className="relative bg-[#1a1a1a]/90 backdrop-blur-md border border-yellow-500/30 rounded-2xl px-6 py-4 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 flex items-center gap-4 min-w-[280px]">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-yellow-500/10 blur-xl rounded-full pointer-events-none"></div>

                {/* Icon */}
                <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center animate-bounce">
                    <svg className="w-5 h-5 text-yellow-400 fill-current drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                </div>

                {/* Text Content */}
                <div className="flex flex-col">
                    <h3 className="text-sm font-black italic text-white uppercase tracking-tighter leading-none">Exchange Complete</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">-{cost} Gold</span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-[10px] text-yellow-400 font-black italic uppercase tracking-wider">+{starsGained} Stars</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
