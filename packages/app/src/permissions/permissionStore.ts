import { create } from 'zustand';
import { eventBus, createLogger } from '@partneros/core';
import type { Permission } from '@partneros/device';

const logger = createLogger({ prefix: 'PermissionStore' });

export interface MissingPermissionRequest {
  app: string;
  permissions: Permission[];
  requestedAt: number;
}

interface PermissionStoreState {
  pending: MissingPermissionRequest[];
  dismiss: (app: string) => void;
  clear: () => void;
}

/**
 * DeviceExecutor emits 'device:permissions:missing' when a command can't
 * run because a permission isn't granted (see packages/device
 * executor/DeviceExecutor.ts). This store listens for that event so the UI
 * (PermissionPrompt.tsx) can show a grant flow without DeviceExecutor
 * knowing anything about React.
 */
export const usePermissionStore = create<PermissionStoreState>((set) => {
  eventBus.on<{ app: string; permissions: Permission[] }>('device:permissions:missing', (payload) => {
    logger.info('Missing permissions reported', payload);
    set((state) => ({
      pending: [
        ...state.pending.filter((p) => p.app !== payload.app),
        { app: payload.app, permissions: payload.permissions, requestedAt: Date.now() },
      ],
    }));
  });

  return {
    pending: [],
    dismiss: (app: string) => set((state) => ({ pending: state.pending.filter((p) => p.app !== app) })),
    clear: () => set({ pending: [] }),
  };
});
