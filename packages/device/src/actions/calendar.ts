import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Creates a calendar event via CalendarContract intent.
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class CalendarAction implements DeviceAction {
  readonly id = 'calendar';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('calendar');
  }

  requiredPermissions(): Permission[] {
    return ['CALENDAR'];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Calendar is not installed on this device'));
    }
    // TODO: implement actual calendar flow
    return Result.err(new Error('calendar action not yet implemented'));
  }
}

export const calendarAction = new CalendarAction();
