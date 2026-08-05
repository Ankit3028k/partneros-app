package com.partnerosapp.wakeword

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Backs @partneros/stt AndroidSpeechRecognizer.ts. Wraps Android's built-in
 * SpeechRecognizer -- free, no model training, works out of the box via
 * Google's on-device/cloud speech services (already present on virtually
 * every Android device). Emits partial results continuously and a final
 * result when the user stops speaking.
 *
 * SpeechRecognizer MUST be created/used on the main thread -- all calls
 * below are dispatched through a main-thread Handler regardless of which
 * thread invokes the @ReactMethod.
 */
class SpeechRecognizerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var recognizer: SpeechRecognizer? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun getName() = "SpeechRecognizer"

  @ReactMethod
  fun start(promise: Promise) {
    mainHandler.post {
      try {
        if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
          promise.reject("NOT_AVAILABLE", "No speech recognition service available on this device")
          return@post
        }

        recognizer?.destroy()
        val rec = SpeechRecognizer.createSpeechRecognizer(reactContext)
        rec.setRecognitionListener(createListener())
        recognizer = rec

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
          // Hinglish/Hindi support per project-brain -- device's configured
          // recognition language governs actual accuracy; this just allows
          // the request to specify it explicitly if set.
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN")
        }

        rec.startListening(intent)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("STT_START_ERROR", e)
      }
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    mainHandler.post {
      try {
        recognizer?.stopListening()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("STT_STOP_ERROR", e)
      }
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}

  private fun createListener(): RecognitionListener {
    return object : RecognitionListener {
      override fun onReadyForSpeech(params: Bundle?) {}
      override fun onBeginningOfSpeech() {}
      override fun onRmsChanged(rmsdB: Float) {}
      override fun onBufferReceived(buffer: ByteArray?) {}
      override fun onEndOfSpeech() {}

      override fun onError(error: Int) {
        emitError(describeError(error))
      }

      override fun onResults(results: Bundle?) {
        val text = extractBestText(results)
        if (text != null) emitResult(text, isFinal = true)
        recognizer?.destroy()
        recognizer = null
      }

      override fun onPartialResults(partialResults: Bundle?) {
        val text = extractBestText(partialResults)
        if (text != null) emitResult(text, isFinal = false)
      }

      override fun onEvent(eventType: Int, params: Bundle?) {}
    }
  }

  private fun extractBestText(bundle: Bundle?): String? {
    val matches = bundle?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
    return matches?.firstOrNull()
  }

  private fun emitResult(text: String, isFinal: Boolean) {
    val map: WritableMap = Arguments.createMap()
    map.putString("text", text)
    map.putBoolean("isFinal", isFinal)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("SpeechResult", map)
  }

  private fun emitError(message: String) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("SpeechError", message)
  }

  private fun describeError(error: Int): String {
    return when (error) {
      SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
      SpeechRecognizer.ERROR_CLIENT -> "Client-side error"
      SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Missing RECORD_AUDIO permission"
      SpeechRecognizer.ERROR_NETWORK -> "Network error"
      SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
      SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized"
      SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
      SpeechRecognizer.ERROR_SERVER -> "Server error"
      SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input timeout"
      else -> "Unknown speech recognition error ($error)"
    }
  }
}
