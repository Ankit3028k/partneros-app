import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { createLogger } from '@partneros/core';
import type { SpeechToText, STTResult, STTResultListener, STTErrorListener } from './SpeechToText';

const logger = createLogger({ prefix: 'AndroidSpeechRecognizer' });

/**
 * Wraps Android's built-in SpeechRecognizer (android.speech.SpeechRecognizer)
 * via a native bridge (android/.../SpeechRecognizerModule.kt). This is a
 * free, on-device-OS-provided engine -- no model training, no API key,
 * works out of the box on any Android device with Google's speech
 * services installed (i.e. effectively all of them).
 *
 * Not offline-guaranteed (Android's default recognizer may use network
 * depending on device/OS version) -- see project-brain/20_STT_PIPELINE.md
 * for the offline-first tradeoff discussion if a fully local engine
 * (Whisper.cpp, Vosk full-vocabulary) is needed later. Same interface
 * swap story as KeywordDetector in @partneros/wakeword.
 */
export class AndroidSpeechRecognizer implements SpeechToText {
  readonly engineName = 'android-speech-recognizer';

  private emitter: NativeEventEmitter | null = null;
  private resultSub: { remove: () => void } | null = null;
  private errorSub: { remove: () => void } | null = null;
  private resultListeners = new Set<STTResultListener>();
  private errorListeners = new Set<STTErrorListener>();
  private listening = false;

  async startListening(): Promise<void> {
    if (this.listening) return;

    if (Platform.OS !== 'android') {
      throw new Error('AndroidSpeechRecognizer only supports Android');
    }
    if (!NativeModules.SpeechRecognizer) {
      throw new Error('SpeechRecognizer native module not linked -- see android/.../SpeechRecognizerModule.kt');
    }

    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(NativeModules.SpeechRecognizer);
      this.resultSub = this.emitter.addListener('SpeechResult', (payload: STTResult) => {
        this.resultListeners.forEach((l) => l(payload));
      });
      this.errorSub = this.emitter.addListener('SpeechError', (message: string) => {
        this.errorListeners.forEach((l) => l(new Error(message)));
      });
    }

    await NativeModules.SpeechRecognizer.start();
    this.listening = true;
    logger.info('STT listening started');
  }

  async stopListening(): Promise<void> {
    if (!this.listening) return;
    await NativeModules.SpeechRecognizer?.stop();
    this.listening = false;
    logger.info('STT listening stopped');
  }

  isListening(): boolean {
    return this.listening;
  }

  onResult(listener: STTResultListener): () => void {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  onError(listener: STTErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }
}

export const androidSpeechRecognizer = new AndroidSpeechRecognizer();
