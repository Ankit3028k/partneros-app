import { NativeModules, Platform } from 'react-native';
import { Result, createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'ContactResolver' });

export interface ResolvedContact {
  name: string;
  phoneNumber: string;
}

export interface ContactMatch {
  exact: ResolvedContact | null;
  candidates: ResolvedContact[]; // fuzzy matches when no exact hit
}

/**
 * Wraps native Contacts provider query (android/.../ContactsBridgeModule.kt).
 * Requires CONTACTS permission -- caller must check via PermissionManager first.
 */
export class ContactResolver {
  async resolve(name: string): Promise<Result<ContactMatch>> {
    if (Platform.OS !== 'android') {
      return Result.err(new Error('Contact resolution not yet supported on this platform'));
    }

    if (!NativeModules.ContactsBridge) {
      return Result.err(new Error('ContactsBridge native module not linked'));
    }

    try {
      const raw: ResolvedContact[] = await NativeModules.ContactsBridge.search(name);

      const exact =
        raw.find((c) => c.name.toLowerCase().trim() === name.toLowerCase().trim()) ?? null;

      return Result.ok({
        exact,
        candidates: exact ? [] : raw.slice(0, 5),
      });
    } catch (error) {
      logger.error('Contact resolve failed', { name, error: String(error) });
      return Result.err(error as Error);
    }
  }
}

export const contactResolver = new ContactResolver();
