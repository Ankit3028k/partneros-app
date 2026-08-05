package com.partnerosapp.device

import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Backs @partneros/device PermissionManager's ACCESSIBILITY_SERVICE check.
 * Accessibility can't be requested via a runtime permission dialog --
 * the only path is sending the user to system Settings, so isEnabled()
 * reads Settings.Secure directly and openSettings() deep-links there.
 */
class AccessibilityBridgeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AccessibilityBridge"

  @ReactMethod
  fun isEnabled(promise: Promise) {
    promise.resolve(isServiceEnabled(WhatsAppAccessibilityService::class.java))
  }

  @ReactMethod
  fun openSettings() {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(intent)
  }

  private fun isServiceEnabled(serviceClass: Class<*>): Boolean {
    val expectedComponentName = "${reactApplicationContext.packageName}/${serviceClass.name}"
    val enabledServices = Settings.Secure.getString(
      reactApplicationContext.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false

    if (TextUtils.isEmpty(enabledServices)) return false

    for (component in enabledServices.split(":")) {
      if (component.equals(expectedComponentName, ignoreCase = true)) return true
    }
    return false
  }
}
