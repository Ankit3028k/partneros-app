import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Sends SMS via native SmsManager (no user-facing app needed).
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class SmsAction implements DeviceAction {
  readonly id = 'sms';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('sms');
  }

  requiredPermissions(): Permission[] {
    return ['SEND_SMS'];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('SMS is not installed on this device'));
    }
    // TODO: implement actual sms flow
    return Result.err(new Error('sms action not yet implemented'));
  }
}

export const smsAction = new SmsAction();
