package com.partnerosapp.wakeword

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Backs @partneros/wakeword AudioCapture.ts. Streams raw 16-bit PCM mono
 * audio from the mic in fixed-size frames, base64-encoded, emitted as
 * "AudioFrame" events to JS. This is the single mic source shared by
 * VAD + KeywordDetector + SpeakerVerifier (see WakeWordService.ts) --
 * only one AudioRecord session is ever open at a time.
 *
 * Requires RECORD_AUDIO permission -- caller (JS PermissionManager) must
 * check/request before calling start(). This module does not request
 * permissions itself, it just fails loudly if missing.
 */
class AudioCaptureModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var audioRecord: AudioRecord? = null
  private var captureThread: Thread? = null
  private val isCapturing = AtomicBoolean(false)

  override fun getName() = "AudioCapture"

  @ReactMethod
  fun start(sampleRate: Int, frameSize: Int, promise: Promise) {
    if (isCapturing.get()) {
      promise.resolve(null) // already running -- idempotent
      return
    }

    if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO)
      != PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject("PERMISSION_DENIED", "RECORD_AUDIO permission not granted")
      return
    }

    try {
      val minBufferSize = AudioRecord.getMinBufferSize(
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
      )

      if (minBufferSize == AudioRecord.ERROR || minBufferSize == AudioRecord.ERROR_BAD_VALUE) {
        promise.reject("AUDIO_CONFIG_ERROR", "Unsupported sample rate/format: $sampleRate")
        return
      }

      // Buffer sized generously above the frame size to avoid overruns --
      // frameSize is in samples, buffer is in bytes (16-bit = 2 bytes/sample).
      val bufferSizeBytes = maxOf(minBufferSize, frameSize * 2 * 4)

      val record = AudioRecord(
        MediaRecorder.AudioSource.VOICE_RECOGNITION,
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        bufferSizeBytes
      )

      if (record.state != AudioRecord.STATE_INITIALIZED) {
        promise.reject("AUDIO_INIT_ERROR", "AudioRecord failed to initialize")
        return
      }

      audioRecord = record
      isCapturing.set(true)
      record.startRecording()

      captureThread = Thread { captureLoop(record, frameSize) }.apply {
        name = "PartnerOS-AudioCapture"
        priority = Thread.MAX_PRIORITY // low-latency audio thread
        start()
      }

      promise.resolve(null)
    } catch (e: SecurityException) {
      promise.reject("PERMISSION_DENIED", e)
    } catch (e: Exception) {
      promise.reject("AUDIO_START_ERROR", e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    isCapturing.set(false)
    captureThread?.join(500)
    captureThread = null

    audioRecord?.let {
      try {
        if (it.state == AudioRecord.STATE_INITIALIZED) it.stop()
        it.release()
      } catch (e: Exception) {
        // best-effort cleanup, don't fail stop() over it
      }
    }
    audioRecord = null

    promise.resolve(null)
  }

  /**
   * Runs on a dedicated thread (not the RN bridge thread) reading fixed-size
   * frames continuously until stop() flips isCapturing off. Each frame is
   * base64-encoded and emitted individually -- decoded back to Float32Array
   * on the JS side (see AudioCapture.ts decodeFrame).
   */
  private fun captureLoop(record: AudioRecord, frameSize: Int) {
    val frameBytes = ShortArray(frameSize)

    while (isCapturing.get()) {
      val read = record.read(frameBytes, 0, frameSize)
      if (read <= 0) continue

      val byteBuffer = java.nio.ByteBuffer.allocate(read * 2)
        .order(java.nio.ByteOrder.LITTLE_ENDIAN)
      for (i in 0 until read) byteBuffer.putShort(frameBytes[i])

      val base64Frame = Base64.encodeToString(byteBuffer.array(), Base64.NO_WRAP)
      emitFrame(base64Frame)
    }
  }

  private fun emitFrame(base64Frame: String) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("AudioFrame", base64Frame)
  }

  // Required by RN's NativeEventEmitter contract even though we don't use
  // JS-side add/removeListener counts for anything (capture runs regardless).
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}
}
