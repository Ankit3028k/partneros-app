import { Result, createLogger, eventBus } from '@partneros/core';
import type { ConversationMessage, IntentResult } from '@partneros/shared';
import { getAppContext } from './Bootstrap';

const logger = createLogger({ prefix: 'PartnerOS' });

export interface ProcessResult {
  message: ConversationMessage;
  intent: IntentResult;
  source: 'local' | 'knowledge' | 'llm' | 'cloud' | 'device';
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

      if (intent.type === 'COMMAND') {
        const commandMsg = await this.handleCommand(text, intent);
        this.history.push(commandMsg);
        await ctx.memory.addConversation('assistant', commandMsg.content, this.sessionId);
        return Result.ok({ message: commandMsg, intent, source: 'device' });
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

  /**
   * Intent -> ActionPlanner -> DeviceExecutor, per project-brain/16_VOICE_PIPELINE.md.
   * IntentGateway/IntentClassifier only flagged this as a COMMAND -- all
   * app/step resolution happens in ActionPlanner, all execution in
   * DeviceExecutor. This method is just the composition-root wiring.
   */
  private async handleCommand(text: string, intent: IntentResult): Promise<ConversationMessage> {
    const ctx = getAppContext();

    const context = await ctx.contextBuilder.build(text, this.sessionId);
    const planResult = await ctx.planner.plan({ intent, rawText: text, context });

    if (!planResult.ok) {
      return { role: 'assistant', content: `Couldn't understand that command: ${planResult.error.message}`, timestamp: Date.now() };
    }

    const plan = planResult.value;

    if (plan.type === 'NONE') {
      return { role: 'assistant', content: "I heard a command but I'm not sure what to do with it yet.", timestamp: Date.now() };
    }

    if (plan.needsClarification) {
      const { field, candidates } = plan.needsClarification;
      const options = candidates?.join(', ') ?? '';
      return {
        role: 'assistant',
        content: `Which ${field} did you mean? ${options}`,
        timestamp: Date.now(),
      };
    }

    if (!plan.app) {
      return { role: 'assistant', content: "I understood the command but couldn't tell which app to use.", timestamp: Date.now() };
    }

    const execResult = await ctx.executor.run({
      type: plan.type,
      app: plan.app,
      steps: plan.steps,
      params: plan.params,
    });

    if (!execResult.ok) {
      logger.warn('Command execution failed', { app: plan.app, error: execResult.error.message });
      return { role: 'assistant', content: execResult.error.message, timestamp: Date.now() };
    }

    return { role: 'assistant', content: execResult.value.message, timestamp: Date.now() };
  }

  getHistory(): ConversationMessage[] { return [...this.history]; }

  clearHistory(): void { this.history = []; }

  async getContext(limit = 20): Promise<ConversationMessage[]> {
    const ctx = getAppContext();
    return ctx.memory.getContext(this.sessionId, limit);
  }
}
