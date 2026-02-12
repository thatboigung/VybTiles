import React from 'react';
import type { UserStats } from '../types';

interface AnalyticsProps {
    user: UserStats;
}

export const Analytics: React.FC<AnalyticsProps> = ({ user }) => {
    const totalHours = Math.floor((user.playtime || 0) / 3600);
    const totalMinutes = Math.floor(((user.playtime || 0) % 3600) / 60);
    const timeDisplay = totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;

    // Generate 7 bars with varying heights for visualization
    const activityBars = React.useMemo(() => {
        const songsPlayed = user.songsPlayed || 0;
        const avgActivity = songsPlayed / 7;

        return Array.from({ length: 7 }, () => {
            const variance = 0.4 + Math.random() * 0.6;
            return Math.max(20, Math.min(100, avgActivity * variance * 15));
        });
    }, [user.songsPlayed]);

    return (
        <div className="space-y-3 mb-4">
            {/* Minimal Bar Graph Visualizer */}
            <div className="flex items-end justify-center gap-2 h-16 rounded-lg px-6 py-2">
                {activityBars.map((height, i) => (
                    <div
                        key={i}
                        className="w-2 rounded-full bg-white/70 transition-all duration-500 hover:bg-white/90"
                        style={{ height: `${height}%` }}
                    />
                ))}
            </div>

            {/* Stats Display */}
            <div className="flex items-center justify-center rounded-xl px-4 py-3">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Playtime</span>
                        <span className="text-sm font-bold text-white tabular-nums">{timeDisplay}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Songs Cleared</span>
                        <span className="text-sm font-bold text-white tabular-nums">{user.songsPlayed || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
