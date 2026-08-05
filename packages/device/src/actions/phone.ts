import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Opens dialer app itself (distinct from placing a call directly).
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class PhoneAction implements DeviceAction {
  readonly id = 'phone';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('phone');
  }

  requiredPermissions(): Permission[] {
    return ['CALL_PHONE'];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Phone/Dialer app is not installed on this device'));
    }
    // TODO: implement actual phone flow
    return Result.err(new Error('phone action not yet implemented'));
  }
}

export const phoneAction = new PhoneAction();
