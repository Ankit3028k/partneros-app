import { Result } from '@partneros/core';

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface LLMProvider {
  readonly name: string;
  readonly isOnDevice: boolean;
  generate(prompt: string, options?: LLMOptions): Promise<Result<string>>;
  generateStream?(prompt: string, options?: LLMOptions): AsyncGenerator<string>;
  isAvailable(): Promise<boolean>;
}

export interface MemoryProvider {
  readonly name: string;
  store(key: string, value: string): Promise<void>;
  retrieve(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface VectorMemoryProvider extends MemoryProvider {
  search(query: string, limit?: number): Promise<Array<{ key: string; value: string; score: number }>>;
}

export type ConversationRole = 'user' | 'assistant' | 'system';
export type IntentType = 'GREETING' | 'FAREWELL' | 'IDENTITY' | 'SMALL_TALK' | 'KNOWLEDGE_QUERY' | 'MEMORY_QUERY' | 'SEARCH_QUERY' | 'TASK' | 'COMMAND' | 'UNKNOWN';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
  timestamp: number;
}

export interface IntentResult {
  type: IntentType;
  confidence: number;
  language: 'en' | 'hi' | 'hinglish';
  entities?: Record<string, string>;
}

export interface AIMetadata {
  name: string;
  gender: 'male' | 'female';
  version: string;
}
