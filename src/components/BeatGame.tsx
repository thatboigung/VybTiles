
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AudioAnalysis, GameMode, Level } from '../types';

const LANES = 4;
const TARGET_Y_RATIO = 0.8;
const CLASSIC_COMPLETION_THRESHOLD = 0.75;

const BG_PALETTE = [
  '#1e1b4b', // Royal Indigo (Focus Base

  '#111827', // Obsidian (Immersion Depth)
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
        <h2 className="text-3xl font-black italic text-white uppercase mb-6 tracking-tighter">How to Play: {mode === 'viberush' ? 'VIBE RUSH' : mode.toUpperCase()}</h2>
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
  allSongs?: AudioAnalysis[]; // Full history for Vibe Rush Mode shuffle
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
  wiggleSpeed?: number; // New: Speed of wiggle (0.5 or 1.0)
  bpm?: number; // New: Store BPM at generation for stable lane shifting
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
  playlist, allSongs, onExit, globalHearts, globalShields, userPerfects, onUseCurrency, onFinish, initialMode, onStartPlay
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [selectedMode, setSelectedMode] = useState<GameMode>(initialMode || (playlist.length > 1 ? 'viberush' : 'classic'));
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
  const [feedback, setFeedback] = useState<{ text: string; color: string; scale: number; rotation: number } | null>(null);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const [ultraFocus, setUltraFocus] = useState(false);

  // Shuffle queue for Vibe Rush Mode
  const [shuffleQueue, setShuffleQueue] = useState<AudioAnalysis[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [vibeRushesCompleted, setVibeRushesCompleted] = useState(0);

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
  const coverArtRef = useRef<HTMLImageElement | null>(null); // Current cover art for render
  const incomingCoverArtRef = useRef<HTMLImageElement | null>(null); // Incoming art during crossfade
  const crossfadeVisualProgressRef = useRef(1); // 0=fully old art, 1=fully new art
  const currentSongRef = useRef<AudioAnalysis | undefined>(undefined);
  const activeSongRef = useRef<AudioAnalysis | undefined>(undefined); // Metadata for the CURRENTLY active tiles (BPM stability)
  const songDurationRef = useRef<number>(120); // Fallback to 120s

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

  // Crossfade & endless duration refs
  const audioRefB = useRef<HTMLAudioElement>(null);
  const activeAudioRef = useRef<'A' | 'B'>('A'); // Which audio element is currently playing
  const crossfadeTimerRef = useRef<number | null>(null); // requestAnimationFrame ID for crossfade
  const endlessSongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Random duration timer
  const crossfadeInProgressRef = useRef(false);
  const crossfadeToNextSongRef = useRef<(() => void) | null>(null); // Ref to break circular dep
  const crossfadeTimeOffsetRef = useRef(0); // Cumulative time offset for continuous tile flow
  const transitionGraceRef = useRef(0); // Timestamp for 2s grace period after transition
  const rushStartTimeRef = useRef(0); // Start displayTime of the current 3-minute rush
  const isChoiceActiveRef = useRef(false); // Whether we are currently in the "Next Rush?" decision phase
  const rushMissCountRef = useRef(0); // Track consecutive misses during the choice phase

  // Initialize shuffle queue for Vibe Rush Mode
  React.useEffect(() => {
    if (selectedMode === 'viberush' && allSongs && allSongs.length > 0) {
      // Ensure the first song in the playlist is at the start of the queue
      const baseTrack = playlist[0];
      const otherSongs = allSongs.filter(s => s.id !== baseTrack?.id);
      const shuffled = [baseTrack, ...otherSongs.sort(() => Math.random() - 0.5)].filter(Boolean) as AudioAnalysis[];

      setShuffleQueue(shuffled);
      setQueueIndex(0);
    }
  }, [selectedMode, allSongs, playlist]);

  const currentSong = selectedMode === 'viberush' && shuffleQueue.length > 0
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

  // Keep refs in sync for the render loop (avoids stale closure)
  useEffect(() => {
    // Do NOT update coverArtRef during a crossfade — the crossfade function controls it
    if (crossfadeInProgressRef.current) return;
    coverArtRef.current = coverArtElement;
  }, [coverArtElement]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);


  // Pick a random duration for Vibe Rush Mode (20s to 100s, biased toward 30-60s)
  const getRandomEndlessDuration = () => {
    // Use a distribution that favors 30-60s
    const ranges = [
      { min: 20, max: 30, weight: 15 },
      { min: 30, max: 60, weight: 50 },
      { min: 60, max: 90, weight: 25 },
      { min: 90, max: 100, weight: 10 },
    ];
    const totalWeight = ranges.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const range of ranges) {
      roll -= range.weight;
      if (roll <= 0) {
        return range.min + Math.random() * (range.max - range.min);
      }
    }
    return 40; // fallback
  };

  // Schedule next song transition timer for Vibe Rush Mode
  const scheduleEndlessSongSwitch = useCallback(() => {
    // Clear existing timer
    if (endlessSongTimerRef.current !== null) {
      clearTimeout(endlessSongTimerRef.current);
      endlessSongTimerRef.current = null;
    }
    if (selectedMode !== 'viberush') return;

    const duration = getRandomEndlessDuration();
    console.log(`[Endless] Next song switch in ${duration.toFixed(1)}s`);
    endlessSongTimerRef.current = setTimeout(() => {
      endlessSongTimerRef.current = null;
      // Call through ref to always get the latest version
      crossfadeToNextSongRef.current?.();
    }, duration * 1000);
  }, [selectedMode]);

  // Crossfade from current audio to next song
  const crossfadeToNextSong = useCallback(() => {
    if (selectedMode !== 'viberush' || !shuffleQueue.length || crossfadeInProgressRef.current) return;

    // Clear the endless timer if it's still running
    if (endlessSongTimerRef.current !== null) {
      clearTimeout(endlessSongTimerRef.current);
      endlessSongTimerRef.current = null;
    }

    let nextIndex = queueIndex + 1;
    let activeQueue = shuffleQueue;
    if (nextIndex >= shuffleQueue.length) {
      activeQueue = [...shuffleQueue].sort(() => Math.random() - 0.5);
      setShuffleQueue(activeQueue);
      nextIndex = 0;
    }

    setQueueIndex(nextIndex);
    const nextSong = activeQueue[nextIndex];
    if (!nextSong?.fileUrl) return;

    // Keep score, combo, gold, hearts, shields — DON'T RESET THEM!
    setIsCleared(false);
    setIsGameOver(false);
    setIsFailing(false);
    setCompletion(0);
    setActiveLives(1);

    // Determine outgoing and incoming audio elements
    const outgoing = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
    const incoming = activeAudioRef.current === 'A' ? audioRefB.current : audioRef.current;
    const newActive = activeAudioRef.current === 'A' ? 'B' : 'A';

    if (!incoming || !outgoing) return;

    crossfadeInProgressRef.current = true;
    crossfadeVisualProgressRef.current = 0;

    // Preload incoming cover art directly (bypass React state pipeline)
    if (nextSong.coverArt) {
      const img = new Image();
      img.src = nextSong.coverArt;
      img.onload = () => { incomingCoverArtRef.current = img; };
    } else {
      incomingCoverArtRef.current = null;
    }

    // Prepare incoming audio (plays silently, fades in)
    incoming.src = nextSong.fileUrl;
    incoming.currentTime = 0;
    incoming.volume = 0;
    incoming.playbackRate = 1;
    incoming.play().catch(e => console.error('Crossfade play blocked', e));

    // DON'T switch active audio yet — old tiles still need old audio for timing
    // DON'T load new notes yet — old tiles play through the crossfade

    // Crossfade animation (10 seconds)
    const fadeDuration = 10000;
    const startTime = performance.now();

    const animateCrossfade = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / fadeDuration);

      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      if (outgoing) outgoing.volume = Math.max(0, 1 - eased);
      if (incoming) incoming.volume = Math.min(1, eased);
      crossfadeVisualProgressRef.current = eased;

      if (progress < 1) {
        crossfadeTimerRef.current = requestAnimationFrame(animateCrossfade);
      } else {
        // === CROSSFADE COMPLETE (10s elapsed) ===
        if (outgoing) { outgoing.pause(); outgoing.volume = 1; }
        if (incoming) incoming.volume = 1;

        const oldDisplayTime = (outgoing?.currentTime || 0) + crossfadeTimeOffsetRef.current;

        crossfadeTimerRef.current = null;
        crossfadeInProgressRef.current = false;
        crossfadeVisualProgressRef.current = 1;

        // Move incoming art to current, clear incoming
        if (incomingCoverArtRef.current) {
          coverArtRef.current = incomingCoverArtRef.current;
        }
        incomingCoverArtRef.current = null;

        // NOW switch active audio and accumulate time offset precisely
        // The new offset should make (incoming.currentTime + newOffset) === oldDisplayTime
        const newOffset = oldDisplayTime - (incoming?.currentTime || 0);
        crossfadeTimeOffsetRef.current = newOffset;
        activeAudioRef.current = newActive;
        activeSongRef.current = nextSong; // Now we switch BPM for the new song

        // Start 2-second grace period (no failure for missing tiles)
        transitionGraceRef.current = Date.now();

        // After 2s gap, load the new song's tiles at the then-current display time
        setTimeout(() => {
          const currentDT = (incoming?.currentTime || 0) + crossfadeTimeOffsetRef.current;
          loadTrackNotes(nextSong, crossfadeTimeOffsetRef.current, true, currentDT);
          scheduleEndlessSongSwitch();
        }, 2000);
      }
    };

    if (crossfadeTimerRef.current !== null) {
      cancelAnimationFrame(crossfadeTimerRef.current);
    }
    crossfadeTimerRef.current = requestAnimationFrame(animateCrossfade);

    incoming.addEventListener('loadedmetadata', () => {
      durationRef.current = incoming.duration || 1;
    }, { once: true });

    setIsActive(true);
    if (onStartPlay) onStartPlay(nextSong);
  }, [selectedMode, shuffleQueue, queueIndex, scheduleEndlessSongSwitch]);

  // Keep the ref in sync with the latest crossfadeToNextSong
  useEffect(() => {
    crossfadeToNextSongRef.current = crossfadeToNextSong;
  }, [crossfadeToNextSong]);


  const triggerVibeRushChoiceRef = useRef<((spawnTime: number) => void) | null>(null);

  const triggerVibeRushChoice = useCallback((spawnTime: number) => {
    // INCREASE HEADROOM: Since speed is halved, we spawn further ahead
    // 4 seconds at half speed = same visual position as 2 seconds at full speed
    const adjustedSpawnTime = spawnTime + 2;

    // 1. Spawning the "Next Rush?" title tiles (spanning 2 columns)
    const titleTiles: Note[] = [
      {
        id: 'viberush-title-1',
        time: adjustedSpawnTime,
        lane: 1,
        hit: false,
        missed: false,
        type: 'tile',
        powerUp: 'none',
        isLong: false,
      },
      {
        id: 'viberush-title-2',
        time: adjustedSpawnTime,
        lane: 2,
        hit: false,
        missed: false,
        type: 'tile',
        powerUp: 'none',
        isLong: false,
      }
    ];

    // 2. Spawning the "Yes" and "No" decision tiles shortly after
    const yesTile: Note = {
      id: 'viberush-choice-yes',
      time: adjustedSpawnTime + 1.2,
      lane: 0,
      hit: false,
      missed: false,
      type: 'tile',
      powerUp: 'none',
      isLong: false,
    };

    const noTile: Note = {
      id: 'viberush-choice-no',
      time: adjustedSpawnTime + 1.2,
      lane: 3,
      hit: false,
      missed: false,
      type: 'tile',
      powerUp: 'none',
      isLong: false,
    };

    notesRef.current = [...notesRef.current, ...titleTiles, yesTile, noTile];
  }, []);

  useEffect(() => {
    triggerVibeRushChoiceRef.current = triggerVibeRushChoice;
  }, [triggerVibeRushChoice]);


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
    setFeedback({ text, color, scale, rotation: Math.random() * 12 - 6 });
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

        // Clear endless timers on failure
        if (endlessSongTimerRef.current !== null) {
          clearTimeout(endlessSongTimerRef.current);
          endlessSongTimerRef.current = null;
        }
        if (crossfadeTimerRef.current !== null) {
          cancelAnimationFrame(crossfadeTimerRef.current);
          crossfadeTimerRef.current = null;
        }
        crossfadeInProgressRef.current = false;

        // Calculate Completion based on Song Progress on Failure
        if (durationRef.current > 0) {
          const progress = (currentTimeRef.current / durationRef.current) * 100;
          setCompletion(Math.floor(progress));
        }

        // Calculate Partial EXP
        const baseExp = 100 + (sessionPerfects * 5);
        const scoreExp = Math.floor(score / 100);
        const earned = baseExp + scoreExp;
        setExpEarned(earned);

        // Add 20 Stars per completed VibeRush
        const rushStars = vibeRushesCompleted * 20;
        setSessionPerfects(p => p + rushStars);

        // Get the currently active audio element for slowdown
        const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
        const inactiveAudio = activeAudioRef.current === 'A' ? audioRefB.current : audioRef.current;

        // Stop inactive audio immediately (if crossfading)
        if (inactiveAudio && !inactiveAudio.paused) {
          inactiveAudio.pause();
          inactiveAudio.volume = 1;
        }

        if (activeAudio) {
          const audio = activeAudio;
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
              audio.playbackRate = newRate;
              audioEffectRef.current = requestAnimationFrame(slowdown);
            } else {
              audio.pause();
              audio.playbackRate = 1;
              (audio as any).preservesPitch = true;
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
    const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
    const t = (activeAudio?.currentTime || 0) + crossfadeTimeOffsetRef.current;

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
        const effectiveSpeed = n.id.startsWith('viberush') ? speed * 0.5 : speed;
        const nY = targetY - ((n.time - t) * effectiveSpeed);
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
      // Handle VibeRush Decision Tiles
      if (noteToHit.id === 'viberush-choice-yes') {
        noteToHit.hit = true;
        setVibeRushesCompleted(prev => prev + 1);
        rushStartTimeRef.current = t; // Reset for next 3 minutes
        isChoiceActiveRef.current = false;
        rushMissCountRef.current = 0; // Reset misses

        // Restore playback speed if it was slowed down
        const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
        if (activeAudio) activeAudio.playbackRate = 1.0;

        // Resume note generation immediately
        if (currentSongRef.current) {
          loadTrackNotes(currentSongRef.current, crossfadeTimeOffsetRef.current, true, t);
        }
        setCompletion(0);
        if (progressBarRef.current) progressBarRef.current.style.width = '0%';
        showFeedback('VIBE RUSH!', 'text-yellow-400', 1.5);
        const effectiveSpeed = noteToHit.id.startsWith('viberush') ? speed * 0.5 : speed;
        spawnParticles(x, targetY - ((noteToHit.time - t) * effectiveSpeed), '#facc15', 50);
        return;
      }
      if (noteToHit.id === 'viberush-choice-no') {
        noteToHit.hit = true;
        handleSuccess();
        return;
      }
      if (noteToHit.id.startsWith('viberush-title')) {
        // Title tiles are decorative/indicators, don't block interaction but maybe no-op
        return;
      }

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

  const loadTrackNotes = (analysis: AudioAnalysis, timeOffset: number = 0, append: boolean = false, currentDisplayTime: number = 0) => {
    if (isChoiceActiveRef.current) return; // DON'T load regular notes during choice

    // CLASSIC MODE: Stop producing tiles after 75% of the song
    let beats = analysis.beats;
    const songDuration = analysis.duration || (beats.length > 0 ? beats[beats.length - 1] + 2 : 120);
    songDurationRef.current = songDuration; // Store for render loop

    if (selectedMode === 'classic') {
      const productionLimit = songDuration * CLASSIC_COMPLETION_THRESHOLD;
      beats = beats.filter(beatTime => beatTime <= productionLimit);
    }

    let excludeUntil = 0;
    const lastLaneTimes = new Array(LANES).fill(-1); // TRACK LAST SPAWN TIME IN EACH LANE

    const newNotes = beats.flatMap((beatTime, index) => {
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
      if (type === 'tile') {
        const moveChance = ultraFocus ? 0.5 : 0.25;
        if (selectedLevel === 'medium' || selectedLevel === 'hard' || ultraFocus) {
          isMoving = Math.random() < moveChance;
        }
      }

      // Long Tiles Logic
      let isLong = false;
      let duration = 0;
      if (type === 'tile' && !isMoving && Math.random() < 0.18) { // Slightly more frequent
        isLong = true;
        duration = 0.6 + Math.random() * 1.2; // Increased duration (0.6s - 1.8s)
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
        time: beatTime + timeOffset,
        lane: lane1,
        hit: false,
        missed: false,
        type,
        powerUp: powerType,
        isMoving,
        originalLane: lane1,
        isLong,
        duration,
        holdProgress: 0,
        wiggleSpeed: Math.random() < 0.5 ? 0.5 : 1.0,
        bpm: analysis.bpm
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
            time: nextBeatTime + timeOffset,
            lane: lane2,
            hit: false,
            missed: false,
            type: 'tile',
            powerUp: 'none',
            isLong: isLong2,
            duration: duration2,
            holdProgress: 0,
            bpm: analysis.bpm
          });

          lastLaneTimes[lane2] = nextBeatTime + (isLong2 ? duration2 : 0);
        }
      }

      return notes;
    });

    const filteredNewNotes = newNotes.filter(n => n.time > currentDisplayTime + 0.5);

    if (append) {
      // Keep only old notes within 2s ahead of current time — discard future notes
      // from old song to prevent double/stacked tiles with new song
      const keepOld = notesRef.current.filter(n => {
        if (n.hit) return true; // Always keep hit notes (for long-hold rendering)
        if (n.missed) return false; // Drop missed notes
        return n.time <= currentDisplayTime + 2; // Only keep notes near current time
      });
      notesRef.current = [...keepOld, ...filteredNewNotes];
    } else {
      notesRef.current = filteredNewNotes;
    }
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    actuallyStartGame();
  };

  // Move livesMap to a stable constant or useMemo if needed, but simple object is fine here
  const livesMap: Record<Level, number> = { easy: 2, medium: 1, hard: 0 };

  const checkCanAfford = () => {
    const shieldCost = selectedMode === 'viberush' ? 1 : livesMap[selectedLevel];
    return {
      canAfford: globalHearts >= 2 && globalShields >= shieldCost,
      shieldCost
    };
  };

  const rampAudioToSpeed = useCallback((targetSpeed: number = 1.0, duration: number = 3000) => {
    const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
    if (!activeAudio) return;

    // Cancel any active effect
    if (audioEffectRef.current !== null) {
      cancelAnimationFrame(audioEffectRef.current);
      audioEffectRef.current = null;
    }

    const audio = activeAudio;

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

    setActiveLives(selectedMode === 'viberush' ? 1 : livesMap[selectedLevel]);

    const startSong = selectedMode === 'viberush' && shuffleQueue.length > 0 ? shuffleQueue[0] : playlist[0];
    if (selectedMode === 'viberush') setQueueIndex(0);
    else setCurrentTrackIndex(0);

    // Reset crossfade state
    activeAudioRef.current = 'A';
    crossfadeInProgressRef.current = false;
    crossfadeTimeOffsetRef.current = 0; // Reset time offset for fresh game
    activeSongRef.current = startSong; // Initialize active metadata
    if (crossfadeTimerRef.current !== null) {
      cancelAnimationFrame(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    if (endlessSongTimerRef.current !== null) {
      clearTimeout(endlessSongTimerRef.current);
      endlessSongTimerRef.current = null;
    }
    // Stop audio B if it was playing
    if (audioRefB.current) {
      audioRefB.current.pause();
      audioRefB.current.volume = 1;
    }

    loadTrackNotes(startSong);
    particlesRef.current = [];

    setScore(0); setCombo(0); setSessionHearts(0); setSessionShields(0); setSessionPerfects(0); setPlayerLane(1);
    setCompletion(0); // Reset completion on game start
    setVibeRushesCompleted(0);
    rushStartTimeRef.current = 0;
    isChoiceActiveRef.current = false;
    rushMissCountRef.current = 0;

    // Restore playback speed
    const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
    if (activeAudio) activeAudio.playbackRate = 1.0;

    setIsActive(true); setIsPaused(false); setIsGameOver(false); setIsCleared(false); setInvincible(false);

    // Reset background transition time
    bgRef.current.lastChangeTime = 0;

    // Immediate Start with Slow Motion Ramp
    if (audioRef.current) {
      audioRef.current.src = startSong.fileUrl || '';
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1;
      rampAudioToSpeed(1.0, 3000);
    }

    // Schedule first random song switch for Vibe Rush Mode
    if (selectedMode === 'viberush') {
      scheduleEndlessSongSwitch();
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
    if (selectedMode === 'viberush') {
      // Song ended naturally before the random timer — still crossfade to next
      if (endlessSongTimerRef.current !== null) {
        clearTimeout(endlessSongTimerRef.current);
        endlessSongTimerRef.current = null;
      }
      crossfadeToNextSong();
    } else {
      // Guard: Don't mark as cleared or 100% if we already failed
      if (isGameOver || isFailing) return;

      // EXP Formula: Base 300 + Performance
      const earned = 300 + (sessionPerfects * 10);
      setExpEarned(earned);

      // Add 20 Stars per completed VibeRush
      const rushStars = vibeRushesCompleted * 20;
      setSessionPerfects(p => p + rushStars);

      setIsCleared(true);
      const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
      if (activeAudio) activeAudio.pause();
      // Also pause inactive audio (if crossfading)
      const inactiveAudio = activeAudioRef.current === 'A' ? audioRefB.current : audioRef.current;
      if (inactiveAudio && !inactiveAudio.paused) inactiveAudio.pause();

      // Calculate Completion based on Song Progress (Time Elapsed)
      // On finish, it's 100%
      setCompletion(100);
    }
  };

  const handleSuccess = useCallback(() => {
    // End game as successful (used for Choice: NO)
    setIsActive(false);

    // Add 20 Stars per completed VibeRush 
    // (Note: handleFinish also handles this, but let's be explicit for Choice: NO)
    const rushStars = vibeRushesCompleted * 20;
    setSessionPerfects(p => p + rushStars);

    // Performance EXP
    const earned = 500 + (sessionPerfects * 15);
    setExpEarned(earned);

    setCompletion(100);
    setIsCleared(true);

    const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
    if (activeAudio) activeAudio.pause();
    const inactiveAudio = activeAudioRef.current === 'A' ? audioRefB.current : audioRef.current;
    if (inactiveAudio) inactiveAudio.pause();
  }, [sessionPerfects, vibeRushesCompleted]);



  const handleAbort = () => {
    // Clean up all crossfade / endless timers
    if (endlessSongTimerRef.current !== null) {
      clearTimeout(endlessSongTimerRef.current);
      endlessSongTimerRef.current = null;
    }
    if (crossfadeTimerRef.current !== null) {
      cancelAnimationFrame(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    if (audioRefB.current) { audioRefB.current.pause(); audioRefB.current.volume = 1; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.volume = 1; }
    crossfadeInProgressRef.current = false;

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
      const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
      if (activeAudio) {
        activeAudio.playbackRate = 1.0; // Ensure speed is reset to normal
        activeAudio.play();
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
    // Clean up crossfade / endless timers
    if (endlessSongTimerRef.current !== null) {
      clearTimeout(endlessSongTimerRef.current);
      endlessSongTimerRef.current = null;
    }
    if (crossfadeTimerRef.current !== null) {
      cancelAnimationFrame(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    crossfadeInProgressRef.current = false;

    // Force reset both audio elements
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.playbackRate = 1;
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1;
      (audioRef.current as any).preservesPitch = true;
    }
    if (audioRefB.current) {
      audioRefB.current.pause();
      audioRefB.current.playbackRate = 1;
      audioRefB.current.currentTime = 0;
      audioRefB.current.volume = 1;
    }
    activeAudioRef.current = 'A';

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

      const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
      const t = activeAudio?.currentTime || 0;
      // Add accumulated time offset for continuous tile flow across song transitions
      const offsetT = t + crossfadeTimeOffsetRef.current;
      // Freeze time visually if failing
      if (!isFailing) {
        currentTimeRef.current = offsetT;
      }
      const displayTime = isFailing ? currentTimeRef.current : offsetT;
      let progress = 0;

      if (selectedMode === 'viberush') {
        const rushElapsed = displayTime - rushStartTimeRef.current;
        progress = Math.max(0, Math.min(1, rushElapsed / 180));
        setCompletion(Math.floor(progress * 100));

        // TRIGGER VIBE RUSH CHOICE phase
        if (progress >= 1 && !isChoiceActiveRef.current) {
          isChoiceActiveRef.current = true;
          // Spawn choice tiles slightly ahead of current time
          triggerVibeRushChoiceRef.current?.(displayTime + 2);
        }
      } else {
        // CLASSIC MODE: Complete at 75%
        const effectiveDuration = durationRef.current > 5 ? durationRef.current : songDurationRef.current;
        const rawProgress = displayTime / effectiveDuration;
        progress = Math.min(1, rawProgress / CLASSIC_COMPLETION_THRESHOLD);
        setCompletion(Math.floor(progress * 100));

        if (progress >= 1 && !isCleared && !isGameOver && effectiveDuration > 10) {
          // Wait for 5 seconds after reaching 100% progress (75% mark reached + 5s buffer)
          const classicLimit = effectiveDuration * CLASSIC_COMPLETION_THRESHOLD;
          if (displayTime >= classicLimit + 5) {
            handleSuccess();
            showFeedback('CLASSIC COMPLETE!', 'text-green-400', 1.5);
            return;
          }
        }
      }

      // Periodically clean up old notes that have scrolled past (every ~60 frames)
      if (selectedMode === 'viberush' && Math.random() < 0.02) {
        notesRef.current = notesRef.current.filter(n =>
          displayTime - n.time < 5 || (!n.missed && !n.hit)
        );
      }

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress * 100}%`;
      }

      const w = canvas.width, h = canvas.height, targetY = h * TARGET_Y_RATIO, lW = w / LANES;

      if (shake > 0) setShake(s => Math.max(0, s - 2));

      ctx.clearRect(0, 0, w, h);

      // Draw Cover Art Background (Cover Scale) — with crossfade between old and new
      const drawCoverArt = (img: HTMLImageElement, alpha: number) => {
        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let dW, dH, dX, dY;
        if (canvasRatio > imgRatio) {
          dW = w; dH = w / imgRatio; dX = 0; dY = (h - dH) / 2;
        } else {
          dH = h; dW = h * imgRatio; dX = (w - dW) / 2; dY = 0;
        }
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, dX, dY, dW, dH);
        ctx.globalAlpha = 1.0;
      };

      // Use crossfade visual progress synced with audio crossfade
      const vp = crossfadeVisualProgressRef.current;

      // Draw current cover art (old art fading out during crossfade)
      if (coverArtRef.current) {
        drawCoverArt(coverArtRef.current, vp < 1 ? (1 - vp) : 1);
      }
      // Draw incoming cover art (new art fading in during crossfade)
      if (incomingCoverArtRef.current && vp < 1) {
        drawCoverArt(incomingCoverArtRef.current, vp);
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
      if (coverArtRef.current || incomingCoverArtRef.current) {
        ctx.globalAlpha = 0.50; // Increased background visibility
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

      // Render Connectors for simultaneous tiles (Double Tiles)
      // Group by time
      const visibleNotes = notesRef.current.filter(n => {
        if (n.hit || n.missed) return false;
        const effSpeed = n.id.startsWith('viberush') ? speed * 0.5 : speed;
        const range = (h / effSpeed) + 1;
        const tDiff = n.time - displayTime;
        return tDiff <= range && tDiff >= -0.15;
      });
      const timeGroups = new Map<number, Note[]>();
      visibleNotes.forEach(n => {
        if (!timeGroups.has(n.time)) timeGroups.set(n.time, []);
        timeGroups.get(n.time)!.push(n);
      });

      timeGroups.forEach((group) => {
        if (group.length > 1) {
          const effSpeed = group[0].id.startsWith('viberush') ? speed * 0.5 : speed;
          const y = targetY - ((group[0].time - displayTime) * effSpeed);
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
        if (note.isMoving && !note.hit && !note.missed && note.originalLane !== undefined) {
          // Switch lanes every 2 beats (Half BPM)
          // Period = 2 * (60 / BPM)
          // Use the BPM stored on the note for stability
          const noteBpm = note.bpm || activeSongRef.current?.bpm || 120;
          const beatDuration = 60 / noteBpm;
          const switchPeriod = beatDuration * 2;

          // Calculate vertical position Y to check if we should still move
          // We need to calculate Y same as below
          const timeToHit = note.time - displayTime;
          const effSpeed = note.id.startsWith('viberush') ? speed * 0.5 : speed;
          const yPos = targetY - (timeToHit * effSpeed);

          // Stop moving if we are past the middle of the screen (0.5 * h)
          // This gives the user time to react
          // NEW: Only switch lanes if ultraFocus is enabled
          if (ultraFocus && yPos < h * 0.5) {
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
              // Skip failure during 2s grace period after song transition
              if (Date.now() - transitionGraceRef.current > 2000) {
                setScore(s => Math.max(0, s - 300));
                handleFailure(note.id);
                showFeedback('BEAT MISSED', 'text-red-500', 1.0);
              }
              return;
            }
          }
        }

        if (note.hit && !note.isLong) return;
        if (note.hit && note.isLong && note.isFullyHeld) return;

        const timeDiff = note.time - displayTime;
        const effSpeed = note.id.startsWith('viberush') ? speed * 0.5 : speed;
        const range = (h / effSpeed) + 1;
        if (timeDiff > range) return;
        if (timeDiff < -0.15 && !isFailing) { // Reduced threshold for missing tiles
          if (!note.hit && !note.missed) {
            // VIBERUSH PERSISTENCE: If missed a choice or title, respawn it!
            if (isChoiceActiveRef.current && note.id.startsWith('viberush')) {
              // Only increment on ONE tile per wave to avoid triple/quadruple counting
              if (note.id === 'viberush-choice-yes') {
                rushMissCountRef.current++;
              }

              // 2nd Miss: SLOW DOWN (0.5x)
              if (rushMissCountRef.current === 2) {
                const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
                if (activeAudio) activeAudio.playbackRate = 0.5;
                showFeedback('FOCUS! SLOWING DOWN...', 'text-yellow-400', 2.0);
              }

              // 3rd Miss: AUTO-SUCCESS (Game Completed)
              if (rushMissCountRef.current >= 3) {
                isChoiceActiveRef.current = false;
                rushMissCountRef.current = 0;
                const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
                if (activeAudio) activeAudio.playbackRate = 1.0;
                handleSuccess();
                showFeedback('SESSION COMPLETE!', 'text-green-400', 2.0);
                return;
              }

              // Slower fall means we need to respawn further ahead
              note.time = displayTime + 4.0;
              return; // Don't mark as missed
            }

            note.missed = true;
            // Skip failure during 2s grace period after song transition
            if (Date.now() - transitionGraceRef.current > 2000) {
              setScore(s => Math.max(0, s - 500)); // Penalty for skipping
              setCombo(0);
              handleFailure(note.id);
              showFeedback('MISS', 'text-red-500', 1.0);
            }
          }
          // Only return if it's NOT a long tile being held/processed
          if (!note.isLong || !note.hit) return;
        }

        // Lock Y to targetY if note is hit but still active (long tile)
        const effectiveSpeed = note.id.startsWith('viberush') ? speed * 0.5 : speed;
        const y = (note.hit && note.isLong) ? targetY : targetY - (timeDiff * effectiveSpeed);

        if (y > -200 && y < h + 200) {
          const x = (note.lane * lW) + (lW / 2);
          let nW = lW * 0.92, nH = 150;

          // BPM-Synced Bouncing for VibeRush tiles
          if (note.id.startsWith('viberush')) {
            const bpm = activeSongRef.current?.bpm || 120;
            const bouncePeriod = (60 / bpm) * 2000; // Period for half BPM in ms (2 beats)
            const bounceScale = 1 + 0.1 * Math.abs(Math.sin((Date.now() % bouncePeriod) * (Math.PI / bouncePeriod)));
            nW *= bounceScale;
            nH *= bounceScale;
          }

          // Draw Tail for Long Tiles
          if (note.isLong && note.duration) {
            const tailHeight = note.duration * speed;
            const isHeld = holdingNotesRef.current.has(note.id);
            const hitAge = now - laneHits[note.lane];
            const popScale = hitAge < 200 ? 1 + (0.2 * (1 - hitAge / 200)) : 1;

            // Beat-synced Wiggle Logic
            const wiggleIntensity = isHeld ? (4 + (note.holdProgress || 0) * 8) : 0;
            const currentWiggleSpeed = note.wiggleSpeed || 1.0;
            const wiggleOffset = isHeld ? Math.sin(now / (40 / currentWiggleSpeed)) * wiggleIntensity : 0;
            const renderX = x + wiggleOffset;

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
                spawnParticles(renderX, targetY, '#22d3ee', 40); // Cyan splash
                showFeedback('VIBE!', 'text-cyan-400', 1.8); // High impact Vibe
              }

              if (isHeld) {
                setScore(s => s + 10);
                if (Math.random() < 0.4) {
                  spawnParticles(renderX, targetY, '#fff', 5);
                }
              }
            }

            ctx.save();
            const tailY = y - tailHeight;
            const tailWidth = nW * 0.45 * popScale;

            // 1. Draw Tail Container (Dark "Empty" part)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.roundRect(renderX - tailWidth / 2, tailY, tailWidth, tailHeight, 4);
            ctx.fill();

            // 2. Draw Tail Outline
            ctx.strokeStyle = isHeld ? 'rgba(34, 211, 238, 0.5)' : 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 3. Draw Vibe Fill (The "Vyb")
            if (note.hit) {
              const fillHeight = burntHeight;
              ctx.save();
              ctx.beginPath();
              // Clip to the container shape
              ctx.roundRect(renderX - tailWidth / 2, tailY, tailWidth, tailHeight, 4);
              ctx.clip();

              // Fill from the bottom (targetY) upwards
              const fillGrad = ctx.createLinearGradient(renderX, y, renderX, y - fillHeight);
              fillGrad.addColorStop(0, '#0ea5e9'); // Blue
              fillGrad.addColorStop(1, '#22d3ee'); // Cyan

              ctx.fillStyle = fillGrad;
              ctx.fillRect(renderX - tailWidth / 2, y - fillHeight, tailWidth, fillHeight);

              // 4. Energy Pulse (At the top of the fill level)
              if (isHeld && (note.holdProgress ?? 0) < 1) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#22d3ee';
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.roundRect(renderX - (tailWidth * 1.2) / 2, y - fillHeight - 2, tailWidth * 1.2, 4, 2);
                ctx.fill();
              }
              ctx.restore();
            }

            // 5. Draw "End Cap"
            ctx.fillStyle = isHeld ? '#fff' : 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.roundRect(renderX - (nW * 0.6 * popScale) / 2, tailY - 10, nW * 0.6 * popScale, 20 * popScale, 10);
            ctx.fill();

            ctx.restore();
          }

          ctx.save();

          // Flash effect for failed note
          if (isFailing && note.id === failedNoteId) {
            const flash = Math.sin(Date.now() / 50); // Fast blink
            ctx.fillStyle = flash > 0 ? '#ff0000' : '#ffffff';
          } else if (note.type === 'tile') {
            // No shadow/glow by default
            if (note.id.startsWith('viberush')) {
              ctx.shadowColor = '#facc15';
              ctx.shadowBlur = 25;
            }
          }

          ctx.beginPath();
          ctx.roundRect(x - nW / 2, y - nH / 2, nW, nH, 4);
          if (isFailing && note.id === failedNoteId) {
            ctx.fill(); // Already set style above
          } else if (note.type === 'tile' || note.type === 'powerup') {
            const depth = 12;
            const xOffset = x - nW / 2;
            const yOffset = y - nH / 2;
            const cornerRadius = 12; // More rounded for "block" feel

            // 1. Draw 3D Depth (Bottom Edge Shadow)
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.roundRect(xOffset, yOffset + depth, nW, nH, cornerRadius);
            ctx.fill();
            ctx.restore();

            // 2. Draw Main Tile Face
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(xOffset, yOffset, nW, nH, cornerRadius);
            ctx.clip();

            // Crossfade tile art between old and new cover during transitions
            const tileVP = crossfadeVisualProgressRef.current;
            const hasIncoming = incomingCoverArtRef.current && tileVP < 1;
            const hasCurr = coverArtRef.current;

            if (hasIncoming || hasCurr) {
              // Draw current/old cover art (fading out during crossfade)
              if (hasCurr && coverArtRef.current) {
                ctx.globalAlpha = tileVP < 1 ? (1 - tileVP) : 1;
                ctx.drawImage(coverArtRef.current, xOffset, yOffset, nW, nH);
              }
              // Draw incoming/new cover art (fading in during crossfade)
              if (hasIncoming && incomingCoverArtRef.current) {
                ctx.globalAlpha = tileVP;
                ctx.drawImage(incomingCoverArtRef.current, xOffset, yOffset, nW, nH);
              }
              ctx.globalAlpha = 1.0;
              // Face Lighting (Subtle top-down light)
              const faceGrad = ctx.createLinearGradient(x, yOffset, x, yOffset + nH);
              faceGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)'); // Top light
              faceGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
              faceGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');       // Bottom depth shadow
              ctx.fillStyle = faceGrad;
              ctx.fillRect(xOffset, yOffset, nW, nH);

              // CUSTOM VIBERUSH RENDERING
              if (note.id.startsWith('viberush')) {
                ctx.save();
                // Darken/Overlay to make text pop
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(xOffset, yOffset, nW, nH);

                ctx.fillStyle = '#fff';
                ctx.font = '900 italic 20px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                let label = '';
                if (note.id === 'viberush-title-1') label = 'NEXT';
                if (note.id === 'viberush-title-2') label = 'RUSH?';
                if (note.id === 'viberush-choice-yes') label = 'YES';
                if (note.id === 'viberush-choice-no') label = 'NO';

                ctx.fillText(label, xOffset + nW / 2, yOffset + nH / 2);
                ctx.restore();
              }
            } else {
              // Fallback if no cover art
              const baseColor = note.type === 'tile' ? '#4f46e5' : '#22c55e';
              ctx.fillStyle = baseColor;
              ctx.fill();
            }
            ctx.restore();

            // 3. Top Edge Highlight (Bevel effect)
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(xOffset + 1, yOffset + 1, nW - 2, nH - 2, cornerRadius);
            ctx.clip();
            ctx.beginPath();
            ctx.moveTo(xOffset, yOffset + 1);
            ctx.lineTo(xOffset + nW, yOffset + 1);
            ctx.stroke();
            ctx.restore();

            // Power-up Icon overlay
            if (note.type === 'powerup') {
              ctx.save();
              ctx.shadowBlur = 15;
              ctx.shadowColor = 'rgba(0,0,0,0.6)';
              ctx.fillStyle = 'white';
              ctx.font = 'bold 24px Inter';
              ctx.textAlign = 'center';
              ctx.fillText(note.powerUp === 'shield' ? '🛡️' : '❤️', x, y + 8);
              ctx.restore();
            }
          } else if (note.type === 'obstacle') {
            ctx.fillStyle = '#b91c1c'; ctx.fill();
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

  // Listen for audio ended event to auto-advance in Vibe Rush Mode (both audio elements)
  useEffect(() => {
    const audioA = audioRef.current;
    const audioB = audioRefB.current;

    const handleAudioEndedOnActive = (endedElement: HTMLAudioElement) => {
      // Only trigger if this is the currently active audio
      const isActiveA = activeAudioRef.current === 'A' && endedElement === audioA;
      const isActiveB = activeAudioRef.current === 'B' && endedElement === audioB;
      if ((isActiveA || isActiveB) && selectedMode === 'viberush') {
        crossfadeToNextSong();
      }
    };

    const onEndedA = () => audioA && handleAudioEndedOnActive(audioA);
    const onEndedB = () => audioB && handleAudioEndedOnActive(audioB);

    audioA?.addEventListener('ended', onEndedA);
    audioB?.addEventListener('ended', onEndedB);
    return () => {
      audioA?.removeEventListener('ended', onEndedA);
      audioB?.removeEventListener('ended', onEndedB);
    };
  }, [selectedMode, crossfadeToNextSong]);


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
              <div className="flex-shrink-0 relative">
                {currentSong?.coverArt ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shadow-2xl shrink-0 relative group">
                    {/* Playing Indicator Overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
                      <div className="flex gap-1">
                        <div className="w-1 h-3 bg-green-500 rounded-full animate-[bounce_1s_infinite]" />
                        <div className="w-1 h-4 bg-green-500 rounded-full animate-[bounce_1.2s_infinite]" />
                        <div className="w-1 h-2 bg-green-500 rounded-full animate-[bounce_0.8s_infinite]" />
                      </div>
                    </div>
                    <img key={currentSong.id} src={currentSong.coverArt} alt="Cover" className="w-full h-full object-cover animate-in fade-in duration-1000" />
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
                      {selectedMode === 'viberush' && (
                        <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">
                          TRK {queueIndex + 1}
                        </span>
                      )}

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
                        // Pause whichever audio is active
                        const activeAudio = activeAudioRef.current === 'A' ? audioRef.current : audioRefB.current;
                        activeAudio?.pause();
                        // Also pause inactive audio (if crossfading)
                        const inactiveAudio = activeAudioRef.current === 'A' ? audioRefB.current : audioRef.current;
                        if (inactiveAudio && !inactiveAudio.paused) inactiveAudio.pause();
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
              {/* Pause Overlay - Pro Redesign */}
              {isPaused && !isGameOver && !isCleared && (
                <div className="absolute inset-0 z-[120] flex flex-col items-center overflow-hidden animate-in fade-in duration-500 h-[100dvh] max-h-screen">
                  {/* Background Art with Soft Pulse */}
                  {currentSong?.coverArt && (
                    <div className="absolute inset-0 z-0">
                      <img
                        src={currentSong.coverArt}
                        className="w-full h-full object-cover scale-110 animate-[pulse_12s_infinite]"
                      />
                    </div>
                  )}

                  {/* Depth Overlays */}
                  <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                  <div className="absolute inset-0 z-0 backdrop-blur-md" />

                  {/* Top Bar Resources */}
                  <div className="w-full p-4 flex justify-between items-center relative z-20">
                    <button onClick={handleAbort} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/5 shadow-2xl">
                      <span className="text-[10px] font-black text-white flex items-center gap-1">{globalHearts}<span className="text-red-500 text-[9px]">❤️</span></span>
                      <div className="w-px h-2.5 bg-white/10 mx-1"></div>
                      <span className="text-[10px] font-black text-white flex items-center gap-1">{globalShields}<span className="text-blue-500 text-[9px]">🛡️</span></span>
                    </div>
                  </div>

                  {/* Main Pause Column */}
                  <div className="flex-1 w-full flex flex-col items-center justify-center relative z-20 px-6 gap-6 text-center pb-8 overflow-y-auto no-scrollbar">

                    {/* Header Group */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 mb-0.5">Session Suspended</span>
                      <h3 className="text-4xl font-black italic text-white uppercase tracking-tighter drop-shadow-2xl">Signal Interrupted</h3>
                    </div>

                    {/* Album Art Pod */}
                    <div className="relative group shrink-0">
                      <div className="absolute -inset-4 bg-white/5 rounded-full blur-2xl animate-pulse opacity-50"></div>
                      <div className="w-36 h-36 rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-[0_25px_50px_rgba(0,0,0,0.6)] relative z-10">
                        {currentSong?.coverArt ? (
                          <img src={currentSong.coverArt} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-3xl">🎵</span></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      </div>
                      <div className="absolute -bottom-2 translate-x-1/2 right-1/2 bg-zinc-950 px-3 py-1 rounded-lg border border-white/10 z-20 shadow-2xl min-w-[120px]">
                        <p className="text-[8px] font-black text-white/60 uppercase tracking-widest truncate">
                          {currentSong?.fileName.replace(/\.[^/.]+$/, "")}
                        </p>
                      </div>
                    </div>

                    {/* Action Sector */}
                    <div className="w-full max-w-[260px] space-y-3">
                      <button
                        onClick={startResumeCountdown}
                        className="group relative w-full py-4 rounded-2xl bg-white text-black font-black text-[12px] uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all overflow-hidden"
                      >
                        <span className="relative z-10">Resume Flow</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      </button>

                      <button
                        onClick={restartSession}
                        className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-95"
                      >
                        Restart Song
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {/* Game Over Screen - Pro Redesign */}
              {isGameOver && (
                <div className="absolute inset-0 z-[120] flex flex-col items-center overflow-hidden animate-in fade-in duration-500 h-[100dvh] max-h-screen">
                  {/* Background Art with Rhythmic Pulse */}
                  {currentSong?.coverArt && (
                    <div className="absolute inset-0 z-0">
                      <img
                        src={currentSong.coverArt}
                        className="w-full h-full object-cover grayscale opacity-40 scale-110 animate-[pulse_8s_infinite]"
                      />
                    </div>
                  )}

                  {/* Depth Overlays */}
                  <div className="absolute inset-0 z-0 bg-gradient-to-b from-black via-transparent to-black opacity-60" />
                  <div className="absolute inset-0 z-0 backdrop-blur-md" />

                  {/* Top Bar Resources */}
                  <div className="w-full p-4 flex justify-between items-center relative z-20">
                    <button onClick={handleAbort} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/5 shadow-2xl">
                      <span className="text-[10px] font-black text-white flex items-center gap-1">{globalHearts}<span className="text-red-500 text-[9px]">❤️</span></span>
                      <div className="w-px h-2.5 bg-white/10 mx-1"></div>
                      <span className="text-[10px] font-black text-white flex items-center gap-1">{globalShields}<span className="text-blue-500 text-[9px]">🛡️</span></span>
                    </div>
                  </div>

                  {/* Main Result Column */}
                  <div className="flex-1 w-full flex flex-col items-center justify-center relative z-20 px-6 gap-6 overflow-y-auto no-scrollbar pb-8 text-center">

                    {/* Header Group */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-red-500 opacity-80 leading-none">Better Luck Next Time</span>
                      <h3 className="text-4xl font-black italic text-white uppercase tracking-tighter drop-shadow-2xl">Game Over</h3>
                    </div>

                    {/* Compact Album Art Pod */}
                    <div className="relative group shrink-0">
                      <div className="absolute -inset-4 bg-red-600/20 rounded-full blur-2xl animate-pulse"></div>
                      <div className="w-28 h-28 rounded-[1.5rem] overflow-hidden border-2 border-white/20 shadow-2xl relative z-10 rotate-[-2deg]">
                        {currentSong?.coverArt ? (
                          <img src={currentSong.coverArt} className="w-full h-full object-cover grayscale opacity-80" />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-3xl">🎵</span></div>
                        )}
                        <div className="absolute inset-0 bg-red-950/40 mix-blend-overlay"></div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <p className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">Song Failed</p>
                      <h4 className="text-xs font-black text-white italic truncate max-w-[200px] mx-auto opacity-70 leading-none">
                        {currentSong?.fileName.replace(/\.[^/.]+$/, "")}
                      </h4>
                    </div>

                    {/* Stat Pods - Compacted */}
                    <div className="w-full max-w-[280px] grid grid-cols-2 gap-2">
                      <div className="col-span-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Final Score</span>
                        <span className="text-2xl font-black italic text-white tracking-tighter tabular-nums">{score.toLocaleString()}</span>
                      </div>
                      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Progress</span>
                        <span className="text-lg font-black italic text-white">{completion}%</span>
                      </div>
                      <div className="bg-indigo-500/10 backdrop-blur-2xl border border-indigo-500/20 rounded-2xl p-3 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">EXP Earned</span>
                        <span className="text-lg font-black italic text-white">+{expEarned}</span>
                      </div>
                      {selectedMode === 'viberush' && vibeRushesCompleted > 0 && (
                        <div className="col-span-2 bg-yellow-400/10 backdrop-blur-2xl border border-yellow-400/20 rounded-2xl p-3 flex flex-col items-center justify-center">
                          <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest mb-1">VibeRushes Completed</span>
                          <span className="text-lg font-black italic text-white">{vibeRushesCompleted} (+{vibeRushesCompleted * 20} Stars)</span>
                        </div>
                      )}
                    </div>

                    {/* Action Sector */}
                    <div className="w-full max-w-[280px] space-y-2">
                      {(() => {
                        const goldCost = 50 * (reviveCount + 1);
                        const canAffordRevive = userPerfects >= goldCost && globalShields >= 2;
                        return (
                          <button
                            onClick={handleRevive}
                            disabled={!canAffordRevive}
                            className={`group relative w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] overflow-hidden transition-all active:scale-95
                               ${canAffordRevive
                                ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.15)]"
                                : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                              }`}
                          >
                            <div className="relative z-10 flex items-center justify-center gap-2">
                              <span>Revive & Continue</span>
                              <span className="text-[9px] opacity-40">({goldCost}G + 2🛡️)</span>
                            </div>
                            {canAffordRevive && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>}
                          </button>
                        );
                      })()}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={restartSession}
                          className="py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[9px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95"
                        >
                          Restart
                        </button>
                        <button
                          onClick={handleClaimAwards}
                          className="py-3 rounded-2xl bg-red-600/20 border border-red-600/40 text-red-500 font-black text-[9px] uppercase tracking-[0.2em] hover:bg-red-600/30 transition-all active:scale-95"
                        >
                          Quit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Success Screen - Pro Redesign */}
              {isCleared && (
                <div className="absolute inset-0 z-[130] flex flex-col items-center overflow-hidden animate-in fade-in duration-500 h-[100dvh] max-h-screen">
                  {/* Background Art with Soft Rhythmic Pulse */}
                  {currentSong?.coverArt && (
                    <div className="absolute inset-0 z-0">
                      <img
                        src={currentSong.coverArt}
                        className="w-full h-full object-cover scale-110 animate-[pulse_10s_infinite]"
                      />
                    </div>
                  )}

                  {/* Depth Overlays */}
                  <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                  <div className="absolute inset-0 z-0 backdrop-blur-md" />

                  {/* Victory Glow */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px] animate-pulse"></div>
                  </div>

                  {/* Top Bar Resources */}
                  <div className="w-full p-4 flex justify-end items-center relative z-20">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/5 shadow-2xl">
                      <span className="text-[10px] font-black text-white flex items-center gap-1">{globalHearts}<span className="text-red-500 text-[9px]">❤️</span></span>
                      <div className="w-px h-2.5 bg-white/10 mx-1"></div>
                      <span className="text-[10px] font-black text-white flex items-center gap-1">{globalShields}<span className="text-blue-500 text-[9px]">🛡️</span></span>
                    </div>
                  </div>

                  {/* Main Achievement Column */}
                  <div className="flex-1 w-full flex flex-col items-center justify-center relative z-20 px-6 gap-4 overflow-y-auto no-scrollbar pb-8 text-center">

                    {/* Stars - More Compact */}
                    <div className="flex gap-3 mb-1 animate-in slide-in-from-bottom-4 duration-700">
                      <StarIcon active={true} className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] animate-bounce" />
                      <StarIcon active={true} className="w-9 h-9 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-[bounce_1.2s_infinite] -translate-y-2" />
                      <StarIcon active={true} className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] animate-[bounce_0.8s_infinite]" />
                    </div>

                    {/* Header Group */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-green-400 opacity-80 mb-0.5">Well Done!</span>
                      <h3 className="text-4xl font-black italic text-white uppercase tracking-tighter drop-shadow-2xl">
                        {selectedMode === 'viberush' ? 'Vibe Rush' : 'Song Cleared'}
                      </h3>
                    </div>

                    {/* Compact Album Art Pod */}
                    <div className="relative group shrink-0">
                      <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
                      <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden border-2 border-white/20 shadow-2xl relative z-10 scale-105">
                        {currentSong?.coverArt ? (
                          <img src={currentSong.coverArt} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-2xl">🎵</span></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <p className="text-[9px] font-black text-green-400 uppercase tracking-widest leading-none mb-1">Now Playing</p>
                      <h4 className="text-xs font-black text-white italic truncate max-w-[200px] mx-auto opacity-70 leading-none">
                        {currentSong?.fileName.replace(/\.[^/.]+$/, "")}
                      </h4>
                    </div>

                    {/* Reward & Stat Sector - Compacted */}
                    <div className="w-full max-w-[280px] space-y-2">
                      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <div className="flex flex-col items-start">
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Gold Earned</span>
                            <span className="text-lg font-black italic text-white">+{sessionPerfects}<span className="text-yellow-500 text-[9px] ml-1 uppercase not-italic">Gold</span></span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Stars Earned</span>
                            <span className="text-lg font-black italic text-yellow-400">+{completion >= 100 ? 10 : 5}⭐</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                            <span className="block text-[7px] font-black text-white/30 uppercase tracking-widest mb-0.5 text-left">Score</span>
                            <div className="text-sm font-black text-blue-400 italic text-left">{score.toLocaleString()}</div>
                          </div>
                          <div className="bg-black/20 rounded-xl p-2 border border-white/5">
                            <span className="block text-[7px] font-black text-white/30 uppercase tracking-widest mb-0.5 text-left">Accuracy</span>
                            <div className="text-sm font-black text-white italic text-left">{Math.floor(completion)}%</div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleClaimAwards}
                        className="group relative w-full py-4 rounded-2xl bg-[#1ed760] text-black font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(30,215,96,0.15)] hover:scale-[1.02] active:scale-95 transition-all overflow-hidden"
                      >
                        <span className="relative z-10">Claim Rewards</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      </button>
                    </div>
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
                    <p className="text-xs font-bold text-white/60 uppercase tracking-[0.4em] mt-4 drop-shadow-md">Get Ready</p>
                  </div>
                </div>
              )}

              {/* Start Overlay - Pro Redesign */}
              {!isActive && !isCleared && !isGameOver && (
                <div className="absolute inset-0 z-[110] flex flex-col items-center overflow-hidden animate-in fade-in duration-500 h-[100dvh] max-h-screen">
                  {/* Background Art with Soft Pulse */}
                  {currentSong?.coverArt && (
                    <div className="absolute inset-0 z-0">
                      <img
                        src={currentSong.coverArt}
                        className="w-full h-full object-cover scale-110 animate-[pulse_14s_infinite]"
                      />
                    </div>
                  )}

                  {/* Depth Overlays */}
                  <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                  <div className="absolute inset-0 z-0 backdrop-blur-md" />

                  {/* Top Bar Resources */}
                  <div className="w-full p-4 flex justify-between items-center relative z-20">
                    <button onClick={handleAbort} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/5 shadow-2xl">
                      <span className="text-[10px] font-black text-white flex items-center gap-1">{globalHearts}<span className="text-red-500 text-[9px]">❤️</span></span>
                      <div className="w-px h-2.5 bg-white/10 mx-1"></div>
                      <span className="text-[10px] font-black text-white flex items-center gap-1">{globalShields}<span className="text-blue-500 text-[9px]">🛡️</span></span>
                    </div>
                  </div>

                  {/* Main Start Column */}
                  <div className="flex-1 w-full flex flex-col items-center justify-center relative z-20 px-6 gap-4 text-center pb-8 overflow-y-auto no-scrollbar">

                    {/* Header Group */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-0.5 leading-none">Now Playing</span>
                      <h3 className="text-xl font-black italic text-white uppercase tracking-tighter drop-shadow-2xl max-w-[240px] truncate leading-tight">
                        {currentSong?.fileName.replace(/\.[^/.]+$/, "")}
                      </h3>
                    </div>

                    {/* Compact Album Art Pod */}
                    <div className="relative group shrink-0">
                      <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
                      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[1.5rem] overflow-hidden border-2 border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative z-10 transition-transform duration-700 group-hover:scale-105">
                        {currentSong?.coverArt ? (
                          <img src={currentSong.coverArt} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><span className="text-3xl">🎵</span></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      </div>
                    </div>

                    {/* Protocol Pod (Selector & Focus) */}
                    <div className="w-full max-w-[260px] space-y-3">
                      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
                        {/* Mode Selector */}
                        <div className="flex gap-1.5">
                          {['classic', 'viberush'].map(m => (
                            <button
                              key={m}
                              onClick={() => setSelectedMode(m as any)}
                              className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border ${selectedMode === m
                                ? 'bg-white text-black border-white shadow-md'
                                : 'bg-transparent text-white/40 border-white/10 hover:border-white/20'
                                }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>

                        {/* Ultra Focus Toggle */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <div className="flex flex-col items-start">
                            <span className="text-[9px] font-black text-white uppercase tracking-wider leading-none">Ultra Focus</span>
                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Minimal Lanes</span>
                          </div>
                          <button
                            onClick={() => setUltraFocus(!ultraFocus)}
                            className={`w-10 h-5 rounded-full relative transition-all duration-300 ${ultraFocus ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${ultraFocus ? 'left-6 shadow-sm' : 'left-1 opacity-40'}`}></div>
                          </button>
                        </div>
                      </div>

                      {/* Execute Button */}
                      {(() => {
                        const { canAfford, shieldCost } = checkCanAfford();
                        return (
                          <button
                            onClick={canAfford ? startGame : undefined}
                            className={`group relative w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] transition-all overflow-hidden active:scale-95 shadow-xl
                               ${canAfford
                                ? "bg-[#1ed760] text-black hover:scale-[1.02] shadow-[0_15px_30px_rgba(30,215,96,0.15)]"
                                : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                              }`}
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {canAfford ? 'Play Now' : 'Not Enough Shields'}
                              {canAfford && <span className="text-[9px] opacity-40">({shieldCost}🛡️)</span>}
                            </span>
                            {canAfford && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {feedback && (
          <div className="absolute top-[20%] left-0 right-0 flex justify-center pointer-events-none z-[150] animate-in zoom-in-50 fade-in duration-200">
            <p
              className={`font-black italic uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] ${feedback.color} animate-out zoom-out-125 fade-out duration-500 fill-mode-forwards`}
              style={{
                fontSize: `${2.2 * feedback.scale}rem`,
                transform: `scale(${feedback.scale}) rotate(${feedback.rotation}deg)`
              }}
            >
              {feedback.text}
            </p>
          </div>
        )
        }

        <audio
          ref={audioRef}
          onEnded={handleFinish}
          onLoadedMetadata={() => durationRef.current = audioRef.current?.duration || 1}
        />
        <audio
          ref={audioRefB}
          onEnded={handleFinish}
          onLoadedMetadata={() => {
            if (activeAudioRef.current === 'B') {
              durationRef.current = audioRefB.current?.duration || 1;
            }
          }}
        />
      </div>
    </>
  );
};
