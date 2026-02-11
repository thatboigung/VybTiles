import React, { useRef, useEffect, useState } from 'react';
import type { AudioAnalysis } from '../types';

interface VisualizerProps {
  analysis: AudioAnalysis;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analysis }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const waveform = analysis.waveform;
    const step = width / waveform.length;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      for (let i = 0; i < width; i += 50) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
      for (let j = 0; j < height; j += 50) { ctx.moveTo(0, j); ctx.lineTo(width, j); }
      ctx.stroke();

      // Draw waveform
      ctx.beginPath();
      ctx.strokeStyle = '#475569'; // Slate
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';

      waveform.forEach((val, i) => {
        const x = i * step;
        const h = val * (height * 0.7);
        const y = (height - h) / 2;
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h);
      });
      ctx.stroke();

      // Draw playback cursor
      if (audioRef.current && audioRef.current.duration) {
        const progress = audioRef.current.currentTime / audioRef.current.duration;
        const cursorX = progress * width;
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, height);
        ctx.stroke();
      }
    };

    let animationFrame: number;
    const animate = () => {
      draw();
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [analysis, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]" ref={containerRef}>
      <div className="flex-1 relative p-6">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-2xl bg-white/5"
        />
        <div className="absolute top-10 left-10">
          <span className="px-3 py-1.5 bg-white/10 text-slate-400 text-[10px] font-black uppercase rounded-lg border border-white/5 tracking-widest">
            ANALOG FLOW
          </span>
        </div>
      </div>

      <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={togglePlay}
            className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-2xl"
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            ) : (
              <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <div>
            <p className="text-lg font-black text-white italic truncate max-w-[240px] leading-none mb-1">{analysis.fileName}</p>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
              {analysis.genre || 'Unknown Genre'} • {analysis.key || 'Key Unknown'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs font-mono text-slate-500 tracking-tighter">
              {audioRef.current ? Math.floor(audioRef.current.currentTime) : 0} / {audioRef.current ? (isNaN(audioRef.current.duration) ? '...' : Math.floor(audioRef.current.duration)) : 0}s
            </p>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={analysis.fileUrl}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};