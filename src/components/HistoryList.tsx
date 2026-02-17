
import React, { useState } from 'react';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import type { AudioAnalysis } from '../types';

interface HistoryListProps {
  history: AudioAnalysis[];
  onSelect: (analysis: AudioAnalysis) => void;
  onDelete: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history, onSelect, onDelete
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<AudioAnalysis | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center ">
        <svg className="w-12 h-12 text-slate-800 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">Upload audio files</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 pr-1" ref={menuRef}>
        {history.map((item) => (
          <div key={item.id} className="w-full flex items-center gap-3 group backdrop-blur-sm mb-2">
            <div className="flex-1 flex items-center gap-4 p-4 cursor-pointer relative overflow-hidden rounded-xl" onClick={() => onSelect(item)}>
              {/* Hover effect background */}
              <div className="absolute inset-0"></div>

              {item.coverArt ? (
                <img src={item.coverArt} alt="Cover" className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0 relative z-10 bg-black/50" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 relative z-10">
                  <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              )}

              <div className="flex-1 min-w-0 pr-2 relative z-10 flex flex-col justify-center">
                <p className="text-lg font-medium text-white truncate w-full" title={item.fileName}>
                  {item.fileName}
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded-md shrink-0">
                    <div className="flex gap-0.5" title={`Completion: ${item.completion || 0}%`}>
                      {[...Array(10)].map((_, i) => {
                        const earned = item.completion ? Math.floor(item.completion / 10) : 0;
                        return (
                          <svg key={i} className={`w-2 h-2 ${i < earned ? 'text-yellow-400 fill-current drop-shadow-[0_0_2px_rgba(250,204,21,0.8)]' : 'text-zinc-800'}`} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration Display */}
              {item.duration && (
                <span className="text-xs font-bold text-slate-500 tabular-nums mr-4">
                  {Math.floor(item.duration / 60)}:{Math.floor(item.duration % 60).toString().padStart(2, '0')}
                </span>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); onSelect(item); }}
                className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-[0_4px_0_rgb(163,163,163)] active:shadow-none active:translate-y-[4px] relative z-10 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 duration-300"
                title="Launch Game"
              >
                <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === item.id ? null : item.id);
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {openMenuId === item.id && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackToDelete(item);
                      setOpenMenuId(null);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Track
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div >

      <DeleteConfirmationModal
        isOpen={!!trackToDelete}
        onClose={() => setTrackToDelete(null)}
        onConfirm={() => {
          if (trackToDelete) onDelete(trackToDelete.id);
        }}
        trackName={trackToDelete?.fileName || ''}
      />
    </>
  );
};
