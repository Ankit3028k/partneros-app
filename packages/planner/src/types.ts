import type { ConversationMessage, IntentResult } from '@partneros/shared';

export interface PlannerContext {
  recentMessages: ConversationMessage[];
  memoryFacts: string[]; // retrieved from packages/memory before planning
  userName?: string;
}

export type PlanStep =
  | 'resolve_contact'
  | 'open_chat'
  | 'prefill_message'
  | 'send'
  | 'open_app'
  | 'set_alarm_time'
  | 'create_event';

export interface ActionPlan {
  type: 'OPEN_APP' | 'DEVICE_ACTION' | 'NONE';
  app?: string; // e.g. 'whatsapp', 'maps'
  steps: PlanStep[];
  params: Record<string, unknown>; // e.g. { contact: 'Rahul', message: 'Hello' }
  needsClarification?: {
    field: string; // e.g. 'contact'
    reason: string; // e.g. 'multiple contacts matched'
    candidates?: string[];
  };
}

export interface PlanningInput {
  intent: IntentResult;
  rawText: string;
  context: PlannerContext;
}
