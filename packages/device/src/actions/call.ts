import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Places a phone call via tel: intent.
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class CallAction implements DeviceAction {
  readonly id = 'call';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('call');
  }

  requiredPermissions(): Permission[] {
    return ['CALL_PHONE'];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Phone dialer is not installed on this device'));
    }
    // TODO: implement actual call flow
    return Result.err(new Error('call action not yet implemented'));
  }
}

export const callAction = new CallAction();
