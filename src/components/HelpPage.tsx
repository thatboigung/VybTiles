import React from 'react';

interface HelpPageProps {
    onBack: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onBack }) => {
    return (
        <div className="h-full bg-black overflow-y-auto no-scrollbar">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Game Guide</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* How to Play */}
                    <section>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                            <span className="text-2xl">🎮</span> How to Play
                        </h3>
                        <div className="space-y-3 text-sm text-slate-300">
                            <p>
                                <strong className="text-white">Goal:</strong> Tap the tiles as they reach the bottom line in rhythm with the music.
                            </p>
                            <p>
                                <strong className="text-white">Controls:</strong> Click or tap the 4 lanes when tiles reach the target zone.
                            </p>
                            <p>
                                <strong className="text-white">Scoring:</strong> Hit tiles perfectly to build combos and earn Gold Bars!
                            </p>
                            <p>
                                <strong className="text-white">Shields:</strong> You start with shields. Missing a tile loses 1 shield. Lose all shields and the game ends.
                            </p>
                        </div>
                    </section>

                    {/* Currencies */}
                    <section>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                            <span className="text-2xl">💰</span> Currencies
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">❤️</span>
                                    <h4 className="font-bold text-white">Hearts</h4>
                                </div>
                                <p className="text-sm text-slate-300">
                                    Earned by completing songs. Used to revive during gameplay or exchange for shields.
                                </p>
                            </div>

                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">🛡️</span>
                                    <h4 className="font-bold text-white">Shields</h4>
                                </div>
                                <p className="text-sm text-slate-300">
                                    Your health in-game. Each missed tile costs 1 shield. Exchange hearts for shields using 250 EXP.
                                </p>
                            </div>

                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-6 h-6 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                                    <h4 className="font-bold text-white">Gold Bars (Perfects)</h4>
                                </div>
                                <p className="text-sm text-slate-300">
                                    Earned by hitting tiles perfectly. Combo multiplier applies! Exchange 100 Gold Bars for 10 Stars.
                                </p>
                            </div>

                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <svg className="w-6 h-6 text-yellow-400 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                    <h4 className="font-bold text-white">Stars</h4>
                                </div>
                                <p className="text-sm text-slate-300">
                                    Premium currency. Earned by completing songs (10 stars at 100%, 5 at 50%+). Costs 10 Stars to upload a new song.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* How to Earn */}
                    <section>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                            <span className="text-2xl">📈</span> How to Earn
                        </h3>
                        <div className="space-y-3 text-sm text-slate-300">
                            <p>
                                <strong className="text-white">Gold Bars:</strong> Hit tiles perfectly. Build combos for 2x+ multipliers!
                            </p>
                            <p>
                                <strong className="text-white">Stars:</strong> Complete songs. Higher completion % = more stars.
                            </p>
                            <p>
                                <strong className="text-white">Hearts:</strong> Earn 1 heart per song completion.
                            </p>
                            <p>
                                <strong className="text-white">Shields:</strong> Exchange hearts in the shop (costs 250 EXP per 5 shields).
                            </p>
                            <p>
                                <strong className="text-white">EXP:</strong> Earned based on your score (score ÷ 100). Perfect hits give more points!
                            </p>
                        </div>
                    </section>

                    {/* Leveling Up */}
                    <section>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                            <span className="text-2xl">⬆️</span> Leveling Up
                        </h3>
                        <div className="space-y-3 text-sm text-slate-300">
                            <p>
                                <strong className="text-white">Requirements:</strong> 10,000 EXP per level. EXP is earned from your score after each game.
                            </p>
                            <p>
                                <strong className="text-white">Benefits:</strong> Higher levels unlock more difficult modes with better rewards.
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Easy Mode: Available until Level 5</li>
                                <li>Medium Mode: Unlocks at Level 3</li>
                                <li>Hard Mode: Unlocks at Level 5</li>
                            </ul>
                        </div>
                    </section>

                    {/* Tips */}
                    <section>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                            <span className="text-2xl">💡</span> Pro Tips
                        </h3>
                        <div className="space-y-2 text-sm text-slate-300">
                            <p>• Focus on perfect hits to maximize Gold Bars with combo multipliers</p>
                            <p>• Complete songs at 100% to earn maximum stars (10 stars)</p>
                            <p>• Exchange currencies strategically - save Gold Bars for Star conversion</p>
                            <p>• Use revive wisely - costs increase each time (50 Gold per revive)</p>
                            <p>• Higher difficulties = faster gameplay but better rewards</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
