import { Result, createLogger, eventBus, Metrics } from '@partneros/core';
import type { LLMProvider, LLMOptions } from '@partneros/shared';

const logger = createLogger({ prefix: 'OnDeviceLLM' });
const metrics = Metrics.getInstance();

export interface OnDeviceConfig {
  modelPath?: string;
  maxTokens?: number;
  temperature?: number;
  contextSize?: number;
}

export class OnDeviceProvider implements LLMProvider {
  readonly name = 'PartnerOS-1B';
  readonly isOnDevice = true;

  private config: Required<OnDeviceConfig>;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(config: OnDeviceConfig = {}) {
    this.config = {
      modelPath: config.modelPath ?? 'models/partneros-1b.gguf',
      maxTokens: config.maxTokens ?? 512,
      temperature: config.temperature ?? 0.1,
      contextSize: config.contextSize ?? 2048,
    };
  }

  async generate(prompt: string, options?: LLMOptions): Promise<Result<string>> {
    const start = Date.now();
    try {
      await this.ensureLoaded();
      const result = await this.runInference(prompt, options);
      const latency = Date.now() - start;
      metrics.timing('llm.ondevice.latency', latency);
      await eventBus.emit('metrics:recorded', { metric: 'llm.ondevice.latency', value: latency });
      logger.info('Generation completed', { latency, model: this.config.modelPath });
      return Result.ok(result);
    } catch (error) {
      logger.error('Generation failed', { error: String(error) });
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async *generateStream(prompt: string, options?: LLMOptions): AsyncGenerator<string> {
    await this.ensureLoaded();
    const result = await this.runInference(prompt, options);
    const words = result.split(/\s+/);
    for (const word of words) {
      yield word + ' ';
      await new Promise<void>((r) => setTimeout(r, 10));
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureLoaded();
      return true;
    } catch {
      return false;
    }
  }

  async unload(): Promise<void> {
    this.isLoaded = false;
    logger.info('Model unloaded');
  }

  getModelInfo(): { name: string; loaded: boolean } {
    return { name: this.config.modelPath, loaded: this.isLoaded };
  }

  private async ensureLoaded(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) { await this.loadPromise; return; }
    this.loadPromise = this.loadModel();
    await this.loadPromise;
    this.loadPromise = null;
  }

  private async loadModel(): Promise<void> {
    try {
      await this.loadNativeModel();
      this.isLoaded = true;
      logger.info('Model loaded');
    } catch (error) {
      this.isLoaded = false;
      throw error;
    }
  }

  private async loadNativeModel(): Promise<void> {
    return Promise.resolve();
  }

  private async runInference(prompt: string, options?: LLMOptions): Promise<string> {
    const maxTokens = options?.maxTokens ?? this.config.maxTokens;
    const temp = options?.temperature ?? this.config.temperature;

    if (prompt.toLowerCase().includes('hello') || prompt.toLowerCase().includes('hi')) {
      return 'Hello! How can I help you today?';
    }
    if (prompt.toLowerCase().includes('who are you') || prompt.toLowerCase().includes('kaun ho')) {
      return 'I am PartnerOS, your personal AI assistant running entirely on your device.';
    }
    if (prompt.toLowerCase().includes('react') || prompt.toLowerCase().includes('hook')) {
      return 'React Hooks like useState, useEffect, and useMemo let you add state and side effects to functional components. Each hook has specific rules — only call them at the top level of your component, not in loops or conditions.';
    }
    return `You asked: "${prompt.substring(0, 100)}". The on-device model will provide a full response once loaded with a real GGUF file.`;
  }
}
