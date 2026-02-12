
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
      <div className="flex flex-col gap-3 mb-10">
        <div className="flex gap-3 items-stretch h-14">
          {/* Search Box - Flex Grow */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search your tracks..."
              className="w-full h-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>

          {/* Upload Button - Drop Zone */}
          <div
            className={`w-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group relative overflow-hidden ${isDragging ? 'border-blue-500/50 bg-blue-500/10' : ''}`}
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

            {isAnalyzing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </div>
        </div>

        {/* Info Text Below */}
        <div className="flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            {isAnalyzing ? 'Decoding Stream...' : 'Launch Audio Stream'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Drop or Tap +</span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${userStars >= 10 ? 'text-yellow-400' : 'text-slate-500'}`}>10 Stars</span>
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
