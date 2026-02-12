import React from 'react';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPurchase: (packageType: string) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, onPurchase }) => {
    if (!isOpen) return null;

    const packages = [
        {
            type: 'hearts_small',
            name: 'Heart Pack',
            icon: '❤️',
            amount: 10,
            price: '$0.99',
            popular: false
        },
        {
            type: 'hearts_medium',
            name: 'Heart Bundle',
            icon: '❤️',
            amount: 25,
            price: '$1.99',
            popular: true
        },
        {
            type: 'hearts_large',
            name: 'Heart Mega Pack',
            icon: '❤️',
            amount: 50,
            price: '$2.99',
            popular: false
        },
        {
            type: 'shields_small',
            name: 'Shield Pack',
            icon: '🛡️',
            amount: 20,
            price: '$0.99',
            popular: false
        },
        {
            type: 'shields_medium',
            name: 'Shield Bundle',
            icon: '🛡️',
            amount: 50,
            price: '$1.99',
            popular: false
        },
        {
            type: 'shields_large',
            name: 'Shield Mega Pack',
            icon: '🛡️',
            amount: 100,
            price: '$2.99',
            popular: false
        },
        {
            type: 'gold_small',
            name: 'Gold Pack',
            icon: '🪙',
            amount: 100,
            price: '$0.99',
            popular: false
        },
        {
            type: 'gold_medium',
            name: 'Gold Bundle',
            icon: '🪙',
            amount: 250,
            price: '$1.99',
            popular: true
        },
        {
            type: 'gold_large',
            name: 'Gold Mega Pack',
            icon: '🪙',
            amount: 500,
            price: '$2.99',
            popular: false
        },
        {
            type: 'stars_small',
            name: 'Star Pack',
            icon: '⭐',
            amount: 20,
            price: '$0.99',
            popular: false
        },
        {
            type: 'stars_medium',
            name: 'Star Bundle',
            icon: '⭐',
            amount: 50,
            price: '$1.99',
            popular: true
        },
        {
            type: 'stars_large',
            name: 'Star Mega Pack',
            icon: '⭐',
            amount: 100,
            price: '$4.99',
            popular: false
        },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto no-scrollbar">
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1a1a] border-b border-white/10 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Shop</h2>
                        <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Currency Packages</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Notice */}
                <div className="p-6 border-b border-white/10">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <p className="text-xs text-blue-300 text-center">
                            💡 <strong>Demo Mode:</strong> Purchases are simulated for demonstration purposes
                        </p>
                    </div>
                </div>

                {/* Packages Grid */}
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {packages.map((pkg) => (
                            <div
                                key={pkg.type}
                                className={`relative bg-white/5 border ${pkg.popular ? 'border-yellow-400/50 ring-2 ring-yellow-400/20' : 'border-white/10'} rounded-xl p-5 hover:bg-white/10 transition-all group`}
                            >
                                {pkg.popular && (
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-black uppercase px-3 py-0.5 rounded-full">
                                        Popular
                                    </div>
                                )}

                                <div className="text-center mb-4">
                                    <div className="text-4xl mb-2">{pkg.icon}</div>
                                    <h3 className="font-bold text-white text-sm">{pkg.name}</h3>
                                    <p className="text-2xl font-black text-white mt-2">{pkg.amount}</p>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">
                                        {pkg.type.includes('hearts') && 'Hearts'}
                                        {pkg.type.includes('shields') && 'Shields'}
                                        {pkg.type.includes('gold') && 'Gold Bars'}
                                        {pkg.type.includes('stars') && 'Stars'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        onPurchase(pkg.type);
                                        alert(`Demo: Purchased ${pkg.name} for ${pkg.price}!`);
                                    }}
                                    className="w-full py-3 bg-white text-black font-bold text-sm uppercase rounded-lg hover:bg-white/90 transition-all active:scale-95 shadow-[2px_2px_0_0_#333] hover:shadow-[3px_3px_0_0_#333] hover:-translate-y-0.5 active:translate-y-[1px] active:shadow-none"
                                >
                                    {pkg.price}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="border-t border-white/10 p-6">
                    <p className="text-xs text-slate-500 text-center">
                        All purchases are final. Currency will be added to your account immediately.
                    </p>
                </div>
            </div>
        </div>
    );
};
