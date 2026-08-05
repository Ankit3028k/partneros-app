import { Linking } from 'react-native';
import { Result, createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'IntentRouter' });

/**
 * Thin wrapper over Linking for opening apps/URLs/deep-links. Action files
 * (whatsapp.ts, maps.ts, etc.) go through this instead of calling Linking
 * directly, so we get one place to log/retry/handle "no app to open URL".
 */
export class IntentRouter {
  async open(url: string): Promise<Result<void>> {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        return Result.err(new Error(`No handler for URL: ${url}`));
      }
      await Linking.openURL(url);
      return Result.ok(undefined);
    } catch (error) {
      logger.error('Failed to open URL', { url, error: String(error) });
      return Result.err(error as Error);
    }
  }

  async openPackage(packageId: string): Promise<Result<void>> {
    // android app launch by package name -- via native bridge since
    // Linking doesn't support package-based launch directly.
    try {
      const { NativeModules } = require('react-native');
      if (!NativeModules.PackageChecker?.launchApp) {
        return Result.err(new Error('launchApp not available on PackageChecker native module'));
      }
      await NativeModules.PackageChecker.launchApp(packageId);
      return Result.ok(undefined);
    } catch (error) {
      logger.error('Failed to launch package', { packageId, error: String(error) });
      return Result.err(error as Error);
    }
  }
}

export const intentRouter = new IntentRouter();
