package com.partnerosapp.device

import android.content.Intent
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Bridges to Android's real PackageManager so JS can check "is app X
 * actually installed" instead of assuming/hardcoding an answer.
 * Backs @partneros/device PackageManager.isInstalled().
 *
 * NOTE: on Android 11+ (API 30+), querying packages you don't declare in
 * <queries> in AndroidManifest.xml will silently fail (NameNotFoundException
 * even if installed) due to package visibility restrictions. Make sure any
 * app you check here is listed in the <queries> block.
 */
class PackageCheckerModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "PackageChecker"

  @ReactMethod
  fun isInstalled(packageId: String, promise: Promise) {
    try {
      val pm = reactApplicationContext.packageManager
      pm.getPackageInfo(packageId, PackageManager.GET_ACTIVITIES)
      promise.resolve(true)
    } catch (e: PackageManager.NameNotFoundException) {
      promise.resolve(false)
    } catch (e: Exception) {
      promise.reject("PACKAGE_CHECK_ERROR", e)
    }
  }

  @ReactMethod
  fun launchApp(packageId: String, promise: Promise) {
    try {
      val pm = reactApplicationContext.packageManager
      val launchIntent = pm.getLaunchIntentForPackage(packageId)
      if (launchIntent == null) {
        promise.reject("APP_NOT_FOUND", "No launch intent for $packageId")
        return
      }
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(launchIntent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("LAUNCH_ERROR", e)
    }
  }
}
