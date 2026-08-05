import type { AudioFrame } from '../AudioCapture';
import { SAMPLE_RATE } from '../AudioCapture';

export interface SpeakerEmbedding {
  vector: Float32Array; // mean-pooled MFCC coefficients across the utterance
  createdAt: number;
}

const NUM_MEL_FILTERS = 26;
const NUM_MFCC_COEFFICIENTS = 13;
const FFT_SIZE = 512;

/**
 * MVP speaker embedding: MFCC extraction + mean pooling. Real DSP
 * implementation (FFT -> mel filterbank -> log -> DCT), not a stub --
 * this is what makes SpeakerVerifier.verify() actually work, not just
 * type-check.
 *
 * Deliberately behind the SpeakerEmbedding interface so swapping to a
 * learned embedding (ECAPA-TDNN, TitaNet) later means adding a new
 * extractor class, not touching SpeakerVerifier/Enrollment.
 */
export class MFCCEmbeddingExtractor {
  extract(audio: AudioFrame): SpeakerEmbedding {
    const frames = this.frameSignal(audio, FFT_SIZE, Math.floor(FFT_SIZE / 2));
    const mfccFrames = frames.map((frame) => this.mfcc(frame));

    // Mean-pool across time -> fixed-length utterance-level vector.
    const vector = new Float32Array(NUM_MFCC_COEFFICIENTS);
    for (const frame of mfccFrames) {
      for (let i = 0; i < NUM_MFCC_COEFFICIENTS; i++) vector[i] += frame[i];
    }
    for (let i = 0; i < NUM_MFCC_COEFFICIENTS; i++) vector[i] /= Math.max(mfccFrames.length, 1);

    return { vector, createdAt: Date.now() };
  }

  /** Average multiple enrollment-sample embeddings into one voiceprint. */
  average(embeddings: SpeakerEmbedding[]): SpeakerEmbedding {
    const dim = embeddings[0]?.vector.length ?? NUM_MFCC_COEFFICIENTS;
    const vector = new Float32Array(dim);
    for (const e of embeddings) {
      for (let i = 0; i < dim; i++) vector[i] += e.vector[i];
    }
    for (let i = 0; i < dim; i++) vector[i] /= Math.max(embeddings.length, 1);
    return { vector, createdAt: Date.now() };
  }

  private frameSignal(signal: AudioFrame, frameSize: number, hop: number): Float32Array[] {
    const frames: Float32Array[] = [];
    for (let start = 0; start + frameSize <= signal.length; start += hop) {
      frames.push(signal.slice(start, start + frameSize));
    }
    return frames.length > 0 ? frames : [this.padTo(signal, frameSize)];
  }

  private padTo(signal: AudioFrame, size: number): Float32Array {
    const out = new Float32Array(size);
    out.set(signal.slice(0, size));
    return out;
  }

  private mfcc(frame: Float32Array): Float32Array {
    const windowed = this.hammingWindow(frame);
    const spectrum = this.magnitudeSpectrum(windowed);
    const melEnergies = this.melFilterbank(spectrum);
    const logEnergies = Array.from(melEnergies, (e) => Math.log(Math.max(e, 1e-10)));
    return this.dct(logEnergies).slice(0, NUM_MFCC_COEFFICIENTS);
  }

  private hammingWindow(frame: Float32Array): Float32Array {
    const out = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      out[i] = frame[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1)));
    }
    return out;
  }

  /** Radix-2 FFT magnitude spectrum (frame length must be a power of 2). */
  private magnitudeSpectrum(frame: Float32Array): Float32Array {
    const n = frame.length;
    const real = Float32Array.from(frame);
    const imag = new Float32Array(n);
    this.fft(real, imag);

    const half = n / 2;
    const mag = new Float32Array(half);
    for (let i = 0; i < half; i++) {
      mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }
    return mag;
  }

  private fft(real: Float32Array, imag: Float32Array): void {
    const n = real.length;
    if (n <= 1) return;

    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }

    for (let len = 2; len <= n; len <<= 1) {
      const angle = (-2 * Math.PI) / len;
      const wReal = Math.cos(angle);
      const wImag = Math.sin(angle);
      for (let start = 0; start < n; start += len) {
        let curReal = 1;
        let curImag = 0;
        for (let k = 0; k < len / 2; k++) {
          const evenIdx = start + k;
          const oddIdx = start + k + len / 2;
          const oddReal = real[oddIdx] * curReal - imag[oddIdx] * curImag;
          const oddImag = real[oddIdx] * curImag + imag[oddIdx] * curReal;

          real[oddIdx] = real[evenIdx] - oddReal;
          imag[oddIdx] = imag[evenIdx] - oddImag;
          real[evenIdx] += oddReal;
          imag[evenIdx] += oddImag;

          const nextReal = curReal * wReal - curImag * wImag;
          const nextImag = curReal * wImag + curImag * wReal;
          curReal = nextReal;
          curImag = nextImag;
        }
      }
    }
  }

  private melFilterbank(spectrum: Float32Array): Float32Array {
    const nyquist = SAMPLE_RATE / 2;
    const melMax = this.hzToMel(nyquist);
    const melPoints = Array.from({ length: NUM_MEL_FILTERS + 2 }, (_, i) => (i * melMax) / (NUM_MEL_FILTERS + 1));
    const hzPoints = melPoints.map((m) => this.melToHz(m));
    const bins = hzPoints.map((hz) => Math.floor(((spectrum.length * 2) * hz) / SAMPLE_RATE));

    const energies = new Float32Array(NUM_MEL_FILTERS);
    for (let m = 1; m <= NUM_MEL_FILTERS; m++) {
      const [left, center, right] = [bins[m - 1], bins[m], bins[m + 1]];
      let energy = 0;
      for (let k = left; k < center; k++) {
        if (k >= 0 && k < spectrum.length && center > left) energy += spectrum[k] * ((k - left) / (center - left));
      }
      for (let k = center; k < right; k++) {
        if (k >= 0 && k < spectrum.length && right > center) energy += spectrum[k] * ((right - k) / (right - center));
      }
      energies[m - 1] = energy;
    }
    return energies;
  }

  private dct(input: number[]): Float32Array {
    const n = input.length;
    const out = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += input[i] * Math.cos((Math.PI / n) * (i + 0.5) * k);
      }
      out[k] = sum;
    }
    return out;
  }

  private hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }

  private melToHz(mel: number): number {
    return 700 * (10 ** (mel / 2595) - 1);
  }
}

export const mfccExtractor = new MFCCEmbeddingExtractor();
