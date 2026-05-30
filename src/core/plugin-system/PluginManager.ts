import { IPlugin, PluginContext, ToolbarContribution } from './types';
import { EventBus } from '../event-bus/EventBus';
import { CommandHistory } from '../commands/CommandHistory';
import { CanvasStore } from '../data-model/store';

export class PluginManager {
  private plugins = new Map<string, IPlugin>();
  private enabledPlugins = new Set<string>();
  private activePluginId: string | null = null;
  private ctx: PluginContext;

  constructor(store: CanvasStore, eventBus: EventBus, commandHistory: CommandHistory) {
    this.ctx = { store, eventBus, commandHistory };
  }

  register(plugin: IPlugin): void {
    if (this.plugins.has(plugin.id)) return;
    this.plugins.set(plugin.id, plugin);
    plugin.register(this.ctx);
    this.enabledPlugins.add(plugin.id);
  }

  activate(pluginId: string): void {
    if (this.activePluginId === pluginId) return;

    if (this.activePluginId) {
      const current = this.plugins.get(this.activePluginId);
      current?.deactivate();
      this.ctx.eventBus.emit('plugin:deactivated', { pluginId: this.activePluginId });
    }

    const next = this.plugins.get(pluginId);
    if (!next) return;

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

  enablePlugin(id: string): void {
    this.enabledPlugins.add(id);
  }

  disablePlugin(id: string): void {
    this.enabledPlugins.delete(id);
    if (this.activePluginId === id) {
      this.deactivateAll();
    }
  }

  isEnabled(id: string): boolean {
    return this.enabledPlugins.has(id);
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

  getToolbarContributions(): ToolbarContribution[] {
    const contributions: ToolbarContribution[] = [];
    for (const plugin of this.plugins.values()) {
      if (this.enabledPlugins.has(plugin.id) && plugin.contributeToolbar) {
        contributions.push(...plugin.contributeToolbar());
      }
    }
    return contributions;
  }

  getContext(): PluginContext {
    return this.ctx;
  }

  destroy(): void {
    this.plugins.forEach(p => p.destroy());
    this.plugins.clear();
    this.activePluginId = null;
    this.enabledPlugins.clear();
  }
}
