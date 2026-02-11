
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
          {mode === 'dodge' ? (
            <div className="space-y-3">
              <p className="text-white font-bold text-base underline underline-offset-4">Dodge Rules:</p>
              <ul className="text-left list-disc list-inside space-y-2">
                <li><span className="text-blue-400 font-bold">SLIDE</span> to move your orb.</li>
                <li><span className="text-red-500 font-bold">AVOID</span> red obstacles to score.</li>
                <li><span className="text-green-500 font-bold">SCORE</span> 500 points for every successful dodge.</li>
                <li>Collect ❤️ and 🛡️ to survive hits.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-white font-bold text-base underline underline-offset-4">Core Rules:</p>
              <ul className="text-left list-disc list-inside space-y-2">
                <li><span className="text-blue-400 font-bold">TAP</span> tiles anywhere in their lane as they fall.</li>
                <li><span className="text-red-500 font-bold">DON'T</span> tap empty space (penalty).</li>
                <li><span className="text-red-500 font-bold">DON'T</span> let tiles pass (failure).</li>
                <li>Collect ❤️ and 🛡️ to stay in the sync.</li>
              </ul>
            </div>
          )}
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
  onExit: () => void;
  globalHearts: number;
  globalShields: number;
  onUseCurrency: (h: number, s: number) => void;
  onFinish: (exp: number, sessionHearts: number, sessionShields: number) => void;
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
  playlist, onExit, globalHearts, globalShields, onUseCurrency, onFinish
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [selectedMode, setSelectedMode] = useState<GameMode>(playlist.length > 1 ? 'endless' : 'classic');
  const [showTutorial, setShowTutorial] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<Level>('easy');
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isCleared, setIsCleared] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  const [score, setScore] = useState(0);
  const [laneHits, setLaneHits] = useState<number[]>(new Array(LANES).fill(0));
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [sessionHearts, setSessionHearts] = useState(0);
  const [sessionShields, setSessionShields] = useState(0);
  const [activeLives, setActiveLives] = useState(5);
  const [shake, setShake] = useState(0);
  const [playerLane, setPlayerLane] = useState(1);
  const [invincible, setInvincible] = useState(false);
  const [expEarned, setExpEarned] = useState(0);
  const [animatedExp, setAnimatedExp] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; color: string; scale: number } | null>(null);

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

  const handleFailure = useCallback(() => {
    if (invincible) return;

    setShake(10);
    setActiveLives(prev => {
      const next = prev - 1;
      if (next <= 0) {
        setIsGameOver(true);
        setIsActive(false);

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
      }
      return next;
    });

    setInvincible(true);
    setTimeout(() => setInvincible(false), 2000);
  }, [invincible]);

  const getNoteSpeed = () => {
    const speeds: Record<Level, number> = { easy: 400, medium: 600, hard: 800 };
    return speeds[selectedLevel];
  };

  const handleHit = useCallback((lane: number, tapY?: number) => {
    if (!isActive || isPaused || isGameOver || isCleared || countdown !== null) return;
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
          // Heavy shake for perfect hit
          setShake(10);
          showFeedback('PERFECT', 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]', 1.5);
          spawnParticles(x, nY, '#facc15', 20); // Gold particles
        } else {
          // GREAT: < 0.22s
          const points = 300 + combo * 10;
          setScore(s => s + points);
          setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
          showFeedback('GREAT', 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]', 1.2);
          spawnParticles(x, nY, '#22d3ee', 12); // Cyan particles
        }
      }
    } else {
      // Missed tap (tapped empty space)
      // Strict rule: tapping empty space counts as failure
      setScore(s => Math.max(0, s - 200));
      handleFailure();
      setCombo(0);
      setShake(5);
      showFeedback('MISS', 'text-red-500 opacity-80', 0.9);
    }
  }, [isActive, isPaused, isGameOver, isCleared, countdown, combo, selectedMode, handleFailure, selectedLevel]);

  const loadTrackNotes = (analysis: AudioAnalysis) => {
    notesRef.current = analysis.beats.flatMap((beatTime, index) => {
      let type: 'obstacle' | 'powerup' | 'tile' = selectedMode === 'dodge' ? 'obstacle' : 'tile';
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

      // Double Tile Chance (25% in tapping modes)
      if (selectedMode !== 'dodge' && Math.random() < 0.25) {
        let lane2 = Math.floor(Math.random() * LANES);
        while (lane2 === lane1) lane2 = Math.floor(Math.random() * LANES);

        notes.push({
          id: `${analysis.id}-n-${index}-b`,
          time: beatTime,
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

  const actuallyStartGame = () => {
    const { shieldCost } = checkCanAfford();
    onUseCurrency(2, shieldCost);

    setActiveLives(selectedMode === 'endless' ? 1 : livesMap[selectedLevel]);

    setCurrentTrackIndex(0);
    loadTrackNotes(playlist[0]);
    particlesRef.current = [];

    setScore(0); setCombo(0); setMaxCombo(0); setSessionHearts(0); setSessionShields(0); setPlayerLane(1);
    setIsActive(true); setIsPaused(false); setIsGameOver(false); setIsCleared(false); setInvincible(false);

    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCountdown(null);
        if (audioRef.current) {
          audioRef.current.playbackRate = 1;
          (audioRef.current as any).preservesPitch = true;
          audioRef.current.src = playlist[0].fileUrl || '';
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error("Audio play blocked", e));
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [countdown, playlist]);

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
      // Significantly increased EXP formula: (score / 10) + 500 base
      const earned = Math.floor(score / 10) + 500;
      setExpEarned(earned);
      setIsCleared(true);
      if (audioRef.current) audioRef.current.pause();

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
    onFinish(expEarned, sessionHearts, sessionShields);
    onExit();
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
      currentTimeRef.current = t;
      const progress = t / (durationRef.current || 1);

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress * 100}%`;
      }

      const w = canvas.width, h = canvas.height, targetY = h * TARGET_Y_RATIO, lW = w / LANES;

      if (shake > 0) setShake(s => Math.max(0, s - 2));

      ctx.save();
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);

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

      if (selectedMode === 'dodge') {
        const pX = (playerLane * lW) + (lW / 2);
        // Move player up a bit (TARGET_Y_RATIO - 0.1)
        const playerY = h * (TARGET_Y_RATIO - 0.1);

        ctx.save();
        ctx.globalAlpha = invincible ? (Math.sin(t * 15) > 0 ? 0.2 : 0.8) : 1;
        ctx.shadowBlur = 30; ctx.shadowColor = 'white';
        // Use playerY instead of targetY
        ctx.beginPath(); ctx.arc(pX, playerY, 28, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill();
        ctx.restore();
      }

      const visibleRangeSeconds = (h / speed) + 1;

      // Render Connectors for simultaneous tiles (Double Tiles)
      // Group by time
      const visibleNotes = notesRef.current.filter(n => !n.hit && !n.missed && (n.time - t) <= visibleRangeSeconds && (n.time - t) >= -0.15);
      const timeGroups = new Map<number, Note[]>();
      visibleNotes.forEach(n => {
        if (!timeGroups.has(n.time)) timeGroups.set(n.time, []);
        timeGroups.get(n.time)!.push(n);
      });

      timeGroups.forEach((group) => {
        if (group.length > 1 && selectedMode !== 'dodge') {
          const y = targetY - ((group[0].time - t) * speed);
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
        if (!note.hit && selectedMode !== 'dodge') {
          // Find if this note has a partner (same time) that was hit > 300ms ago
          const partner = notesRef.current.find(n => n.time === note.time && n.id !== note.id);
          if (partner && partner.hit && partner.hitTimestamp) {
            if (now - partner.hitTimestamp > 300) {
              note.missed = true;
              setScore(s => Math.max(0, s - 300));
              handleFailure();
              showFeedback('SYNC FAIL', 'text-red-500', 1.0);
              return;
            }
          }
        }

        if (note.hit) return;

        const timeDiff = note.time - t;
        if (timeDiff > visibleRangeSeconds) return;
        if (timeDiff < -0.15) { // Reduced threshold for missing tiles
          if (selectedMode !== 'dodge' && !note.hit && !note.missed) {
            note.missed = true;
            setScore(s => Math.max(0, s - 500)); // Penalty for skipping
            setCombo(0);
            handleFailure();
            showFeedback('MISS', 'text-red-500', 1.0);
          } else if (selectedMode === 'dodge' && !note.hit && !note.missed && note.type === 'obstacle') {
            // Dodge success: Obstacle passed without hit
            note.missed = true; // Mark as processed
            setScore(s => s + 500);
            setCombo(c => c + 1);
          }
          return;
        }

        const y = targetY - (timeDiff * speed);

        if (selectedMode === 'dodge') {
          // Check collision with playerY
          const playerY = h * (TARGET_Y_RATIO - 0.1);
          if (Math.abs(y - playerY) < 45 && note.lane === playerLane) {
            note.hit = true;
            if (note.type === 'obstacle') handleFailure();
            else if (note.type === 'powerup') {
              if (note.powerUp === 'shield') setSessionShields(s => s + 1);
              else setSessionHearts(h => h + (note.powerUp === 'life1' ? 1 : 2));
              setScore(s => s + 2000);
              spawnParticles((note.lane * lW) + lW / 2, playerY, 'white', 20);
            }
          }
        }

        if (y > -200 && y < h + 200) {
          const x = (note.lane * lW) + (lW / 2);
          const nW = lW * 0.92, nH = 150;

          ctx.save();
          if (note.type === 'tile') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(255,255,255,0.2)';
          }

          ctx.beginPath();
          ctx.roundRect(x - nW / 2, y - nH / 2, nW, nH, 4);
          if (note.type === 'powerup') {
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

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (countdown !== null || isPaused || isGameOver || isCleared) return;

      if (selectedMode === 'dodge') {
        if (e.code === 'ArrowLeft') {
          setPlayerLane(prev => Math.max(0, prev - 1));
        } else if (e.code === 'ArrowRight') {
          setPlayerLane(prev => Math.min(LANES - 1, prev + 1));
        }
      } else {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMode, countdown, isPaused, isGameOver, isCleared, handleHit]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (countdown !== null) return;
    isDraggingRef.current = true;
    const r = gameAreaRef.current?.getBoundingClientRect();
    if (r) {
      const l = Math.max(0, Math.min(LANES - 1, Math.floor((e.clientX - r.left) / (r.width / LANES))));
      if (selectedMode === 'dodge') {
        // Prevent instant jumps > 1 lane. Only allow moving 1 step towards target.
        setPlayerLane(prev => {
          if (l === prev) return prev;
          if (l > prev) return prev + 1;
          return prev - 1;
        });
      }
      else handleHit(l, e.clientY - r.top);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current && selectedMode === 'dodge' && countdown === null) {
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

        <div ref={gameAreaRef} className="relative w-full max-w-[450px] h-full bg-[#0a0a0a] border-x border-white/5 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]">

          {/* HUD */}
          <div className="absolute top-0 left-0 right-0 p-4 z-50 pointer-events-none flex flex-col gap-4">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl pointer-events-auto flex items-center justify-between shadow-2xl">
                <div className="flex flex-col gap-1.5">
                  {selectedMode === 'endless' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-blue-500 text-lg">🛡️</span>
                      <span className="text-white font-black italic text-lg">{globalShields}</span>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {Array.from({ length: activeLives }).map((_, i) => <span key={i} className="text-blue-500 text-[10px]">🛡️</span>)}
                    </div>
                  )}
                  <div className="text-xl font-black text-white italic tabular-nums tracking-tighter leading-none">{score.toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">Hearts</span>
                    <span className="text-sm font-black text-green-500 italic">+{sessionHearts}</span>
                  </div>
                  <div className="w-px h-6 bg-white/10"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">Shields</span>
                    <span className="text-sm font-black text-blue-500 italic">+{sessionShields}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => { setIsPaused(true); audioRef.current?.pause(); }} className="w-12 h-12 bg-black/60 border border-white/10 flex items-center justify-center pointer-events-auto rounded-2xl text-white shadow-xl hover:bg-white/10 transition-colors">
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

              <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 flex justify-between pointer-events-none px-1 mt-2">
                <div className="relative" style={{ left: '0%' }}></div>
                <div className="relative" style={{ left: '25%' }}>
                  <StarIcon active={currentTimeRef.current / durationRef.current >= 0.25} className="w-5 h-5" />
                </div>
                <div className="relative" style={{ left: '50%' }}>
                  <StarIcon active={currentTimeRef.current / durationRef.current >= 0.5} className="w-5 h-5" />
                </div>
                <div className="relative" style={{ left: '100%' }}>
                  <StarIcon active={currentTimeRef.current / durationRef.current >= 0.99} className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} width={450} height={800} className="w-full h-full" />

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[115]">
              <div className="text-8xl font-black italic text-white animate-ping">
                {countdown === 0 ? 'GO!' : countdown}
              </div>
            </div>
          )}

          {/* Start Overlay */}
          {!isActive && !isCleared && !isGameOver && countdown === null && (
            <div className="absolute inset-0 bg-[#0a0a0a]/95 flex flex-col items-center justify-center p-8 z-[110] text-center">
              <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter mb-4">{playlist.length > 1 ? 'Endless Protocol' : 'Archives Access'}</h2>

              {/* Resource Status */}
              <div className="flex gap-4 mb-8 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="flex flex-col items-center min-w-[60px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-green-500">❤️ {globalHearts}</span>
                    <span className="text-sm font-black text-blue-500">🛡️ {globalShields}</span>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-xs space-y-6">
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Game Mode</p>
                  <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                    {['classic', 'dodge', 'endless'].map(m => (
                      <button key={m} onClick={() => setSelectedMode(m as any)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${selectedMode === m ? 'bg-white text-black' : 'text-slate-500'}`}>{m}</button>
                    ))}
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Threat Level</p>
                  <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
                    {['easy', 'medium', 'hard'].map(l => (
                      <button key={l} onClick={() => setSelectedLevel(l as any)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${selectedLevel === l ? 'bg-white text-black' : 'text-slate-500'}`}>{l}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <button onClick={startGame} className="w-full py-5 bg-white text-black font-black text-xl italic uppercase rounded-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-1">
                    <span>Initialize</span>

                  </button>
                  {(!checkCanAfford().canAfford) && (
                    <p className="text-xs text-red-500 font-bold uppercase animate-pulse">Insufficient Resources</p>
                  )}
                </div>

                <button onClick={onExit} className="w-full text-[10px] font-black text-slate-600 uppercase tracking-widest mt-4 hover:text-white transition-colors">Abort Sync</button>
              </div>
            </div>
          )}

          {/* Results/Overlays */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/80  backdrop-blur-sm flex flex-col items-center justify-center p-10 z-[120]">
              <div className=" p-10 rounded-2xl text-center w-full max-w-sm shadow-2xl">
                <h3 className="text-3xl font-black italic text-red-500 uppercase mb-2">Signal Failed</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-8">
                  Wallet: {globalHearts}❤️ {globalShields}🛡️
                </p>

                <div className="space-y-3">
                  <button onClick={restartSession} className="w-full py-5 bg-white text-black font-black text-lg uppercase italic rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center">
                    <span>Retry Sync</span>
                  </button>
                  <button onClick={exitSession} className="w-full py-3  text-slate-500 font-black text-xs uppercase italic rounded-xl hover:text-white transition-colors">Abort archives</button>
                </div>
              </div>
            </div>
          )}

          {isCleared && (
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-10 z-[130]">
              <div className="w-full max-w-sm  p-10 rounded-2xl flex flex-col items-center shadow-2xl">
                <div className="flex gap-2 mb-4">
                  <StarIcon active={true} className="w-8 h-8" />
                  <StarIcon active={true} className="w-10 h-10 -translate-y-2" />
                  <StarIcon active={true} className="w-8 h-8" />
                </div>
                <h3 className="text-4xl font-black italic text-yellow-400 uppercase mb-8 tracking-tighter">Sync Success</h3>

                <div className="w-full bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
                  <div className="grid grid-cols-2 gap-6 text-center">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Rewards</p>
                      <div className="flex flex-col gap-1">
                        <span className="text-xl font-black text-green-500 italic">+{sessionHearts + 1}❤️</span>
                        <span className="text-[10px] font-bold text-white/50 tracking-tighter">(Bonus Heart Included)</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Growth</p>
                      <span className="text-xl font-black text-white italic">+{animatedExp} EXP</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Peak Sync</p>
                    <span className="text-lg font-black text-blue-400 italic">{maxCombo} COMBO</span>
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/5 flex flex-col items-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Shields Salvaged</p>
                    <span className="text-lg font-black text-blue-500 italic">+{sessionShields}🛡️</span>
                  </div>
                </div>

                <button onClick={exitSession} className="w-full py-6 bg-white text-black font-black text-2xl uppercase italic rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">Claim Awards</button>
              </div>
            </div>
          )}

          {isPaused && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-[140]">
              <div className="w-72 p-10 rounded-2xl text-center shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="text-2xl font-black italic text-white uppercase mb-8 tracking-tighter">Game Paused</h2>
                <div className="space-y-4">
                  <button onClick={() => { setIsPaused(false); audioRef.current?.play(); }} className="w-full py-5 bg-white text-black font-black text-lg uppercase italic rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all">Resume Sync</button>
                  <button onClick={restartSession} className="w-full py-3 bg-white/5 border border-white/10 text-slate-300 font-black text-xs uppercase italic rounded-xl hover:bg-white/10 transition-colors">Restart Session</button>
                  <button onClick={exitSession} className="w-full py-3 bg-transparent text-slate-600 font-black text-xs uppercase italic tracking-widest hover:text-red-500 transition-colors">Eject & Exit</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {feedback && (
          <div className="absolute bottom-[20%] left-0 right-0 flex justify-center pointer-events-none z-[150] animate-in zoom-in-50 fade-in duration-150">
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
