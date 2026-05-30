import { IPlugin, PluginContext } from './types';
import { EventBus } from '../event-bus/EventBus';
import { CommandHistory } from '../commands/CommandHistory';
import { CanvasStore } from '../data-model/store';

export class PluginManager {
  private plugins = new Map<string, IPlugin>();
  private activePluginId: string | null = null;
  private ctx: PluginContext;

  constructor(store: CanvasStore, eventBus: EventBus, commandHistory: CommandHistory) {
    this.ctx = { store, eventBus, commandHistory };
  }

  register(plugin: IPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" is already registered.`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
    plugin.register(this.ctx);
  }

  activate(pluginId: string): void {
    if (this.activePluginId === pluginId) return;

    if (this.activePluginId) {
      const current = this.plugins.get(this.activePluginId);
      current?.deactivate();
      this.ctx.eventBus.emit('plugin:deactivated', { pluginId: this.activePluginId });
    }

    const next = this.plugins.get(pluginId);
    if (!next) {
      console.warn(`Plugin "${pluginId}" not found.`);
      return;
    }

    next.activate();
    this.activePluginId = pluginId;
    this.ctx.store.setActivePlugin(pluginId);
    this.ctx.eventBus.emit('plugin:activated', { pluginId });
  }

  deactivateAll(): void {
    if (this.activePluginId) {
      const current = this.plugins.get(this.activePluginId);
      current?.deactivate();
      this.activePluginId = null;
      this.ctx.store.setActivePlugin(null);
    }
  }

  getPlugin(id: string): IPlugin | undefined {
    return this.plugins.get(id);
  }

  getActivePluginId(): string | null {
    return this.activePluginId;
  }

  getAllPlugins(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  destroy(): void {
    this.plugins.forEach(p => p.destroy());
    this.plugins.clear();
    this.activePluginId = null;
  }
}
