
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { BeatGame } from './components/BeatGame';
import { HistoryList } from './components/HistoryList';
import { Settings } from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { BottomNav } from './components/BottomNav';
import type { AudioAnalysis, UserStats } from './types';
import { analyzeLocally } from './services/geminiService';
import { storageService } from './services/storageService';

const STORAGE_KEYS = {
  HISTORY: 'music_tiles_fever_history',
  SETUP_COMPLETE: 'music_tiles_fever_setup_complete',
  HEARTS: 'music_tiles_fever_hearts',
  SHIELDS: 'music_tiles_fever_shields',
  USER: 'music_tiles_fever_user',
  EXP: 'music_tiles_fever_exp'
};

const MAX_HEARTS = 10;
const REGEN_TIME = 70;

const App: React.FC = () => {
  const [currentPlaylist, setCurrentPlaylist] = useState<AudioAnalysis[] | null>(null);
  const [history, setHistory] = useState<AudioAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Initializing');
  const [screen, setScreen] = useState<'landing' | 'collection' | 'game' | 'settings'>('landing');

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
      isPro: false
    };
  });

  const [hearts, setHearts] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HEARTS);
    return saved !== null ? Number(saved) : 5;
  });
  const [shields, setShields] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHIELDS);
    return saved !== null ? Number(saved) : 5;
  });
  const [timeToNextHeart, setTimeToNextHeart] = useState<number>(REGEN_TIME);
  const [showResourceMenu, setShowResourceMenu] = useState(false);

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

  useEffect(() => {
    const timer = setInterval(() => {
      if (hearts < MAX_HEARTS) {
        setTimeToNextHeart(prev => {
          if (prev <= 1) {
            setHearts(h => Math.min(MAX_HEARTS, h + 1));
            return REGEN_TIME;
          }
          return prev - 1;
        });
      } else {
        setTimeToNextHeart(REGEN_TIME);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [hearts]);

  const handleLandingComplete = (username: string) => {
    setUser(prev => ({ ...prev, username }));
    localStorage.setItem(STORAGE_KEYS.SETUP_COMPLETE, 'true');
    setScreen('collection');
  };

  const handleFileUpload = async (file: File) => {
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
        highlights: localResult.highlights || []
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

  const startEndlessMode = () => {
    const validTracks = history.filter(track => track.fileUrl);
    if (validTracks.length < 1) {
      alert("Requires at least 1 active track in history. Re-upload tracks to populate local buffer.");
      return;
    }
    const shuffled = [...validTracks].sort(() => Math.random() - 0.5);
    setCurrentPlaylist(shuffled);
    setScreen('game');
  };

  const handleGameFinish = (earnedExp: number, sessionHearts: number, sessionShields: number) => {
    setUser(prev => {
      const newExp = prev.exp + earnedExp;
      return {
        ...prev,
        exp: newExp,
        level: Math.floor(newExp / 1000) + 1,
        songsPlayed: (prev.songsPlayed || 0) + 1,
        playtime: (prev.playtime || 0) + 180 // Approx 3 mins per song
      };
    });
    // Add collected hearts and shields to global currency
    setHearts(prev => Math.min(MAX_HEARTS, prev + sessionHearts + 1));
    setShields(prev => prev + sessionShields);
  };

  const handleUseCurrency = (h: number, s: number) => {
    setHearts(prev => Math.max(0, prev - h));
    setShields(prev => Math.max(0, prev - s));
  };

  const handleUpdateProfile = (newUsername: string) => {
    setUser(prev => ({ ...prev, username: newUsername }));
  };

  const handleUpgrade = () => {
    setUser(prev => ({ ...prev, isPro: true }));
    alert("Welcome to Pro! Ads removed (simulated).");
  };

  const handleLogout = async () => {
    // Clear Local Storage
    localStorage.clear();
    // Clear IndexedDB
    try {
      // We'd ideally have a clear method in storageService, but deleting DB is also an option.
      // For now, we'll just reload which clears transient state, 
      // effectively logging out since we clear localStorage keys.
    } catch (e) {
      console.error("Logout error", e);
    }
    // Hard reload to reset everything
    window.location.reload();
  };


  if (screen === 'landing') {
    return <>
      <LandingPage onEnter={handleLandingComplete} />
    </>;
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-slate-100 flex flex-col overflow-hidden">
      {screen !== 'game' && (
        <Header
          user={user}
          currentScreen={screen as any}
          setScreen={setScreen as any}
          hasAnalysis={!!currentPlaylist}
        />
      )}

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
            <div className="max-w-5xl mx-auto space-y-12">
              <section className="relative">
                {/* Resource Bar & Shop */}
                <div className="relative z-20 mb-8">
                  <button
                    onClick={() => setShowResourceMenu(!showResourceMenu)}
                    className="w-full p-4 flex justify-center items-center  transition-all active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                        <span className="text-red-500 text-xl">❤️</span>
                        <div className="flex flex-col items-start">
                          <span className="text-white font-black italic text-lg leading-none">{hearts}</span>
                          {hearts < MAX_HEARTS && (
                            <span className="text-[10px] text-slate-500 font-bold tabular-nums">+{timeToNextHeart}s</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                        <span className="text-blue-500 text-xl">🛡️</span>
                        <div className="flex flex-col items-start">
                          <span className="text-white font-black italic text-lg leading-none">{shields}</span>
                          <span className="text-[10px] text-slate-500 font-bold">SHIELDS</span>
                        </div>
                      </div>
                    </div>

                  </button>

                  <div className={`absolute right-0 top-full mt-2 w-full sm:w-72 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 transition-all duration-200 origin-top-right overflow-hidden ${showResourceMenu ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'}`}>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 py-2">Quick Refill</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => { setHearts(h => Math.min(MAX_HEARTS, h + 5)); setShowResourceMenu(false); }}
                        className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group/item transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">❤️</div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-sm">+5 Hearts</span>
                            <span className="text-xs text-slate-500">Watch Ad</span>
                          </div>
                        </div>
                        <span className="text-green-400 text-xs font-black group-hover/item:translate-x-1 transition-transform">FREE</span>
                      </button>

                      <button
                        onClick={() => { setShields(s => s + 3); setShowResourceMenu(false); }}
                        className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group/item transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">🛡️</div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-sm">+3 Shields</span>
                            <span className="text-xs text-slate-500">250 EXP</span>
                          </div>
                        </div>
                        <span className="text-white/40 text-xs font-black group-hover/item:text-white transition-colors">BUY</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                  <div>
                    <h2 className="text-4xl font-black flex items-center gap-4 italic uppercase tracking-tighter text-white">
                      Vyb Tiles
                    </h2>
                    <p className="text-slate-500 text-sm mt-2">Deploy signals , Tap and Play.</p>
                  </div>

                  {history.length > 0 && (
                    <button
                      onClick={startEndlessMode}
                      className="group relative px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black italic uppercase tracking-tighter flex items-center gap-3 transition-all active:scale-95 border-b-4 border-purple-800 hover:border-purple-700 active:border-b-0 active:translate-y-1"
                    >
                      <svg className="w-6 h-6 fill-current animate-pulse" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      Start Endless Run
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-20">
                  <div className="lg:col-span-4 md:flex md:gap-6 lg:block">
                    <div className="flex-1 w-full">
                      <FileUploader onUpload={handleFileUpload} isAnalyzing={isAnalyzing} />
                    </div>
                    <div className="mt-6 p-6 md:mt-0 lg:mt-6 flex-1 w-full">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Neural Buffer Status</h4>
                      <div className="flex justify-between items-end">
                        <span className="text-2xl font-black italic text-white leading-none">{history.filter(t => t.fileUrl).length}</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Active Signals</span>
                      </div>

                    </div>
                  </div>
                  <div className="lg:col-span-8">
                    <HistoryList history={history} onSelect={handlePlayFromHistory} onDelete={handleDeleteTrack} />
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {screen === 'settings' && (
          <Settings
            onBack={() => setScreen('collection')}
            user={user}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
            onUpgrade={handleUpgrade}
          />
        )}

        {screen === 'game' && currentPlaylist && (
          <BeatGame
            playlist={currentPlaylist}
            onExit={() => setScreen('collection')}
            globalHearts={hearts}
            globalShields={shields}
            onUseCurrency={handleUseCurrency}
            onFinish={handleGameFinish}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {screen !== 'game' && (
        <BottomNav currentScreen={screen as any} setScreen={setScreen as any} />
      )}
    </div>
  );
};

export default App;
