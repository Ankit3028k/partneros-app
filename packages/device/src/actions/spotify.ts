import { Result } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';

/**
 * Opens/plays a track or playlist via spotify: URI.
 * STUB -- wire up execute() per action's actual deep-link/API contract.
 */
export class SpotifyAction implements DeviceAction {
  readonly id = 'spotify';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('spotify');
  }

  requiredPermissions(): Permission[] {
    return [];
  }

  async execute(_params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('Spotify is not installed on this device'));
    }
    // TODO: implement actual spotify flow
    return Result.err(new Error('spotify action not yet implemented'));
  }
}

export const spotifyAction = new SpotifyAction();
