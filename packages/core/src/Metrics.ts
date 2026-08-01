type MetricType = 'counter' | 'timing' | 'gauge';

interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export class Metrics {
  private static instance: Metrics;
  private metrics: Metric[] = [];
  private maxSize = 1000;

  static getInstance(): Metrics {
    if (!Metrics.instance) {
      Metrics.instance = new Metrics();
    }
    return Metrics.instance;
  }

  counter(name: string, value = 1, tags?: Record<string, string>): void {
    this.record({ name, type: 'counter', value, timestamp: Date.now(), tags });
  }

  timing(name: string, value: number, tags?: Record<string, string>): void {
    this.record({ name, type: 'timing', value, timestamp: Date.now(), tags });
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record({ name, type: 'gauge', value, timestamp: Date.now(), tags });
  }

  private record(metric: Metric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxSize) {
      this.metrics.shift();
    }
  }

  flush(): Metric[] {
    const snapshot = [...this.metrics];
    this.metrics = [];
    return snapshot;
  }

  getMetrics(): Metric[] {
    return [...this.metrics];
  }
}
