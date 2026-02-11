
import type { AudioAnalysis } from "../types";

/**
 * Local analysis fallback. 
 * Since AI is removed, we estimate BPM from the detected beats 
 * and provide generic metadata.
 */
export const analyzeLocally = (beats: number[], _fileName: string): Partial<AudioAnalysis> => {
  // Estimate BPM based on average interval between beats
  let estimatedBpm = 120;
  if (beats.length > 5) {
    const intervals = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    estimatedBpm = Math.round(60 / avgInterval);
    // Clamp to reasonable rhythm game ranges
    estimatedBpm = Math.max(60, Math.min(200, estimatedBpm));
  }

  return {
    bpm: estimatedBpm,
    key: "Auto",
    genre: "Local Track",
    mood: "Energetic",
    summary: `Local sync successful. Detected ${beats.length} rhythmic peaks in signal.`,
    highlights: beats.slice(0, 10)
  };
};

// Removing analyzeWithGemini as per request
export const analyzeWithGemini = async (_audioBase64: string, _fileName: string) => {
  throw new Error("AI Analysis Disabled");
};
