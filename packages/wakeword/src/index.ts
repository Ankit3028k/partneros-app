export { AudioCapture, audioCapture, SAMPLE_RATE, FRAME_SIZE } from './AudioCapture';
export type { AudioFrame, AudioFrameListener } from './AudioCapture';

export { VAD, DEFAULT_VAD_CONFIG } from './VAD';
export type { VADConfig } from './VAD';

export type { KeywordDetector, DetectionResult } from './detectors/KeywordDetector';
export { OpenWakeWordDetector, DEFAULT_OWW_CONFIG } from './detectors/OpenWakeWordDetector';
export type { OpenWakeWordConfig } from './detectors/OpenWakeWordDetector';
export { VoskDetector, DEFAULT_VOSK_CONFIG } from './detectors/VoskDetector';
export type { VoskConfig } from './detectors/VoskDetector';

export { MFCCEmbeddingExtractor, mfccExtractor } from './speaker/SpeakerEmbedding';
export type { SpeakerEmbedding } from './speaker/SpeakerEmbedding';
export { SpeakerVerifier, speakerVerifier, DEFAULT_VERIFIER_CONFIG } from './speaker/SpeakerVerifier';
export type { SpeakerVerifierInterface, SpeakerVerifierConfig } from './speaker/SpeakerVerifier';
export { SpeakerEnrollment, speakerEnrollment } from './speaker/SpeakerEnrollment';
export type { SpeakerEnrollmentInterface } from './speaker/SpeakerEnrollment';

export { WakeWordService, wakeWordService, DEFAULT_SERVICE_CONFIG } from './WakeWordService';
export type { WakeWordServiceConfig, WakeWordEngine } from './WakeWordService';
