
import React, { useState, useEffect, useRef } from 'react';
import type { Level } from './types';
import { Header } from './components/Header';
import { BeatGame } from './components/BeatGame';
import { HistoryList } from './components/HistoryList';
import { Settings } from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { CurrencyBar } from './components/CurrencyBar';
import { BottomNav } from './components/BottomNav';
import { BottomPlayer } from './components/BottomPlayer';
import { ExchangeSuccessModal } from './components/ExchangeSuccessModal';
import { ResourceShopModal } from './components/ResourceShopModal';
import { InsufficientFundsModal } from './components/InsufficientFundsModal';
import type { AudioAnalysis, UserStats } from './types';
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

const App: React.FC = () => {
  const [currentPlaylist, setCurrentPlaylist] = useState<AudioAnalysis[] | null>(null);
  const [history, setHistory] = useState<AudioAnalysis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Initializing');
  const [screen, setScreen] = useState<'landing' | 'collection' | 'game' | 'settings' | 'help'>('landing');

  // Global Audio Player State
  const [activeAudioTrack, setActiveAudioTrack] = useState<AudioAnalysis | null>(null);
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0
  });
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

      const newAnalysis: AudioAnalysis = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileSize: file.size,
        timestamp: Date.now(),
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
        duration: audioBuffer.duration
      };

      // Save to IndexedDB
      await storageService.saveTrack(newAnalysis, file);

      setCurrentPlaylist([newAnalysis]);
      setHistory(prev => [newAnalysis, ...prev]);
      setScreen('game');
    } catch (error) {
      console.error(error);
      alert("Signal disruption. File could not be mapped.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayFromHistory = (item: AudioAnalysis) => {
    // With IndexedDB, fileUrl is regenerated and valid
    if (!item.fileUrl) return alert("Error loading track. Please re-upload.");
    setCurrentPlaylist([item]);
    setScreen('game');
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


  // Sync active track source
  useEffect(() => {
    if (activeAudioTrack && globalAudioRef.current) {
      // Only change src if it's different to avoid reload
      const currentSrc = globalAudioRef.current.src;
      // Check if src needs update (handling blob vs object URL format)
      if (!currentSrc.includes(activeAudioTrack.id) && activeAudioTrack.fileUrl && activeAudioTrack.fileUrl !== currentSrc) {
        globalAudioRef.current.src = activeAudioTrack.fileUrl;
        globalAudioRef.current.play().catch(e => console.error("Auto-play failed", e));
      }
    }
  }, [activeAudioTrack]);

  // Pause global audio when entering game
  useEffect(() => {
    if (screen === 'game' && globalAudioRef.current && !globalAudioRef.current.paused) {
      globalAudioRef.current.pause();
    }
  }, [screen]);


  const handleGlobalPlayPause = () => {
    if (!globalAudioRef.current) return;
    if (globalAudioRef.current.paused) {
      if (!activeAudioTrack && history.length > 0) {
        // Init with first track if nothing active
        setActiveAudioTrack(history[0]);
      } else {
        globalAudioRef.current.play();
      }
    } else {
      globalAudioRef.current.pause();
    }
  };

  const handleGlobalSeek = (time: number) => {
    if (globalAudioRef.current) {
      globalAudioRef.current.currentTime = time;
    }
  };

  const activeTrackForPlayer = activeAudioTrack || (history.length > 0 ? history[0] : null);

  if (screen === 'landing') {
    return <>
      <LandingPage onEnter={handleLandingComplete} />
    </>;
  }

  return (
    <div className="h-screen w-screen bg-[#121212] bg-gradient-to-b from-[#121212] to-black text-slate-100 flex flex-col overflow-hidden">
      {screen !== 'game' && (
        <Header
          user={user}
          currentScreen={screen as any}
          setScreen={setScreen as any}
          hasAnalysis={!!currentPlaylist}
          onExchange={handleExchangeCurrency}
          onShowShop={() => setShowResourceMenu(true)}
          hearts={hearts}
          shields={shields}
        />
      )}

      {/* Global Audio Element */}
      <audio
        ref={globalAudioRef}
        onPlay={() => setAudioState(prev => ({ ...prev, isPlaying: true }))}
        onPause={() => setAudioState(prev => ({ ...prev, isPlaying: false }))}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          setAudioState(prev => ({
            ...prev,
            currentTime: audio.currentTime,
            progress: audio.duration ? audio.currentTime / audio.duration : 0,
            duration: audio.duration || 0,
          }));
        }}
        onLoadedMetadata={(e) => {
          const audio = e.currentTarget;
          setAudioState(prev => ({
            ...prev,
            duration: audio.duration || 0,
          }));
        }}
        onEnded={() => setAudioState(prev => ({ ...prev, isPlaying: false, progress: 0, currentTime: 0 }))}
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
            <p className="text-slate-500 text-xs mt-2 font-bold tracking-widest">CORE_SYNC_V2 ENGINE PROCESSING</p>
          </div>
        )}

        {screen === 'collection' && (
          <div className="h-full container mx-auto px-4 py-8 overflow-y-auto no-scrollbar relative">
            <div className="max-w-5xl mx-auto space-y-8 relative z-10">
              {/* Hero Section */}
              <section className="flex flex-col md:flex-row gap-8 items-end p-6 bg-gradient-to-b from-transparent to-black/20 rounded-3xl">
                {/* Hero Art */}
                <div className="w-full md:w-56 md:h-56 aspect-square shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden relative group">
                  {history.length > 0 && history[0].coverArt ? (
                    <img src={history[0].coverArt} alt="Hero Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <span className="text-4xl">🎵</span>
                    </div>
                  )}
                </div>

                {/* Hero Info */}
                <div className="flex flex-col gap-4 w-full overflow-hidden">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60">Last Played</span>
                  <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white drop-shadow-xl truncate leading-none">
                    {history.length > 0 ? history[0].fileName.replace(/\.[^/.]+$/, "") : "No History"}
                  </h1>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-white/80">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                        <span className="text-[10px]">👤</span>
                      </div>
                      <span>{user.username || "Player"}</span>
                    </div>
                    <span className="text-white/20">•</span>
                    <span>Lv. {user.level}</span>
                    <span className="text-white/20">•</span>
                    <span>{user.songsPlayed || 0} Songs Played</span>
                    <span className="text-white/20">•</span>
                    <span className="text-yellow-400">{user.perfects || 0} Gold</span>
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
                          handlePlayFromHistory(random); // Note: Game component handles mode if we want endless explicitly we might need to pass a prop or just let user switch. 
                          // User asked for "Shuffle to start playing any random song (start playing game)"
                          // Actually, simply picking a random song and starting is good enough.
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
                        onClick={() => document.getElementById('hidden-file-input')?.click()}
                        className="w-8 h-8 rounded-full border-2 border-slate-500 text-slate-500 flex items-center justify-center hover:border-white hover:text-white transition-all"
                        title="Add Songs"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                      {/* Hidden File Input Logic from FileUploader */}
                      <input
                        id="hidden-file-input"
                        type="file"
                        accept=".mp3,.wav"
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
                </div>
              </section>

              {/* Currency Bar */}
              <div className="px-4 pb-2">
                <CurrencyBar
                  user={user}
                  hearts={hearts}
                  shields={shields}
                  onExchange={handleExchangeCurrency}
                  onShowShop={() => setShowResourceMenu(true)}
                  compact={false}
                />
              </div>

              {/* History List Header */}
              <div className="flex items-center justify-between px-4 pt-2 sticky top-0 z-10 py-2">
                <h2 className="text-lg font-black italic text-white uppercase tracking-tighter">Your Tracks</h2>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-right text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none w-24 focus:w-40 transition-all"
                  />
                  <div className="absolute right-0 bottom-0 h-px w-full bg-white/10 group-focus-within:bg-white/50 transition-colors"></div>
                </div>
              </div>

              {/* History List at bottom */}
              <div className="px-2 pb-16">
                <HistoryList
                  history={searchQuery ? history.filter(track =>
                    track.fileName.toLowerCase().includes(searchQuery.toLowerCase())
                  ) : history}
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
              onLogout={handleLogout}
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
              userLevel={user.level}
              currentExp={user.exp}
            />
          )
        }
      </main >

      {/* Persistent Bottom Player */}
      {screen !== 'game' && activeTrackForPlayer && (
        <BottomPlayer
          currentSong={activeTrackForPlayer}
          isPlaying={audioState.isPlaying}
          onPlayPause={handleGlobalPlayPause}
          progress={audioState.progress}
          currentTime={audioState.currentTime}
          duration={audioState.duration || (activeAudioTrack ? 0 : 180)}
          onSeek={handleGlobalSeek}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {
        screen !== 'game' && (
          <BottomNav currentScreen={screen as any} setScreen={setScreen as any} />
        )
      }

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
    </div>
  );
};

export default App;
