import { createLogger } from '@partneros/core';

const logger = createLogger({ prefix: 'ModelSelector' });

export interface DeviceSpecs {
  totalRamGB: number;
  freeStorageGB: number;
  cpuCores: number;
  platform: 'ios' | 'android';
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  sizeGB: number;
  minRAMGB: number;
  minStorageGB: number;
  speed: 'fast' | 'medium' | 'slow';
  accuracy: 'high' | 'medium' | 'low';
  recommended: boolean;
  ramUsageGB: number;
}

const MODELS: ModelOption[] = [
  { id: 'gemma-2b', name: 'Gemma 2B', description: 'Halka aur tez. Basic sawaal-jawaab ke liye best.', sizeGB: 2.2, minRAMGB: 2, minStorageGB: 4, speed: 'fast', accuracy: 'low', recommended: false, ramUsageGB: 1.5 },
  { id: 'partneros-1b', name: 'PartnerOS 1B', description: 'Tez aur balance. Intent classification + basic generation.', sizeGB: 1.25, minRAMGB: 2, minStorageGB: 3, speed: 'fast', accuracy: 'medium', recommended: true, ramUsageGB: 1.2 },
  { id: 'partneros-3b', name: 'PartnerOS 3B', description: 'Accha accuracy. Medium queries ke liye best.', sizeGB: 3.5, minRAMGB: 4, minStorageGB: 6, speed: 'medium', accuracy: 'high', recommended: false, ramUsageGB: 2.5 },
  { id: 'llama-8b', name: 'Llama 3.1 8B', description: 'Sabse smart. Sirf flagship phones pe.', sizeGB: 8.5, minRAMGB: 8, minStorageGB: 12, speed: 'slow', accuracy: 'high', recommended: false, ramUsageGB: 6 },
];

export class ModelSelector {
  getCompatibleModels(specs?: DeviceSpecs): ModelOption[] {
    if (!specs) return MODELS;
    return MODELS.filter((m) => specs.totalRamGB >= m.minRAMGB && specs.freeStorageGB >= m.minStorageGB);
  }

  getRecommendedModel(specs?: DeviceSpecs): ModelOption {
    const compatible = this.getCompatibleModels(specs);
    return compatible.find((m) => m.recommended) ?? compatible[0] ?? MODELS[0];
  }

  getAllModels(): ModelOption[] { return [...MODELS]; }

  getModel(id: string): ModelOption | undefined { return MODELS.find((m) => m.id === id); }

  getDeviceSummary(specs?: DeviceSpecs): string {
    if (!specs) return 'Device info not available';
    const compatible = this.getCompatibleModels(specs);
    return [
      `Platform: ${specs.platform}`, `RAM: ${specs.totalRamGB}GB`, `Free Storage: ${specs.freeStorageGB}GB`, `CPU: ${specs.cpuCores} cores`,
      ``, `Compatible: ${compatible.length}`, ...compatible.map((m) => `  • ${m.name} (${m.sizeGB}GB)`),
      ``, `Recommended: ${this.getRecommendedModel(specs).name}`,
    ].join('\n');
  }
}
