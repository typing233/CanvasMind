import { EventBus } from '../event-bus/EventBus';
import { CommandHistory } from '../commands/CommandHistory';
import { CanvasStore } from '../data-model/store';

export interface IPlugin {
  id: string;
  name: string;
  version: string;
  register(ctx: PluginContext): void;
  activate(): void;
  deactivate(): void;
  destroy(): void;
}

export interface PluginContext {
  store: CanvasStore;
  eventBus: EventBus;
  commandHistory: CommandHistory;
}
