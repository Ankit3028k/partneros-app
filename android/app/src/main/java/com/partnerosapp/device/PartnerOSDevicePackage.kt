package com.partnerosapp.device

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Single package registering every native module @partneros/device depends
 * on: PackageChecker, AccessibilityBridge, WhatsAppAccessibilityBridge,
 * ContactsBridge. Add new bridges here as more actions (maps, sms, etc.)
 * get real implementations.
 */
class PartnerOSDevicePackage : ReactPackage {

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(
      PackageCheckerModule(reactContext),
      AccessibilityBridgeModule(reactContext),
      WhatsAppAccessibilityBridgeModule(reactContext),
      ContactsBridgeModule(reactContext)
    )
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
