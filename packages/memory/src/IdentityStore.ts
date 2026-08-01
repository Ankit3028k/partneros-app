import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import { createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'IdentityStore' });

export interface IdentityData {
  name: string;
  gender: 'male' | 'female';
  preferences: Record<string, string>;
  createdAt: number;
}

export class IdentityStore {
  private storage: MMKV;

  constructor() {
    this.storage = createMMKV({ id: 'identity-store' });
    logger.info('IdentityStore initialized');
  }

  get(): IdentityData | null {
    try {
      const raw = this.storage.getString('identity');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  set(data: IdentityData): void {
    this.storage.set('identity', JSON.stringify(data));
    logger.info('Identity updated', { name: String(data.name) });
  }

  update(partial: Partial<IdentityData>): void {
    const current = this.get() ?? { name: '', gender: 'male' as const, preferences: {}, createdAt: Date.now() };
    this.set({ ...current, ...partial });
  }

  clear(): void {
    this.storage.clearAll();
    logger.info('Identity cleared');
  }
}
