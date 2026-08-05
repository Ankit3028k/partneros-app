import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Opens profile/DM via instagram:// deep-link.
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class InstagramAction implements DeviceAction {
  readonly id = 'instagram';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('instagram');
  }

  requiredPermissions(): Permission[] {
    return [];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Instagram is not installed on this device'));
    }
    // TODO: implement actual instagram flow
    return Result.err(new Error('instagram action not yet implemented'));
  }
}

export const instagramAction = new InstagramAction();
