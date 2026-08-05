import { Result, createLogger } from '@partneros/core';
import { devicePackageManager, KNOWN_PACKAGES } from './PackageManager';
import { intentRouter } from './IntentRouter';

const logger = createLogger({ prefix: 'AppLauncher' });

/**
 * Generic "just open app X" -- for cases with no specific action needed
 * (e.g. "open camera", "open spotify"). Action-specific flows (send a
 * WhatsApp message, set an alarm) go through actions/*.ts + DeviceExecutor
 * instead of this.
 */
export class AppLauncher {
  async open(appKey: string): Promise<Result<void>> {
    const installed = await devicePackageManager.isAppInstalled(appKey);
    if (!installed) {
      return Result.err(new Error(`"${appKey}" is not installed on your device`));
    }

    const packageId = KNOWN_PACKAGES[appKey] ?? appKey;
    const result = await intentRouter.openPackage(packageId);
    if (!result.ok) {
      logger.error('Failed to open app', { appKey, error: result.error.message });
    }
    return result;
  }
}

export const appLauncher = new AppLauncher();
