
import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onUpload: (file: File) => void;
  isAnalyzing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, isAnalyzing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-500 bg-gray p-5 flex items-center gap-5 rounded-[8px] hover:bg-white/[0.05] group-hover:from-blue-500/5 group-hover:to-purple-500/5 ${isDragging ? 'border-white/20 bg-white/10' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onUpload(f); }}
      onClick={() => !isAnalyzing && fileInputRef.current?.click()}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp3,.wav" className="hidden" />

      <div className={`w-10 h-10 border border-white/10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-500 ${isAnalyzing ? 'animate-pulse' : 'group-hover:rotate-90'}`}>
        {isAnalyzing ? (
          <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </div>

      <div className="flex-1 text-left">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
          {isAnalyzing ? 'Decoding Neural Stream...' : 'Initialize Audio Feed'}
        </p>
        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
          {isAnalyzing ? 'Please Wait' : 'Drop MP3 / WAV signal here'}
        </p>
      </div>

      <div className="hidden sm:block text-[8px] font-black text-slate-700 uppercase tracking-tighter opacity-50">
        CORE_SYNC_V2
      </div>
    </div>
  );
};
