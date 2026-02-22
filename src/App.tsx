
import React, { useState, useEffect, useRef } from 'react';
import type { Level } from './types';
import { Header } from './components/Header';
import { BeatGame } from './components/BeatGame';
import { HistoryList } from './components/HistoryList';
import { Settings } from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { CurrencyBar } from './components/CurrencyBar';
import { ExchangeSuccessModal } from './components/ExchangeSuccessModal';
import { ResourceShopModal } from './components/ResourceShopModal';
import { InsufficientFundsModal } from './components/InsufficientFundsModal';
import type { AudioAnalysis, UserStats, GameMode } from './types';
import { analyzeLocally } from './services/geminiService';
import { storageService } from './services/storageService';
import { parseBlob } from 'music-metadata-browser';
import { Buffer } from 'buffer';

// Polyfill Buffer for music-metadata-browser
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

const STORAGE_KEYS = {
  HISTORY: 'music_tiles_fever_history',
  SETUP_COMPLETE: 'music_tiles_fever_setup_complete',
  HEARTS: 'music_tiles_fever_hearts',
  SHIELDS: 'music_tiles_fever_shields',
  USER: 'music_tiles_fever_user',
  EXP: 'music_tiles_fever_exp',
  LAST_HEART_REGEN: 'music_tiles_fever_last_regen'
};

const MAX_HEARTS = 10;

const LogoutConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void }> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 ease-out">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Terminate Session?</h3>
          <p className="text-xs text-blue-200 font-bold uppercase tracking-widest mt-2 leading-relaxed">
            Logging out will clear all local data, including your library and stats.
          </p>

          <div className="flex flex-col w-full gap-3 mt-8">
            <button
              onClick={onConfirm}
              className="w-full py-4 bg-red-500 text-white font-black uppercase text-xs rounded-2xl hover:bg-red-600 transition-colors shadow-lg active:scale-95 transition-all"
            >
              Terminate & Logout
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 bg-white/5 text-slate-400 font-black uppercase text-xs rounded-2xl hover:bg-white/10 transition-colors active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center">
    <div className="flex flex-col items-center animate-pulse">
      <h1 className="text-4xl font-black italic text-white mb-4 tracking-tighter">VYB TAPS</h1>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
      </div>
      <p className="mt-4 text-xs font-bold text-blue-200/60 uppercase tracking-widest">Fetching Resources...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentPlaylist, setCurrentPlaylist] = useState<AudioAnalysis[] | null>(null);
  const [history, setHistory] = useState<AudioAnalysis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Initializing');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [screen, setScreen] = useState<'landing' | 'collection' | 'game' | 'settings' | 'help'>('landing');
  const [isLoading, setIsLoading] = useState(true);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showShuffleDropdown, setShowShuffleDropdown] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const globalAudioRef = useRef<HTMLAudioElement>(null);

  const [user, setUser] = useState<UserStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback for old string-only format
        return {
          username: saved,
          exp: Number(localStorage.getItem(STORAGE_KEYS.EXP) || 0),
          level: 1,
          playtime: 0,
          songsPlayed: 0,
          isPro: false
        };
      }
    }
    return {
      username: '',
      exp: 0,
      level: 1,
      playtime: 0,
      songsPlayed: 0,
      perfects: 0, // Gold Bars
      stars: 30,
      isPro: false
    };
  });

  const [hearts, setHearts] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HEARTS);
    return saved !== null ? Number(saved) : 5;
  });
  const [shields, setShields] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHIELDS);
    return saved !== null ? Number(saved) : 10;
  });
  const [showResourceMenu, setShowResourceMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showExchangeSuccess, setShowExchangeSuccess] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState<{ isOpen: boolean; currency: 'stars' | 'gold'; required: number } | null>(null);

  // Auto-Exchange Logic: Ensure user always has 10 stars if they have enough gold
  useEffect(() => {
    if ((user.stars || 0) < 10 && (user.perfects || 0) >= 100) {
      // Auto-exchange 100 Gold -> 10 Stars
      setUser(prev => ({
        ...prev,
        perfects: (prev.perfects || 0) - 100,
        stars: (prev.stars || 0) + 10
      }));
      // Optional: Show modal or just do it silently? User asked for "automatic", usually implies check & fix.
      // Showing modal might be annoying if it loops. Let's show it for clarity once.
      setExchangeInfo({ cost: 100, gained: 10 });
      setShowExchangeSuccess(true);
    }
  }, [user.stars, user.perfects]);

  // Heart Regeneration Logic: 1 Heart every 49 seconds
  useEffect(() => {
    if (hearts >= MAX_HEARTS) {
      localStorage.removeItem(STORAGE_KEYS.LAST_HEART_REGEN);
      return;
    }

    // Initialize or get last regen time
    const now = Date.now();
    let lastRegen = Number(localStorage.getItem(STORAGE_KEYS.LAST_HEART_REGEN));
    if (!lastRegen) {
      lastRegen = now;
      localStorage.setItem(STORAGE_KEYS.LAST_HEART_REGEN, String(now));
    }

    const REGEN_INTERVAL = 49000; // 49 seconds

    const checkRegen = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - lastRegen;

      if (elapsed >= REGEN_INTERVAL) {
        const heartsToAdd = Math.floor(elapsed / REGEN_INTERVAL);
        setHearts(prev => {
          const next = Math.min(MAX_HEARTS, prev + heartsToAdd);
          return next;
        });

        // Update last regen timestamp to the "consumed" point
        lastRegen = lastRegen + (heartsToAdd * REGEN_INTERVAL);
        localStorage.setItem(STORAGE_KEYS.LAST_HEART_REGEN, String(lastRegen));
      }
    };

    // Run immediately on mount/state change
    checkRegen();

    const timer = setInterval(checkRegen, 1000); // Check every second
    return () => clearInterval(timer);
  }, [hearts]);

  // Auto-Shop Trigger: Show shop when resources are critically low

  const audioContextRef = useRef<AudioContext | null>(null);

  // ... (existing imports)

  // ... (existing imports)

  useEffect(() => {
    const checkSetup = () => {
      const isComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE);
      return isComplete === 'true' && user.username;
    };

    const loadHistory = async () => {
      try {
        const tracks = await storageService.getAllTracks();
        if (tracks.length > 0) {
          setHistory(tracks);
          if (!currentPlaylist) setCurrentPlaylist([tracks[0]]);
        }
      } catch (e) {
        console.error("Failed to load history from DB", e);
      }
    };

    const initApp = async () => {
      // Simulate minimum loading time for smooth UX
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 1500));

      const check = checkSetup();
      const load = loadHistory();

      await Promise.all([minLoadTime, load]);

      if (check) {
        setScreen('collection');
      }
      setIsLoading(false);
    };

    initApp();
  }, [user.username]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HEARTS, String(hearts));
    localStorage.setItem(STORAGE_KEYS.SHIELDS, String(shields));
    // Save full user object now
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }, [hearts, shields, user]);



  const handleLandingComplete = (username: string) => {
    setUser(prev => ({ ...prev, username }));
    localStorage.setItem(STORAGE_KEYS.SETUP_COMPLETE, 'true');
    setScreen('collection');
  };


  const handleLogout = async () => {
    // 1. Clear IndexedDB (Songs)
    await storageService.clearAllData();

    // 2. Clear LocalStorage (User Stats, History, etc.)
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.HEARTS);
    localStorage.removeItem(STORAGE_KEYS.SHIELDS);
    localStorage.removeItem(STORAGE_KEYS.SETUP_COMPLETE);

    // 3. Reset State
    setUser({ username: '', exp: 0, level: 1, songsPlayed: 0, playtime: 0, perfects: 0, stars: 30 });
    setHistory([]);
    setCurrentPlaylist([]);
    setHearts(MAX_HEARTS);
    setShields(10); // Reset to 10 shields on new game start

    // 4. Redirect to Landing
    setScreen('landing');
  };

  const handleFileUpload = async (file: File) => {
    if ((user.stars || 0) < 10) {
      setInsufficientFunds({ isOpen: true, currency: 'stars', required: 10 });
      return;
    }

    // Deduct cost immediately
    setUser(prev => ({ ...prev, stars: (prev.stars || 0) - 10 }));

    setIsAnalyzing(true);
    setAnalysisStep('Syncing Core');
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;
      const arrayBuffer = await file.arrayBuffer();
      setAnalysisStep('Decoding');
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      setAnalysisStep('Beat Mapping');
      const rawData = audioBuffer.getChannelData(0);

      const samples = 1000;
      const blockSize = Math.floor(rawData.length / samples);
      const waveform = [];
      for (let i = 0; i < samples; i++) {
        let max = 0;
        for (let j = 0; j < blockSize; j += 8) {
          const val = Math.abs(rawData[i * blockSize + j]);
          if (val > max) max = val;
        }
        waveform.push(max);
      }

      const beats: number[] = [];
      const windowSize = 1024;
      const step = 512;
      const energies = [];

      for (let i = 0; i < rawData.length - windowSize; i += step) {
        let energy = 0;
        for (let j = 0; j < windowSize; j++) {
          energy += rawData[i + j] * rawData[i + j];
        }
        energies.push(energy / windowSize);
      }

      const localWindow = 43;
      for (let i = localWindow; i < energies.length - localWindow; i++) {
        const e = energies[i];
        let isPeak = true;
        for (let j = i - localWindow; j <= i + localWindow; j++) {
          if (energies[j] > e) {
            isPeak = false;
            break;
          }
        }
        if (isPeak && e > 0.01) {
          const time = (i * step) / audioBuffer.sampleRate;
          if (beats.length === 0 || (time - beats[beats.length - 1] > 0.3)) {
            beats.push(time);
          }
        }
      }

      setAnalysisStep('Finalizing');
      const localResult = analyzeLocally(beats, file.name);

      // Extract Cover Art
      let coverArt: string | undefined = undefined;
      try {
        // Create a slice to ensure a fresh Blob reference and avoid potential caching
        const freshBlob = file.slice(0, file.size);
        const metadata = await parseBlob(freshBlob);
        const picture = metadata.common.picture?.[0];
        if (picture) {
          const base64String = Buffer.from(picture.data).toString('base64');
          coverArt = `data:${picture.format};base64,${base64String}`;
        }
      } catch (e) {
        console.warn("Failed to extract cover art", e);
      }

      const now = Date.now();
      const newAnalysis: AudioAnalysis = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileSize: file.size,
        timestamp: now,
        waveform,
        beats: beats,
        fileUrl: URL.createObjectURL(file), // Transient URL for immediate playback
        bpm: localResult.bpm || 120,
        key: localResult.key || "C",
        genre: localResult.genre || "Electronic",
        mood: localResult.mood || "Neutral",
        summary: localResult.summary || "Local sync ready.",
        highlights: localResult.highlights || [],
        coverArt,
        duration: audioBuffer.duration,
        source: 'local'
      };

      // Save to IndexedDB
      await storageService.saveTrack(newAnalysis, file);

      setCurrentPlaylist([newAnalysis]);
      setHistory(prev => {
        const updated = [newAnalysis, ...prev];
        return updated.sort((a, b) => {
          if (a.lastPlayed || b.lastPlayed) {
            const timeA = a.lastPlayed || 0;
            const timeB = b.lastPlayed || 0;
            if (timeA !== timeB) return timeB - timeA;
          }
          return (b.timestamp || 0) - (a.timestamp || 0);
        });
      });
      setScreen('game');
    } catch (error) {
      console.error(error);
      alert("Signal disruption. File could not be mapped.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayFromHistory = (item: AudioAnalysis, mode: GameMode = 'classic') => {
    // With IndexedDB, fileUrl is regenerated and valid
    if (!item.fileUrl) return alert("Error loading track. Please re-upload.");

    setGameMode(mode);
    setCurrentPlaylist([item]);
    setScreen('game');
  };

  const handleStartPlay = (item: AudioAnalysis) => {
    // Update lastPlayed timestamp ONLY when the game actually starts
    const now = Date.now();
    storageService.updateTrackStats(item.id, { lastPlayed: now });
    setHistory(prev => {
      const updated = prev.map(t => t.id === item.id ? { ...t, lastPlayed: now } : t);
      // Re-sort history so the last played song is at history[0]
      return updated.sort((a, b) => {
        if (a.lastPlayed || b.lastPlayed) {
          const timeA = a.lastPlayed || 0;
          const timeB = b.lastPlayed || 0;
          if (timeA !== timeB) return timeB - timeA;
        }
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    });
  };

  const handleDeleteTrack = async (id: string) => {
    try {
      await storageService.deleteTrack(id);
      setHistory(prev => prev.filter(track => track.id !== id));

      // If the deleted track is currently playing, maybe stop it? 
      // For now, we just remove it from history.
    } catch (e) {
      console.error("Failed to delete track", e);
      alert("Failed to delete track");
    }
  };



  const handleGameFinish = (sessionHearts: number, sessionShields: number, sessionPerfects: number, difficulty: Level, completion: number) => {
    // Update completion in history if better than previous
    if (currentPlaylist && currentPlaylist.length > 0) {
      const trackId = currentPlaylist[0].id;
      const currentBest = history.find(t => t.id === trackId)?.completion || 0;

      if (completion > currentBest) {
        setHistory(prev => prev.map(t => t.id === trackId ? { ...t, completion } : t));
        storageService.updateTrackStats(trackId, { completion });
      }
    }

    // Award stars based on progress and difficulty
    // 1. Base stars: 1 star for every 10% completion
    const baseStars = Math.floor(completion / 10);

    // 2. Difficulty Bonuses
    let bonusStars = 0;
    if (difficulty === 'easy') {
      if (completion >= 100) bonusStars = 5;
      else if (completion >= 50) bonusStars = 2;
    } else if (difficulty === 'medium') {
      if (completion >= 100) bonusStars = 10;
      else if (completion >= 50) bonusStars = 5;
    } else if (difficulty === 'hard') {
      if (completion >= 100) bonusStars = 20;
      else if (completion >= 50) bonusStars = 10;
    }

    const starsEarned = baseStars + bonusStars;

    // Calculate EXP based on perfects (Base 300 + Performance)
    const earnedExp = 300 + (sessionPerfects * 10);

    setUser(prev => {
      const newExp = prev.exp + earnedExp;
      return {
        ...prev,
        exp: newExp,
        level: Math.floor(newExp / 10000) + 1,
        songsPlayed: (prev.songsPlayed || 0) + 1,
        playtime: (prev.playtime || 0) + 180,
        perfects: (prev.perfects || 0) + sessionPerfects,
        stars: Math.max(0, prev.stars || 0) + starsEarned
      };
    });

    setHearts(prev => Math.min(MAX_HEARTS, prev + sessionHearts)); // Only add hearts earned during session
    setShields(prev => prev + sessionShields);
  };

  const handleUseCurrency = (h: number, s: number, g: number = 0) => {
    setHearts(prev => Math.max(0, prev - h));
    setShields(prev => Math.max(0, prev - s));
    if (g > 0) {
      setUser(prev => ({
        ...prev,
        perfects: Math.max(0, (prev.perfects || 0) - g)
      }));
    }
  };

  const handleUpdateProfile = (newUsername: string) => {
    setUser(prev => ({ ...prev, username: newUsername }));
  };

  const handleUpgrade = () => {
    setUser(prev => ({ ...prev, isPro: true }));
    alert("Welcome to Pro! Ads removed (simulated).");
  };

  const [exchangeInfo, setExchangeInfo] = useState({ cost: 0, gained: 0 });

  const handleExchangeCurrency = () => {
    const cost = 100;
    if ((user.perfects || 0) >= cost) {
      setUser(prev => ({
        ...prev,
        perfects: (prev.perfects || 0) - cost,
        stars: Math.max(0, (prev.stars || 0)) + 10
      }));
      setExchangeInfo({ cost: 100, gained: 10 });
      setShowExchangeSuccess(true);
    } else {
      setInsufficientFunds({ isOpen: true, currency: 'gold', required: 100 });
    }
  };




  const handleWatchAd = () => {
    setHearts(h => Math.min(MAX_HEARTS, h + 5));
    // In a real app, this would trigger an ad
    setShowResourceMenu(false);
    alert("Ad Watched: +5 Hearts!"); // Feedback
  };

  const handleBuyShields = () => {
    if (user.exp >= 250) {
      setUser(previousUser => ({ ...previousUser, exp: previousUser.exp - 250 }));
      setShields(s => s + 3);
      setShowResourceMenu(false);
      alert("Purchase Successful: +3 Shields!");
    } else {
      alert("Insufficient EXP! Need 250 EXP.");
    }
  };

  // Global Audio Logic



  // Pause global audio when entering game
  useEffect(() => {
    if (screen === 'game' && globalAudioRef.current && !globalAudioRef.current.paused) {
      globalAudioRef.current.pause();
    }
  }, [screen]);





  if (isLoading) {
    return <LoadingScreen />;
  }

  if (screen === 'landing') {
    return <>
      <LandingPage onEnter={handleLandingComplete} />
    </>;
  }

  return (
    <div className="h-screen w-screen bg-[#0f172a] bg-[#312e81] text-slate-50 flex flex-col overflow-hidden">


      {/* Global Audio Element */}
      <audio
        ref={globalAudioRef}
      />

      <main className="flex-1 overflow-hidden relative">
        {isAnalyzing && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="w-full max-w-md bg-[#1e1b4b]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-12 shadow-[0_22px_70px_4px_rgba(0,0,0,0.8)] flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-300">
              {/* Waveform Loading Animation */}
              <div className="flex items-center gap-1.5 h-24 mb-10">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-white rounded-full animate-loading-wave"
                    style={{
                      height: '30%',
                      animationDelay: `${i * 0.1}s`,
                      boxShadow: '0 0 15px rgba(255,255,255,0.4)'
                    }}
                  ></div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black italic text-white uppercase tracking-[0.2em] animate-pulse">
                  {analysisStep}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
                  <p className="text-blue-200/60 text-[10px] font-black uppercase tracking-[0.4em]">
                    GAV3NA ENGINE PROCESSING
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === 'collection' && (
          <div className="h-full container mx-auto p-2 overflow-y-auto no-scrollbar relative">
            <div className="max-w-5xl mx-auto space-y-0 relative z-10">
              {/* Hero Section */}
              <section className="flex flex-col items-center gap-2 p-4 md:p-6 bg-black/10 rounded-3xl mb-2">

                {screen !== 'game' && (
                  <Header
                    user={user}
                    currentScreen={screen as any}
                    setScreen={setScreen as any}
                    hasAnalysis={!!currentPlaylist}
                  />
                )}

                {/* Hero Info */}
                <div className="flex flex-col gap-4 w-full overflow-hidden">
                  {/* Metadata Row */}


                  {/* Actions Row */}
                  <div className="flex items-center justify-center gap-4 mt-2">
                    {/* Play Button */}
                    <button
                      onClick={() => history.length > 0 && handlePlayFromHistory(history[0])}
                      className="w-14 h-14 rounded-full bg-green-500 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                    >
                      <svg className="w-6 h-6 ml-0.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </button>

                    {/* Shuffle Options Dropdown */}
                    {/* Shuffle Toggle */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowShuffleDropdown(true);
                          setShowCurrencyDropdown(false);
                          setShowAddDropdown(false);
                        }}
                        className={`w-12 h-12 rounded-full transition-all flex items-center justify-center ${showShuffleDropdown ? 'bg-white text-black' : 'text-blue-200/40 hover:text-white hover:bg-white/5'}`}
                        title="Play Modes"
                      >
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
                      </button>
                    </div>

                    {/* Currency Popup Toggle */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowCurrencyDropdown(true);
                          setShowShuffleDropdown(false);
                          setShowAddDropdown(false);
                        }}
                        className={`w-12 h-12 rounded-full transition-all flex items-center justify-center ${showCurrencyDropdown ? 'bg-white text-black' : 'text-blue-200/40 hover:text-white hover:bg-white/5'}`}
                        title="Wallet & Resources"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </button>
                    </div>

                    {/* Add Song Popup Toggle */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowAddDropdown(true);
                          setShowCurrencyDropdown(false);
                          setShowShuffleDropdown(false);
                        }}
                        className={`w-12 h-12 rounded-full transition-all flex items-center justify-center ${showAddDropdown ? 'bg-white text-black' : 'text-blue-200/40 hover:text-white hover:bg-white/5'}`}
                        title="Add Music"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                    {/* Hidden File Input Logic from FileUploader */}
                    <input
                      id="hidden-file-input"
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = ''; // Reset
                      }}
                    />
                  </div>

                  {/* Search Combined */}
                  <div className="flex items-center justify-center mt-4">
                    <div className="flex-1 max-w-md relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-green-500 transition-colors pointer-events-none">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                      <input
                        type="text"
                        placeholder={`Search...${user.songsPlayed || 0} Songs Played`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-white placeholder:text-blue-200/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:bg-white/10 transition-all uppercase tracking-wider"
                      />
                    </div>
                  </div>
                </div>


              </section>


              {/* History List Header */}


              {/* History List at bottom */}
              <div className="px-0 pb-16">
                <HistoryList
                  history={history.filter(track =>
                    track.fileName.toLowerCase().includes(searchQuery.toLowerCase())
                  )}
                  onSelect={handlePlayFromHistory}
                  onDelete={handleDeleteTrack}
                />
              </div>
            </div>
          </div >
        )}

        {
          screen === 'settings' && (
            <Settings
              onBack={() => setScreen('collection')}
              user={user}
              onUpdateProfile={handleUpdateProfile}
              onLogout={() => setShowLogoutConfirm(true)}
              onUpgrade={handleUpgrade}
            />
          )
        }

        {
          screen === 'game' && currentPlaylist && (
            <BeatGame
              playlist={currentPlaylist}
              allSongs={history}
              onExit={() => setScreen('collection')}
              globalHearts={hearts}
              globalShields={shields}
              userPerfects={user.perfects || 0}
              onUseCurrency={handleUseCurrency}
              onFinish={handleGameFinish}
              currentExp={user.exp}
              initialMode={gameMode}
              onStartPlay={handleStartPlay}
            />
          )
        }
      </main >

      {screen !== 'game' && (
        <footer className="py-4 text-center">
          <p className="text-[10px] text-blue-200/20 font-black uppercase tracking-[0.5em]">Gavena</p>
        </footer>
      )}




      <ExchangeSuccessModal
        isOpen={showExchangeSuccess}
        onClose={() => setShowExchangeSuccess(false)}
        starsGained={exchangeInfo.gained}
        cost={exchangeInfo.cost}
      />

      {/* Currency Modal Popup */}
      {showCurrencyDropdown && screen !== 'game' && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowCurrencyDropdown(false)}
        >
          <div
            className="w-full max-w-md bg-[#1e1b4b]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_22px_70px_4px_rgba(0,0,0,0.56)] animate-in zoom-in-95 fade-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 bg-white shrink-0 rounded-xl flex items-center justify-center mb-2 shadow-xl">
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-widest whitespace-nowrap">Wallet & Resources</h3>
              <p className="text-[9px] text-blue-200/40 uppercase tracking-[0.2em] font-bold mt-1">Manage your GAV3NA assets</p>
            </div>

            <CurrencyBar
              user={user}
              hearts={hearts}
              shields={shields}
              onExchange={handleExchangeCurrency}
              onShowShop={() => {
                setShowResourceMenu(true);
                setShowCurrencyDropdown(false);
              }}
              compact={false}
            />

            <button
              onClick={() => setShowCurrencyDropdown(false)}
              className="w-full mt-6 py-4 text-blue-200/60 font-bold uppercase text-[10px] tracking-widest rounded-2xl hover:text-white transition-colors border border-white/5"
            >
              Close Wallet
            </button>
          </div>
        </div>
      )}

      {/* Add Music Modal Popup */}
      {showAddDropdown && screen !== 'game' && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowAddDropdown(false)}
        >
          <div
            className="w-full max-w-md bg-[#1e1b4b]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_22px_70px_4px_rgba(0,0,0,0.56)] animate-in zoom-in-95 fade-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-white shrink-0 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest">Add New Music</h3>
              <p className="text-[10px] text-blue-200/40 uppercase tracking-[0.2em] font-bold mt-1">Select your audio source</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  document.getElementById('hidden-file-input')?.click();
                  setShowAddDropdown(false);
                }}
                className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left group border border-white/5"
              >
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm">Local Device</span>
                  <span className="text-xs text-blue-200/40">Upload from your storage</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </div>
              </button>

              <div className="p-5 opacity-30 cursor-not-allowed flex items-center justify-between bg-white/5 rounded-2xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-white font-bold text-sm">Online Stream</span>
                  <span className="text-xs text-blue-200/40">Cloud sync (Coming Soon)</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddDropdown(false)}
              className="w-full mt-6 py-4 text-blue-200/60 font-bold uppercase text-[10px] tracking-widest rounded-2xl hover:text-white transition-colors border border-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Shuffle Modes Modal Popup */}
      {showShuffleDropdown && screen !== 'game' && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowShuffleDropdown(false)}
        >
          <div
            className="w-full max-w-sm bg-[#1e1b4b]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_22px_70px_4px_rgba(0,0,0,0.56)] animate-in zoom-in-95 fade-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-white shrink-0 rounded-xl flex items-center justify-center mb-2 shadow-xl">
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-widest whitespace-nowrap">Play Modes</h3>
              <p className="text-[9px] text-blue-200/40 uppercase tracking-[0.2em] font-bold mt-1">Select your challenge</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  if (history.length > 0) {
                    const random = history[Math.floor(Math.random() * history.length)];
                    handlePlayFromHistory(random, 'classic');
                  }
                  setShowShuffleDropdown(false);
                }}
                className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-[.2em] text-blue-200/40">Standard Run</span>
                    <span className="text-xs font-black text-white uppercase tracking-widest">Classic Random</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-blue-200/20 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => {
                  if (history.length > 0) {
                    const random = history[Math.floor(Math.random() * history.length)];
                    handlePlayFromHistory(random, 'endless');
                  }
                  setShowShuffleDropdown(false);
                }}
                className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4V1l8 5-8 5V8c-3.31 0-6 2.69-6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l-8-5 8-5v3z" /></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-[.2em] text-blue-200/40">Survival Mode</span>
                    <span className="text-xs font-black text-white uppercase tracking-widest">Endless Marathon</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-blue-200/20 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setShowShuffleDropdown(false)}
              className="w-full mt-6 py-4 text-blue-200/40 font-bold uppercase text-[10px] tracking-[0.3em] hover:text-white transition-colors border border-white/5 rounded-2xl"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}
      <ResourceShopModal
        isOpen={showResourceMenu && screen !== 'game'}
        onClose={() => setShowResourceMenu(false)}
        user={user}
        onBuyShields={handleBuyShields}
        onWatchAd={handleWatchAd}
      />

      {
        insufficientFunds && (
          <InsufficientFundsModal
            isOpen={insufficientFunds.isOpen}
            onClose={() => setInsufficientFunds(null)}
            currentBalance={insufficientFunds.currency === 'gold' ? (user.perfects || 0) : (user.stars || 0)}
            requiredAmount={insufficientFunds.required}
            currency={insufficientFunds.currency}
          />
        )
      }

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
      />
    </div >
  );
};

export default App;
