import { NativeModules } from 'react-native';
import { createLogger } from '@partneros/core';
import type { AudioFrame } from '../AudioCapture';
import type { DetectionResult, KeywordDetector } from './KeywordDetector';

const logger = createLogger({ prefix: 'VoskDetector' });

export interface VoskConfig {
  modelPath: string; // e.g. 'vosk-model-small-en-in-0.4' bundled in assets
  keywords: string[]; // fuzzy-matched against partial transcript, e.g. ['hey bro', 'hi bro']
  maxEditDistance: number; // Levenshtein tolerance for accent/small-model inaccuracy
}

export const DEFAULT_VOSK_CONFIG: VoskConfig = {
  modelPath: 'vosk-model-small-en-in-0.4',
  keywords: ['hey bro', 'hi bro', 'hey bhai'],
  maxEditDistance: 2,
};

/**
 * Fallback KeywordDetector -- 100% open-source path when OpenWakeWord's
 * custom-trained model isn't available. Unlike OpenWakeWord (purpose-built
 * keyword spotting), Vosk here is small-model continuous ASR whose partial
 * transcripts we fuzzy-match against our keyword list. This is why it's
 * fallback, not primary: heavier CPU/battery cost per
 * project-brain/17_WAKE_WORD_DETECTION.md.
 */
export class VoskDetector implements KeywordDetector {
  readonly engineName = 'vosk';
  private initialized = false;

  constructor(private config: VoskConfig = DEFAULT_VOSK_CONFIG) {}

  async initialize(): Promise<void> {
    if (!NativeModules.Vosk) {
      throw new Error('Vosk native module not linked -- see android/.../VoskModule.kt');
    }
    await NativeModules.Vosk.loadModel(this.config.modelPath);
    this.initialized = true;
    logger.info('Vosk model loaded', { modelPath: this.config.modelPath });
  }

  async processFrame(frame: AudioFrame): Promise<DetectionResult> {
    if (!this.initialized) {
      return { detected: false, confidence: 0 };
    }

    // Native side accumulates frames internally and returns a partial
    // transcript once enough audio has been seen (Vosk's own chunking).
    const partial: string = await NativeModules.Vosk.acceptFrame(Array.from(frame));
    if (!partial) return { detected: false, confidence: 0 };

    const match = this.fuzzyMatchKeyword(partial.toLowerCase().trim());
    if (!match) return { detected: false, confidence: 0, transcript: partial };

    return { detected: true, confidence: match.confidence, transcript: partial };
  }

  reset(): void {
    NativeModules.Vosk?.reset();
  }

  async dispose(): Promise<void> {
    await NativeModules.Vosk?.unloadModel();
    this.initialized = false;
  }

  private fuzzyMatchKeyword(transcript: string): { confidence: number } | null {
    for (const keyword of this.config.keywords) {
      if (transcript.includes(keyword)) return { confidence: 1 };

      // Check word-window edit distance for accent/model-noise tolerance
      // (small Vosk model + Indian English accent commonly drops/swaps
      // consonants -- this is what was silently failing before).
      const words = transcript.split(/\s+/);
      const keywordWords = keyword.split(/\s+/);
      for (let i = 0; i <= words.length - keywordWords.length; i++) {
        const window = words.slice(i, i + keywordWords.length).join(' ');
        const distance = this.levenshtein(window, keyword);
        if (distance <= this.config.maxEditDistance) {
          const confidence = 1 - distance / Math.max(keyword.length, 1);
          return { confidence };
        }
      }
    }
    return null;
  }

  private levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[a.length][b.length];
  }
}
