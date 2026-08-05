export interface STTResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export type STTResultListener = (result: STTResult) => void;
export type STTErrorListener = (error: Error) => void;

/**
 * Swappable STT engine interface, same pattern as
 * @partneros/wakeword's KeywordDetector -- callers depend only on this,
 * not on any specific engine, so swapping AndroidSTT <-> Whisper.cpp <->
 * cloud STT later doesn't touch VoiceSessionController.
 */
export interface SpeechToText {
  readonly engineName: string;

  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  isListening(): boolean;

  onResult(listener: STTResultListener): () => void;
  onError(listener: STTErrorListener): () => void;
}
