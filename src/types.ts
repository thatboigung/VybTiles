export interface AudioAnalysis {
  id: string;
  fileName: string;
  fileSize: number;
  timestamp: number;
  waveform: number[];
  beats: number[];
  fileUrl?: string;
  bpm: number;
  key: string;
  genre: string;
  mood: string;
  summary: string;
  highlights: number[];
  completion?: number; // Checkpoint: 0-100 percentage
}

export interface UserStats {
  username: string;
  exp: number;
  level: number;
  // Analytics
  playtime?: number; // in seconds
  songsPlayed?: number;
  // Subscription
  isPro?: boolean;
  perfects?: number;
  stars?: number;
}

export type GameMode = 'classic' | 'dodge' | 'endless';
export type Level = 'easy' | 'medium' | 'hard';
