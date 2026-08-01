import { createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'SemanticStore' });

interface MemoryEntry {
  key: string;
  value: string;
  tags: string[];
  timestamp: number;
}

export class SemanticStore {
  private entries: MemoryEntry[] = [];
  private maxEntries = 500;

  async store(key: string, value: string, tags?: string[]): Promise<void> {
    this.entries.unshift({ key, value, tags: tags ?? [], timestamp: Date.now() });
    if (this.entries.length > this.maxEntries) this.entries.pop();
    logger.debug('Stored semantic memory', { key });
  }

  async search(query: string, limit = 5): Promise<Array<{ key: string; value: string; score: number }>> {
    const q = query.toLowerCase();
    const scored = this.entries.map((entry) => {
      let score = 0;
      if (entry.key.toLowerCase().includes(q)) score += 10;
      if (entry.value.toLowerCase().includes(q)) score += 5;
      for (const tag of entry.tags) if (tag.toLowerCase().includes(q)) score += 3;
      return { key: entry.key, value: entry.value, score };
    });
    return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async retrieve(key: string): Promise<string | null> {
    const entry = this.entries.find((e) => e.key === key);
    return entry?.value ?? null;
  }

  async delete(key: string): Promise<void> {
    this.entries = this.entries.filter((e) => e.key !== key);
  }

  async clear(): Promise<void> {
    this.entries = [];
    logger.info('Semantic memory cleared');
  }
}
