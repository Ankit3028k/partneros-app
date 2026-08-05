import type { Result } from '@partneros/core';
import type { Permission } from '../permissions/Permission';

export interface DeviceActionResult {
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Every app/hardware integration implements this. The executor never
 * branches per-app -- it only ever calls these three methods.
 */
export interface DeviceAction {
  readonly id: string; // e.g. 'whatsapp', 'call', 'maps'

  canExecute(): Promise<boolean>;

  requiredPermissions(): Permission[];

  execute(params: Record<string, unknown>): Promise<Result<DeviceActionResult>>;
}
