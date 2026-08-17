import { Result, createLogger, eventBus } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from '../actions/DeviceAction';
import { whatsappAction } from '../actions/whatsapp';
import { callAction } from '../actions/call';
import { smsAction } from '../actions/sms';
import { mapsAction } from '../actions/maps';
import { alarmAction } from '../actions/alarm';
import { calendarAction } from '../actions/calendar';
import { flashlightAction } from '../actions/flashlight';
import { browserAction } from '../actions/browser';
import { spotifyAction } from '../actions/spotify';
import { instagramAction } from '../actions/instagram';
import { telegramAction } from '../actions/telegram';
import { cameraAction } from '../actions/camera';
import { phoneAction } from '../actions/phone';
import { permissionManager } from '../PermissionManager';
import { appLauncher } from '../AppLauncher';

const logger = createLogger({ prefix: 'DeviceExecutor' });

// Registry: this is the ONLY place that knows about every app id.
// The executor itself never branches per-app.
const ACTION_REGISTRY: Record<string, DeviceAction> = {
  whatsapp: whatsappAction,
  call: callAction,
  sms: smsAction,
  maps: mapsAction,
  alarm: alarmAction,
  calendar: calendarAction,
  flashlight: flashlightAction,
  browser: browserAction,
  spotify: spotifyAction,
  instagram: instagramAction,
  telegram: telegramAction,
  camera: cameraAction,
  phone: phoneAction,
};

export interface ExecutionPlan {
  type: string; // e.g. 'OPEN_APP'
  app: string; // e.g. 'whatsapp'
  steps: string[]; // e.g. ['resolve_contact', 'open_chat', 'prefill_message', 'send']
  params?: Record<string, unknown>; // e.g. { contact: 'Rahul', message: 'Hello' }
}

/**
 * Runs an ExecutionPlan by looking up the target app's DeviceAction and
 * calling execute() with the plan's params. Individual actions own their
 * own multi-step internals (see whatsapp.ts) -- `steps` in the plan is
 * primarily for logging/telemetry/UI display, not executor branching.
 */
export class DeviceExecutor {
  async run(plan: ExecutionPlan): Promise<Result<DeviceActionResult>> {
    // Plain "open X" with no further steps (no contact/message/etc.) --
    // just launch the app generically. This was the Instagram bug: a
    // simple open was being routed through the app's specific
    // DeviceAction.execute(), which fails for every app whose action is
    // still a stub (Instagram, Maps, Spotify, ...) even though the app
    // is installed and AppLauncher could open it fine on its own.
    const isSimpleOpen = plan.steps.length === 1 && plan.steps[0] === 'open_app';
    if (isSimpleOpen) {
      logger.info('Simple app open -- using AppLauncher directly', { app: plan.app });
      const opened = await appLauncher.open(plan.app);
      if (!opened.ok) return Result.err(opened.error);
      return Result.ok({ message: `Opened ${plan.app}.` });
    }

    const action = ACTION_REGISTRY[plan.app];
    if (!action) {
      return Result.err(new Error(`No DeviceAction registered for app "${plan.app}"`));
    }

    const canExecute = await action.canExecute();
    if (!canExecute) {
      return Result.err(new Error(`"${plan.app}" is not available (not installed or unsupported)`));
    }

    const missingPermissions: string[] = [];
    for (const permission of action.requiredPermissions()) {
      const granted = await permissionManager.check(permission);
      if (!granted) missingPermissions.push(permission);
    }
    if (missingPermissions.length > 0) {
      // Let the UI layer react (show a "grant permissions" prompt) without
      // DeviceExecutor knowing anything about React/UI itself.
      await eventBus.emit('device:permissions:missing', { app: plan.app, permissions: missingPermissions });
      return Result.err(
        new Error(`Missing permissions for "${plan.app}": ${missingPermissions.join(', ')}`),
      );
    }

    logger.info('Executing plan', { app: plan.app, steps: plan.steps });
    await eventBus.emit('device:execute:start', plan);

    const result = await action.execute(plan.params ?? {});

    await eventBus.emit('device:execute:done', { plan, ok: result.ok });
    return result;
  }

  registeredApps(): string[] {
    return Object.keys(ACTION_REGISTRY);
  }
}

export const deviceExecutor = new DeviceExecutor();
