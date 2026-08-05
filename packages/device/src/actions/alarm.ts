import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Sets an alarm via AlarmClock intent (android.intent.action.SET_ALARM).
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class AlarmAction implements DeviceAction {
  readonly id = 'alarm';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('alarm');
  }

  requiredPermissions(): Permission[] {
    return [];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Clock/Alarm is not installed on this device'));
    }
    // TODO: implement actual alarm flow
    return Result.err(new Error('alarm action not yet implemented'));
  }
}

export const alarmAction = new AlarmAction();
