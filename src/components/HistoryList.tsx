
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
      <div className="pr-1" ref={menuRef}>
        {history.map((item) => (
          <div key={item.id} className="w-full flex items-center gap-[10px] group backdrop-blur-sm mb-[2px]">
            <div className="flex-1 min-w-0 flex items-center gap-[10px] p-[10px] cursor-pointer relative overflow-hidden rounded-xl" onClick={() => onSelect(item)}>
              {/* Hover effect background */}
              <div className="absolute inset-0"></div>

              {item.coverArt ? (
                <img src={item.coverArt} alt="Cover" className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0 relative z-10 bg-black/50" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 relative z-10">
                  <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              )}

              <div className="flex-1 min-w-0 pr-2 relative z-10 flex flex-col justify-center">
                <p className="text-lg font-medium text-white truncate w-full" title={item.fileName}>
                  {item.fileName}
                </p>
                <div className="flex items-center gap-[10px] mt-[10px] flex-wrap">
                  <div className="flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded-md shrink-0 text-[10px] font-bold text-yellow-500/80 uppercase tracking-tight">
                    {item.completion || 0}%
                  </div>
                </div>
              </div>

              {/* Duration Display */}
              {item.duration && (
                <span className="text-xs font-bold text-slate-500 tabular-nums mr-4">
                  {Math.floor(item.duration / 60)}:{Math.floor(item.duration % 60).toString().padStart(2, '0')}
                </span>
              )}

            </div>

            <div className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(item.id);
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                title="Track Options"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Global Menu Popup */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-out"
          onClick={() => setOpenMenuId(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_22px_70px_4px_rgba(0,0,0,0.56)] animate-in zoom-in-90 slide-in-from-bottom-10 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-white shrink-0 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                  <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                </div>
                <h3 className="text-xl font-black text-white truncate w-full px-2">
                  {history.find(t => t.id === openMenuId)?.fileName.replace(/\.[^/.]+$/, "")}
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mt-1">Track Intelligence Active</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    const item = history.find(t => t.id === openMenuId);
                    if (item) onSelect(item);
                    setOpenMenuId(null);
                  }}
                  className="w-full py-5 px-6 bg-white text-black font-black uppercase text-xs rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg active:shadow-none"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  Sync & Play
                </button>

                <button
                  onClick={() => {
                    const item = history.find(t => t.id === openMenuId);
                    if (item) setTrackToDelete(item);
                    setOpenMenuId(null);
                  }}
                  className="w-full py-5 px-6 bg-zinc-900 text-red-500 font-black uppercase text-xs rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-800 active:scale-95 transition-all border border-white/5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove Record
                </button>

                <button
                  onClick={() => setOpenMenuId(null)}
                  className="w-full py-3 text-slate-500 font-bold uppercase text-[10px] tracking-widest rounded-2xl hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
