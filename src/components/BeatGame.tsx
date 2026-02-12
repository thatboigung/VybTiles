
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AudioAnalysis, GameMode, Level } from '../types';
import { RechargeModal } from './RechargeModal';

const LANES = 4;
const TARGET_Y_RATIO = 0.8;

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
              <li>Collect ❤️ and 🛡️ to stay in the sync.</li>
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
  userLevel: number;
  currentExp: number;
}

type PowerUpType = 'shield' | 'life1' | 'life2' | 'none';

interface Note {
  id: string; time: number; lane: number; hit: boolean; missed: boolean;
  type: 'obstacle' | 'powerup' | 'tile'; powerUp: PowerUpType;
  hitTimestamp?: number; // Track when this note was hit
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
  playlist, allSongs, onExit, globalHearts, globalShields, userPerfects, onUseCurrency, onFinish, userLevel, currentExp
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [selectedMode, setSelectedMode] = useState<GameMode>(playlist.length > 1 ? 'endless' : 'classic');
  const [showTutorial, setShowTutorial] = useState(false);
  // Removed countdown state

  // Determine initial valid level
  const getInitialLevel = (): Level => {
    if (userLevel >= 5) return 'medium'; // Easy disabled
    return 'easy';
  };

  const [selectedLevel, setSelectedLevel] = useState<Level>(getInitialLevel());
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFlyoutAnimating, setIsFlyoutAnimating] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isCleared, setIsCleared] = useState(false);
  const [isFailing, setIsFailing] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [failedNoteId, setFailedNoteId] = useState<string | null>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  const [score, setScore] = useState(0);
  const [laneHits, setLaneHits] = useState<number[]>(new Array(LANES).fill(0));
  const [combo, setCombo] = useState(0);
  const [completion, setCompletion] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [sessionHearts, setSessionHearts] = useState(0);
  const [sessionShields, setSessionShields] = useState(0);
  const [sessionPerfects, setSessionPerfects] = useState(0);
  const [reviveCount, setReviveCount] = useState(0);
  // @ts-ignore - activeLives used in logic but not render currently
  const [activeLives, setActiveLives] = useState(5);
  const [shake, setShake] = useState(0);
  const [playerLane, setPlayerLane] = useState(1);
  const [invincible, setInvincible] = useState(false);
  const [expEarned, setExpEarned] = useState(0);
  const [animatedExp, setAnimatedExp] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; scale: number } | null>(null);

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
  const isDraggingRef = useRef(false);

  // Initialize shuffle queue for endless mode
  React.useEffect(() => {
    if (selectedMode === 'endless' && allSongs && allSongs.length > 0) {
      const shuffled = [...allSongs].sort(() => Math.random() - 0.5);
      setShuffleQueue(shuffled);
      setQueueIndex(0);
    }
  }, [selectedMode, allSongs]);

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

        // Delay Game Over Menu by 1s (Sync with audio slowdown)
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

  const getNoteSpeed = () => {
    // Base speed: Easy 400 (x1.0)
    // Medium: 600 (x1.5)
    // Hard: 800 (x2.0)
    const speeds: Record<Level, number> = { easy: 400, medium: 600, hard: 800 };
    return speeds[selectedLevel];
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
          setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
          const bonus = combo >= 2 ? combo : 1;
          setSessionPerfects(p => p + bonus);
          // Heavy shake for perfect hit
          setShake(10);
          showFeedback('PERFECT', 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]', 1.5);
          spawnParticles(x, nY, '#facc15', 20); // Gold particles
        } else {
          // GREAT: < 0.22s (Non-Perfect Hit breaks Perfect Combo)
          const points = 300;
          setScore(s => s + points);
          setCombo(0); // Reset combo if not perfect
          showFeedback('GREAT', 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]', 1.2);
          spawnParticles(x, nY, '#22d3ee', 12); // Cyan particles
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
      showFeedback('MISS', 'text-red-500 opacity-80', 0.9);
    }
  }, [isActive, isPaused, isGameOver, isCleared, combo, selectedMode, handleFailure, selectedLevel]);

  const loadTrackNotes = (analysis: AudioAnalysis) => {
    notesRef.current = analysis.beats.flatMap((beatTime, index) => {
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

      const lane1 = Math.floor(Math.random() * LANES);
      const notes: Note[] = [{
        id: `${analysis.id}-n-${index}-a`,
        time: beatTime,
        lane: lane1,
        hit: false,
        missed: false,
        type,
        powerUp: powerType
      }];

      // Calculate song duration approximation (last beat)
      const lastBeat = analysis.beats.length > 0 ? analysis.beats[analysis.beats.length - 1] : 0;
      const isLateGame = lastBeat > 0 && beatTime > (lastBeat * 0.6);

      // Dynamic Difficulty:
      // - Normal: 25% double tile chance
      // - Late Game (>60%): 60% double tile chance (Climax)
      const doubleTileChance = isLateGame ? 0.6 : 0.25;

      // Double Tile Chance
      if (Math.random() < doubleTileChance) {
        let lane2 = Math.floor(Math.random() * LANES);
        while (lane2 === lane1) lane2 = Math.floor(Math.random() * LANES);

        notes.push({
          id: `${analysis.id}-n-${index}-b`,
          time: beatTime + 0.15, // Sequential offset for stream effect
          lane: lane2,
          hit: false,
          missed: false,
          type: 'tile', // Secondary note is always a basic tile
          powerUp: 'none'
        });
      }

      return notes;
    });
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    actuallyStartGame();
  };

  // Move livesMap to a stable constant or useMemo if needed, but simple object is fine here
  const livesMap: Record<Level, number> = { easy: 3, medium: 2, hard: 1 };

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

    setCurrentTrackIndex(0);
    loadTrackNotes(playlist[0]);
    particlesRef.current = [];

    setScore(0); setCombo(0); setMaxCombo(0); setSessionHearts(0); setSessionShields(0); setSessionPerfects(0); setPlayerLane(1);
    setIsActive(true); setIsPaused(false); setIsGameOver(false); setIsCleared(false); setInvincible(false);

    // Immediate Start with Slow Motion Ramp
    if (audioRef.current) {
      audioRef.current.src = playlist[0].fileUrl || '';
      audioRef.current.currentTime = 0;
      rampAudioToSpeed(1.0, 3000);
    }
  };

  // Removed Countdown Effect

  const startGame = () => {
    const { canAfford } = checkCanAfford();
    if (!canAfford) {
      setShowRechargeModal(true);
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
      const nextIndex = (currentTrackIndex + 1) % playlist.length;
      setCurrentTrackIndex(nextIndex);
      loadTrackNotes(playlist[nextIndex]);
      showFeedback('SYNC EXTENDED', 'text-blue-400', 1.2);

      if (audioRef.current) {
        audioRef.current.src = playlist[nextIndex].fileUrl || '';
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      // EXP Formula: 10000 points = 100 EXP (ratio 100:1)
      const earned = Math.floor(score / 100);
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

  const exitSession = () => {
    setIsExiting(true);
    // Delay unmount to allow exit animation
    setTimeout(() => {
      onFinish(sessionHearts, sessionShields, sessionPerfects, selectedLevel, completion);
      onExit();
    }, 200);
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
    setIsFlyoutAnimating(true);
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

      ctx.save();
      // Glitch effect: intense shake and color shifts during failure
      const currentShake = isFailing ? 20 : shake;
      ctx.translate((Math.random() - 0.5) * currentShake, (Math.random() - 0.5) * currentShake);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);

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
              showFeedback('SYNC FAIL', 'text-red-500', 1.0);
              return;
            }
          }
        }

        if (note.hit) return;

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
          return;
        }

        const y = targetY - (timeDiff * speed);

        if (y > -200 && y < h + 200) {
          const x = (note.lane * lW) + (lW / 2);
          const nW = lW * 0.92, nH = 150;

          ctx.save();

          // Flash effect for failed note
          if (isFailing && note.id === failedNoteId) {
            const flash = Math.sin(Date.now() / 50); // Fast blink
            ctx.shadowColor = flash > 0 ? 'red' : 'transparent';
            ctx.shadowBlur = 30;
            ctx.fillStyle = flash > 0 ? '#ff0000' : '#ffffff';
          } else if (note.type === 'tile') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(255,255,255,0.2)';
          }

          ctx.beginPath();
          ctx.roundRect(x - nW / 2, y - nH / 2, nW, nH, 4);
          if (isFailing && note.id === failedNoteId) {
            ctx.fill(); // Already set style above
          } else if (note.type === 'powerup') {
            ctx.fillStyle = note.powerUp === 'shield' ? '#2563eb' : '#16a34a'; ctx.fill();
            ctx.fillStyle = 'white'; ctx.font = 'bold 18px Inter'; ctx.textAlign = 'center';
            ctx.fillText(note.powerUp === 'shield' ? '🛡️' : '❤️', x, y + 6);
          } else if (note.type === 'obstacle') { ctx.fillStyle = '#b91c1c'; ctx.fill(); }
          else {
            const gradient = ctx.createLinearGradient(x, y - nH / 2, x, y + nH / 2);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#94a3b8');
            ctx.fillStyle = gradient;
            ctx.fill();
          }
          ctx.restore();
        }
      });

      let i = particlesRef.current.length;
      while (i--) {
        const p = particlesRef.current[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
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
      <div className="fixed inset-0 bg-[#0a0a0a] flex justify-center z-[100] select-none touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => isDraggingRef.current = false}
        onPointerCancel={() => isDraggingRef.current = false}>

        <RechargeModal
          isOpen={showRechargeModal}
          onClose={() => setShowRechargeModal(false)}
        />

        <div ref={gameAreaRef} className={`relative w-full max-w-[450px] h-full bg-[#0a0a0a] overflow-hidden 
          animate-in fade-in zoom-in-95 duration-200 
          ${isExiting ? 'animate-out fade-out zoom-out-95 duration-200 fill-mode-forwards' : ''}
        `}>

          {/* HUD */}
          <div className="absolute top-0 left-0 right-0 p-4 z-50 pointer-events-none flex flex-col gap-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 flex flex-wrap gap-2">
                {/* Score Display (Minimal) */}
                <div className="flex flex-col items-start bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 shadow-xl w-fit">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Score</span>
                  <div className="text-2xl font-black text-white italic tabular-nums tracking-tighter leading-none">{score.toLocaleString()}</div>
                </div>

                {/* Gold / Perfects Display */}
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 w-fit">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                  <span className="text-xs font-black text-yellow-100 tabular-nums tracking-tight">{sessionPerfects.toLocaleString()} <span className="text-[9px] text-yellow-500/80 ml-0.5">GOLD</span></span>
                </div>

                {/* Shields / Lives Display */}
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 w-fit">
                  <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
                  </svg>
                  <span className="text-xs font-black text-blue-100 tabular-nums tracking-tight">{activeLives} <span className="text-[9px] text-blue-500/80 ml-0.5">LIVES</span></span>
                </div>
              </div>

              {/* Combo Display (Centered/Right aligned dynamically) */}
              {combo > 1 && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center animate-in zoom-in-50 slide-in-from-bottom-2 fade-in duration-200">
                  <span className="text-5xl font-black text-white italic leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-tighter">{combo}</span>
                  <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-t from-slate-400 to-white uppercase tracking-[0.3em]">COMBO</span>
                </div>
              )}

              {/* Pause Button */}
              <button onClick={() => { setIsPaused(true); audioRef.current?.pause(); }} className="w-10 h-10 bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center pointer-events-auto rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              </button>
            </div>

            <div className="relative w-full px-2">
              <div className="flex justify-between items-center mb-1.5 px-1">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] italic truncate max-w-[150px]">{playlist[currentTrackIndex]?.fileName}</span>
                {selectedMode === 'endless' && (
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">TRACK {currentTrackIndex + 1}/{playlist.length}</span>
                )}
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden shadow-inner">
                <div ref={progressBarRef} className="h-full bg-white transition-none" style={{ width: '0%' }}></div>
              </div>


              <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 pointer-events-none mt-2">
                <div className="absolute -translate-x-1/2" style={{ left: '25%' }}>
                  <StarIcon active={currentTimeRef.current / durationRef.current >= 0.25} className="w-5 h-5" />
                </div>
                <div className="absolute -translate-x-1/2" style={{ left: '50%' }}>
                  <StarIcon active={currentTimeRef.current / durationRef.current >= 0.5} className="w-5 h-5" />
                </div>
                <div className="absolute -translate-x-1/2" style={{ left: '100%' }}>
                  <StarIcon active={currentTimeRef.current / durationRef.current >= 0.99} className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} width={450} height={800} className="w-full h-full" />

          {/* Countdown Overlay */}
          {/* Countdown removed */}    {/* Start Overlay */}
          {!isActive && !isCleared && !isGameOver && (
            <div className="absolute inset-0 bg-[#0a0a0a]/95 flex flex-col items-center justify-center p-8 z-[110] text-center">

              {/* Top Wallet Bar */}
              <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start">
                <button onClick={handleAbort} className="text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="group-hover:-translate-x-1 transition-transform">←</span> ABORT
                </button>
                <div className="flex gap-4">
                  <div className="flex flex-col items-end">

                    <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                      <span className="text-sm font-black text-white">{globalHearts} <span className="text-xs text-red-500">❤️</span></span>
                      <div className="w-px h-3 bg-white/10"></div>
                      <span className="text-sm font-black text-white">{globalShields} <span className="text-xs text-blue-500">🛡️</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kinetic Typography Title */}
              <div key={selectedMode} className="mb-12 animate-in fade-in zoom-in-95 duration-500">
                <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter " style={{ textShadow: '0 0 30px rgba(255,255,255,0.1)' }}>
                  {selectedMode === 'endless' ? 'Endless Protocol' : 'Start Game'}
                </h2>
                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto mt-4 rounded-full opacity-50"></div>
              </div>

              <div className="w-full max-w-xs space-y-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-left pl-1">Game Mode</p>
                    <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                      {['classic', 'endless'].map(m => (
                        <button key={m} onClick={() => setSelectedMode(m as any)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${selectedMode === m ? 'bg-white text-black shadow-lg scale-105' : 'text-slate-500 hover:text-slate-300'}`}>{m}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-left pl-1">Difficulty</p>
                    <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                      {['easy', 'medium', 'hard'].map(level => {
                        const l = level as Level;
                        let isLocked = false;
                        let lockReason = "";

                        if (l === 'easy' && userLevel >= 5) {
                          isLocked = true;
                          lockReason = "Max Level Exceeded";
                        } else if (l === 'medium' && userLevel < 3) {
                          isLocked = true;
                          lockReason = "Unlock at Lv.3";
                        } else if (l === 'hard' && userLevel < 5) { // Assuming Hard unlocks at Lv 5
                          isLocked = true;
                          lockReason = "Unlock at Lv.5";
                        }

                        return (
                          <button
                            key={l}
                            onClick={() => !isLocked && setSelectedLevel(l)}
                            disabled={isLocked}
                            className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all relative overflow-hidden
                              ${selectedLevel === l
                                ? 'bg-white text-black shadow-lg scale-105 z-10'
                                : isLocked
                                  ? 'bg-zinc-900/50 text-zinc-700 cursor-not-allowed border border-white/5'
                                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                              }`}
                          >
                            <span className={isLocked ? 'opacity-0' : ''}>{l}</span>
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                <span className="text-[7px] text-zinc-500 font-bold leading-tight px-1">{lockReason || "LOCKED"}</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  {(() => {
                    const { canAfford } = checkCanAfford();
                    return (
                      <button
                        onClick={canAfford ? startGame : undefined}
                        className={`w-full py-5 font-black text-xl italic uppercase rounded-2xl transition-all flex flex-col items-center justify-center gap-1 shadow-2xl
                          ${canAfford
                            ? "bg-white text-black hover:scale-[1.02] active:scale-95"
                            : "bg-red-900/20 text-red-500 border border-red-500/30 cursor-not-allowed"
                          }`}
                      >
                        <span>{canAfford ? "" : "Insufficient Resources"}</span>
                        <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Results/Overlays */}
          {isGameOver && (
            <div className="absolute inset-0 backdrop-blur-xl flex flex-col items-center justify-end pb-24 md:justify-center md:pb-0 z-[120] animate-in fade-in duration-300">
              <div className="p-8 rounded-2xl text-center w-full max-w-sm ring-1 ring-white/5 relative overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                {/* Decorative glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/10 rounded-full blur-[50px] pointer-events-none"></div>

                <h3 className="text-4xl font-black italic text-red-500 uppercase mb-6 tracking-tighter drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] relative z-10 animate-pulse">Game Over</h3>

                {/* Stats Grid - Unified with Success Screen */}
                <div className="w-full bg-white/5 rounded-2xl p-6 mb-6 border border-white/5 relative z-10">
                  <div className="grid grid-cols-2 gap-6 text-center">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Salvage</p>
                      <div className="flex flex-col gap-1">
                        <span className="text-xl font-black text-white italic">+{sessionHearts}<span className="text-red-500 text-lg ml-0.5">❤️</span></span>
                        <span className="text-xl font-black text-white italic">+{sessionShields}🛡️</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Growth</p>
                      <span className="text-2xl font-black text-white italic">+{expEarned} <span className="text-xs text-slate-500 ml-0.5">EXP</span></span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Completion</p>
                    <span className="text-lg font-black text-purple-400 italic">{completion}%</span>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  {/* Revive Button */}
                  {(() => {
                    const goldCost = 50 * (reviveCount + 1);
                    const canAffordRevive = userPerfects >= goldCost && globalShields >= 2;

                    return (
                      <button
                        onClick={handleRevive}
                        disabled={!canAffordRevive}
                        className={`w-full py-4 font-black text-lg uppercase italic rounded-xl transition-all flex items-center justify-center gap-2 border-2
                          ${canAffordRevive
                            ? "bg-yellow-600 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] hover:scale-105 active:scale-95"
                            : "bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed opacity-50"
                          }`}
                      >
                        <span>Revive</span>
                        <span className="text-xs font-normal opacity-80 bg-black/20 px-2 py-0.5 rounded">
                          {goldCost} Gold + 2🛡️
                        </span>
                      </button>
                    );
                  })()}

                  {(() => {
                    const { canAfford, shieldCost } = checkCanAfford();
                    return (
                      <button
                        onClick={canAfford ? restartSession : undefined}
                        disabled={!canAfford}
                        className={`w-full py-5 font-black text-xl uppercase italic rounded-xl transition-all flex flex-col items-center justify-center gap-1 border-2
                          ${canAfford
                            ? "bg-white text-black border-white shadow-[4px_4px_0_0_#333] hover:shadow-[6px_6px_0_0_#333] hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none active:scale-95"
                            : "bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed opacity-80"
                          }`}
                        style={canAfford ? { animation: `rhythmic-pulse ${60 / (playlist[currentTrackIndex]?.bpm || 128)}s ease-in-out infinite` } : {}}
                      >
                        <span>{canAfford ? "Retry Sync" : "Low Signal"}</span>
                        <span className="text-[9px] opacity-60 tracking-widest font-normal">
                          {canAfford ? `COST: 2❤️ ${shieldCost}🛡️` : "INSUFFICIENT ENERGY"}
                        </span>
                      </button>
                    );
                  })()}

                  <button
                    onClick={handleClaimAwards}
                    className="w-full py-4 text-zinc-400 font-black text-xs uppercase italic tracking-widest bg-transparent border-2 border-white/5 rounded-xl hover:text-white hover:border-white/20 transition-all active:scale-95 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform inline-block">Claim & Exit</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {isCleared && (
            <div className="absolute inset-0 backdrop-blur-xl flex flex-col items-center justify-center p-6 z-[130] animate-in fade-in duration-300">
              <div className="w-full max-w-sm  p-8 rounded-2xl flex flex-col items-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Decorative glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-500/10 rounded-full blur-[50px] pointer-events-none"></div>

                <div className="flex gap-2 mb-6 relative z-10">
                  <StarIcon active={true} className="w-8 h-8 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                  <StarIcon active={true} className="w-10 h-10 -translate-y-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
                  <StarIcon active={true} className="w-8 h-8 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                </div>
                <h3 className="text-4xl font-black italic text-yellow-500 uppercase mb-8 tracking-tighter drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] relative z-10 animate-jump-in">Sync Success</h3>

                <div className="w-full bg-white/5 rounded-2xl p-6 mb-8 border border-white/5 relative z-10">
                  <div className="grid grid-cols-2 gap-6 text-center">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Rewards</p>
                      <div className="flex flex-col gap-1">
                        <span className="text-2xl font-black text-white italic">+{sessionHearts + 1}<span className="text-red-500 text-lg ml-0.5">❤️</span></span>
                        {/* Star Reward Display */}
                        {(completion >= 50) && (
                          <span className="text-xl font-black text-yellow-400 italic">+{completion >= 100 ? 10 : 5}⭐</span>
                        )}
                        <span className="text-[9px] font-bold text-slate-500 tracking-tighter">(Bonus Included)</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Growth</p>
                      <span className="text-2xl font-black text-white italic">+{animatedExp} <span className="text-xs text-slate-500 ml-0.5">EXP</span></span>
                    </div>
                  </div>

                  {/* Level Bar Animation */}
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Level {Math.floor((currentExp + animatedExp) / 10000) + 1}</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                      {/* Previous Progress (Ghost) */}
                      <div className="absolute top-0 left-0 h-full bg-white/20" style={{ width: `${(currentExp % 10000) / 100}%` }}></div>
                      {/* New Progress (Fill) */}
                      <div className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${((currentExp + animatedExp) % 10000) / 100}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      <span>Total EXP: {currentExp + animatedExp}</span>
                      <span className="text-white tabular-nums">{(currentExp + animatedExp) % 10000} / 10000 EXP</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Gold</p>
                      <span className="text-lg font-black text-yellow-400 italic">+{sessionPerfects}💰</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Peak Sync</p>
                      <span className="text-lg font-black text-blue-400 italic">{maxCombo} COMBO</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Salvage</p>
                      <span className="text-lg font-black text-blue-500 italic">+{sessionShields}🛡️</span>
                    </div>
                  </div>
                </div>

                <button onClick={handleClaimAwards} className="w-full py-5 bg-white text-black font-black text-xl uppercase italic rounded-xl shadow-[4px_4px_0_0_#333] hover:shadow-[6px_6px_0_0_#333] hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none active:scale-95 transition-all relative z-10 group">
                  <span className="group-active:scale-90 inline-block transition-transform">Claim Awards</span>
                </button>

                {/* Fly-out Animations */}
                {isFlyoutAnimating && (
                  <div className="fixed inset-0 pointer-events-none z-[200]">
                    {/* Hearts Flyout */}
                    {[...Array(Math.min(5, sessionHearts + 1))].map((_, i) => (
                      <div key={`heart-${i}`} className="absolute top-1/2 left-1/2 text-2xl animate-fly-to-wallet-heart" style={{ animationDelay: `${i * 0.1}s` }}>❤️</div>
                    ))}
                    {/* Shields Flyout */}
                    {[...Array(Math.min(5, sessionShields))].map((_, i) => (
                      <div key={`shield-${i}`} className="absolute top-1/2 left-1/2 text-2xl animate-fly-to-wallet-shield" style={{ animationDelay: `${i * 0.1}s` }}>🛡️</div>
                    ))}
                    {/* Stars/EXP Flyout */}
                    {[...Array(5)].map((_, i) => (
                      <div key={`star-${i}`} className="absolute top-1/2 left-1/2 text-xs font-black text-yellow-400 animate-fly-to-wallet-exp" style={{ animationDelay: `${i * 0.05}s` }}>⭐</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {isPaused && (
            <div className="absolute inset-0 backdrop-blur-xl flex flex-col items-center justify-center z-[140] animate-in fade-in duration-200">
              <div className="w-80  p-8 rounded-[2rem] text-center shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40  rounded-full blur-[60px] pointer-events-none"></div>

                <h2 className="text-3xl font-black italic text-white uppercase mb-8 tracking-tighter relative z-10">game Paused</h2>
                <div className="space-y-3 relative z-10">
                  <button onClick={() => { setIsPaused(false); rampAudioToSpeed(1.0, 3000); }} className="w-full py-4 bg-white text-black font-black text-lg uppercase italic rounded-xl shadow-[4px_4px_0_0_#333] hover:shadow-[6px_6px_0_0_#333] hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none active:scale-95 transition-all">Resume</button>
                  <button onClick={restartSession} className="w-full py-3 bg-zinc-900 text-zinc-400 font-black text-xs uppercase italic rounded-xl hover:bg-zinc-700 hover:text-white transition-colors border border-transparent hover:border-white/10">Restart S</button>
                  <button onClick={exitSession} className="w-full py-3 bg-transparent text-red-500/80 font-black text-xs uppercase italic tracking-widest hover:text-red-500 transition-colors">Eject & Exit</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {feedback && (
          <div className="absolute top-[20%] left-0 right-0 flex justify-center pointer-events-none z-[150] animate-in zoom-in-50 fade-in duration-150">
            <p
              className={`font-black italic uppercase ${feedback.color}`}
              style={{
                fontSize: `${3 * feedback.scale}rem`,
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
      </div>
    </>
  );
};
