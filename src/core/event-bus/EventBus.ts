type Handler<T = unknown> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  on<T>(event: string, handler: Handler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as Handler);
    return () => this.off(event, handler);
  }

  off<T>(event: string, handler: Handler<T>): void {
    this.handlers.get(event)?.delete(handler as Handler);
  }

  emit<T>(event: string, payload: T): void {
    this.handlers.get(event)?.forEach(handler => handler(payload));
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
