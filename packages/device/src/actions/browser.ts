import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Opens a URL in default browser via Linking.
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class BrowserAction implements DeviceAction {
  readonly id = 'browser';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('browser');
  }

  requiredPermissions(): Permission[] {
    return [];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Browser is not installed on this device'));
    }
    // TODO: implement actual browser flow
    return Result.err(new Error('browser action not yet implemented'));
  }
}

export const browserAction = new BrowserAction();
