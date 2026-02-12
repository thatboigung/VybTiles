
import React, { useRef, useState } from 'react';
import { InsufficientFundsModal } from './InsufficientFundsModal';

interface FileUploaderProps {
  onUpload: (file: File) => void;
  isAnalyzing: boolean;
  userPerfects: number;
  userStars: number;
  onDeductCurrency: (p: number, s: number) => void;
  onSearchChange?: (query: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, isAnalyzing, userStars, onDeductCurrency, onSearchChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (userStars >= 10) {
        onDeductCurrency(0, 10);
        onUpload(file);
      } else {
        setShowInsufficientFundsModal(true);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearchChange?.(query);
  };

  return (
    <>
      <div className="flex gap-4 items-center mb-10">
        {/* Upload Div - Left Side */}
        <div
          className={`flex-1 relative group cursor-pointer transition-all duration-500 bg-gray p-5 flex items-center gap-5 rounded-2xl hover:bg-white/[0.05] group-hover:from-blue-500/5 group-hover:to-purple-500/5 ${isDragging ? 'border-white/20 bg-white/10' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) {
              if (userStars >= 10) {
                onDeductCurrency(0, 10);
                onUpload(f);
              } else {
                setShowInsufficientFundsModal(true);
              }
            }
          }}
          onClick={() => {
            if (!isAnalyzing) {
              if (userStars >= 10) {
                fileInputRef.current?.click();
              } else {
                setShowInsufficientFundsModal(true);
              }
            }
          }}
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
              {isAnalyzing ? 'Decoding Neural Stream...' : 'Launch Audio Stream'}
            </p>
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
              {isAnalyzing ? 'Please Wait' : 'Drop MP3 / WAV signal here'}
            </p>
            <div className="flex gap-3 mt-2">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${userStars >= 10 ? 'text-yellow-400' : 'text-zinc-600'}`}>10 Stars</span>
            </div>
          </div>

          <div className="hidden sm:block text-[8px] font-black text-slate-700 uppercase tracking-tighter opacity-50">
            GAVENA  CORE_SYNC_V2
          </div>
        </div>

        {/* Search Box - Right Side */}
        <div className="w-80">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search your tracks..."
              className="w-full bg-white/5 rounded-3xl px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20 transition-colors"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <InsufficientFundsModal
        isOpen={showInsufficientFundsModal}
        onClose={() => setShowInsufficientFundsModal(false)}
        currentBalance={userStars}
        requiredAmount={10}
        currency="stars"
      />
    </>
  );
};
