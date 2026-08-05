import { NativeModules, Platform } from 'react-native';
import { createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'PackageManager' });

// Known package IDs for actions we support out of the box.
export const KNOWN_PACKAGES: Record<string, string> = {
  whatsapp: 'com.whatsapp',
  instagram: 'com.instagram.android',
  telegram: 'org.telegram.messenger',
  maps: 'com.google.android.apps.maps',
  spotify: 'com.spotify.music',
  phone: 'com.android.dialer',
  camera: 'com.android.camera',
};

/**
 * Wraps a native module (android/.../PackageCheckerModule.kt) that calls
 * PackageManager.getPackageInfo() on the Android side. This replaces the
 * old hardcoded "app not found" behavior -- previously nothing queried
 * the device at all.
 */
export class DevicePackageManager {
  private cache = new Map<string, boolean>();

  async isInstalled(packageId: string): Promise<boolean> {
    if (this.cache.has(packageId)) {
      return this.cache.get(packageId)!;
    }

    if (Platform.OS !== 'android') {
      logger.warn('Package check skipped -- iOS not yet supported', { packageId });
      return false;
    }

    if (!NativeModules.PackageChecker) {
      logger.error('PackageChecker native module not linked -- add PackageCheckerModule.kt and register it');
      return false;
    }

    try {
      const installed: boolean = await NativeModules.PackageChecker.isInstalled(packageId);
      this.cache.set(packageId, installed);
      return installed;
    } catch (error) {
      logger.error('isInstalled check failed', { packageId, error: String(error) });
      return false;
    }
  }

  async isAppInstalled(appKey: keyof typeof KNOWN_PACKAGES | string): Promise<boolean> {
    const packageId = KNOWN_PACKAGES[appKey] ?? appKey;
    return this.isInstalled(packageId);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const devicePackageManager = new DevicePackageManager();
