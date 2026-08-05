import { createLogger } from '@partneros/core';
import { MemoryEngine } from '@partneros/memory';
import type { PlannerContext } from './types';

const logger = createLogger({ prefix: 'ContextBuilder' });

/**
 * Sits between STT output and ActionPlanner in the voice pipeline (see
 * project-brain/16_VOICE_PIPELINE.md). Pulls recent conversation + relevant
 * semantic memory so the planner has enough context to resolve ambiguous
 * commands (e.g. "send him the address" needs prior turns to know who "him" is).
 */
export class ContextBuilder {
  constructor(private memory: MemoryEngine) {}

  async build(rawText: string, sessionId: string): Promise<PlannerContext> {
    const recentMessages = await this.memory.getContext(sessionId, 10);
    const identity = this.memory.getUserIdentity();

    let memoryFacts: string[] = [];
    try {
      const hits = await this.memory.searchMemories(rawText);
      memoryFacts = hits.slice(0, 5).map((h) => h.value);
    } catch (error) {
      logger.warn('Semantic memory search failed, continuing without it', { error: String(error) });
    }

    return {
      recentMessages: recentMessages.map((e) => ({
        role: e.role,
        content: e.content,
        timestamp: e.timestamp,
      })),
      memoryFacts,
      userName: identity?.name,
    };
  }
}
