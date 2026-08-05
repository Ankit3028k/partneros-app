import { NativeModules } from 'react-native';
import { Result, createLogger } from '@partneros/core';
import type { DeviceAction, DeviceActionResult } from './DeviceAction';
import type { Permission } from '../permissions/Permission';
import { devicePackageManager } from '../PackageManager';
import { contactResolver } from '../ContactResolver';
import { intentRouter } from '../IntentRouter';

const logger = createLogger({ prefix: 'WhatsAppAction' });

export interface WhatsAppParams {
  contact: string; // name or raw phone number
  message: string;
}

/**
 * WhatsApp has no public "send message programmatically" intent.
 * `whatsapp://send?phone=...&text=...` opens the chat with the message
 * PREFILLED only -- it does not send. Actually tapping send requires the
 * WhatsAppAccessibilityService (declared in AndroidManifest.xml) to find
 * the send button in the view tree and perform a click.
 */
export class WhatsAppAction implements DeviceAction {
  readonly id = 'whatsapp';

  async canExecute(): Promise<boolean> {
    return devicePackageManager.isAppInstalled('whatsapp');
  }

  requiredPermissions(): Permission[] {
    return ['CONTACTS', 'ACCESSIBILITY_SERVICE'];
  }

  async execute(params: Record<string, unknown>): Promise<Result<DeviceActionResult>> {
    const { contact, message } = params as unknown as WhatsAppParams;

    if (!contact || !message) {
      return Result.err(new Error('WhatsApp action requires both "contact" and "message"'));
    }

    const installed = await this.canExecute();
    if (!installed) {
      return Result.err(new Error('WhatsApp is not installed on this device'));
    }

    // Step 1: resolve contact -> phone number
    const phoneNumber = await this.resolvePhoneNumber(contact);
    if (!phoneNumber.ok) return Result.err(phoneNumber.error);

    // Step 2: open chat with prefilled message
    const encodedText = encodeURIComponent(message);
    const deepLink = `whatsapp://send?phone=${phoneNumber.value}&text=${encodedText}`;
    const opened = await intentRouter.open(deepLink);
    if (!opened.ok) return Result.err(opened.error);

    // Step 3: tap send via Accessibility Service.
    // Small delay lets WhatsApp render the chat + prefilled text box
    // before we look for the send button.
    await this.delay(1200);
    const sent = await this.tapSendViaAccessibility();
    if (!sent.ok) {
      logger.warn('Message prefilled but auto-send failed -- user must tap send manually', {
        error: sent.error.message,
      });
      return Result.ok({
        message: `Opened chat with ${contact} and prefilled message. Auto-send failed -- please tap send.`,
      });
    }

    return Result.ok({ message: `Message sent to ${contact} on WhatsApp.` });
  }

  private async resolvePhoneNumber(contact: string): Promise<Result<string>> {
    // If it already looks like a phone number, use as-is.
    if (/^\+?\d[\d\s-]{6,}$/.test(contact)) {
      return Result.ok(contact.replace(/[\s-]/g, ''));
    }

    const match = await contactResolver.resolve(contact);
    if (!match.ok) return Result.err(match.error);

    if (match.value.exact) {
      return Result.ok(match.value.exact.phoneNumber);
    }

    if (match.value.candidates.length > 0) {
      // Planner layer should have already disambiguated via LLM/UI before
      // reaching here. If we land here it means execute() was called
      // directly without going through ActionPlanner's resolve_contact step.
      return Result.err(
        new Error(
          `Multiple contacts match "${contact}": ${match.value.candidates
            .map((c) => c.name)
            .join(', ')}. Disambiguate before calling execute().`,
        ),
      );
    }

    return Result.err(new Error(`No contact found matching "${contact}"`));
  }

  private async tapSendViaAccessibility(): Promise<Result<void>> {
    try {
      if (!NativeModules.WhatsAppAccessibilityBridge) {
        return Result.err(
          new Error('WhatsAppAccessibilityBridge not linked -- see android/.../WhatsAppAccessibilityService.kt'),
        );
      }
      const enabled = await NativeModules.WhatsAppAccessibilityBridge.isServiceEnabled();
      if (!enabled) {
        return Result.err(new Error('Accessibility Service not enabled by user -- open Settings to grant it'));
      }
      await NativeModules.WhatsAppAccessibilityBridge.tapSendButton();
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(error as Error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const whatsappAction = new WhatsAppAction();
