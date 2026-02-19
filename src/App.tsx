
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
import type { AudioAnalysis, UserStats, GameMode, YouTubeResult } from './types';
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
  EXP: 'music_tiles_fever_exp'
};

const MAX_HEARTS = 10;

const INVIDIOUS_INSTANCES = [
  'iv.ggtyler.dev',
  'yewtu.be',
  'inv.nadeko.net',
  'invidious.nerdvpn.de',
  'invidious.privacyredirect.com'
];

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
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">
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

const App: React.FC = () => {
  const [currentPlaylist, setCurrentPlaylist] = useState<AudioAnalysis[] | null>(null);
  const [history, setHistory] = useState<AudioAnalysis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Initializing');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [screen, setScreen] = useState<'landing' | 'collection' | 'game' | 'settings' | 'help' | 'search'>('landing');
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');

  const [onlineResults, setOnlineResults] = useState<YouTubeResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchInput, setOnlineSearchInput] = useState('');

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

  // Auto-Shop Trigger: Show shop when resources are critically low
  useEffect(() => {
    if (hearts < 3 && shields < 3 && !showResourceMenu) {
      setShowResourceMenu(true);
    }
  }, [hearts, shields, showResourceMenu]);

  const audioContextRef = useRef<AudioContext | null>(null);

  // ... (existing imports)

  // ... (existing imports)

  useEffect(() => {
    const checkSetup = () => {
      const isComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE);
      if (isComplete === 'true' && user.username) {
        setScreen('collection');
      }
    };

    const loadHistory = async () => {
      try {
        const tracks = await storageService.getAllTracks();
        if (tracks.length > 0) {
          setHistory(tracks);
          if (!currentPlaylist) setCurrentPlaylist([tracks[0]]); // Set initial playlist if empty
        }
      } catch (e) {
        console.error("Failed to load history from DB", e);
      }
    };

    checkSetup();
    loadHistory();
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

  // YouTube Search Logic (Invidious API)
  useEffect(() => {
    if (!onlineSearchInput.trim()) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);

      let success = false;
      for (const instance of INVIDIOUS_INSTANCES) {
        if (success) break;
        try {
          const response = await fetch(`https://${instance}/api/v1/search?q=${encodeURIComponent(onlineSearchInput)}&type=video`);
          if (!response.ok) continue;

          const data = await response.json();
          if (Array.isArray(data)) {
            setOnlineResults(data.filter(item => item.type === 'video').map(item => ({
              videoId: item.videoId,
              title: item.title,
              author: item.author,
              duration: item.lengthSeconds,
              videoThumbnails: item.videoThumbnails
            })));
            success = true;
          }
        } catch (error) {
          console.warn(`Search failed on ${instance}:`, error);
        }
      }

      if (!success) {
        console.error("All search instances failed.");
        setOnlineResults([]);
      }
      setIsSearchingOnline(false);
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [onlineSearchInput]);

  const analyzeAudioBuffer = async (audioBuffer: AudioBuffer) => {
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

    return { waveform, beats };
  };

  const handleOnlineTrackSelect = async (result: YouTubeResult) => {
    if ((user.stars || 0) < 10) {
      setInsufficientFunds({ isOpen: true, currency: 'stars', required: 10 });
      return;
    }

    setUser(prev => ({ ...prev, stars: (prev.stars || 0) - 10 }));
    setIsAnalyzing(true);
    setAnalysisStep('Syncing Cloud');

    let arrayBuffer: ArrayBuffer | null = null;
    let success = false;
    let audioUrl = '';

    for (const instance of INVIDIOUS_INSTANCES) {
      if (success) break;
      try {
        audioUrl = `https://${instance}/latest_version?id=${result.videoId}&itag=140`;
        const response = await fetch(audioUrl);
        if (!response.ok) continue;

        arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 1000) { // Basic check for valid data
          success = true;
        }
      } catch (error) {
        console.warn(`Sync failed on ${instance}:`, error);
      }
    }

    if (!success || !arrayBuffer) {
      alert("All cloud signals lost. This track might be restricted or all servers are busy. Please try another one.");
      setUser(prev => ({ ...prev, stars: (prev.stars || 0) + 10 }));
      setIsAnalyzing(false);
      return;
    }

    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;

      setAnalysisStep('Decoding');
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const { waveform, beats } = await analyzeAudioBuffer(audioBuffer);

      setAnalysisStep('Finalizing');
      const localResult = analyzeLocally(beats, result.title);

      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });

      const newAnalysis: AudioAnalysis = {
        id: crypto.randomUUID(),
        fileName: result.title,
        fileSize: arrayBuffer.byteLength,
        timestamp: Date.now(),
        waveform,
        beats,
        fileUrl: URL.createObjectURL(blob),
        bpm: localResult.bpm || 120,
        key: localResult.key || "C",
        genre: localResult.genre || "Electronic",
        mood: localResult.mood || "Neutral",
        summary: localResult.summary || "Cloud sync ready.",
        highlights: localResult.highlights || [],
        coverArt: result.videoThumbnails.find((t: any) => t.quality === 'medium')?.url || result.videoThumbnails[0]?.url,
        duration: audioBuffer.duration,
        source: 'online'
      };

      await storageService.saveTrack(newAnalysis, blob);
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
      alert("Cloud signal lost. Please try another track.");
      setUser(prev => ({ ...prev, stars: (prev.stars || 0) + 10 }));
    } finally {
      setIsAnalyzing(false);
    }
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

      const { waveform, beats } = await analyzeAudioBuffer(audioBuffer);

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

    setHearts(prev => Math.min(MAX_HEARTS, prev + sessionHearts + 1));
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





  if (screen === 'landing') {
    return <>
      <LandingPage onEnter={handleLandingComplete} />
    </>;
  }

  return (
    <div className="h-screen w-screen bg-[#0f172a] bg-gradient-to-b from-black/60 via-[#1e1b4b] to-[#0f172a] text-slate-50 flex flex-col overflow-hidden">
      {screen !== 'game' && (
        <Header
          user={user}
          currentScreen={screen as any}
          setScreen={setScreen as any}
          hasAnalysis={!!currentPlaylist}
        />
      )}

      {/* Global Audio Element */}
      <audio
        ref={globalAudioRef}
      />

      <main className="flex-1 overflow-hidden relative">
        {isAnalyzing && (
          <div className="fixed inset-0 bg-[#0a0a0a] z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Waveform Loading Animation */}
            <div className="flex items-center gap-1 h-32 mb-8">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-white rounded-full animate-loading-wave"
                  style={{
                    height: '20%',
                    animationDelay: `${i * 0.1}s`,
                    boxShadow: '0 0 10px rgba(255,255,255,0.5)'
                  }}
                ></div>
              ))}
            </div>
            <h3 className="text-4xl font-black italic text-white uppercase tracking-widest animate-pulse">{analysisStep}</h3>
            <p className="text-slate-500 text-xs mt-2 font-bold tracking-widest">GAV3NA ENGINE PROCESSING</p>
          </div>
        )}

        {screen === 'collection' && (
          <div className="h-full container mx-auto p-2 overflow-y-auto no-scrollbar relative">
            <div className="max-w-5xl mx-auto space-y-0 relative z-10">
              {/* Hero Section */}
              <section className="flex items-center gap-6 p-4 md:p-6 bg-black/10 rounded-3xl mb-8">


                {/* Hero Info */}
                <div className="flex flex-col gap-4 w-full overflow-hidden mt-2">
                  {history.length > 0 && (
                    <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white drop-shadow-xl truncate leading-none">
                      {history[0].fileName.replace(/\.[^/.]+$/, "")}
                    </h1>
                  )}


                  {/* Metadata Row */}
                  <div className="flex items-center gap-2 text-sm font-bold text-white/80 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-1.5 min-w-0 shrink">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 shrink-0">
                        <span className="text-[10px]">👤</span>
                      </div>
                      <span className="truncate">{user.username || "Player"}</span>
                    </div>
                    <span className="text-white/20">•</span>
                    <span>Lv. {user.level}</span>
                    <span className="text-white/20">•</span>
                    <span>{user.songsPlayed || 0} Songs Played</span>
                    <span className="text-white/20">•</span>
                  </div>

                  {/* Currency Bar */}
                  <div className=" px-0 pb-2 pt-2">
                    <CurrencyBar
                      user={user}
                      hearts={hearts}
                      shields={shields}
                      onExchange={handleExchangeCurrency}
                      onShowShop={() => setShowResourceMenu(true)}
                      compact={false}
                    />
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-4 mt-2">
                    {/* Play Button */}
                    <button
                      onClick={() => history.length > 0 && handlePlayFromHistory(history[0])}
                      className="w-14 h-14 rounded-full bg-green-500 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                    >
                      <svg className="w-6 h-6 ml-0.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </button>

                    {/* Shuffle Button (Start Game Endless/Random) */}
                    <button
                      onClick={() => {
                        if (history.length > 0) {
                          // Pick random song
                          const random = history[Math.floor(Math.random() * history.length)];
                          handlePlayFromHistory(random, 'endless');
                        }
                      }}
                      className="p-3 rounded-full text-slate-400 hover:text-white transition-colors"
                      title="Shuffle Play"
                    >
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
                    </button>

                    {/* Add Song Button (+ input) */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (activeTab === 'online') {
                            setScreen('search');
                          } else {
                            document.getElementById('hidden-file-input')?.click();
                          }
                        }}
                        className="w-8 h-8 rounded-full border-2 border-slate-500 text-slate-500 flex items-center justify-center hover:border-white hover:text-white transition-all"
                        title={activeTab === 'online' ? "Search Online" : "Add Songs"}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
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

                    {/* Settings Menu Button */}
                    <button
                      onClick={() => setScreen('settings')}
                      className="p-3 text-slate-400 hover:text-white transition-colors"
                    >
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                    </button>
                  </div>

                  {/* Hierarchy Tabs */}
                  <div className="flex items-center gap-6 mt-6 px-1  pb-2">
                    <button
                      onClick={() => setActiveTab('local')}
                      className={`text-xs font-black uppercase tracking-widest transition-all relative pb-2 ${activeTab === 'local' ? 'text-white' : 'text-slate-500 hover:text-white/60'}`}
                    >
                      Local
                      {activeTab === 'local' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 rounded-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('online')}
                      className={`text-xs font-black uppercase tracking-widest transition-all relative pb-2 ${activeTab === 'online' ? 'text-white' : 'text-slate-500 hover:text-white/60'}`}
                    >
                      Online
                      {activeTab === 'online' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 rounded-full" />
                      )}
                    </button>

                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-right text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none w-24 focus:w-40 transition-all rounded-2xl bg-white/10 p-2"
                      />
                    </div>
                  </div>

                </div>
              </section>



              {/* History List Header */}


              {/* History List at bottom */}
              <div className="px-0 pb-16">
                <HistoryList
                  history={history.filter(track => {
                    const matchesSearch = track.fileName.toLowerCase().includes(searchQuery.toLowerCase());
                    const trackSource = track.source || 'local'; // Default to 'local' for legacy tracks
                    return matchesSearch && trackSource === activeTab;
                  })}
                  onSelect={handlePlayFromHistory}
                  onDelete={handleDeleteTrack}
                />
              </div>
            </div>
          </div >
        )}

        {screen === 'search' && (
          <div className="h-full container mx-auto p-6 overflow-y-auto no-scrollbar relative animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setScreen('collection')}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Search Online</h2>
              </div>

              {/* Search Bar */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <svg className={`w-5 h-5 ${isSearchingOnline ? 'text-green-500 animate-pulse' : 'text-slate-500'} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search YouTube..."
                  value={onlineSearchInput}
                  onChange={(e) => setOnlineSearchInput(e.target.value)}
                  className="w-full bg-[#1e1b4b]/40 backdrop-blur-md border border-white/5 py-6 pl-16 pr-8 text-xl font-black text-white italic rounded-3xl outline-none focus:border-green-500/50 transition-all shadow-2xl"
                  autoFocus
                />
              </div>

              {/* Results List */}
              <div className="space-y-2 pb-12">
                {isSearchingOnline && onlineResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">Connecting to GAV3NA Cloud...</p>
                  </div>
                )}

                {!isSearchingOnline && onlineSearchInput && onlineResults.length === 0 && (
                  <div className="text-center py-20">
                    <p className="text-xs font-bold text-slate-500 uppercase">No signals found for "{onlineSearchInput}"</p>
                  </div>
                )}

                {onlineResults.map((result) => (
                  <button
                    key={result.videoId}
                    className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group text-left"
                    onClick={() => {
                      handleOnlineTrackSelect(result);
                    }}
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 relative">
                      <img
                        src={result.videoThumbnails.find((t: any) => t.quality === 'medium')?.url || result.videoThumbnails[0]?.url}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt=""
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate leading-tight mb-1">{result.title}</h4>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{result.author}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                        {Math.floor(result.duration / 60)}:{Math.floor(result.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </button>
                ))}

                {!onlineSearchInput && (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mb-6 border border-green-500/20">
                      <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-black italic text-white uppercase mb-2">GAV3NA Cloud Browser</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Enter parameters to sync online audio</p>
                  </div>
                )}
              </div>
            </div>
          </div>
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




      <ExchangeSuccessModal
        isOpen={showExchangeSuccess}
        onClose={() => setShowExchangeSuccess(false)}
        starsGained={exchangeInfo.gained}
        cost={exchangeInfo.cost}
      />
      <ResourceShopModal
        isOpen={showResourceMenu}
        onClose={() => setShowResourceMenu(false)}
        user={user}
        onBuyShields={handleBuyShields}
        onWatchAd={handleWatchAd}
      />

      {insufficientFunds && (
        <InsufficientFundsModal
          isOpen={insufficientFunds.isOpen}
          onClose={() => setInsufficientFunds(null)}
          currentBalance={insufficientFunds.currency === 'gold' ? (user.perfects || 0) : (user.stars || 0)}
          requiredAmount={insufficientFunds.required}
          currency={insufficientFunds.currency}
        />
      )}

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
      />
    </div>
  );
};

export default App;
