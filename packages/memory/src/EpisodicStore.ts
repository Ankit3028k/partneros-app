import { createLogger } from '@partneros/core';
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const logger = createLogger({ prefix: 'EpisodicStore' });

export interface Episode {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sessionId: string;
}

export class EpisodicStore {
  private db: any = null;
  private ready = false;

  async init(): Promise<void> {
    if (this.ready) return;
    this.db = await SQLite.openDatabase({ name: 'episodic.db', location: 'default' });
    await this.db.executeSql(
      `CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        sessionId TEXT NOT NULL
      )`
    );
    await this.db.executeSql(
      `CREATE INDEX IF NOT EXISTS idx_episodes_session ON episodes(sessionId)`
    );
    this.ready = true;
    logger.info('EpisodicStore initialized');
  }

  async add(episode: Omit<Episode, 'id'>): Promise<number> {
    await this.ensureReady();
    const [result] = await this.db.executeSql(
      'INSERT INTO episodes (role, content, timestamp, sessionId) VALUES (?, ?, ?, ?)',
      [episode.role, episode.content, episode.timestamp, episode.sessionId]
    );
    return result.insertId;
  }

  async getSession(sessionId: string, limit = 50): Promise<Episode[]> {
    await this.ensureReady();
    const [result] = await this.db.executeSql(
      'SELECT * FROM episodes WHERE sessionId = ? ORDER BY timestamp DESC LIMIT ?',
      [sessionId, limit]
    );
    const episodes: Episode[] = [];
    for (let i = 0; i < result.rows.length; i++) episodes.push(result.rows.item(i));
    return episodes.reverse();
  }

  async getAllSessions(): Promise<string[]> {
    await this.ensureReady();
    const [result] = await this.db.executeSql(
      'SELECT DISTINCT sessionId FROM episodes ORDER BY MAX(timestamp) DESC'
    );
    const sessions: string[] = [];
    for (let i = 0; i < result.rows.length; i++) sessions.push(result.rows.item(i).sessionId);
    return sessions;
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.ensureReady();
    await this.db.executeSql('DELETE FROM episodes WHERE sessionId = ?', [sessionId]);
  }

  async clear(): Promise<void> {
    await this.ensureReady();
    await this.db.executeSql('DELETE FROM episodes');
  }

  private async ensureReady(): Promise<void> {
    if (!this.ready) await this.init();
  }
}
