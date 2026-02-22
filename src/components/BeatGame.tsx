
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AudioAnalysis, GameMode, Level } from '../types';

const LANES = 4;
const TARGET_Y_RATIO = 0.8;

const BG_PALETTE = [
  '#1e1b4b', // Royal Indigo (Focus Base)
  '#4f46e5', // Electric Indigo (Momentum)
  '#7c3aed', // Deep Violet (Flow State)
  '#c026d3', // Cosmic Magenta (Dopamine Pop)
  '#0891b2', // Cyber Cyan (High Contrast)
  '#111827', // Obsidian (Immersion Depth)
  '#2e1065', // Midnight Purple (Emotional Depth)
  '#ec4899'  // Cyber Pink (Pure Energy)
];

const BG_INTERVALS = [10, 20, 15, 23];
const BG_FADE_DURATION = 3;

function lerpColor(c1: string, c2: string, t: number) {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const TutorialModal: React.FC<{ mode: string; isOpen: boolean; onClose: () => void }> = ({ mode, isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-zinc-950 border border-white/10 p-8 rounded-3xl shadow-2xl">
        <h2 className="text-3xl font-black italic text-white uppercase mb-6 tracking-tighter">Protocol: {mode.toUpperCase()}</h2>
        <div className="space-y-4 text-slate-400 text-sm leading-relaxed mb-8">
          <div className="space-y-3">
            <p className="text-white font-bold text-base underline underline-offset-4">Core Rules:</p>
            <ul className="text-left list-disc list-inside space-y-2">
              <li><span className="text-blue-400 font-bold">TAP</span> tiles anywhere in their lane as they fall.</li>
              <li><span className="text-red-500 font-bold">DON'T</span> tap empty space (penalty).</li>
              <li><span className="text-red-500 font-bold">DON'T</span> let tiles pass (failure).</li>
              <li>Collect ❤️ and 🛡️ to stay in the rhythm.</li>
            </ul>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(`showTutorial_${mode}`, 'false');
            onClose();
          }}
          className="w-full py-4 bg-white text-black font-black uppercase italic rounded-xl hover:scale-105 transition-transform"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

interface BeatGameProps {
  playlist: AudioAnalysis[];
  allSongs?: AudioAnalysis[]; // Full history for endless mode shuffle
  onExit: () => void;
  globalHearts: number;
  globalShields: number;
  userPerfects: number;
  onUseCurrency: (hearts: number, shields: number, gold?: number) => void;
  onFinish: (sessionHearts: number, sessionShields: number, sessionPerfects: number, difficulty: Level, completion: number) => void;
  currentExp: number;
  initialMode?: GameMode;
  onStartPlay?: (track: AudioAnalysis) => void;
}

type PowerUpType = 'shield' | 'life1' | 'life2' | 'none';

interface Note {
  id: string; time: number; lane: number; hit: boolean; missed: boolean;
  type: 'obstacle' | 'powerup' | 'tile'; powerUp: PowerUpType;
  hitTimestamp?: number; // Track when this note was hit
  isMoving?: boolean; // New property for moving tiles
  originalLane?: number; // Store original lane for moving tiles
  isLong?: boolean; // New: Is this a long/held tile
  duration?: number; // New: Duration of the long tile in seconds
  holdProgress?: number; // New: 0 to 1 progress of the hold
  isFullyHeld?: boolean; // New: Did the user hold it to the end
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; color: string; size: number;
}

const StarIcon = ({ active, className }: { active: boolean; className?: string }) => (
  <svg
    className={`transition-all duration-700 ${active ? 'text-yellow-400 scale-125 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-white/10'} ${className}`}
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);

export const BeatGame: React.FC<BeatGameProps> = ({
  playlist, allSongs, onExit, globalHearts, globalShields, userPerfects, onUseCurrency, onFinish, currentExp, initialMode, onStartPlay
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [selectedMode, setSelectedMode] = useState<GameMode>(initialMode || (playlist.length > 1 ? 'endless' : 'classic'));
  const [showTutorial, setShowTutorial] = useState(false);
  // Removed countdown state

  const [selectedLevel] = useState<Level>('medium');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [isGameOver, setIsGameOver] = useState(false);
  const [isCleared, setIsCleared] = useState(false);
  const [isFailing, setIsFailing] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [failedNoteId, setFailedNoteId] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [laneHits, setLaneHits] = useState<number[]>(new Array(LANES).fill(0));
  const [combo, setCombo] = useState(0);
  const [completion, setCompletion] = useState(0);

  const [sessionHearts, setSessionHearts] = useState(0);
  const [sessionShields, setSessionShields] = useState(0);
  const [sessionPerfects, setSessionPerfects] = useState(0);
  const [reviveCount, setReviveCount] = useState(0);
  const [coverArtElement, setCoverArtElement] = useState<HTMLImageElement | null>(null);
  // @ts-ignore - activeLives used in logic but not render currently
  const [activeLives, setActiveLives] = useState(5);
  const [shake, setShake] = useState(0);
  const [playerLane, setPlayerLane] = useState(1);
  const [invincible, setInvincible] = useState(false);
  const [expEarned, setExpEarned] = useState(0);
  const [animatedExp, setAnimatedExp] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; scale: number } | null>(null);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);

  // Shuffle queue for endless mode
  const [shuffleQueue, setShuffleQueue] = useState<AudioAnalysis[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const notesRef = useRef<Note[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>(0);
  const audioEffectRef = useRef<number | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(1);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Background transition state
  const bgRef = useRef({
    prevColor: BG_PALETTE[0],
    currColor: BG_PALETTE[0],
    nextColor: BG_PALETTE[Math.floor(Math.random() * BG_PALETTE.length)],
    lastChangeTime: 0,
    nextInterval: BG_INTERVALS[Math.floor(Math.random() * BG_INTERVALS.length)]
  });

  const isDraggingRef = useRef(false);
  const holdingNotesRef = useRef<Set<string>>(new Set()); // Track IDs of long notes being held

  // Initialize shuffle queue for endless mode
  React.useEffect(() => {
    if (selectedMode === 'endless' && allSongs && allSongs.length > 0) {
      // Ensure the first song in the playlist is at the start of the queue
      const baseTrack = playlist[0];
      const otherSongs = allSongs.filter(s => s.id !== baseTrack?.id);
      const shuffled = [baseTrack, ...otherSongs.sort(() => Math.random() - 0.5)].filter(Boolean) as AudioAnalysis[];

      setShuffleQueue(shuffled);
      setQueueIndex(0);
    }
  }, [selectedMode, allSongs, playlist]);

  const currentSong = selectedMode === 'endless' && shuffleQueue.length > 0
    ? shuffleQueue[queueIndex]
    : playlist[currentTrackIndex];

  // Preload cover art for canvas
  useEffect(() => {
    if (currentSong?.coverArt) {
      const img = new Image();
      img.src = currentSong.coverArt;
      img.onload = () => setCoverArtElement(img);
      img.onerror = () => setCoverArtElement(null);
    } else {
      setCoverArtElement(null);
    }
  }, [currentSong?.coverArt]);


  // Auto-advance to next song in endless mode
  const loadNextSongInEndless = React.useCallback(() => {
    if (selectedMode !== 'endless' || !shuffleQueue.length) return;

    let nextIndex = queueIndex + 1;

    // If we've exhausted the queue, reshuffle
    if (nextIndex >= shuffleQueue.length) {
      const reshuffled = [...shuffleQueue].sort(() => Math.random() - 0.5);
      setShuffleQueue(reshuffled);
      nextIndex = 0;
    }

    setQueueIndex(nextIndex);
    const nextSong = shuffleQueue[nextIndex];

    // Reset game state for new song
    setScore(0);
    setCombo(0);
    setSessionHearts(0);
    setSessionShields(0);
    setSessionPerfects(0);
    setIsCleared(false);
    setIsGameOver(false);
    setIsFailing(false);
    setActiveLives(5);
    setReviveCount(0);
    setCompletion(0); // Reset completion for new song in endless

    // Reset background transition time for new song
    bgRef.current.lastChangeTime = 0;

    // Load the new song
    loadTrackNotes(nextSong);

    // Reset and play audio
    if (audioRef.current && nextSong.fileUrl) {
      audioRef.current.src = nextSong.fileUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsActive(true);
    }
  }, [selectedMode, shuffleQueue, queueIndex]);



  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const showFeedback = (text: string, color: string, scale: number) => {
    setFeedback({ text, color, scale });
    // Clear feedback after 600ms (shorter for snappier feel)
    setTimeout(() => setFeedback(null), 600);
  };

  const handleFailure = useCallback((noteId?: string) => {
    if (invincible || isFailing) return;

    if (noteId) setFailedNoteId(noteId);

    setShake(10);
    setActiveLives(prev => {
      const next = prev - 1;
      if (next <= 0) {
        setIsFailing(true);

        // Calculate Completion based on Song Progress on Failure
        if (durationRef.current > 0) {
          const progress = (currentTimeRef.current / durationRef.current) * 100;
          setCompletion(Math.floor(progress));
        }

        // Calculate Partial EXP
        // Standard formula: Score / 100
        const earned = Math.floor(score / 100);
        setExpEarned(earned);

        if (audioRef.current) {
          const audio = audioRef.current;
          // Disable pitch preservation to get the "deepening" vinyl stop effect
          if ('preservesPitch' in audio) {
            (audio as any).preservesPitch = false;
          } else if ('mozPreservesPitch' in audio) {
            (audio as any).mozPreservesPitch = false;
          } else if ('webkitPreservesPitch' in audio) {
            (audio as any).webkitPreservesPitch = false;
          }

          const duration = 1000; // 1 second slow down
          const startRate = audio.playbackRate;
          const startTime = performance.now();

          const slowdown = (now: number) => {
            const elapsed = now - startTime;
            if (elapsed < duration) {
              const progress = elapsed / duration;
              // Ease out cubic for a natural feel
              const newRate = Math.max(0, startRate * (1 - progress));
              if (audioRef.current) audioRef.current.playbackRate = newRate;
              audioEffectRef.current = requestAnimationFrame(slowdown);
            } else {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.playbackRate = 1;
                (audioRef.current as any).preservesPitch = true;
              }
              audioEffectRef.current = null;
            }
          };
          audioEffectRef.current = requestAnimationFrame(slowdown);
        }

        // Delay Game Over Menu by 1s (Match with audio slowdown)
        setTimeout(() => {
          setIsFailing(false);
          setIsGameOver(true);
          setIsActive(false);
          setFailedNoteId(null);
        }, 1000);
      }
      return next;
    });

    setInvincible(true);
    setTimeout(() => setInvincible(false), 2000);
  }, [invincible, isFailing]);

  // Scale note speed based on *actual game height* (canvas height)
  // Logic: 800px height = standard speed.
  // We need access to current canvas height. Since this is called in render loop (via closure on state?), 
  // actually getNoteSpeed is called in render. 
  // Let's make getNoteSpeed read from canvasRef directly if available.
  const getNoteSpeed = () => {
    let height = 800;
    if (canvasRef.current) {
      height = canvasRef.current.height;
    } else if (typeof window !== 'undefined') {
      height = window.innerHeight;
    }

    // Base speed: Easy 400 (x1.0) -> Scaled by height ratio (reference 800px)
    const heightScale = height / 800;
    const speeds: Record<Level, number> = { easy: 400, medium: 600, hard: 800 };
    return speeds[selectedLevel] * heightScale;
  };

  const handleHit = useCallback((lane: number, tapY?: number) => {
    if (!isActive || isPaused || isGameOver || isCleared) return;
    const t = audioRef.current?.currentTime || 0;

    setLaneHits(prev => {
      const next = [...prev];
      next[lane] = Date.now();
      return next;
    });

    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const lW = rect.width / LANES;
    const x = (lane * lW) + (lW / 2);
    const speed = getNoteSpeed();
    const targetY = rect.height * TARGET_Y_RATIO;

    // Filter candidates in this lane
    const candidates = notesRef.current.filter(n => !n.hit && !n.missed && n.lane === lane);

    let closestNote: Note | null = null;

    if (tapY !== undefined) {
      // Logic for "Tap anywhere": find note whose current Y is closest to tapY
      let minDiff = 150; // 150px tolerance
      candidates.forEach(n => {
        const nY = targetY - ((n.time - t) * speed);
        const diff = Math.abs(nY - tapY);
        if (diff < minDiff) {
          minDiff = diff;
          closestNote = n;
        }
      });
    } else {
      // Fallback/Legacy timing logic
      const windowSeconds = 0.22;
      const timeCandidates = candidates
        .filter(n => Math.abs(n.time - t) < windowSeconds)
        .sort((a, b) => Math.abs(a.time - t) - Math.abs(b.time - t));
      closestNote = timeCandidates[0] || null;
    }

    const noteToHit = closestNote as Note | null;
    if (noteToHit) {
      noteToHit.hit = true;
      noteToHit.hitTimestamp = Date.now(); // Record hit time
      const nY = targetY - ((noteToHit.time - t) * speed);

      if (noteToHit.type === 'powerup') {
        if (noteToHit.powerUp === 'shield') setSessionShields(s => s + 1);
        else setSessionHearts(h => h + (noteToHit.powerUp === 'life1' ? 1 : 2));
        setScore(s => s + 2000);
        spawnParticles(x, nY, '#fff', 30);
        showFeedback('COLLECTED', 'text-white', 1.0);
      } else {
        const diff = Math.abs(noteToHit.time - t);
        // PERFECT: < 0.05s (50ms)
        if (diff < 0.05) {
          setScore(s => s + 1000 + combo * 50);
          setCombo(c => c + 1);
          const bonus = combo >= 2 ? combo : 1;
          setSessionPerfects(p => p + bonus);
          // Heavy shake for perfect hit (Only shake for first 3 perfects to prevent lag)
          if (combo < 3) setShake(10);
          showFeedback('PERFECT', 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]', 1.0);
          spawnParticles(x, nY, '#facc15', 20); // Gold particles
        } else {
          // GREAT: < 0.22s (Non-Perfect Hit breaks Perfect Combo)
          const points = 300;
          setScore(s => s + points);
          setCombo(0); // Reset combo if not perfect
          showFeedback('GREAT', 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]', 0.8);
          spawnParticles(x, nY, '#22d3ee', 12); // Cyan particles
        }

        // Start Hold if it's a Long Tile
        if (noteToHit.isLong && noteToHit.duration) {
          holdingNotesRef.current.add(noteToHit.id);
        }
      }
    } else {
      // Missed tap (tapped empty space)
      // Strict rule: tapping empty space counts as failure
      setScore(s => Math.max(0, s - 200));
      // No specific note ID for tapping empty space, or maybe find closest?
      // For now, generic failure without specific note highlight if tapping void.
      handleFailure();
      setCombo(0);
      setShake(5);
      showFeedback('MISS', 'text-red-500 opacity-80', 0.7);
    }
  }, [isActive, isPaused, isGameOver, isCleared, combo, selectedMode, handleFailure, selectedLevel]);

  const loadTrackNotes = (analysis: AudioAnalysis) => {
    let excludeUntil = 0;
    const lastLaneTimes = new Array(LANES).fill(-1); // TRACK LAST SPAWN TIME IN EACH LANE

    notesRef.current = analysis.beats.flatMap((beatTime, index) => {
      // Skip if this beat falls within a long tile's "exclusive" period
      if (beatTime < excludeUntil) return [];

      let type: 'obstacle' | 'powerup' | 'tile' = 'tile';
      const isPowerUp = Math.random() < 0.1;
      let powerType: PowerUpType = 'none';
      if (isPowerUp) {
        const pR = Math.random();
        if (pR < 0.3) powerType = 'shield';
        else if (pR < 0.6) powerType = 'life1';
        else powerType = 'life2';
        type = 'powerup';
      }

      // Varying Tiles Logic (Moving Tiles)
      let isMoving = false;
      if (type === 'tile' && (selectedLevel === 'medium' || selectedLevel === 'hard')) {
        isMoving = Math.random() < 0.25;
      }

      // Long Tiles Logic
      let isLong = false;
      let duration = 0;
      if (type === 'tile' && !isMoving && Math.random() < 0.15) {
        isLong = true;
        duration = 0.4 + Math.random() * 0.8;
        excludeUntil = beatTime + duration + 0.2;
      }

      // FIND A VALID LANE (Minimum gap: 0.25s)
      const MIN_GAP = 0.25;
      let lane1 = Math.floor(Math.random() * LANES);

      // Attempt to find a lane that has enough gap
      if (beatTime - lastLaneTimes[lane1] < MIN_GAP) {
        // Try all other lanes
        const availableLanes = [];
        for (let l = 0; l < LANES; l++) {
          if (beatTime - lastLaneTimes[l] >= MIN_GAP) availableLanes.push(l);
        }
        if (availableLanes.length > 0) {
          lane1 = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        } else {
          // If no lanes are available, we skip this beat to prevent cluster
          return [];
        }
      }

      lastLaneTimes[lane1] = beatTime + (isLong ? duration : 0);

      const notes: Note[] = [{
        id: `${analysis.id}-n-${index}-a`,
        time: beatTime,
        lane: lane1,
        hit: false,
        missed: false,
        type,
        powerUp: powerType,
        isMoving,
        originalLane: lane1,
        isLong,
        duration,
        holdProgress: 0
      }];

      // Skip double tiles if it's a long tile
      if (isLong) return notes;

      const lastBeat = analysis.beats.length > 0 ? analysis.beats[analysis.beats.length - 1] : 0;
      const isLateGame = lastBeat > 0 && beatTime > (lastBeat * 0.6);
      const doubleTileChance = isLateGame ? 0.6 : 0.25;

      if (Math.random() < doubleTileChance) {
        // Find a second lane that is also valid
        const nextBeatTime = beatTime + 0.15;
        const availableLanes2 = [];
        for (let l = 0; l < LANES; l++) {
          if (l !== lane1 && nextBeatTime - lastLaneTimes[l] >= MIN_GAP) {
            availableLanes2.push(l);
          }
        }

        if (availableLanes2.length > 0) {
          let lane2 = availableLanes2[Math.floor(Math.random() * availableLanes2.length)];

          let isLong2 = false;
          let duration2 = 0;
          if (!isLong && Math.random() < 0.1) {
            isLong2 = true;
            duration2 = 0.4 + Math.random() * 0.6;
            excludeUntil = beatTime + 0.15 + duration2 + 0.2;
          }

          notes.push({
            id: `${analysis.id}-n-${index}-b`,
            time: nextBeatTime,
            lane: lane2,
            hit: false,
            missed: false,
            type: 'tile',
            powerUp: 'none',
            isLong: isLong2,
            duration: duration2,
            holdProgress: 0
          });

          lastLaneTimes[lane2] = nextBeatTime + (isLong2 ? duration2 : 0);
        }
      }

      return notes;
    });
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    actuallyStartGame();
  };

  // Move livesMap to a stable constant or useMemo if needed, but simple object is fine here
  const livesMap: Record<Level, number> = { easy: 2, medium: 1, hard: 0 };

  const checkCanAfford = () => {
    const shieldCost = selectedMode === 'endless' ? 1 : livesMap[selectedLevel];
    return {
      canAfford: globalHearts >= 2 && globalShields >= shieldCost,
      shieldCost
    };
  };

  const rampAudioToSpeed = useCallback((targetSpeed: number = 1.0, duration: number = 3000) => {
    if (!audioRef.current) return;

    // Cancel any active effect
    if (audioEffectRef.current !== null) {
      cancelAnimationFrame(audioEffectRef.current);
      audioEffectRef.current = null;
    }

    const audio = audioRef.current;

    // Start slow
    const startRate = 0.2;
    audio.playbackRate = startRate;
    (audio as any).preservesPitch = true;

    audio.play().catch(e => console.error("Play blocked", e));

    const startTime = performance.now();

    const rampUp = (now: number) => {
      // Stop if paused or game over (checking refs or DOM state is safer than closed-over state)
      if (audio.paused) {
        audioEffectRef.current = null;
        return;
      }

      const elapsed = now - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const currentRate = startRate + (targetSpeed - startRate) * progress;
        audio.playbackRate = currentRate;
        audioEffectRef.current = requestAnimationFrame(rampUp);
      } else {
        audio.playbackRate = targetSpeed;
        audioEffectRef.current = null;
      }
    };

    audioEffectRef.current = requestAnimationFrame(rampUp);
  }, []);

  const actuallyStartGame = () => {
    const { shieldCost } = checkCanAfford();
    onUseCurrency(2, shieldCost, 0);

    setActiveLives(selectedMode === 'endless' ? 1 : livesMap[selectedLevel]);

    const startSong = selectedMode === 'endless' && shuffleQueue.length > 0 ? shuffleQueue[0] : playlist[0];
    if (selectedMode === 'endless') setQueueIndex(0);
    else setCurrentTrackIndex(0);

    loadTrackNotes(startSong);
    particlesRef.current = [];

    setScore(0); setCombo(0); setSessionHearts(0); setSessionShields(0); setSessionPerfects(0); setPlayerLane(1);
    setCompletion(0); // Reset completion on game start
    setIsActive(true); setIsPaused(false); setIsGameOver(false); setIsCleared(false); setInvincible(false);

    // Reset background transition time
    bgRef.current.lastChangeTime = 0;

    // Immediate Start with Slow Motion Ramp
    if (audioRef.current) {
      audioRef.current.src = startSong.fileUrl || '';
      audioRef.current.currentTime = 0;
      rampAudioToSpeed(1.0, 3000);
    }

    // Notify parent that playback has truly begun
    if (onStartPlay) onStartPlay(startSong);
  };

  // Removed Countdown Effect

  const startGame = () => {
    const { canAfford } = checkCanAfford();
    if (!canAfford) {
      return;
    }

    const stored = localStorage.getItem(`showTutorial_${selectedMode}`);
    if (stored !== 'false') {
      setShowTutorial(true);
    } else {
      actuallyStartGame();
    }
  };

  const handleFinish = () => {
    if (selectedMode === 'endless') {
      loadNextSongInEndless();
      showFeedback('BEAT EXTENDED', 'text-blue-400', 1.2);
    } else {
      // Guard: Don't mark as cleared or 100% if we already failed
      if (isGameOver || isFailing) return;

      // EXP Formula: Base 300 + Performance
      const earned = 300 + (sessionPerfects * 10);
      setExpEarned(earned);
      setIsCleared(true);
      if (audioRef.current) audioRef.current.pause();

      // Calculate Completion based on Song Progress (Time Elapsed)
      // On finish, it's 100%
      setCompletion(100);

      const durationAnim = 1000;
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const prog = Math.min(elapsed / durationAnim, 1);
        setAnimatedExp(Math.floor(prog * earned));
        if (prog < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  };



  const handleAbort = () => {
    setIsExiting(true);
    setTimeout(onExit, 200);
  };

  // Define exitSession implicitly if it was missing/misnamed or verify usage. 
  // Since I couldn't find it, I'll alias it to handleAbort or similar for safety in my new function, 
  // but looking at existing usage, it's expected to be there. 
  // I will just use onExit in my new function to be safe.
  const handleClaimAwards = () => {

    // Trigger save immediately or before exit? 
    // Let's do it before exit to ensure we have the data
    setTimeout(() => {
      onFinish(sessionHearts, sessionShields, sessionPerfects, selectedLevel, completion);
      setIsExiting(true);
      setTimeout(onExit, 200);
    }, 1500); // Wait for flyout animation
  };

  const handleRevive = () => {
    // Revive Cost: 50 * (reviveCount + 1) Gold + 2 Shields
    const goldCost = 50 * (reviveCount + 1);
    const shieldCost = 2;

    if (userPerfects >= goldCost && globalShields >= shieldCost) {
      onUseCurrency(0, shieldCost, goldCost);
      setReviveCount(prev => prev + 1);

      // Cancel audio slowdown effect
      if (audioEffectRef.current !== null) {
        cancelAnimationFrame(audioEffectRef.current);
        audioEffectRef.current = null;
      }

      setIsGameOver(false);
      setIsActive(true);
      setActiveLives(1); // Start with 1 shield

      // Resume audio with slow motion ramp
      rampAudioToSpeed(1.0, 3000);

      // Brief invincibility
      setInvincible(true);
      setTimeout(() => setInvincible(false), 3000);
    }
  };

  // Resume Countdown Logic
  useEffect(() => {
    if (resumeCountdown === null) return;

    if (resumeCountdown > 0) {
      const timer = setTimeout(() => {
        setResumeCountdown(resumeCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished
      setIsPaused(false);
      setResumeCountdown(null);
      if (audioRef.current) {
        audioRef.current.playbackRate = 1.0; // Ensure speed is reset to normal
        audioRef.current.play();
      }
    }
  }, [resumeCountdown]);

  const startResumeCountdown = () => {
    setIsPaused(false); // Hide pause menu immediately or keep it? 
    // Usually pause menu hides, and countdown shows over the game.
    setResumeCountdown(3);
  };

  const restartSession = () => {
    // Cancel any active audio effects
    if (audioEffectRef.current !== null) {
      cancelAnimationFrame(audioEffectRef.current);
      audioEffectRef.current = null;
    }
    // Force reset audio props immediately
    if (audioRef.current) {
      audioRef.current.pause(); // Ensure it's paused
      audioRef.current.playbackRate = 1;
      audioRef.current.currentTime = 0; // Reset time immediately
      (audioRef.current as any).preservesPitch = true;
    }

    // Clear notes/particles immediately so we don't render old frame during countdown
    notesRef.current = [];
    particlesRef.current = [];

    setIsPaused(false);
    setIsGameOver(false);
    setIsCleared(false);

    // Slight delay to ensure state updates propagate before checking hearts/starting
    setTimeout(() => startGame(), 0);
  };

  // Handle Responsive Canvas Resize
  // Uses ResizeObserver to track the container size instead of window
  useEffect(() => {
    if (!gameAreaRef.current || !canvasRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === gameAreaRef.current && canvasRef.current) {
          const { width, height } = entry.contentRect;
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      }
    });

    resizeObserver.observe(gameAreaRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    const render = () => {
      if (!isActive || isPaused || isGameOver || isCleared) {
        if (isActive) requestRef.current = requestAnimationFrame(render);
        return;
      }

      const t = audioRef.current?.currentTime || 0;
      // Freeze time visually if failing
      if (!isFailing) {
        currentTimeRef.current = t;
      }
      const displayTime = isFailing ? currentTimeRef.current : t;
      const progress = displayTime / (durationRef.current || 1);

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress * 100}%`;
      }

      const w = canvas.width, h = canvas.height, targetY = h * TARGET_Y_RATIO, lW = w / LANES;

      if (shake > 0) setShake(s => Math.max(0, s - 2));

      ctx.clearRect(0, 0, w, h);

      // Draw Cover Art Background (Cover Scale)
      if (coverArtElement) {
        const img = coverArtElement;
        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let dW, dH, dX, dY;

        if (canvasRatio > imgRatio) {
          dW = w;
          dH = w / imgRatio;
          dX = 0;
          dY = (h - dH) / 2;
        } else {
          dH = h;
          dW = h * imgRatio;
          dX = (w - dW) / 2;
          dY = 0;
        }
        ctx.drawImage(img, dX, dY, dW, dH);
      }

      // Update Background State
      if (displayTime >= bgRef.current.lastChangeTime + bgRef.current.nextInterval) {
        bgRef.current.prevColor = bgRef.current.currColor;
        bgRef.current.currColor = bgRef.current.nextColor;
        bgRef.current.nextColor = BG_PALETTE[Math.floor(Math.random() * BG_PALETTE.length)];
        bgRef.current.lastChangeTime = displayTime;
        bgRef.current.nextInterval = BG_INTERVALS[Math.floor(Math.random() * BG_INTERVALS.length)];
      }

      // Calculate Interpolated Color for smooth transition
      const timeSinceChange = displayTime - bgRef.current.lastChangeTime;
      const bgT = Math.min(1, timeSinceChange / BG_FADE_DURATION);
      const activeBgColor = lerpColor(bgRef.current.prevColor, bgRef.current.currColor, bgT);

      // Overlay shifting color with semi-transparency
      if (coverArtElement) {
        ctx.globalAlpha = 0.82; // Balance immersion and readability
      }
      ctx.fillStyle = activeBgColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1.0; // Reset

      // Sync color to CSS variable for HTML overlays
      gameAreaRef.current?.style.setProperty('--active-bg', activeBgColor);

      ctx.save();
      // Glitch effect: intense shake and color shifts during failure
      const currentShake = isFailing ? 20 : shake;
      ctx.translate((Math.random() - 0.5) * currentShake, (Math.random() - 0.5) * currentShake);

      // Rewind Logic during failure
      if (isFailing && failedNoteId) {
        const failedNote = notesRef.current.find(n => n.id === failedNoteId);
        if (failedNote) {
          // Smoothly rewind time to the failed note's time
          // Lerp factor 0.1 for smooth slide back
          currentTimeRef.current = currentTimeRef.current + (failedNote.time - currentTimeRef.current) * 0.1;
        }
      }

      const now = Date.now();
      for (let i = 0; i < LANES; i++) {
        const hitAge = now - laneHits[i];
        if (hitAge < 150) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.15 * (1 - hitAge / 150)})`;
          ctx.fillRect(i * lW, 0, lW, h);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.beginPath(); ctx.moveTo(i * lW, 0); ctx.lineTo(i * lW, h); ctx.stroke();
      }

      const speed = getNoteSpeed();

      const visibleRangeSeconds = (h / speed) + 1;

      // Render Connectors for simultaneous tiles (Double Tiles)
      // Group by time
      const visibleNotes = notesRef.current.filter(n => !n.hit && !n.missed && (n.time - displayTime) <= visibleRangeSeconds && (n.time - displayTime) >= -0.15);
      const timeGroups = new Map<number, Note[]>();
      visibleNotes.forEach(n => {
        if (!timeGroups.has(n.time)) timeGroups.set(n.time, []);
        timeGroups.get(n.time)!.push(n);
      });

      timeGroups.forEach((group) => {
        if (group.length > 1) {
          const y = targetY - ((group[0].time - displayTime) * speed);
          if (y > -200 && y < h + 200) {
            // Find min and max x
            let minX = w, maxX = 0;
            group.forEach(n => {
              const x = (n.lane * lW) + (lW / 2);
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            });
            // Draw connector line
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(minX, y);
            ctx.lineTo(maxX, y);
            ctx.stroke();
            ctx.restore();
          }
        }
      });

      // The `now` variable is already defined above, so we don't redefine it.
      notesRef.current.forEach((note) => {
        // Handle Moving Tiles Logic
        if (note.isMoving && !note.hit && !note.missed && note.originalLane !== undefined) {
          // Switch lanes every 2 beats (Half BPM)
          // Period = 2 * (60 / BPM)
          const bpm = currentSong?.bpm || 120;
          const beatDuration = 60 / bpm;
          const switchPeriod = beatDuration * 2;

          // Calculate vertical position Y to check if we should still move
          // We need to calculate Y same as below
          const timeToHit = note.time - displayTime;
          const yPos = targetY - (timeToHit * speed);

          // Stop moving if we are past the middle of the screen (0.5 * h)
          // This gives the user time to react
          if (yPos < h * 0.5) {
            const switchState = Math.floor(displayTime / switchPeriod) % 2;

            const targetLane = switchState === 0
              ? note.originalLane
              : (note.originalLane >= LANES - 1 ? note.originalLane - 1 : note.originalLane + 1);

            note.lane = targetLane;
          }
        }

        if (note.missed) return;

        // Check for Simultaneous Sync Failure (Double Tiles)
        if (!note.hit) {
          // Find if this note has a partner (same time) that was hit > 300ms ago
          const partner = notesRef.current.find(n => n.time === note.time && n.id !== note.id);
          if (partner && partner.hit && partner.hitTimestamp) {
            if (now - partner.hitTimestamp > 300) {
              note.missed = true;
              setScore(s => Math.max(0, s - 300));
              handleFailure(note.id);
              showFeedback('BEAT MISSED', 'text-red-500', 1.0);
              return;
            }
          }
        }

        if (note.hit && !note.isLong) return;
        if (note.hit && note.isLong && note.isFullyHeld) return;

        const timeDiff = note.time - displayTime;
        if (timeDiff > visibleRangeSeconds) return;
        if (timeDiff < -0.15 && !isFailing) { // Reduced threshold for missing tiles
          if (!note.hit && !note.missed) {
            note.missed = true;
            setScore(s => Math.max(0, s - 500)); // Penalty for skipping
            setCombo(0);
            handleFailure(note.id);
            showFeedback('MISS', 'text-red-500', 1.0);
          }
          // Only return if it's NOT a long tile being held/processed
          if (!note.isLong || !note.hit) return;
        }

        // Lock Y to targetY if note is hit but still active (long tile)
        const y = (note.hit && note.isLong) ? targetY : targetY - (timeDiff * speed);

        if (y > -200 && y < h + 200) {
          const x = (note.lane * lW) + (lW / 2);
          const nW = lW * 0.92, nH = 150;

          // Draw Tail for Long Tiles
          if (note.isLong && note.duration) {
            const tailHeight = note.duration * speed;
            const isHeld = holdingNotesRef.current.has(note.id);

            // Calculate how much of the tail is "burned" (passed targetY)
            // If hit, we use displayTime - note.time to see progress
            let burntHeight = 0;
            if (note.hit) {
              const holdTime = Math.max(0, displayTime - note.time);
              burntHeight = Math.min(note.duration, holdTime) * speed;
              note.holdProgress = Math.min(1, holdTime / note.duration);

              // Auto-release if finished
              if (note.holdProgress >= 1 && !note.isFullyHeld) {
                note.isFullyHeld = true;
                holdingNotesRef.current.delete(note.id);
                setScore(s => s + 500); // Completion bonus
                spawnParticles(x, targetY, '#facc15', 30);
              }

              // Bonus points while holding
              if (isHeld) {
                setScore(s => s + 10);
                // Continuous particles at target line
                if (Math.random() < 0.3) {
                  spawnParticles(x, targetY, '#fff', 5);
                }
              }
            }

            ctx.save();
            const tailY = y - tailHeight;

            // Draw shadow/glow for the tail if being held
            if (isHeld) {
              ctx.shadowBlur = 20;
              ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            }

            // Tail Gradient
            const tailGrad = ctx.createLinearGradient(x, y - burntHeight, x, tailY);
            if (isHeld) {
              tailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
              tailGrad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
            } else {
              tailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
              tailGrad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
            }

            ctx.fillStyle = tailGrad;
            // Draw tail from the top of the tile (y - nH/2) upwards
            // But if hit, it should start from targetY (or y - burntHeight)
            const tailStart = y - nH / 2;
            const drawTop = tailY;
            const drawBottom = tailStart - burntHeight;

            if (drawBottom > drawTop) {
              ctx.beginPath();
              ctx.roundRect(x - (nW * 0.4) / 2, drawTop, nW * 0.4, drawBottom - drawTop, 4);
              ctx.fill();
            }

            // Draw "End Cap" for long tiles
            ctx.fillStyle = isHeld ? '#fff' : 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.roundRect(x - (nW * 0.6) / 2, tailY - 10, nW * 0.6, 20, 10);
            ctx.fill();

            ctx.restore();
          }

          ctx.save();

          // Flash effect for failed note
          if (isFailing && note.id === failedNoteId) {
            const flash = Math.sin(Date.now() / 50); // Fast blink
            ctx.fillStyle = flash > 0 ? '#ff0000' : '#ffffff';
          } else if (note.type === 'tile') {
            // No shadow/glow
          }

          ctx.beginPath();
          ctx.roundRect(x - nW / 2, y - nH / 2, nW, nH, 4);
          if (isFailing && note.id === failedNoteId) {
            ctx.fill(); // Already set style above
          } else if (note.type === 'powerup') {
            // Background refinement
            if (coverArtElement) {
              ctx.save();
              ctx.clip(); // Clip to the roundRect path defined above
              ctx.drawImage(coverArtElement, x - nW / 2, y - nH / 2, nW, nH);
              // Slight darkening overlay for better icon contrast
              ctx.fillStyle = 'rgba(0,0,0,0.1)';
              ctx.fill();
              ctx.restore();
            } else {
              ctx.fillStyle = 'white';
              ctx.fill();
            }

            // Power-up Icon with shadow
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.fillStyle = (note.powerUp === 'shield' || !coverArtElement) ? 'white' : '#fff';
            ctx.font = 'bold 22px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(note.powerUp === 'shield' ? '🛡️' : '❤️', x, y + 8);
            ctx.restore();
          } else if (note.type === 'obstacle') {
            ctx.fillStyle = '#b91c1c'; ctx.fill();
          } else {
            const grad = ctx.createLinearGradient(x, y - nH / 2, x, y + nH / 2);
            grad.addColorStop(0.10, '#eeeeeeff'); // White highlight at top
            grad.addColorStop(0.15, '#eeeeeeff');              // Blend into bg color
            grad.addColorStop(1, '#ffffffff');
            ctx.fillStyle = grad;
            ctx.fill();
            // Borders removed as requested
          }
          ctx.restore();
        }
      });

      let iIdx = particlesRef.current.length;
      while (iIdx--) {
        const p = particlesRef.current[iIdx];
        p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        if (p.life <= 0) {
          particlesRef.current.splice(iIdx, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      requestRef.current = requestAnimationFrame(render);
    };
    if (isActive) requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isActive, isPaused, isGameOver, isCleared, playerLane, selectedMode, invincible, shake, selectedLevel, laneHits]);

  // Listen for audio ended event to auto-advance in endless mode
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleAudioEnded = () => {
      if (selectedMode === 'endless') {
        // Small delay for smooth transition
        setTimeout(() => {
          loadNextSongInEndless();
        }, 500);
      }
    };

    audio.addEventListener('ended', handleAudioEnded);
    return () => audio.removeEventListener('ended', handleAudioEnded);
  }, [selectedMode, loadNextSongInEndless]);


  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isGameOver || isCleared || isFailing) return;

      const keyMap: Record<string, number> = {
        'KeyD': 0, 'KeyF': 1, 'KeyJ': 2, 'KeyK': 3,
        'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3 // Alternative
      };
      if (e.code in keyMap) {
        handleHit(keyMap[e.code]);
        // Visual feedback for key press
        const lane = keyMap[e.code];
        setLaneHits(prev => {
          const next = [...prev];
          next[lane] = Date.now();
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMode, isPaused, isGameOver, isCleared, handleHit]);

  // Keyboard Release Logic
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        'KeyD': 0, 'KeyF': 1, 'KeyJ': 2, 'KeyK': 3,
        'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3
      };
      if (e.code in keyMap) {
        const lane = keyMap[e.code];
        // Release any held notes in this lane
        holdingNotesRef.current.forEach(id => {
          const note = notesRef.current.find(n => n.id === id);
          if (note && note.lane === lane) {
            holdingNotesRef.current.delete(id);
            note.isFullyHeld = true; // Mark as done so it disappears
            // Spawn release particles
            const rect = gameAreaRef.current?.getBoundingClientRect();
            if (rect) {
              const lW = rect.width / LANES;
              const x = (lane * lW) + (lW / 2);
              const targetY = rect.height * TARGET_Y_RATIO;
              spawnParticles(x, targetY, '#fff', 15);
            }
          }
        });
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (isFailing) return;

    // Check if target is a button or inside a button (e.g. Pause, Resume)
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    isDraggingRef.current = true;
    const r = gameAreaRef.current?.getBoundingClientRect();
    if (r) {
      const l = Math.max(0, Math.min(LANES - 1, Math.floor((e.clientX - r.left) / (r.width / LANES))));
      handleHit(l, e.clientY - r.top);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    const r = gameAreaRef.current?.getBoundingClientRect();
    if (r) {
      const lane = Math.max(0, Math.min(LANES - 1, Math.floor((e.clientX - r.left) / (r.width / LANES))));
      // Release any held notes in this lane
      holdingNotesRef.current.forEach(id => {
        const note = notesRef.current.find(n => n.id === id);
        if (note && note.lane === lane) {
          holdingNotesRef.current.delete(id);
          note.isFullyHeld = true; // Mark as done so it disappears
          // Spawn release particles
          const lW = r.width / LANES;
          const x = (lane * lW) + (lW / 2);
          const targetY = r.height * TARGET_Y_RATIO;
          spawnParticles(x, targetY, '#fff', 15);
        }
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      const r = gameAreaRef.current?.getBoundingClientRect();
      if (r) {
        const l = Math.max(0, Math.min(LANES - 1, Math.floor((e.clientX - r.left) / (r.width / LANES))));
        // Smooth slide: Only update if adjacent or same
        setPlayerLane(prev => {
          if (l === prev) return prev;
          if (l > prev) return prev + 1;
          return prev - 1;
        });
      }
    }
  };

  return (
    <>
      <TutorialModal
        mode={selectedMode}
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
      />
      <div className="fixed inset-0 bg-[#0f172a] flex justify-center items-center z-[100] select-none touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}>


        <div ref={gameAreaRef} className={`relative w-full h-full 
          lg:w-[480px] lg:h-full lg:rounded-none lg:border-x lg:border-white/10 lg:shadow-2xl 
          bg-transparent overflow-hidden flex flex-col
          animate-in fade-in zoom-in-95 duration-200 
          ${isExiting ? 'animate-out fade-out zoom-out-95 duration-200 fill-mode-forwards' : ''}
        `}>

          {/* HUD - Separate Top Section */}
          <div className={`w-full p-4 z-[100] relative bg-[#0f172a] transition-all duration-300 ${(!isActive || isPaused || isGameOver || isCleared) ? 'h-0 p-0 overflow-hidden opacity-0 invisible' : 'h-auto opacity-100 visible'}`}>
            {/* Top Row: Art + Stats + Pause */}
            <div className="flex items-center justify-between gap-3">

              {/* Left: Cover Art (Square) */}
              <div className="flex-shrink-0">
                {currentSong?.coverArt ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shadow-2xl shrink-0 relative group">
                    {/* Playing Indicator Overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="flex gap-1">
                        <div className="w-1 h-3 bg-green-500 rounded-full animate-[bounce_1s_infinite]" />
                        <div className="w-1 h-4 bg-green-500 rounded-full animate-[bounce_1.2s_infinite]" />
                        <div className="w-1 h-2 bg-green-500 rounded-full animate-[bounce_0.8s_infinite]" />
                      </div>
                    </div>
                    <img src={currentSong.coverArt} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center shadow-2xl">
                    <span className="text-2xl">🎵</span>
                  </div>
                )}
              </div>

              {/* Right: Unified Stats & Progress Card */}
              <div className="flex-1 min-w-0 overflow-hidden flex flex-col shadow-xl ">

                {/* Top: Song Info & Stats */}
                <div className="flex items-center justify-between px-3 py-2 gap-3">

                  {/* Song Title (Left) */}
                  <div className="flex flex-col overflow-hidden mr-auto">
                    <h3 className="text-xs font-black italic text-white uppercase tracking-wide truncate">
                      {currentSong?.fileName.replace(/\.[^/.]+$/, "")}
                    </h3>
                    <div className="flex items-center gap-2">
                      {selectedMode === 'endless' && (
                        <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">
                          TRK {queueIndex + 1}
                        </span>
                      )}
                      <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">
                        {(completion)}%
                      </span>
                    </div>
                  </div>

                  {/* Stats (Right) */}
                  <div className="flex items-center gap-3 shrink-0">

                    {/* Score */}
                    <div className="flex flex-col items-end">
                      <span className="text-[7px] font-bold text-white/60 uppercase tracking-widest leading-none mb-0.5">SCORE</span>
                      <span className="text-lg font-black italic text-white leading-none tracking-tighter">{score.toLocaleString()}</span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-4 bg-white/10"></div>

                    {/* Gold */}
                    <div className="flex flex-col items-end">
                      <span className="text-[7px] font-bold text-yellow-500 uppercase tracking-widest leading-none mb-0.5">GOLD</span>
                      <span className="text-lg font-black italic text-white leading-none tracking-tighter">{sessionPerfects}</span>
                    </div>

                    {/* Pause Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPaused(true);
                        audioRef.current?.pause();
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors ml-1 active:scale-95 pointer-events-auto"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" /></svg>
                    </button>
                  </div>
                </div>

                {/* Bottom: Progress Bar (Integrated) */}
                <div className="h-1 w-full bg-white/5 relative">
                  <div ref={progressBarRef} className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-none" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Screen Area (Behind/Drawer) */}
          <div className="flex-1 relative overflow-hidden bg-[#0f172a]">

            {/* Countdown Overlay */}

            {/* Overlays Layer (Behind the Drawer) */}
            <div className="absolute inset-0 z-0">
              {/* Pause Overlay - Spotify Style */}
              {isPaused && !isGameOver && !isCleared && (
                <div className="absolute inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden">
                  {/* Background Art */}
                  {currentSong?.coverArt && (
                    <div className="absolute inset-0 z-0">
                      <img src={currentSong.coverArt} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {/* Shifting Color Overlay */}
                  <div
                    className="absolute inset-0 z-0 opacity-85 transition-colors duration-500"
                    style={{ backgroundColor: 'var(--active-bg, #0f172a)' }}
                  />
                  {/* Glassmorphic Blur overlay */}
                  <div className="absolute inset-0 z-0 backdrop-blur-2xl" />

                  <div className="flex flex-col gap-6 items-center w-full max-w-xs relative z-10">
                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-4 drop-shadow-2xl">Paused</h2>

                    <button
                      onClick={startResumeCountdown}
                      className="w-full py-4 rounded-full bg-white text-black font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
                    >
                      Resume
                    </button>

                    <button
                      onClick={restartSession}
                      className="w-full py-4 rounded-full bg-white/10 border border-white/20 text-white font-bold text-sm uppercase tracking-widest hover:bg-white/20 transition-colors backdrop-blur-md"
                    >
                      Restart
                    </button>

                    <button
                      onClick={handleAbort}
                      className="text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors mt-4"
                    >
                      Quit Game
                    </button>
                  </div>
                </div>
              )}


              {/* Game Over Screen - Spotify Style */}
              {isGameOver && (
                <div className="absolute inset-0 z-[120] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300 overflow-hidden">
                  {/* Background Art */}
                  {currentSong?.coverArt && (
                    <div className="absolute inset-0 z-0">
                      <img src={currentSong.coverArt} className="w-full h-full object-cover grayscale opacity-50" />
                    </div>
                  )}
                  {/* Shifting Color Overlay */}
                  <div
                    className="absolute inset-0 z-0 opacity-90 transition-colors duration-500"
                    style={{ backgroundColor: 'var(--active-bg, #0f172a)' }}
                  />
                  {/* Glassmorphic Blur */}
                  <div className="absolute inset-0 z-0 backdrop-blur-3xl" />

                  <div className="max-w-sm w-full relative z-10 flex flex-col items-center gap-6">
                    <h3 className="text-5xl font-black italic text-white uppercase tracking-tighter drop-shadow-xl">Game Over</h3>

                    {/* Song Info */}
                    <div className="text-center">
                      <h4 className="text-xl font-black text-white italic truncate max-w-[250px]">{currentSong?.fileName.replace(/\.[^/.]+$/, "")}</h4>
                    </div>

                    {/* Stats Card */}
                    <div className="w-full p-6 flex flex-col gap-4 bg-white/5 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl">
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Score</span>
                        <span className="text-2xl font-black text-white italic">{score.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Progress</span>
                        <span className="text-lg font-black text-white italic">{completion}%</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                          <span className="block text-xl font-black text-white">{sessionPerfects}<span className="text-yellow-500 text-sm">⭐</span></span>
                          <span className="text-[9px] font-bold text-white/40 uppercase">Gold (Perfects)</span>
                        </div>
                        <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                          <span className="block text-xl font-black text-white">{expEarned}<span className="text-blue-400 text-sm">XP</span></span>
                          <span className="text-[9px] font-bold text-white/40 uppercase">Growth</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full space-y-3">
                      {/* Revive Button */}
                      {(() => {
                        const goldCost = 50 * (reviveCount + 1);
                        const canAffordRevive = userPerfects >= goldCost && globalShields >= 2;

                        return (
                          <button
                            onClick={handleRevive}
                            disabled={!canAffordRevive}
                            className={`w-full py-4 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                               ${canAffordRevive
                                ? "bg-[#312e81] text-white hover:bg-[#312e81]/80 hover:scale-105 shadow-lg shadow-indigo-500/10"
                                : "bg-zinc-800 text-white/20 cursor-not-allowed opacity-50"
                              }`}
                          >
                            <span>Revive</span>
                            <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-bold">
                              {goldCost}G + 2🛡️
                            </span>
                          </button>
                        );
                      })()}

                      {/* Retry Button */}
                      {(() => {
                        const { canAfford, shieldCost } = checkCanAfford();
                        return (
                          <button
                            onClick={canAfford ? restartSession : undefined}
                            disabled={!canAfford}
                            className={`w-full py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all flex flex-col items-center justify-center leading-none gap-1
                               ${canAfford
                                ? "bg-white/10 text-white border border-white/10 hover:bg-white/20 hover:scale-105"
                                : "bg-zinc-800 text-white/20 cursor-not-allowed"
                              }`}
                          >
                            <span>Play Again</span>
                            <span className="text-[9px] font-bold opacity-60">
                              {canAfford ? `COST: 2❤️ ${shieldCost}🛡️` : "Low Energy"}
                            </span>
                          </button>
                        );
                      })()}

                      <button
                        onClick={handleClaimAwards}
                        className="w-full py-4 text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                      >
                        Claim Rewards & Exit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Screen - Spotify Style */}
              {isCleared && (
                <div className="absolute inset-0 z-[130] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300 overflow-hidden">
                  {/* Background Art */}
                  {currentSong?.coverArt && (
                    <div className="absolute inset-0 z-0">
                      <img src={currentSong.coverArt} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {/* Shifting Color Overlay */}
                  <div
                    className="absolute inset-0 z-0 opacity-85 transition-colors duration-500"
                    style={{ backgroundColor: 'var(--active-bg, #0f172a)' }}
                  />
                  {/* Glassmorphic Blur Overlay */}
                  <div className="absolute inset-0 z-0 backdrop-blur-3xl" />

                  {/* Confetti / Glow */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-[80px]"></div>
                  </div>

                  <div className="max-w-sm w-full relative z-10 flex flex-col items-center gap-6">
                    {/* Stars */}
                    <div className="flex gap-2">
                      <StarIcon active={true} className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] animate-[bounce_1s_infinite]" />
                      <StarIcon active={true} className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] -translate-y-2 animate-[bounce_1.2s_infinite]" />
                      <StarIcon active={true} className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] animate-[bounce_0.8s_infinite]" />
                    </div>

                    <h3 className="text-5xl font-black italic text-white uppercase tracking-tighter drop-shadow-xl animate-in zoom-in-0 duration-500">Complete</h3>

                    {/* Song Info */}
                    <div className="text-center">
                      <p className="text-sm font-bold text-green-400 uppercase tracking-widest mb-1 drop-shadow-lg">Perfect Performance</p>
                      <h4 className="text-xl font-black text-white italic truncate max-w-[250px] shadow-sm">{currentSong?.fileName.replace(/\.[^/.]+$/, "")}</h4>
                    </div>

                    {/* Stats Card */}
                    <div className="w-full bg-white/5 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 flex flex-col gap-4 shadow-2xl">
                      {/* Rewards Row */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <span className="text-xs font-bold text-blue-200/60 uppercase tracking-widest">Rewards</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black text-white">+{sessionPerfects}<span className="text-yellow-500 text-base ml-0.5">Gold</span></span>
                          {(completion >= 50) && (
                            <span className="text-xl font-black text-yellow-400">+{completion >= 100 ? 10 : 5}⭐</span>
                          )}
                        </div>
                      </div>

                      {/* Level Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-blue-200/60 uppercase tracking-widest">Level {Math.floor((currentExp + animatedExp) / 10000) + 1}</span>
                          <span className="text-[10px] font-bold text-blue-400">+{animatedExp} XP</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                          <div className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${((currentExp + animatedExp) % 10000) / 100}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Main Action */}
                    <button
                      onClick={handleClaimAwards}
                      className="w-full py-4 rounded-full bg-[#312e81] text-white font-black text-sm uppercase tracking-widest hover:bg-[#312e81]/80 hover:scale-105 transition-all shadow-[0_0_20px_rgba(49,46,129,0.3)]"
                    >
                      Claim Rewards
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Game Drawer Layer (Top) */}
            <div className={`absolute inset-0 z-10 transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden rounded-2xl ${(isPaused || isGameOver || isCleared) ? 'translate-y-[100%]' : 'translate-y-0'}`}>

              {/* Gradient transition matching HUD */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#0f172a] to-transparent z-[5] pointer-events-none" />

              {/* Drawer Handle Visual */}
              {(isPaused || isGameOver || isCleared) && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full mt-2 z-20" />
              )}

              <canvas ref={canvasRef} width={450} height={800} className="w-full h-full" />

              {/* Combo Display (floating on drawer) */}
              {combo > 1 && (
                <div className="absolute top-8 right-4 flex flex-col items-end animate-in zoom-in-50 slide-in-from-right-8 fade-in duration-200 pointer-events-none">
                  <span className="text-5xl font-black text-white italic leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-tighter">{combo}</span>
                  <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.3em]">COMBO</span>
                </div>
              )}

              {/* Resume Countdown Overlay - In Game Drawer */}
              {resumeCountdown !== null && (
                <div className="absolute inset-0 z-[150] flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300">
                  <div className="flex flex-col items-center">
                    <span className="text-8xl font-black italic text-white uppercase tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.6)] animate-in zoom-in-50 duration-300">
                      {resumeCountdown > 0 ? resumeCountdown : 'GO!'}
                    </span>
                    <p className="text-xs font-bold text-white/60 uppercase tracking-[0.4em] mt-4 drop-shadow-md">Prepare for Flow</p>
                  </div>
                </div>
              )}

              {/* Start Overlay - Always on Drawer */}
              {!isActive && !isCleared && !isGameOver && (
                <div className="absolute inset-0 z-[110] flex flex-col items-center rounded-2xl overflow-hidden">
                  {/* Background Art */}
                  {currentSong?.coverArt && (
                    <div className="absolute inset-0 z-0">
                      <img src={currentSong.coverArt} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {/* Shifting Color Overlay */}
                  <div
                    className="absolute inset-0 z-0 opacity-85 transition-colors duration-500"
                    style={{ backgroundColor: 'var(--active-bg, #0f172a)' }}
                  />
                  {/* Glassmorphic Blur Overlay */}
                  <div className="absolute inset-0 z-0 backdrop-blur-3xl" />

                  {/* Top Bar (Abort & Resources) */}
                  <div className="w-full p-6 flex justify-between items-center relative z-20">
                    <button onClick={handleAbort} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/10 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                      <span className="text-xs font-bold text-white flex items-center gap-1">{globalHearts}<span className="text-red-500 text-[10px]">❤️</span></span>
                      <div className="w-px h-3 bg-white/10"></div>
                      <span className="text-xs font-bold text-white flex items-center gap-1">{globalShields}<span className="text-blue-500 text-[10px]">🛡️</span></span>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 w-full flex flex-col items-center justify-center relative z-20 px-6 sm:px-8 py-8 sm:pb-12 gap-6 sm:gap-8">

                    {/* Album Art & Title */}
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 relative group">
                        {currentSong?.coverArt ? (
                          <img src={currentSong.coverArt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><span className="text-4xl">🎵</span></div>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter leading-tight drop-shadow-lg max-w-[280px] sm:max-w-[300px] mx-auto truncate">
                          {currentSong?.fileName.replace(/\.[^/.]+$/, "")}
                        </h2>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Ready to Play</p>
                      </div>
                    </div>

                    {/* Settings Container */}
                    <div className="w-full max-w-xs space-y-4 sm:space-y-6">

                      {/* Selectors */}
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="w-full bg-[#1e1b4b]/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 sm:p-6 flex flex-row gap-2 shadow-2xl">
                          {['classic', 'endless'].map(m => (
                            <button
                              key={m}
                              onClick={() => setSelectedMode(m as any)}
                              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-md transition-all ${selectedMode === m ? 'bg-[#312e81] text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Play Button */}
                      {(() => {
                        const { canAfford } = checkCanAfford();
                        return (
                          <button
                            onClick={canAfford ? startGame : undefined}
                            className={`w-full py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-2
                                  ${canAfford ? 'bg-[#1ed760] text-black hover:bg-[#1fdf64] hover:scale-105' : 'bg-red-900/20 text-red-500 border border-red-500/20 cursor-not-allowed'}`}
                          >
                            {canAfford ? 'START' : 'INSUFFICIENT FUNDS'}
                          </button>
                        );
                      })()}
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>

        </div >

        {feedback && (
          <div className="absolute top-[20%] left-0 right-0 flex justify-center pointer-events-none z-[150] animate-in zoom-in-50 fade-in duration-150">
            <p
              className={`font-black italic uppercase ${feedback.color}`}
              style={{
                fontSize: `${1.5 * feedback.scale}rem`,
                transform: `scale(${feedback.scale}) rotate(${Math.random() * 10 - 5}deg)`
              }}
            >
              {feedback.text}
            </p>
          </div>
        )}

        <audio
          ref={audioRef}
          onEnded={handleFinish}
          onLoadedMetadata={() => durationRef.current = audioRef.current?.duration || 1}
        />
      </div >
    </>
  );
};
