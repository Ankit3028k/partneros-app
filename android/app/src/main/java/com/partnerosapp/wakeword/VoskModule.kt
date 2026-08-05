package com.partnerosapp.wakeword

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import org.json.JSONObject
import org.vosk.Model
import org.vosk.Recognizer
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipInputStream

/**
 * Backs @partneros/wakeword VoskDetector.ts -- the fallback, 100%
 * open-source keyword-spotting path (see
 * project-brain/17_WAKE_WORD_DETECTION.md). Unlike OpenWakeWord, Vosk does
 * continuous small-model ASR; JS does the fuzzy keyword matching against
 * partial transcripts this module returns.
 *
 * Model must be bundled as a zip in android/app/src/main/assets/models/
 * (e.g. "vosk-model-small-en-in-0.4.zip", ~40MB, downloaded from
 * alphacephei.com/vosk/models -- NOT trained, just a small pre-built
 * recognition model). This module unpacks it to internal storage on first
 * load, then reuses the unpacked copy on subsequent loads.
 *
 * Requires gradle dependency:
 *   implementation("com.alphacephei:vosk-android:0.3.47")
 *   implementation("net.java.dev.jna:jna:5.13.0@aar")
 * and repository:
 *   maven { url = uri("https://alphacephei.com/maven/") }
 */
class VoskModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val SAMPLE_RATE = 16000.0f
    private const val ASSET_MODELS_DIR = "models"
  }

  private var model: Model? = null
  private var recognizer: Recognizer? = null

  override fun getName() = "Vosk"

  @ReactMethod
  fun loadModel(modelPath: String, promise: Promise) {
    try {
      val unpackedDir = ensureModelUnpacked(modelPath)
      val loadedModel = Model(unpackedDir.absolutePath)
      val newRecognizer = Recognizer(loadedModel, SAMPLE_RATE)

      // Close any previous instance before swapping -- avoids leaking
      // native handles if loadModel() is called twice (e.g. engine switch).
      recognizer?.close()
      model?.close()

      model = loadedModel
      recognizer = newRecognizer
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("VOSK_LOAD_ERROR", "Failed to load Vosk model at $modelPath: ${e.message}", e)
    }
  }

  /**
   * Accepts one frame of PCM samples (as a JS number[] of Float32 values in
   * [-1, 1], converted here to 16-bit PCM shorts). Returns Vosk's current
   * partial transcript, or empty string if nothing recognized yet.
   */
  @ReactMethod
  fun acceptFrame(frame: ReadableArray, promise: Promise) {
    val rec = recognizer
    if (rec == null) {
      promise.reject("NOT_INITIALIZED", "Vosk recognizer not initialized -- call loadModel() first")
      return
    }

    try {
      val shorts = ShortArray(frame.size())
      for (i in 0 until frame.size()) {
        val sample = frame.getDouble(i).toFloat()
        shorts[i] = (sample * 32767f).toInt().coerceIn(-32768, 32767).toShort()
      }

      val hasResult = rec.acceptWaveForm(shorts, shorts.size)
      val json = if (hasResult) rec.result else rec.partialResult
      val text = extractText(json, if (hasResult) "text" else "partial")
      promise.resolve(text)
    } catch (e: Exception) {
      promise.reject("VOSK_ACCEPT_ERROR", e)
    }
  }

  @ReactMethod
  fun reset(promise: Promise) {
    try {
      recognizer?.reset()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("VOSK_RESET_ERROR", e)
    }
  }

  @ReactMethod
  fun unloadModel(promise: Promise) {
    try {
      recognizer?.close()
      model?.close()
      recognizer = null
      model = null
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("VOSK_UNLOAD_ERROR", e)
    }
  }

  private fun extractText(json: String, field: String): String {
    return try {
      JSONObject(json).optString(field, "")
    } catch (e: Exception) {
      ""
    }
  }

  /**
   * Unpacks modelPath.zip from assets/models/ into internal storage on
   * first use. Subsequent calls reuse the already-unpacked directory --
   * unzipping a ~40MB model on every load would be wasteful.
   */
  private fun ensureModelUnpacked(modelPath: String): File {
    val targetDir = File(reactContext.filesDir, modelPath)
    if (targetDir.exists() && targetDir.isDirectory && (targetDir.list()?.isNotEmpty() == true)) {
      return targetDir
    }

    targetDir.mkdirs()
    val assetZipPath = "$ASSET_MODELS_DIR/$modelPath.zip"

    reactContext.assets.open(assetZipPath).use { input ->
      ZipInputStream(input).use { zip ->
        var entry = zip.nextEntry
        while (entry != null) {
          val outFile = File(targetDir, entry.name)
          if (entry.isDirectory) {
            outFile.mkdirs()
          } else {
            outFile.parentFile?.mkdirs()
            FileOutputStream(outFile).use { out -> zip.copyTo(out) }
          }
          zip.closeEntry()
          entry = zip.nextEntry
        }
      }
    }

    return targetDir
  }
}
