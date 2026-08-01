import { createLogger, eventBus } from '@partneros/core';
import { MemoryEngine } from '@partneros/memory';
import { DocumentationProvider } from '@partneros/knowledge';
import { IntentGateway } from '@partneros/intent';
import { OnDeviceProvider, CloudFallbackProvider, ModelSelector } from '@partneros/llm';
import type { AIMetadata } from '@partneros/shared';

const logger = createLogger({ prefix: 'Bootstrap' });

export interface AppContext {
  memory: MemoryEngine;
  docs: DocumentationProvider;
  intentGateway: IntentGateway;
  llm: OnDeviceProvider;
  fallback: CloudFallbackProvider;
  modelSelector: ModelSelector;
  metadata: AIMetadata;
}

let appContext: AppContext | null = null;

export async function initializeApp(gender?: 'male' | 'female'): Promise<AppContext> {
  logger.info('Initializing PartnerOS...');

  const memory = new MemoryEngine();
  await memory.init();

  const docs = new DocumentationProvider();
  const intentGateway = new IntentGateway();
  const llm = new OnDeviceProvider();
  const fallback = new CloudFallbackProvider();
  const modelSelector = new ModelSelector();

  const aiGender = gender ?? memory.identity.get()?.gender ?? 'male';

  intentGateway.setGender(aiGender);

  const identity = memory.identity.get();
  if (!identity) {
    memory.identity.set({
      name: 'User',
      gender: aiGender,
      preferences: {},
      createdAt: Date.now(),
    });
  }

  const metadata: AIMetadata = {
    name: 'PartnerOS',
    gender: aiGender,
    version: '0.1.0',
  };

  appContext = { memory, docs, intentGateway, llm, fallback, modelSelector, metadata };

  eventBus.emit('app:initialized', metadata);
  logger.info('PartnerOS initialized', { gender: aiGender });

  return appContext;
}

export function getAppContext(): AppContext {
  if (!appContext) throw new Error('App not initialized. Call initializeApp() first.');
  return appContext;
}
