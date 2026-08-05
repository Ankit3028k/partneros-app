import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Opens chat and sends via tg:// deep-link + Accessibility (same pattern as WhatsApp).
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class TelegramAction implements DeviceAction {
  readonly id = 'telegram';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('telegram');
  }

  requiredPermissions(): Permission[] {
    return ['ACCESSIBILITY_SERVICE'];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Telegram is not installed on this device'));
    }
    // TODO: implement actual telegram flow
    return Result.err(new Error('telegram action not yet implemented'));
  }
}

export const telegramAction = new TelegramAction();
