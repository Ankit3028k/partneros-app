import type { AudioFrame } from './AudioCapture';

export interface VADConfig {
  energyThreshold: number; // RMS energy above which frame is "active"
  zcrMinThreshold: number; // speech has ZCR roughly in this band, not silence/pure-tone noise
  zcrMaxThreshold: number;
  hangoverFrames: number; // keep "active" for N frames after energy drops, avoids clipping word endings
}

export const DEFAULT_VAD_CONFIG: VADConfig = {
  energyThreshold: 0.01,
  zcrMinThreshold: 0.02,
  zcrMaxThreshold: 0.5,
  hangoverFrames: 8, // ~250ms at 32ms/frame
};

/**
 * Lightweight voice-activity detection gate that runs BEFORE the keyword
 * detector on every frame. This is the main reason wake word doesn't need
 * to be Vosk (continuous ASR) -- silence is filtered out here at near-zero
 * cost, and only speech-like frames reach the (heavier) KeywordDetector.
 *
 * Real energy + zero-crossing-rate detection, not a stub -- cheap enough to
 * run on every 32ms frame continuously.
 */
export class VAD {
  private hangoverCounter = 0;

  constructor(private config: VADConfig = DEFAULT_VAD_CONFIG) {}

  isSpeech(frame: AudioFrame): boolean {
    const energy = this.rmsEnergy(frame);
    const zcr = this.zeroCrossingRate(frame);

    const energyActive = energy > this.config.energyThreshold;
    const zcrInSpeechBand = zcr >= this.config.zcrMinThreshold && zcr <= this.config.zcrMaxThreshold;

    const active = energyActive && zcrInSpeechBand;

    if (active) {
      this.hangoverCounter = this.config.hangoverFrames;
      return true;
    }

    if (this.hangoverCounter > 0) {
      this.hangoverCounter--;
      return true;
    }

    return false;
  }

  reset(): void {
    this.hangoverCounter = 0;
  }

  private rmsEnergy(frame: AudioFrame): number {
    let sumSquares = 0;
    for (let i = 0; i < frame.length; i++) sumSquares += frame[i] * frame[i];
    return Math.sqrt(sumSquares / frame.length);
  }

  private zeroCrossingRate(frame: AudioFrame): number {
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0) !== (frame[i - 1] >= 0)) crossings++;
    }
    return crossings / frame.length;
  }
}
