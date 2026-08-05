package com.partnerosapp.device

import android.database.Cursor
import android.provider.ContactsContract
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * Backs @partneros/device ContactResolver.resolve(). Requires READ_CONTACTS
 * permission -- caller (JS PermissionManager) must check/request before
 * calling search(), this module does not request permissions itself.
 */
class ContactsBridgeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "ContactsBridge"

  @ReactMethod
  fun search(query: String, promise: Promise) {
    try {
      val results: WritableArray = Arguments.createArray()
      val resolver = reactApplicationContext.contentResolver

      val cursor: Cursor? = resolver.query(
        ContactsContract.Contacts.CONTENT_URI,
        arrayOf(ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME),
        "${ContactsContract.Contacts.DISPLAY_NAME} LIKE ?",
        arrayOf("%$query%"),
        "${ContactsContract.Contacts.DISPLAY_NAME} ASC"
      )

      cursor?.use { c ->
        val idIndex = c.getColumnIndex(ContactsContract.Contacts._ID)
        val nameIndex = c.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME)

        while (c.moveToNext()) {
          val contactId = c.getString(idIndex) ?: continue
          val name = c.getString(nameIndex) ?: continue

          val phoneCursor = resolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER),
            "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
            arrayOf(contactId),
            null
          )

          phoneCursor?.use { pc ->
            if (pc.moveToFirst()) {
              val numberIndex = pc.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
              val number = pc.getString(numberIndex)
              if (number != null) {
                val map: WritableMap = Arguments.createMap()
                map.putString("name", name)
                map.putString("phoneNumber", number.replace(Regex("[\\s-]"), ""))
                results.pushMap(map)
              }
            }
          }
        }
      }

      promise.resolve(results)
    } catch (e: Exception) {
      promise.reject("CONTACTS_SEARCH_ERROR", e)
    }
  }
}
