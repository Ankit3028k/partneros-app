import { IdentityStore, IdentityData } from './IdentityStore';
import { EpisodicStore, Episode } from './EpisodicStore';
import { SemanticStore } from './SemanticStore';
import { createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'MemoryEngine' });

export class MemoryEngine {
  readonly identity: IdentityStore;
  readonly episodic: EpisodicStore;
  readonly semantic: SemanticStore;

  constructor() {
    this.identity = new IdentityStore();
    this.episodic = new EpisodicStore();
    this.semantic = new SemanticStore();
  }

  async init(): Promise<void> {
    await this.episodic.init();
    logger.info('MemoryEngine initialized');
  }

  async addConversation(role: 'user' | 'assistant' | 'system', content: string, sessionId: string): Promise<void> {
    await this.episodic.add({ role, content, timestamp: Date.now(), sessionId });
    if (role === 'assistant' && content.length > 20) {
      await this.semantic.store(
        `convo:${sessionId}:${Date.now()}`,
        content.substring(0, 200),
        ['conversation', sessionId]
      );
    }
  }

  async getContext(sessionId: string, limit = 20): Promise<Episode[]> {
    return this.episodic.getSession(sessionId, limit);
  }

  async searchMemories(query: string): Promise<Array<{ key: string; value: string; score: number }>> {
    return this.semantic.search(query);
  }

  getUserIdentity(): IdentityData | null {
    return this.identity.get();
  }

  setUserIdentity(data: IdentityData): void {
    this.identity.set(data);
  }
}
