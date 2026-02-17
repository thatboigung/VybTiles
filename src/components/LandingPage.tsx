
import React, { useState } from 'react';

interface LandingPageProps {
  onEnter: (username: string) => void;
}

const slides = [
  {
    id: 'start',
    title: 'Vyb Tiles',
    subtitle: 'Gavena Presents',
    description: 'Transform any audio file into a high-fidelity interactive experience with beat-synced rhythm challenge.',
    cta: 'Get Started'
  },
  {
    id: 'identity',
    title: 'Your Profile',
    subtitle: 'Operational Profile',
    description: 'Establish a local link to track performance and experience gains.',
    cta: 'Confirm Identity'
  },
  {
    id: 'legal',
    title: 'Legal Core',
    subtitle: 'Privacy & Rights',
    description: 'All processing occurs locally on your device. Your music stays yours.',
    cta: 'Accept & Enter'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [username, setUsername] = useState('');

  const handleNext = () => {
    if (currentSlide === 1 && !username.trim()) {
      alert("Identify yourself, Agent.");
      return;
    }
    if (currentSlide === slides.length - 1) {
      onEnter(username);
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div className="h-screen w-screen bg-[#121212] bg-gradient-to-b from-[#121212] to-black flex items-center justify-center overflow-hidden relative">
      <div className="relative z-10 w-full max-w-4xl px-8 flex flex-col items-center text-center">
        {/* ...existing code... */}
        <div key={slide.id} className="animate-in fade-in slide-in-from-bottom-12 duration-1000 flex flex-col items-center">
          <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.8em] mb-4">{slide.subtitle}</p>
          <h1 className="text-8xl font-black italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            VYB TAPS</h1>
          <p className="text-lg text-slate-400 font-medium max-w-2xl leading-relaxed mb-12">{slide.description}</p>

          {slide.id === 'identity' && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ENTER AGENT NAME..."
              className="w-full max-w-md bg-white/5 border border-white/10 py-6 px-10 text-xl font-black text-white italic text-center outline-none focus:border-white/30 transition-all rounded-[8px] mb-12"
            />
          )}

          <button
            onClick={handleNext}
            className="group px-20 py-8 bg-white text-black rounded-full font-black text-2xl uppercase italic tracking-tighter transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            {slide.cta}
          </button>
        </div>
      </div>
      <div className="absolute bottom-12 left-12"><p className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em]">Gavena Presents</p></div>
    </div>
  );
};
