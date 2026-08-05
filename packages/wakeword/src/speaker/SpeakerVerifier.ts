import { createLogger } from '@partneros/core';
import type { AudioFrame } from '../AudioCapture';
import { mfccExtractor } from './SpeakerEmbedding';
import type { SpeakerEmbedding } from './SpeakerEmbedding';

const logger = createLogger({ prefix: 'SpeakerVerifier' });

export interface SpeakerVerifierConfig {
  threshold: number; // cosine similarity cutoff, tune during real-device testing
}

export const DEFAULT_VERIFIER_CONFIG: SpeakerVerifierConfig = {
  threshold: 0.75,
};

/**
 * Gate between wake-word detection and STT (see
 * project-brain/16_VOICE_PIPELINE.md): only the enrolled voice should ever
 * reach the LLM/action pipeline. verify() is what was missing entirely
 * before -- wake word had nothing to compare against, so nothing could
 * ever pass even if detected.
 */
export interface SpeakerVerifierInterface {
  verify(audio: AudioFrame, storedEmbedding: SpeakerEmbedding): boolean;
}

export class SpeakerVerifier implements SpeakerVerifierInterface {
  constructor(private config: SpeakerVerifierConfig = DEFAULT_VERIFIER_CONFIG) {}

  verify(audio: AudioFrame, storedEmbedding: SpeakerEmbedding): boolean {
    const liveEmbedding = mfccExtractor.extract(audio);
    const similarity = this.cosineSimilarity(liveEmbedding.vector, storedEmbedding.vector);

    logger.info('Speaker verification', { similarity, threshold: this.config.threshold });
    return similarity >= this.config.threshold;
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const speakerVerifier = new SpeakerVerifier();
