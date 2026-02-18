
import React from 'react';
import type { AudioAnalysis } from '../types';

interface BottomPlayerProps {
    currentSong: AudioAnalysis | null;
    isPlaying: boolean;
    onPlayPause: () => void;
    progress: number; // 0 to 1
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
    currentSong,
    isPlaying,
    onPlayPause,
    progress,
    currentTime,
    duration,
    onSeek
}) => {
    if (!currentSong) return null;

    const formatTime = (time: number) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return (
        <div className="h-16 md:h-24 bg-[#0f172a] border-t border-white/5 px-4 flex items-center justify-between z-[40] animate-in slide-in-from-bottom duration-500">
            {/* Left: Song Info - Show cover art on mobile, hide text */}
            <div className="flex items-center gap-3 md:gap-4 w-12 md:w-[30%] min-w-0 shrink-0">
                {currentSong.coverArt ? (
                    <img src={currentSong.coverArt} alt="Cover" className="w-10 h-10 md:w-14 md:h-14 rounded-2xl shadow-lg object-cover" />
                ) : (
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-[#282828] rounded flex items-center justify-center">
                        <span className="text-xl md:text-2xl">🎵</span>
                    </div>
                )}
                <div className="hidden md:flex flex-col min-w-0">
                    <h4 className="text-sm font-bold text-white truncate hover:underline cursor-pointer">
                        {currentSong.fileName.replace(/\.[^/.]+$/, "")}
                    </h4>
                    <span className="text-xs text-[#b3b3b3] hover:underline cursor-pointer hover:text-white transition-colors">
                        Unknown Artist
                    </span>
                </div>
                <button className="text-[#b3b3b3] hover:text-white ml-2 hidden md:block">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </button>
            </div>

            {/* Center: Controls - Play and Progress only on mobile */}
            <div className="flex flex-row md:flex-col items-center gap-4 md:gap-2 w-full md:max-w-[40%]">
                {/* Play Button */}
                <button
                    onClick={onPlayPause}
                    className="w-10 h-5 md:w-8 md:h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                >
                    {isPlaying ? (
                        <svg className="w-5 h-5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                        <svg className="w-5 h-5 md:w-4 md:h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>

                {/* Progress Bar Container */}
                <div className="w-full flex items-center gap-2 group">
                    <span className="text-[10px] md:text-xs text-[#b3b3b3] tabular-nums font-mono min-w-[35px] text-right">{formatTime(currentTime)}</span>
                    <div className="flex-1 h-1 bg-[#4d4d4d] rounded-full relative cursor-pointer group-hover:h-1.5 transition-all">
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full relative group-hover:bg-[#1ed760] transition-colors"
                                style={{ width: `${progress * 100}%` }}
                            ></div>
                        </div>
                        {/* Slider thumb */}
                        <div
                            className="w-3 h-3 bg-white rounded-full absolute top-1/2 -translate-y-1/2 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: `${progress * 100}%`, transform: 'translate(-50%, -50%)' }}
                        />
                        <input
                            type="range"
                            min={0}
                            max={duration || 1}
                            value={currentTime}
                            onChange={(e) => onSeek(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    <span className="text-[10px] md:text-xs text-[#b3b3b3] tabular-nums font-mono min-w-[35px]">{formatTime(duration)}</span>
                </div>

                {/* Desktop-only controls hidden on mobile */}
                <div className="hidden md:flex items-center gap-6 mt-1">
                    <button className="text-[#b3b3b3] hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
                    </button>
                    <button className="text-[#b3b3b3] hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                    </button>
                    <div className="w-8 h-8 invisible"></div> {/* Spacer for play button alignment if needed */}
                    <button className="text-[#b3b3b3] hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                    </button>
                    <button className="text-[#b3b3b3] hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>
                    </button>
                </div>
            </div>

            {/* Right: Volume & Options (Visual Only) */}
            <div className="flex items-center justify-end gap-2 w-[30%] min-w-0 hidden md:flex">
                <button className="text-[#b3b3b3] hover:text-white p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <button className="text-[#b3b3b3] hover:text-white p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div className="flex items-center gap-2 group w-24">
                    <svg className="w-5 h-5 text-[#b3b3b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    <div className="h-1 bg-[#4d4d4d] flex-1 rounded-full overflow-hidden">
                        <div className="h-full bg-[#b3b3b3] group-hover:bg-[#1ed760] transition-colors w-3/4"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
