
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
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'completion'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortPopup, setShowSortPopup] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Sorting Logic
  const sortedHistory = [...history].sort((a, b) => {
    if (sortBy === 'name') {
      return a.fileName.localeCompare(b.fileName);
    }
    if (sortBy === 'date') {
      return sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    }
    if (sortBy === 'completion') {
      const compA = a.completion || 0;
      const compB = b.completion || 0;
      return compA - compB; // Uncompleted first
    }
    return 0;
  });

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
        <svg className="w-12 h-12 text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="text-blue-200/40 text-[10px] font-black uppercase tracking-[0.3em]">Upload audio files</p>
      </div>
    );
  }

  return (
    <>
      {/* Library Controls */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex flex-col">
          <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Music Library</h2>
          <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.3em] mt-1">{history.length} TRACKS IN LIBRARY</p>
        </div>

        <button
          onClick={() => setShowSortPopup(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group"
        >
          <svg className="w-3 h-3 text-blue-200/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/60 group-hover:text-white">Sort By</span>
        </button>
      </div>

      <div className="pr-1" ref={menuRef}>
        {sortedHistory.map((item) => (
          <div key={item.id} className="w-full flex items-center gap-[10px] group backdrop-blur-sm mb-[2px] bg-black/10 rounded-3xl">
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
                <p className="text-base font-black text-white uppercase tracking-tighter truncate w-full" title={item.fileName}>
                  {item.fileName.replace(/\.[^/.]+$/, "")}
                </p>
                <div className="flex items-center gap-[10px] mt-1.5 flex-wrap">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md shrink-0 text-[8px] font-black text-white/40 uppercase tracking-[0.1em]">
                    Best Score: <span className="text-white ml-1">{item.completion || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Duration Display */}
              {item.duration && (
                <span className="text-xs font-bold text-blue-200/60 tabular-nums mr-4">
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
                className="w-10 h-10 rounded-full flex items-center justify-center text-blue-200/40 hover:text-white hover:bg-white/10 transition-colors"
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
                <p className="text-[10px] text-blue-200/60 uppercase tracking-[0.2em] font-bold mt-1">Track Options</p>
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
                  Play Track
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
                  Delete Track
                </button>

                <button
                  onClick={() => setOpenMenuId(null)}
                  className="w-full py-3 text-blue-200/60 font-bold uppercase text-[10px] tracking-widest rounded-2xl hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sort Options Popup */}
      {showSortPopup && (
        <div
          className="fixed inset-0 z-[9999] bg-[#0a0a1a]/95 backdrop-blur-3xl animate-in fade-in duration-500"
          onClick={() => setShowSortPopup(false)}
        >
          <div
            className="w-full h-full flex flex-col animate-in slide-in-from-bottom-8 duration-500 ease-out"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Sort By</h2>
              <button
                onClick={() => setShowSortPopup(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8">
              <div className="max-w-md mx-auto space-y-3">
                <button
                  onClick={() => { setSortBy('name'); setShowSortPopup(false); }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border ${sortBy === 'name' ? 'bg-white border-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                >
                  <span className={`font-black uppercase text-xs tracking-widest ${sortBy === 'name' ? 'text-black' : 'text-white'}`}>Name (A-Z)</span>
                  {sortBy === 'name' && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}
                </button>

                <button
                  onClick={() => { setSortBy('date'); setSortOrder('desc'); setShowSortPopup(false); }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border ${sortBy === 'date' && sortOrder === 'desc' ? 'bg-white border-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                >
                  <span className={`font-black uppercase text-xs tracking-widest ${sortBy === 'date' && sortOrder === 'desc' ? 'text-black' : 'text-white'}`}>Newest First</span>
                  {sortBy === 'date' && sortOrder === 'desc' && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}
                </button>

                <button
                  onClick={() => { setSortBy('date'); setSortOrder('asc'); setShowSortPopup(false); }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border ${sortBy === 'date' && sortOrder === 'asc' ? 'bg-white border-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                >
                  <span className={`font-black uppercase text-xs tracking-widest ${sortBy === 'date' && sortOrder === 'asc' ? 'text-black' : 'text-white'}`}>Oldest First</span>
                  {sortBy === 'date' && sortOrder === 'asc' && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}
                </button>

                <button
                  onClick={() => { setSortBy('completion'); setShowSortPopup(false); }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border ${sortBy === 'completion' ? 'bg-white border-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                >
                  <span className={`font-black uppercase text-xs tracking-widest ${sortBy === 'completion' ? 'text-black' : 'text-white'}`}>Uncompleted First</span>
                  {sortBy === 'completion' && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}
                </button>
              </div>
            </div>

            {/* Bottom Close */}
            <div className="shrink-0 flex justify-center px-6 py-5 border-t border-white/5">
              <button
                onClick={() => setShowSortPopup(false)}
                className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-full hover:scale-105 active:scale-95 transition-all tracking-[0.2em]"
              >
                Close
              </button>
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
