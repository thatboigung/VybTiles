
import React, { useState, useEffect, useRef } from 'react';
import type { Level } from './types';
import { Header } from './components/Header';
import { BeatGame } from './components/BeatGame';
import { HistoryList } from './components/HistoryList';
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

const LoadingScreen: React.FC<{ status?: string }> = ({ status }) => (
  <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center transition-opacity duration-700">
    <div className="flex flex-col items-center">
      <h1 className="text-4xl font-black italic text-white mb-4 tracking-tighter animate-pulse">VIBE RUSH</h1>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
      </div>
      <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{status || 'Loading...'}</p>
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
  const [loadingStatus, setLoadingStatus] = useState('Loading...');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showShuffleDropdown, setShowShuffleDropdown] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [menuBgUrl, setMenuBgUrl] = useState<string | null>(null);

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
  const [purchaseFeedback, setPurchaseFeedback] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

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

  // Auto-Buy Shields: When shields hit 0 and user has enough EXP, auto-purchase 3 shields
  useEffect(() => {
    if (shields <= 0 && user.exp >= 250) {
      setUser(prev => ({ ...prev, exp: prev.exp - 250 }));
      setShields(s => s + 3);
    }
  }, [shields, user.exp]);

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

    const loadHistory = async (): Promise<AudioAnalysis[]> => {
      try {
        const tracks = await storageService.getAllTracks();
        if (tracks.length > 0) {
          setHistory(tracks);
          if (!currentPlaylist) setCurrentPlaylist([tracks[0]]);
        }
        return tracks;
      } catch (e) {
        console.error("Failed to load history from DB", e);
        return [];
      }
    };

    const initApp = async () => {
      // Minimum loading time for smooth UX
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 1800));

      setLoadingStatus('Loading your library...');
      const check = checkSetup();
      const load = loadHistory();
      const loadedTracks = await load;

      // Preload cover art images
      const tracksWithArt = (loadedTracks || []).filter((t: AudioAnalysis) => t.coverArt);
      if (tracksWithArt.length > 0) {
        setLoadingStatus('Loading artwork...');
        const imagePromises = tracksWithArt.slice(0, 20).map((t: AudioAnalysis) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = t.coverArt!;
          })
        );
        await Promise.all(imagePromises);
      }

      // Wait for fonts
      setLoadingStatus('Almost ready...');
      try {
        await document.fonts.ready;
      } catch (e) { /* fonts API not supported, skip */ }

      await minLoadTime;

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

  // Background Rotation Logic
  useEffect(() => {
    if (screen === 'game') return;

    const updateBg = () => {
      if (history.length > 0) {
        const songsWithArt = history.filter(s => s.coverArt);
        if (songsWithArt.length > 0) {
          const random = songsWithArt[Math.floor(Math.random() * songsWithArt.length)];
          setMenuBgUrl(random.coverArt || null);
        }
      }
    };

    updateBg(); // Initial pick
    const interval = setInterval(updateBg, 15000); // Rotate every 15s
    return () => clearInterval(interval);
  }, [history, screen]);



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
    setShowResourceMenu(false);
    setPurchaseFeedback({ type: 'success', title: '+5 Hearts!', message: 'Your hearts have been restored.' });
    setTimeout(() => setPurchaseFeedback(null), 2500);
  };

  const handleBuyShields = () => {
    if (user.exp >= 250) {
      setUser(previousUser => ({ ...previousUser, exp: previousUser.exp - 250 }));
      setShields(s => s + 3);
      setShowResourceMenu(false);
      setPurchaseFeedback({ type: 'success', title: '+3 Shields!', message: 'Purchase successful. 250 EXP spent.' });
      setTimeout(() => setPurchaseFeedback(null), 2500);
    } else {
      setPurchaseFeedback({ type: 'error', title: 'Not Enough EXP', message: 'You need at least 250 EXP to buy shields.' });
      setTimeout(() => setPurchaseFeedback(null), 2500);
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
    return <LoadingScreen status={loadingStatus} />;
  }

  if (screen === 'landing') {
    return <>
      <LandingPage onEnter={handleLandingComplete} />
    </>;
  }

  return (
    <div className="h-screen w-screen bg-[#0f172a] text-slate-50 flex flex-col overflow-hidden relative">

      {/* Dynamic Menu Background - Pro Standard */}
      {screen !== 'game' && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Cover Art Layer with Cinematic Blur */}
          {menuBgUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[3000ms] scale-110 blur-1xl opacity-40"
              style={{ backgroundImage: `url(${menuBgUrl})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-[#0f172a]" />
          )}

          {/* Grain & Scanline Overlay for Texture */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

          {/* Cinematic Depth Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/90 via-transparent to-[#0f172a]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,27,75,0.4)_0%,transparent_100%)]" />
        </div>
      )}


      {/* Global Audio Element */}
      <audio
        ref={globalAudioRef}
      />

      <main className="flex-1 overflow-hidden relative">
        {isAnalyzing && (
          <div className="fixed inset-0 z-[9999] bg-[#0a0a1a]/98 backdrop-blur-3xl animate-in fade-in duration-500">
            <div className="w-full h-full flex flex-col">
              {/* Top Bar */}
              <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5">
                <h2 className="text-lg font-black text-white uppercase tracking-widest">Analyzing</h2>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className="flex flex-col items-center text-center">
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

                  <div className="space-y-3">
                    <h3 className="text-2xl font-black italic text-white uppercase tracking-widest animate-pulse">
                      {analysisStep}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></div>
                      <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
                        Processing audio
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === 'collection' && (
          <div className="h-full container mx-auto p-2 overflow-y-auto no-scrollbar relative">
            <div className="max-w-5xl mx-auto space-y-0 relative z-10">
              {/* Hero Section - The Command Pod */}
              <section className="flex flex-col items-center gap-6 p-8 md:p-12 bg-black/10 backdrop-blur-sm  rounded-3xl mb-6 relative overflow-hidden group animate-in slide-in-from-top-12 duration-1000">
                {/* Background Glows */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>

                {true && (
                  <div className="w-full relative z-10 scale-105">
                    <Header
                      user={user}
                      currentScreen={screen as any}
                      setScreen={setScreen as any}
                      hasAnalysis={!!currentPlaylist}
                      onUpdateProfile={handleUpdateProfile}
                      onLogout={() => setShowLogoutConfirm(true)}
                      onUpgrade={handleUpgrade}
                    />
                  </div>
                )}

                {/* Command Pod Info */}
                <div className="flex flex-col items-center gap-6 w-full relative z-10 mt-4">

                  {/* Status Indicator */}
                  <div className="flex items-center gap-4 py-1.5 px-4 rounded-full bg-white/5 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Ready to Play</span>
                  </div>

                  {/* Actions Row - High Energy Cluster */}
                  <div className="flex items-center justify-center gap-6 mt-2">
                    {/* Main Execute (Play) Button */}
                    <button
                      onClick={() => history.length > 0 && handlePlayFromHistory(history[0])}
                      className="group relative w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      <svg className="w-8 h-8 ml-1 fill-current relative z-10" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </button>

                    <div className="flex gap-4">
                      {/* Shuffle Button */}
                      <button
                        onClick={() => {
                          setShowShuffleDropdown(true);
                          setShowCurrencyDropdown(false);
                          setShowAddDropdown(false);
                        }}
                        className={`w-14 h-14 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 border ${showShuffleDropdown ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white'}`}
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
                        <span className="text-[7px] font-black uppercase tracking-widest">Shuffle</span>
                      </button>

                      {/* Wallet Button */}
                      <button
                        onClick={() => {
                          setShowCurrencyDropdown(true);
                          setShowShuffleDropdown(false);
                          setShowAddDropdown(false);
                        }}
                        className={`w-14 h-14 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 border ${showCurrencyDropdown ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white'}`}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="text-[7px] font-black uppercase tracking-widest">Wallet</span>
                      </button>

                      {/* Add Button */}
                      <button
                        onClick={() => {
                          setShowAddDropdown(true);
                          setShowCurrencyDropdown(false);
                          setShowShuffleDropdown(false);
                        }}
                        className={`w-14 h-14 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 border ${showAddDropdown ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white'}`}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[7px] font-black uppercase tracking-widest">Add Song</span>
                      </button>
                    </div>

                    {/* Hidden File Input Logic */}
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

                  {/* Search Pod - Integrated */}
                  <div className="w-full max-w-sm relative group mt-2">
                    <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white transition-colors pointer-events-none">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                      <input
                        type="text"
                        placeholder={`Search Library...Good Times`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-xs font-black text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all uppercase tracking-[0.2em]"
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
          <p className="text-[10px] text-blue font-black uppercase tracking-[0.5em]">Gavena</p>
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
          className="fixed inset-0 z-[9999] bg-[#0a0a1a]/95 backdrop-blur-3xl animate-in fade-in duration-500"
          onClick={() => setShowCurrencyDropdown(false)}
        >
          <div
            className="w-full h-full flex flex-col animate-in slide-in-from-bottom-8 duration-500 ease-out"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Wallet</h2>
              <button
                onClick={() => setShowCurrencyDropdown(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8">
              <div className="max-w-md mx-auto">
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
              </div>
            </div>

            {/* Bottom Close */}
            <div className="shrink-0 flex justify-center px-6 py-5 border-t border-white/5">
              <button
                onClick={() => setShowCurrencyDropdown(false)}
                className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-full hover:scale-105 active:scale-95 transition-all tracking-[0.2em]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Music Modal Popup */}
      {showAddDropdown && screen !== 'game' && (
        <div
          className="fixed inset-0 z-[9999] bg-[#0a0a1a]/95 backdrop-blur-3xl animate-in fade-in duration-500"
          onClick={() => setShowAddDropdown(false)}
        >
          <div
            className="w-full h-full flex flex-col animate-in slide-in-from-bottom-8 duration-500 ease-out"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Add Music</h2>
              <button
                onClick={() => setShowAddDropdown(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8">
              <div className="max-w-md mx-auto space-y-4">
                <button
                  onClick={() => {
                    document.getElementById('hidden-file-input')?.click();
                    setShowAddDropdown(false);
                  }}
                  className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-left group border border-white/10"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white uppercase tracking-wider">Local Device</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Upload from your storage</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                </button>

                <div className="p-6 opacity-30 cursor-not-allowed flex items-center justify-between bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white uppercase tracking-wider">Online Stream</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cloud sync (Coming Soon)</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-500/20 flex items-center justify-center text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Close */}
            <div className="shrink-0 flex justify-center px-6 py-5 border-t border-white/5">
              <button
                onClick={() => setShowAddDropdown(false)}
                className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-full hover:scale-105 active:scale-95 transition-all tracking-[0.2em]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shuffle Modes Modal Popup */}
      {showShuffleDropdown && screen !== 'game' && (
        <div
          className="fixed inset-0 z-[9999] bg-[#0a0a1a]/95 backdrop-blur-3xl animate-in fade-in duration-500"
          onClick={() => setShowShuffleDropdown(false)}
        >
          <div
            className="w-full h-full flex flex-col animate-in slide-in-from-bottom-8 duration-500 ease-out"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Play Modes</h2>
              <button
                onClick={() => setShowShuffleDropdown(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8">
              <div className="max-w-md mx-auto space-y-4">
                <button
                  onClick={() => {
                    if (history.length > 0) {
                      const random = history[Math.floor(Math.random() * history.length)];
                      handlePlayFromHistory(random, 'classic');
                    }
                    setShowShuffleDropdown(false);
                  }}
                  className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white uppercase tracking-wider">Classic Mode</span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Play a random song</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    if (history.length > 0) {
                      const random = history[Math.floor(Math.random() * history.length)];
                      handlePlayFromHistory(random, 'viberush');
                    }
                    setShowShuffleDropdown(false);
                  }}
                  className="w-full flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4V1l8 5-8 5V8c-3.31 0-6 2.69-6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l-8-5 8-5v3z" /></svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white uppercase tracking-wider">Vibe Rush</span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Survival challenge</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Bottom Close */}
            <div className="shrink-0 flex justify-center px-6 py-5 border-t border-white/5">
              <button
                onClick={() => setShowShuffleDropdown(false)}
                className="px-10 py-4 bg-white text-black font-black uppercase text-xs rounded-full hover:scale-105 active:scale-95 transition-all tracking-[0.2em]"
              >
                Close
              </button>
            </div>
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

      {/* Purchase Feedback Popup */}
      {purchaseFeedback && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setPurchaseFeedback(null)}
        >
          <div
            className="w-full max-w-xs bg-[#0a0a1a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 slide-in-from-top-8 duration-500 ease-out"
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${purchaseFeedback.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
              {purchaseFeedback.type === 'success' ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            {/* Text */}
            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">{purchaseFeedback.title}</h3>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{purchaseFeedback.message}</p>

            {/* Dismiss */}
            <button
              onClick={() => setPurchaseFeedback(null)}
              className="mt-6 px-8 py-3 bg-white text-black font-black uppercase text-xs rounded-full hover:scale-105 active:scale-95 transition-all tracking-[0.2em]"
            >
              OK
            </button>
          </div>
        </div>
      )}

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
