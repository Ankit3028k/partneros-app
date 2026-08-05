import { createMMKV } from 'react-native-mmkv';
import { createLogger } from '@partneros/core';
import type { AudioFrame } from '../AudioCapture';
import { mfccExtractor } from './SpeakerEmbedding';
import type { SpeakerEmbedding } from './SpeakerEmbedding';

const logger = createLogger({ prefix: 'SpeakerEnrollment' });

const STORAGE_KEY = 'wakeword.voiceprint';
const MIN_SAMPLES = 3;
const RECOMMENDED_SAMPLES = 5;

export interface SpeakerEnrollmentInterface {
  enroll(samples: AudioFrame[]): Promise<SpeakerEmbedding>;
}

/**
 * Captures 3-5 "hey bro" utterances during setup, builds an averaged
 * voiceprint, persists it for SpeakerVerifier to compare against later.
 *
 * Storage is encrypted at rest via MMKV's built-in AES encryption (per
 * project-brain/23_ON_DEVICE_ENCRYPTION.md -- voiceprints are biometric
 * data). encryptionKey below is a placeholder: swap for a key pulled from
 * platform secure storage (Android Keystore) before shipping, don't
 * hardcode it in source.
 */
export class SpeakerEnrollment implements SpeakerEnrollmentInterface {
  private storage = createMMKV({
    id: 'partneros-wakeword',
    encryptionKey: 'REPLACE_WITH_KEYSTORE_DERIVED_KEY', // TODO: source from Android Keystore
  });

  async enroll(samples: AudioFrame[]): Promise<SpeakerEmbedding> {
    if (samples.length < MIN_SAMPLES) {
      throw new Error(`Need at least ${MIN_SAMPLES} samples to enroll, got ${samples.length}`);
    }
    if (samples.length < RECOMMENDED_SAMPLES) {
      logger.warn('Enrolling with fewer than recommended samples', {
        got: samples.length,
        recommended: RECOMMENDED_SAMPLES,
      });
    }

    const embeddings = samples.map((sample) => mfccExtractor.extract(sample));
    const voiceprint = mfccExtractor.average(embeddings);

    this.persist(voiceprint);
    logger.info('Enrollment complete', { sampleCount: samples.length });

    return voiceprint;
  }

  hasEnrollment(): boolean {
    return this.storage.contains(STORAGE_KEY);
  }

  getStoredVoiceprint(): SpeakerEmbedding | null {
    const raw = this.storage.getString(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as { vector: number[]; createdAt: number };
      return { vector: Float32Array.from(parsed.vector), createdAt: parsed.createdAt };
    } catch (error) {
      logger.error('Failed to parse stored voiceprint', { error: String(error) });
      return null;
    }
  }

  clearEnrollment(): void {
    this.storage.remove(STORAGE_KEY);
  }

  private persist(embedding: SpeakerEmbedding): void {
    const serializable = { vector: Array.from(embedding.vector), createdAt: embedding.createdAt };
    this.storage.set(STORAGE_KEY, JSON.stringify(serializable));
  }
}

export const speakerEnrollment = new SpeakerEnrollment();
