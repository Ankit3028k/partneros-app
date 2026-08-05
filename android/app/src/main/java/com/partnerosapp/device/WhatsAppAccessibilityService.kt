package com.partnerosapp.device

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * WhatsApp exposes no public "send message programmatically" API --
 * whatsapp://send?text=... only PREFILLS the message box. This service
 * finds the actual send button in WhatsApp's view tree and performs a
 * click, once the user has granted Accessibility access (Settings, one-time).
 *
 * Passive by design: onAccessibilityEvent does nothing. We only act when
 * tapSendButton() is explicitly called from JS via
 * WhatsAppAccessibilityBridgeModule, right after the deep-link opens the
 * prefilled chat. This avoids the service interfering with the user at
 * any other time.
 */
class WhatsAppAccessibilityService : AccessibilityService() {

  companion object {
    var instance: WhatsAppAccessibilityService? = null
      private set

    private const val WHATSAPP_PACKAGE = "com.whatsapp"

    // WhatsApp changes internal view IDs across releases -- these are the
    // two most common send-button resource IDs observed. If both miss, we
    // fall back to content-description search below.
    private val KNOWN_SEND_BUTTON_IDS = listOf(
      "com.whatsapp:id/send",
      "com.whatsapp:id/fab_container"
    )
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
  }

  override fun onDestroy() {
    super.onDestroy()
    instance = null
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    // Intentionally no-op -- see class doc.
  }

  override fun onInterrupt() {}

  /**
   * @return true if a send button was found and clicked, false otherwise.
   * Caller (WhatsAppAccessibilityBridgeModule) surfaces false as a rejected
   * promise so JS falls back to "prefilled but not sent, tap manually".
   */
  fun tapSendButton(): Boolean {
    val root = rootInActiveWindow ?: return false
    if (root.packageName?.toString() != WHATSAPP_PACKAGE) return false

    for (id in KNOWN_SEND_BUTTON_IDS) {
      val node = findNodeById(root, id)
      if (node != null && clickNode(node)) return true
    }

    val byDescription = findNodeByDescription(root, "Send")
    if (byDescription != null && clickNode(byDescription)) return true

    return false
  }

  private fun findNodeById(root: AccessibilityNodeInfo, id: String): AccessibilityNodeInfo? {
    val nodes = root.findAccessibilityNodeInfosByViewId(id)
    return if (nodes.isNotEmpty()) nodes[0] else null
  }

  private fun findNodeByDescription(node: AccessibilityNodeInfo, description: String): AccessibilityNodeInfo? {
    if (node.contentDescription?.toString()?.equals(description, ignoreCase = true) == true) {
      return node
    }
    for (i in 0 until node.childCount) {
      val child = node.getChild(i) ?: continue
      val result = findNodeByDescription(child, description)
      if (result != null) return result
    }
    return null
  }

  private fun clickNode(node: AccessibilityNodeInfo): Boolean {
    var target: AccessibilityNodeInfo? = node
    while (target != null && !target.isClickable) {
      target = target.parent
    }
    return target?.performAction(AccessibilityNodeInfo.ACTION_CLICK) ?: false
  }
}
