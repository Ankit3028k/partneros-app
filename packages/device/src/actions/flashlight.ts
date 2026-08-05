import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Toggles torch via CameraManager (no app to launch, hardware control).
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class FlashlightAction implements DeviceAction {
  readonly id = 'flashlight';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('flashlight');
  }

  requiredPermissions(): Permission[] {
    return ['CAMERA'];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Flashlight is not installed on this device'));
    }
    // TODO: implement actual flashlight flow
    return Result.err(new Error('flashlight action not yet implemented'));
  }
}

export const flashlightAction = new FlashlightAction();
