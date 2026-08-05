import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'AudioCapture' });

export const SAMPLE_RATE = 16000; // standard for both wake-word models and Vosk
export const FRAME_SIZE = 512; // ~32ms frames at 16kHz

export type AudioFrame = Float32Array;
export type AudioFrameListener = (frame: AudioFrame) => void;

/**
 * Thin wrapper over a native AudioRecord-based module
 * (android/.../AudioCaptureModule.kt). Streams continuous 16kHz mono PCM
 * frames to JS as base64, decoded here into Float32Array for VAD/detector
 * consumption. This is the single mic source shared by VAD + KeywordDetector
 * + SpeakerVerifier -- only one AudioRecord session should ever be open.
 */
export class AudioCapture {
  private emitter: NativeEventEmitter | null = null;
  private subscription: { remove: () => void } | null = null;
  private listeners = new Set<AudioFrameListener>();
  private running = false;

  async start(): Promise<void> {
    if (this.running) return;

    if (Platform.OS !== 'android') {
      logger.warn('AudioCapture: iOS not yet supported');
      return;
    }

    if (!NativeModules.AudioCapture) {
      throw new Error('AudioCapture native module not linked -- see android/.../AudioCaptureModule.kt');
    }

    this.emitter = new NativeEventEmitter(NativeModules.AudioCapture);
    this.subscription = this.emitter.addListener('AudioFrame', (base64Frame: string) => {
      const frame = this.decodeFrame(base64Frame);
      this.listeners.forEach((listener) => listener(frame));
    });

    await NativeModules.AudioCapture.start(SAMPLE_RATE, FRAME_SIZE);
    this.running = true;
    logger.info('Audio capture started', { sampleRate: SAMPLE_RATE, frameSize: FRAME_SIZE });
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    await NativeModules.AudioCapture?.stop();
    this.subscription?.remove();
    this.subscription = null;
    this.running = false;
    logger.info('Audio capture stopped');
  }

  onFrame(listener: AudioFrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Native side sends 16-bit PCM samples base64-encoded. Decode to
   * Float32Array normalized to [-1, 1] for downstream DSP (VAD, MFCC).
   * Self-contained decode -- RN/Hermes doesn't guarantee atob/Buffer
   * globals are present, so no dependency on either.
   */
  private decodeFrame(base64: string): Float32Array {
    const bytes = this.base64ToBytes(base64);
    const view = new DataView(bytes.buffer);
    const sampleCount = bytes.length / 2;
    const samples = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const int16 = view.getInt16(i * 2, true); // little-endian
      samples[i] = int16 / 32768;
    }
    return samples;
  }

  private base64ToBytes(base64: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
    const byteLength = Math.floor((clean.length * 3) / 4) - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0);
    const bytes = new Uint8Array(byteLength);

    let byteIndex = 0;
    for (let i = 0; i < clean.length; i += 4) {
      const c0 = chars.indexOf(clean[i]);
      const c1 = chars.indexOf(clean[i + 1]);
      const c2 = chars.indexOf(clean[i + 2]);
      const c3 = chars.indexOf(clean[i + 3]);

      const triple = ((c0 & 0x3f) << 18) | ((c1 & 0x3f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f);

      if (byteIndex < byteLength) bytes[byteIndex++] = (triple >> 16) & 0xff;
      if (byteIndex < byteLength) bytes[byteIndex++] = (triple >> 8) & 0xff;
      if (byteIndex < byteLength) bytes[byteIndex++] = triple & 0xff;
    }
    return bytes;
  }
}

export const audioCapture = new AudioCapture();
