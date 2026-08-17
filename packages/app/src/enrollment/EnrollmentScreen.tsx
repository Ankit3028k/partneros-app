import React, { useCallback, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { audioCapture, speakerEnrollment } from '@partneros/wakeword';
import type { AudioFrame } from '@partneros/wakeword';
import { permissionManager } from '@partneros/device';
import { createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'EnrollmentScreen' });

const MIN_SAMPLES = 3;
const RECOMMENDED_SAMPLES = 5;
const RECORD_DURATION_MS = 1800; // ~1.8s per "hey bro" utterance -- enough for the phrase + a little padding

type Stage = 'intro' | 'ready' | 'recording' | 'processing' | 'done' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEnrolled: () => void;
}

/**
 * Voice enrollment flow -- the piece that was missing entirely, which is
 * why the mic button did nothing before: WakeWordService.start() requires
 * a stored voiceprint and there was no screen to create one. Records
 * MIN_SAMPLES-RECOMMENDED_SAMPLES utterances of the wake word, builds an
 * averaged voiceprint via SpeakerEnrollment.enroll(), persists it.
 */
export function EnrollmentScreen({ visible, onClose, onEnrolled }: Props): React.JSX.Element | null {
  const [stage, setStage] = useState<Stage>('intro');
  const [sampleCount, setSampleCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const samplesRef = useRef<AudioFrame[]>([]);

  const reset = useCallback(() => {
    setStage('intro');
    setSampleCount(0);
    setError(null);
    samplesRef.current = [];
  }, []);

  const start = useCallback(async () => {
    const granted = await permissionManager.request('MICROPHONE');
    if (!granted) {
      setError('Microphone permission is required to enroll your voice.');
      setStage('error');
      return;
    }
    setStage('ready');
  }, []);

  const recordOneSample = useCallback(async () => {
    setStage('recording');
    try {
      const chunks: Float32Array[] = [];
      const unsubscribe = audioCapture.onFrame((frame) => chunks.push(frame));

      if (!audioCapture.isRunning()) {
        await audioCapture.start();
      }

      await new Promise<void>((resolve) => setTimeout(resolve, RECORD_DURATION_MS));

      unsubscribe();

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      samplesRef.current.push(merged);
      setSampleCount(samplesRef.current.length);
      setStage('ready');
    } catch (err) {
      logger.error('Sample recording failed', { error: String(err) });
      setError(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  }, []);

  const finish = useCallback(async () => {
    setStage('processing');
    try {
      await audioCapture.stop();
      await speakerEnrollment.enroll(samplesRef.current);
      setStage('done');
      onEnrolled();
    } catch (err) {
      logger.error('Enrollment failed', { error: String(err) });
      setError(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  }, [onEnrolled]);

  const cancel = useCallback(async () => {
    await audioCapture.stop().catch(() => {});
    reset();
    onClose();
  }, [reset, onClose]);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={cancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Set up "Hey Bro"</Text>

          {stage === 'intro' && (
            <>
              <Text style={styles.body}>
                Record yourself saying "hey bro" {RECOMMENDED_SAMPLES} times so PartnerOS can recognize
                your voice specifically -- this is what keeps other people's voices from triggering it.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={start}>
                <Text style={styles.primaryButtonText}>Start</Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'ready' && (
            <>
              <Text style={styles.body}>
                Sample {sampleCount} of {RECOMMENDED_SAMPLES} recorded.
              </Text>
              <View style={styles.dots}>
                {Array.from({ length: RECOMMENDED_SAMPLES }).map((_, i) => (
                  <View key={i} style={[styles.dot, i < sampleCount && styles.dotFilled]} />
                ))}
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={recordOneSample}>
                <Text style={styles.primaryButtonText}>
                  {sampleCount === 0 ? 'Say "Hey Bro"' : 'Record Again'}
                </Text>
              </TouchableOpacity>
              {sampleCount >= MIN_SAMPLES && (
                <TouchableOpacity style={styles.secondaryButton} onPress={finish}>
                  <Text style={styles.secondaryButtonText}>Finish Enrollment</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {stage === 'recording' && (
            <>
              <Text style={styles.recordingText}>🎙️ Listening...</Text>
              <Text style={styles.body}>Say "hey bro" now</Text>
            </>
          )}

          {stage === 'processing' && <Text style={styles.body}>Building your voiceprint...</Text>}

          {stage === 'done' && (
            <>
              <Text style={styles.body}>✅ Voice enrolled. You can now use "hey bro" to trigger PartnerOS.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'error' && (
            <>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={reset}>
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </>
          )}

          {stage !== 'done' && (
            <TouchableOpacity style={styles.dismissButton} onPress={cancel}>
              <Text style={styles.dismissText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '85%', backgroundColor: '#16213e', borderRadius: 16, padding: 20 },
  title: { color: '#e94560', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  body: { color: '#ccc', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  recordingText: { color: '#e94560', fontSize: 24, textAlign: 'center', marginBottom: 8 },
  errorText: { color: '#ff6b6b', fontSize: 14, marginBottom: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0f3460' },
  dotFilled: { backgroundColor: '#e94560' },
  primaryButton: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secondaryButton: { marginTop: 10, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e94560' },
  secondaryButtonText: { color: '#e94560', fontWeight: '600', fontSize: 15 },
  dismissButton: { marginTop: 16, alignItems: 'center' },
  dismissText: { color: '#888', fontSize: 13 },
});
