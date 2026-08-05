import type { AudioFrame } from '../AudioCapture';

export interface DetectionResult {
  detected: boolean;
  confidence: number; // 0-1
  transcript?: string; // Vosk-backed detectors can surface partial transcript for debugging
}

/**
 * Swappable keyword-spotting engine. WakeWordService depends only on this
 * interface -- swapping OpenWakeWord <-> Vosk (or adding Porcupine later)
 * never touches WakeWordService or anything upstream.
 */
export interface KeywordDetector {
  readonly engineName: string;

  initialize(): Promise<void>;

  /** Feed one VAD-gated speech frame. Accumulates internally across calls. */
  processFrame(frame: AudioFrame): Promise<DetectionResult>;

  reset(): void;

  dispose(): Promise<void>;
}
