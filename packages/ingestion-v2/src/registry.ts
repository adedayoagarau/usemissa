import type { SourceAdapter } from "./contracts.js";

export class AdapterRegistry {
  private readonly adapters = new Map<string, SourceAdapter>();

  register(adapter: SourceAdapter): this {
    if (this.adapters.has(adapter.id)) throw new Error(`Adapter already registered: ${adapter.id}`);
    this.adapters.set(adapter.id, adapter);
    return this;
  }

  get(id: string): SourceAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`No ingestion v2 adapter registered for: ${id}`);
    return adapter;
  }

  list(): string[] {
    return [...this.adapters.keys()].sort();
  }
}
