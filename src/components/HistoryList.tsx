
import React, { useState } from 'react';
import type { AudioAnalysis } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface HistoryListProps {
  history: AudioAnalysis[];
  onSelect: (analysis: AudioAnalysis) => void;
  onDelete: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onDelete }) => {
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
      <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
        <svg className="w-12 h-12 text-slate-800 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">No compositions found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pr-3" ref={menuRef}>
        {history.map((item) => (
          <div key={item.id} className="w-full flex items-center gap-4 group backdrop-blur-sm  mb-3">
            <div
              onClick={() => onSelect(item)}
              className="flex-1 flex items-center justify-between p-4 cursor-pointer relative overflow-hidden rounded-xl"
            >
              {/* Hover effect background */}
              <div className="absolute inset-0"></div>

              <div className="flex-1 min-w-0 pr-6 relative z-10">
                <p className="text-lg font-black text-white truncate tracking-tight transition-colors">
                  {item.fileName}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded-md">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {item.bpm || '128'} BPM
                    </span>
                    <div className="w-[1px] h-3 bg-white/10 mx-1"></div>
                    <div className="flex gap-0.5" title={`Difficulty: ${(item.bpm && item.bpm > 160 ? 5 : item.bpm && item.bpm > 140 ? 4 : item.bpm && item.bpm > 120 ? 3 : item.bpm && item.bpm > 100 ? 2 : 1)}/5`}>
                      {[...Array(5)].map((_, i) => {
                        const difficulty = item.bpm ? (item.bpm > 160 ? 5 : item.bpm > 140 ? 4 : item.bpm > 120 ? 3 : item.bpm > 100 ? 2 : 1) : 3;
                        return (
                          <svg key={i} className={`w-2.5 h-2.5 ${i < difficulty ? 'text-yellow-500 fill-current drop-shadow-[0_0_2px_rgba(234,179,8,0.5)]' : 'text-slate-700'}`} viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        );
                      })}
                    </div>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
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
      </div>

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
