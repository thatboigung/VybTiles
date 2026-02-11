
import React from 'react';
import type { AudioAnalysis } from '../types';

interface AnalysisPanelProps {
  analysis: AudioAnalysis;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis }) => {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2 text-white">
        <span className="w-2 h-6 bg-white rounded-full"></span>
        Neural Report
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Tempo</p>
          <p className="text-2xl font-black text-white leading-none italic">{analysis.bpm || '120'} <span className="text-xs font-normal text-zinc-600 not-italic">BPM</span></p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Harmonic Key</p>
          <p className="text-2xl font-black text-white leading-none italic">{analysis.key || 'C Maj'}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Style</p>
          <p className="text-lg font-black text-white leading-tight truncate italic uppercase tracking-tighter">{analysis.genre || 'Electronic'}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Atmosphere</p>
          <p className="text-lg font-black text-white leading-tight truncate italic uppercase tracking-tighter">{analysis.mood || 'Vibrant'}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Synthesis Summary</p>
        <p className="text-sm text-zinc-300 leading-relaxed bg-black/40 p-4 rounded-xl border border-zinc-800 italic">
          "{analysis.summary || "Generating description..."}"
        </p>
      </div>

      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Beat Density Profile</p>
        </div>
        <div className="flex gap-1 h-12 items-end px-2 bg-black/50 rounded-lg p-2 overflow-hidden">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-zinc-700/40 rounded-t-sm"
              style={{ height: `${20 + Math.random() * 80}%` }}
            ></div>
          ))}
        </div>
      </div>
    </section>
  );
};
