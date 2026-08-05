import { Result, createLogger } from '@partneros/core';
import { contactResolver, KNOWN_PACKAGES } from '@partneros/device';
import type { ActionPlan, PlanningInput } from './types';

const logger = createLogger({ prefix: 'ActionPlanner' });

// app name -> canonical action id (mirrors KNOWN_PACKAGES keys in @partneros/device)
const APP_ALIASES: Record<string, string> = {
  whatsapp: 'whatsapp',
  wp: 'whatsapp',
  insta: 'instagram',
  instagram: 'instagram',
  telegram: 'telegram',
  maps: 'maps',
  'google maps': 'maps',
  spotify: 'spotify',
  camera: 'camera',
  phone: 'phone',
  dialer: 'phone',
};

// "open whatsapp and send rahul hello" / "open whatsapp, send rahul: hello"
const OPEN_AND_SEND_PATTERN =
  /open\s+([a-z\s]+?)\s+(?:and\s+)?send\s+([a-z0-9._'-]+)[:,]?\s+(.+)/i;

// "open camera" / "open spotify"
const OPEN_APP_PATTERN = /^open\s+([a-z\s]+?)$/i;

/**
 * Translates a classified COMMAND intent into a concrete ExecutionPlan.
 * IntentClassifier stays purely semantic (see project-brain/13/intent) --
 * all app/step mapping logic lives here so classifier never touches
 * device-specific concerns.
 */
export class ActionPlanner {
  async plan(input: PlanningInput): Promise<Result<ActionPlan>> {
    const text = input.rawText.trim();

    const sendMatch = text.match(OPEN_AND_SEND_PATTERN);
    if (sendMatch) {
      return this.planOpenAndSend(sendMatch);
    }

    const openMatch = text.match(OPEN_APP_PATTERN);
    if (openMatch) {
      return this.planOpenApp(openMatch[1]);
    }

    return Result.ok({ type: 'NONE', steps: [], params: {} });
  }

  private async planOpenAndSend(match: RegExpMatchArray): Promise<Result<ActionPlan>> {
    const [, rawApp, contact, message] = match;
    const app = APP_ALIASES[rawApp.trim().toLowerCase()];

    if (!app) {
      return Result.err(new Error(`Don't know how to send messages via "${rawApp.trim()}" yet`));
    }

    // Resolve contact ambiguity HERE, before handing off to DeviceExecutor --
    // whatsapp.ts's execute() expects an unambiguous contact/phone number.
    const resolved = await contactResolver.resolve(contact.trim());
    if (!resolved.ok) {
      logger.warn('Contact resolution failed, passing raw name through', {
        contact,
        error: resolved.error.message,
      });
    } else if (!resolved.value.exact && resolved.value.candidates.length > 1) {
      return Result.ok({
        type: 'OPEN_APP',
        app,
        steps: ['resolve_contact', 'open_chat', 'prefill_message', 'send'],
        params: { contact: contact.trim(), message: message.trim() },
        needsClarification: {
          field: 'contact',
          reason: `Multiple contacts match "${contact.trim()}"`,
          candidates: resolved.value.candidates.map((c) => c.name),
        },
      });
    }

    return Result.ok({
      type: 'OPEN_APP',
      app,
      steps: ['resolve_contact', 'open_chat', 'prefill_message', 'send'],
      params: { contact: contact.trim(), message: message.trim() },
    });
  }

  private planOpenApp(rawApp: string): Result<ActionPlan> {
    const key = rawApp.trim().toLowerCase();
    const app = APP_ALIASES[key] ?? (key in KNOWN_PACKAGES ? key : undefined);

    if (!app) {
      return Result.err(new Error(`Don't know how to open "${rawApp.trim()}" yet`));
    }

    return Result.ok({
      type: 'OPEN_APP',
      app,
      steps: ['open_app'],
      params: {},
    });
  }
}

export const actionPlanner = new ActionPlanner();
