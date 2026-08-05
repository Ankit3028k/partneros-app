import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Opens camera app via ACTION_IMAGE_CAPTURE intent.
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class CameraAction implements DeviceAction {
  readonly id = 'camera';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('camera');
  }

  requiredPermissions(): Permission[] {
    return ['CAMERA'];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Camera is not installed on this device'));
    }
    // TODO: implement actual camera flow
    return Result.err(new Error('camera action not yet implemented'));
  }
}

export const cameraAction = new CameraAction();
