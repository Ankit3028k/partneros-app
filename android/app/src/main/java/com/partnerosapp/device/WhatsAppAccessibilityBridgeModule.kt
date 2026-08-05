package com.partnerosapp.device

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Backs @partneros/device actions/whatsapp.ts's tapSendViaAccessibility().
 * Separate from AccessibilityBridgeModule because this one talks to the
 * live WhatsAppAccessibilityService instance directly (more accurate
 * "is it actually running" check than reading Settings.Secure).
 */
class WhatsAppAccessibilityBridgeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "WhatsAppAccessibilityBridge"

  @ReactMethod
  fun isServiceEnabled(promise: Promise) {
    promise.resolve(WhatsAppAccessibilityService.instance != null)
  }

  @ReactMethod
  fun tapSendButton(promise: Promise) {
    val service = WhatsAppAccessibilityService.instance
    if (service == null) {
      promise.reject("SERVICE_NOT_RUNNING", "WhatsAppAccessibilityService is not enabled/running")
      return
    }
    if (service.tapSendButton()) {
      promise.resolve(null)
    } else {
      promise.reject("SEND_BUTTON_NOT_FOUND", "Could not locate WhatsApp send button in view tree")
    }
  }
}
