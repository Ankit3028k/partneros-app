import { PermissionsAndroid, Platform } from 'react-native';
import { createLogger } from '@partneros/core';
import type { Permission, PermissionStatus } from './permissions/Permission';

const logger = createLogger({ prefix: 'PermissionManager' });

// Maps our Permission union to Android's runtime permission strings.
// ACCESSIBILITY_SERVICE is not a runtime permission -- it's granted via
// Settings deep-link (see requestAccessibilityService below).
const ANDROID_PERMISSION_MAP: Partial<Record<Permission, string>> = {
  CONTACTS: PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  CALL_PHONE: PermissionsAndroid.PERMISSIONS.CALL_PHONE,
  SEND_SMS: PermissionsAndroid.PERMISSIONS.SEND_SMS,
  CAMERA: PermissionsAndroid.PERMISSIONS.CAMERA,
  LOCATION: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  MICROPHONE: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
};

export class PermissionManager {
  async check(permission: Permission): Promise<boolean> {
    if (permission === 'ACCESSIBILITY_SERVICE') {
      return this.isAccessibilityServiceEnabled();
    }

    if (Platform.OS !== 'android') {
      logger.warn('Permission check skipped -- iOS not yet supported', { permission });
      return false;
    }

    const androidPermission = ANDROID_PERMISSION_MAP[permission];
    if (!androidPermission) {
      logger.warn('No Android mapping for permission', { permission });
      return false;
    }

    return PermissionsAndroid.check(androidPermission as never);
  }

  async request(permission: Permission): Promise<boolean> {
    if (permission === 'ACCESSIBILITY_SERVICE') {
      // Accessibility can't be requested via a runtime dialog -- must send
      // the user to Settings. Caller (UI) should show instructions.
      return this.isAccessibilityServiceEnabled();
    }

    if (Platform.OS !== 'android') return false;

    const androidPermission = ANDROID_PERMISSION_MAP[permission];
    if (!androidPermission) return false;

    const result = await PermissionsAndroid.request(androidPermission as never);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async checkAll(permissions: Permission[]): Promise<PermissionStatus[]> {
    return Promise.all(
      permissions.map(async (permission) => ({
        permission,
        granted: await this.check(permission),
      })),
    );
  }

  /**
   * Checked via native bridge module (see android/.../AccessibilityBridgeModule.kt)
   * which reads Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES and looks for
   * our WhatsAppAccessibilityService entry.
   */
  private async isAccessibilityServiceEnabled(): Promise<boolean> {
    try {
      const { NativeModules } = require('react-native');
      if (!NativeModules.AccessibilityBridge) {
        logger.warn('AccessibilityBridge native module not linked yet');
        return false;
      }
      return await NativeModules.AccessibilityBridge.isEnabled();
    } catch (error) {
      logger.error('Accessibility check failed', { error: String(error) });
      return false;
    }
  }

  openAccessibilitySettings(): void {
    try {
      const { NativeModules } = require('react-native');
      NativeModules.AccessibilityBridge?.openSettings();
    } catch (error) {
      logger.error('Could not open accessibility settings', { error: String(error) });
    }
  }
}

export const permissionManager = new PermissionManager();
