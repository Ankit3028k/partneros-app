package com.partnerosapp.wakeword

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

/**
 * Backs @partneros/wakeword OpenWakeWordDetector.ts -- the preferred
 * keyword-spotting engine (see project-brain/17_WAKE_WORD_DETECTION.md).
 * Runs a custom-trained "hey bro" TFLite model per audio window, returns
 * a confidence score which JS thresholds against.
 *
 * IMPORTANT: this module only runs inference -- it does NOT train or
 * generate the model. The .tflite file (android/app/src/main/assets/
 * hey_bro.tflite) must come from OpenWakeWord's own offline training
 * pipeline (github.com/dscripka/openWakeWord): synthetic TTS samples of
 * "hey bro" + background-noise augmentation -> trained -> exported to
 * TFLite. loadModel() will reject if the asset is missing.
 *
 * Requires gradle dependency:
 *   implementation("org.tensorflow:tensorflow-lite:2.16.1")
 */
class OpenWakeWordModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var interpreter: Interpreter? = null

  // OpenWakeWord's standard exported models take a single float32 output
  // (detection probability). Input/output shapes below match the common
  // OWW TFLite export convention -- confirm against your specific model's
  // signature (interpreter.getInputTensor(0).shape()) if training produces
  // a different shape.
  private var inputSize: Int = 16000

  override fun getName() = "OpenWakeWord"

  @ReactMethod
  fun loadModel(modelPath: String, promise: Promise) {
    try {
      val buffer = loadModelFile(modelPath)
      val options = Interpreter.Options().apply {
        setNumThreads(2) // keep this light -- runs continuously in background
      }
      val newInterpreter = Interpreter(buffer, options)

      interpreter?.close()
      interpreter = newInterpreter
      inputSize = newInterpreter.getInputTensor(0).shape().last()

      promise.resolve(null)
    } catch (e: java.io.FileNotFoundException) {
      promise.reject(
        "MODEL_NOT_FOUND",
        "No trained model at assets/$modelPath -- OpenWakeWord models are trained offline, " +
          "see class doc. Falling back to Vosk is expected until this exists.",
        e,
      )
    } catch (e: Exception) {
      promise.reject("MODEL_LOAD_ERROR", e)
    }
  }

  /**
   * Runs one inference pass over a ~1s audio window (Float32 samples in
   * [-1, 1], matching what OpenWakeWordDetector.ts slides through). Returns
   * a single confidence score in [0, 1].
   */
  @ReactMethod
  fun predict(window: ReadableArray, promise: Promise) {
    val interp = interpreter
    if (interp == null) {
      promise.reject("NOT_INITIALIZED", "OpenWakeWord model not loaded -- call loadModel() first")
      return
    }

    try {
      val inputBuffer = ByteBuffer.allocateDirect(4 * inputSize).order(ByteOrder.nativeOrder())
      val count = minOf(window.size(), inputSize)
      for (i in 0 until count) {
        inputBuffer.putFloat(window.getDouble(i).toFloat())
      }
      // Zero-pad if the window came in shorter than expected.
      for (i in count until inputSize) inputBuffer.putFloat(0f)
      inputBuffer.rewind()

      val outputBuffer = ByteBuffer.allocateDirect(4).order(ByteOrder.nativeOrder())
      interp.run(inputBuffer, outputBuffer)
      outputBuffer.rewind()

      val confidence = outputBuffer.float
      promise.resolve(confidence.toDouble())
    } catch (e: Exception) {
      promise.reject("PREDICT_ERROR", e)
    }
  }

  @ReactMethod
  fun unloadModel(promise: Promise) {
    interpreter?.close()
    interpreter = null
    promise.resolve(null)
  }

  private fun loadModelFile(modelPath: String): MappedByteBuffer {
    val assetFileDescriptor = reactContext.assets.openFd(modelPath)
    FileInputStream(assetFileDescriptor.fileDescriptor).use { inputStream ->
      val fileChannel = inputStream.channel
      val startOffset = assetFileDescriptor.startOffset
      val declaredLength = assetFileDescriptor.declaredLength
      return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }
  }
}
