import { createLogger, eventBus } from '@partneros/core';
import { WakeWordService } from '@partneros/wakeword';
import type { SpeechToText, STTResult } from '@partneros/stt';
import type { PartnerOS } from './PartnerOS';

const logger = createLogger({ prefix: 'VoiceSessionController' });

export type VoiceState = 'idle' | 'listening_for_wakeword' | 'listening_for_command' | 'processing';

/**
 * Composition-root glue for the full voice pipeline (see
 * project-brain/16_VOICE_PIPELINE.md):
 *
 *   WakeWordService --('wakeword:triggered')--> stop wake-word mic
 *     -> SpeechToText.startListening() -> final transcript
 *     -> PartnerOS.process(transcript) -> resume WakeWordService
 *
 * Wake word and STT can't both hold the mic at once (AudioRecord vs
 * SpeechRecognizer both need exclusive access), so this controller is
 * also what enforces "only one listens at a time".
 */
export class VoiceSessionController {
  private state: VoiceState = 'idle';
  private unsubscribeTrigger: (() => void) | null = null;
  private unsubscribeResult: (() => void) | null = null;
  private unsubscribeError: (() => void) | null = null;

  constructor(
    private wakeWordService: WakeWordService,
    private stt: SpeechToText,
    private partnerOS: PartnerOS,
  ) {}

  async start(): Promise<void> {
    this.unsubscribeTrigger = eventBus.on('wakeword:triggered', () => {
      void this.handleWakeWordTriggered();
    });

    await this.wakeWordService.start();
    this.state = 'listening_for_wakeword';
    logger.info('Voice session started');
  }

  async stop(): Promise<void> {
    this.unsubscribeTrigger?.();
    this.unsubscribeResult?.();
    this.unsubscribeError?.();
    await this.stt.stopListening();
    await this.wakeWordService.stop();
    this.state = 'idle';
    logger.info('Voice session stopped');
  }

  getState(): VoiceState {
    return this.state;
  }

  private async handleWakeWordTriggered(): Promise<void> {
    if (this.state !== 'listening_for_wakeword') return; // already mid-command, ignore re-trigger

    try {
      // Wake word and STT both need exclusive mic access -- hand off cleanly.
      await this.wakeWordService.stop();
      this.state = 'listening_for_command';
      await eventBus.emit('voice:state', { state: this.state });

      this.unsubscribeResult = this.stt.onResult((result: STTResult) => {
        void this.handleSTTResult(result);
      });
      this.unsubscribeError = this.stt.onError((error: Error) => {
        logger.error('STT error', { error: error.message });
        void this.resumeWakeWordListening();
      });

      await this.stt.startListening();
    } catch (error) {
      logger.error('Failed to start command listening', { error: String(error) });
      await this.resumeWakeWordListening();
    }
  }

  private async handleSTTResult(result: STTResult): Promise<void> {
    if (!result.isFinal) return; // partials are for UI feedback only, not acted on here

    this.unsubscribeResult?.();
    this.unsubscribeError?.();
    this.unsubscribeResult = null;
    this.unsubscribeError = null;

    this.state = 'processing';
    await eventBus.emit('voice:state', { state: this.state });

    if (result.text.trim().length === 0) {
      await this.resumeWakeWordListening();
      return;
    }

    try {
      const processed = await this.partnerOS.process(result.text);
      if (processed.ok) {
        await eventBus.emit('voice:response', processed.value);
      } else {
        logger.error('PartnerOS.process returned error', { error: processed.error.message });
      }
    } catch (error) {
      logger.error('PartnerOS.process threw', { error: String(error) });
    } finally {
      await this.resumeWakeWordListening();
    }
  }

  private async resumeWakeWordListening(): Promise<void> {
    try {
      await this.stt.stopListening();
      await this.wakeWordService.start();
      this.state = 'listening_for_wakeword';
      await eventBus.emit('voice:state', { state: this.state });
    } catch (error) {
      logger.error('Failed to resume wake-word listening', { error: String(error) });
      this.state = 'idle';
    }
  }
}
