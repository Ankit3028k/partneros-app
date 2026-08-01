import { Result, createLogger, eventBus } from '@partneros/core';
import type { ConversationMessage, IntentResult } from '@partneros/shared';
import { getAppContext } from './Bootstrap';

const logger = createLogger({ prefix: 'PartnerOS' });

export interface ProcessResult {
  message: ConversationMessage;
  intent: IntentResult;
  source: 'local' | 'knowledge' | 'llm' | 'cloud';
}

export class PartnerOS {
  private sessionId: string;
  private history: ConversationMessage[] = [];

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? `session_${Date.now()}`;
  }

  getSessionId(): string { return this.sessionId; }

  async process(text: string): Promise<Result<ProcessResult>> {
    try {
      const ctx = getAppContext();
      const userMsg: ConversationMessage = { role: 'user', content: text, timestamp: Date.now() };
      this.history.push(userMsg);
      await ctx.memory.addConversation('user', text, this.sessionId);

      const gatewayResult = await ctx.intentGateway.process(text);
      if (!gatewayResult.ok) return Result.err(gatewayResult.error);

      const { intent, response: localResponse, handledLocally } = gatewayResult.value;

      if (handledLocally && localResponse) {
        const msg: ConversationMessage = { role: 'assistant', content: localResponse, timestamp: Date.now() };
        this.history.push(msg);
        await ctx.memory.addConversation('assistant', localResponse, this.sessionId);
        return Result.ok({ message: msg, intent, source: 'local' });
      }

      const docResult = await ctx.docs.query(text);
      if (docResult.ok && docResult.value) {
        const msg: ConversationMessage = { role: 'assistant', content: docResult.value, timestamp: Date.now() };
        this.history.push(msg);
        await ctx.memory.addConversation('assistant', docResult.value, this.sessionId);
        return Result.ok({ message: msg, intent, source: 'knowledge' });
      }

      const llmResult = await ctx.llm.generate(text);
      if (llmResult.ok) {
        const msg: ConversationMessage = { role: 'assistant', content: llmResult.value, timestamp: Date.now() };
        this.history.push(msg);
        await ctx.memory.addConversation('assistant', llmResult.value, this.sessionId);
        return Result.ok({ message: msg, intent, source: 'llm' });
      }

      const fallbackResult = await ctx.fallback.generate(text);
      if (fallbackResult.ok) {
        const msg: ConversationMessage = { role: 'assistant', content: fallbackResult.value, timestamp: Date.now() };
        this.history.push(msg);
        await ctx.memory.addConversation('assistant', fallbackResult.value, this.sessionId);
        return Result.ok({ message: msg, intent, source: 'cloud' });
      }

      const errorMsg: ConversationMessage = { role: 'assistant', content: 'Sorry, I couldn\'t process that right now. Please try again.', timestamp: Date.now() };
      this.history.push(errorMsg);
      return Result.ok({ message: errorMsg, intent, source: 'local' });
    } catch (error) {
      logger.error('Process failed', { error: String(error) });
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  getHistory(): ConversationMessage[] { return [...this.history]; }

  clearHistory(): void { this.history = []; }

  async getContext(limit = 20): Promise<ConversationMessage[]> {
    const ctx = getAppContext();
    return ctx.memory.getContext(this.sessionId, limit);
  }
}
