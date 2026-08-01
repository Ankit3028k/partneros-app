type Listener<T = unknown> = (payload: T) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private listeners = new Map<string, Set<Listener>>();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<T>(event: string, listener: Listener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener);
    return () => this.listeners.get(event)?.delete(listener as Listener);
  }

  off<T>(event: string, listener: Listener<T>): void {
    this.listeners.get(event)?.delete(listener as Listener);
  }

  async emit<T>(event: string, payload: T): Promise<void> {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    const errors: Error[] = [];
    for (const listener of listeners) {
      try {
        await listener(payload);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, `Event "${event}" listeners failed`);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = EventBus.getInstance();
