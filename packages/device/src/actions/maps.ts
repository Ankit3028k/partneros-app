import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Opens Maps with a destination/query via geo: or maps deep-link.
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class MapsAction implements DeviceAction {
  readonly id = 'maps';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('maps');
  }

  requiredPermissions(): Permission[] {
    return ['LOCATION'];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Google Maps is not installed on this device'));
    }
    // TODO: implement actual maps flow
    return Result.err(new Error('maps action not yet implemented'));
  }
}

export const mapsAction = new MapsAction();
