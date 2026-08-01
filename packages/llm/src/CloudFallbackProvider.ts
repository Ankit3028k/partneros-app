import { Result, createLogger } from '@partneros/core';
import type { LLMProvider, LLMOptions } from '@partneros/shared';

const logger = createLogger({ prefix: 'CloudFallback' });

export interface CloudConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class CloudFallbackProvider implements LLMProvider {
  readonly name = 'Groq-Cloud';
  readonly isOnDevice = false;

  private config: Required<CloudConfig>;

  constructor(config: CloudConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? '',
      baseUrl: config.baseUrl ?? 'https://api.groq.com/openai/v1',
      model: config.model ?? 'llama-3.1-8b-instant',
    };
  }

  async generate(prompt: string, options?: LLMOptions): Promise<Result<string>> {
    try {
      if (!this.config.apiKey) {
        return Result.err(new Error('No API key configured for cloud fallback'));
      }

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens ?? 512,
          temperature: options?.temperature ?? 0.1,
        }),
      });

      if (!response.ok) {
        return Result.err(new Error(`Groq API error: ${response.status}`));
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      return Result.ok(content);
    } catch (error) {
      logger.error('Cloud fallback failed', { error: String(error) });
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }
}
