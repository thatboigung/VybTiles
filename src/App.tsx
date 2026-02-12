
import React, { useState, useEffect, useRef } from 'react';
import type { Level } from './types';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { BeatGame } from './components/BeatGame';
import { HistoryList } from './components/HistoryList';
import { Settings } from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { BottomNav } from './components/BottomNav';
import { ExchangeSuccessModal } from './components/ExchangeSuccessModal';
import { ResourceShopModal } from './components/ResourceShopModal';
import { InsufficientFundsModal } from './components/InsufficientFundsModal';
import { Analytics } from './components/Analytics';
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

const App: React.FC = () => {
  const [currentPlaylist, setCurrentPlaylist] = useState<AudioAnalysis[] | null>(null);
  const [history, setHistory] = useState<AudioAnalysis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Initializing');
  const [screen, setScreen] = useState<'landing' | 'collection' | 'game' | 'settings' | 'help'>('landing');

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

    // Award stars based on difficulty
    const starsEarned = difficulty === 'hard' ? 6 : difficulty === 'medium' ? 3 : 2;

    // Calculate EXP based on perfects
    const earnedExp = sessionPerfects * 10;

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
          onExchange={handleExchangeCurrency}
          onShowShop={() => setShowResourceMenu(true)}
          hearts={hearts}
          shields={shields}
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
            <div className="max-w-5xl mx-auto space-y-8">
              <section className="relative">
                {/* Analytics at top */}
                <Analytics user={user} />

                {/* FileUploader in middle - full width */}
                <div className="w-full">
                  <FileUploader
                    onUpload={handleFileUpload}
                    isAnalyzing={isAnalyzing}
                    userPerfects={user.perfects || 0}
                    userStars={user.stars || 0}
                    onDeductCurrency={(p, s) => setUser(prev => ({
                      ...prev,
                      perfects: Math.max(0, (prev.perfects || 0) - p),
                      stars: Math.max(0, (prev.stars || 0) - s)
                    }))}
                    onSearchChange={setSearchQuery}
                  />
                </div>

                {/* History List at bottom */}
                <HistoryList
                  history={searchQuery ? history.filter(track =>
                    track.fileName.toLowerCase().includes(searchQuery.toLowerCase())
                  ) : history}
                  onSelect={handlePlayFromHistory}
                  onDelete={handleDeleteTrack}
                />
              </section>
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
