package com.partnerosapp.wakeword

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers native modules @partneros/wakeword and @partneros/stt depend
 * on: AudioCapture, Vosk, OpenWakeWord (all real), SpeechRecognizer
 * (real, wraps Android's built-in STT).
 */
class PartnerOSWakeWordPackage : ReactPackage {

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(
      AudioCaptureModule(reactContext),
      VoskModule(reactContext),
      OpenWakeWordModule(reactContext),
      SpeechRecognizerModule(reactContext)
    )
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
