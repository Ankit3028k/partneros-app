import { createLogger, eventBus } from '@partneros/core';
import { AudioCapture, audioCapture } from './AudioCapture';
import { VAD } from './VAD';
import type { KeywordDetector } from './detectors/KeywordDetector';
import { OpenWakeWordDetector } from './detectors/OpenWakeWordDetector';
import { VoskDetector } from './detectors/VoskDetector';
import { SpeakerVerifier, speakerVerifier } from './speaker/SpeakerVerifier';
import { SpeakerEnrollment, speakerEnrollment } from './speaker/SpeakerEnrollment';

const logger = createLogger({ prefix: 'WakeWordService' });

export type WakeWordEngine = 'openwakeword' | 'vosk';

export interface WakeWordServiceConfig {
  engine: WakeWordEngine;
  requireSpeakerVerification: boolean;
  cooldownMs: number; // minimum gap between consecutive triggers
}

export const DEFAULT_SERVICE_CONFIG: WakeWordServiceConfig = {
  engine: 'openwakeword',
  requireSpeakerVerification: true,
  cooldownMs: 2000,
};

/**
 * Full pipeline per project-brain/17_WAKE_WORD_DETECTION.md:
 *
 *   AudioCapture -> VAD -> KeywordDetector -> SpeakerVerifier -> emit 'wakeword:triggered'
 *
 * STT is NOT started here -- this service's only job is deciding "was the
 * enrolled user's voice heard saying the wake word". Whatever listens for
 * 'wakeword:triggered' (app layer) is responsible for starting STT next.
 */
export class WakeWordService {
  private vad = new VAD();
  private detector: KeywordDetector;
  private lastTriggerAt = 0;
  private unsubscribeFrame: (() => void) | null = null;
  private running = false;

  constructor(
    private config: WakeWordServiceConfig = DEFAULT_SERVICE_CONFIG,
    private capture: AudioCapture = audioCapture,
    private verifier: SpeakerVerifier = speakerVerifier,
    private enrollment: SpeakerEnrollment = speakerEnrollment,
  ) {
    this.detector = this.createDetector(config.engine);
  }

  async start(): Promise<void> {
    if (this.running) return;

    if (this.config.requireSpeakerVerification && !this.enrollment.hasEnrollment()) {
      throw new Error('No speaker enrollment found -- run SpeakerEnrollment.enroll() first');
    }

    try {
      await this.detector.initialize();
    } catch (error) {
      if (this.config.engine === 'openwakeword') {
        logger.warn('OpenWakeWord init failed, falling back to Vosk', { error: String(error) });
        this.detector = this.createDetector('vosk');
        await this.detector.initialize();
      } else {
        throw error;
      }
    }

    await this.capture.start();
    this.unsubscribeFrame = this.capture.onFrame((frame) => {
      void this.handleFrame(frame);
    });
    this.running = true;
    logger.info('WakeWordService started', { engine: this.detector.engineName });
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.unsubscribeFrame?.();
    this.unsubscribeFrame = null;
    await this.capture.stop();
    this.detector.reset();
    this.vad.reset();
    this.running = false;
    logger.info('WakeWordService stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  private async handleFrame(frame: Float32Array): Promise<void> {
    // VAD gate -- silence never reaches the (heavier) keyword detector.
    if (!this.vad.isSpeech(frame)) return;

    const result = await this.detector.processFrame(frame);
    if (!result.detected) return;

    const now = Date.now();
    if (now - this.lastTriggerAt < this.config.cooldownMs) return;

    if (this.config.requireSpeakerVerification) {
      const voiceprint = this.enrollment.getStoredVoiceprint();
      if (!voiceprint) {
        logger.warn('Wake word detected but no voiceprint stored -- rejecting');
        return;
      }
      const verified = this.verifier.verify(frame, voiceprint);
      if (!verified) {
        logger.info('Wake word detected but speaker verification failed');
        await eventBus.emit('wakeword:rejected', { reason: 'speaker_mismatch', confidence: result.confidence });
        return;
      }
    }

    this.lastTriggerAt = now;
    this.detector.reset();
    logger.info('Wake word triggered', { engine: this.detector.engineName, confidence: result.confidence });
    await eventBus.emit('wakeword:triggered', { confidence: result.confidence, engine: this.detector.engineName });
  }

  private createDetector(engine: WakeWordEngine): KeywordDetector {
    return engine === 'vosk' ? new VoskDetector() : new OpenWakeWordDetector();
  }
}

export const wakeWordService = new WakeWordService();
