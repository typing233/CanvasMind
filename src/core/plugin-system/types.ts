import { EventBus } from '../event-bus/EventBus';
import { CommandHistory } from '../commands/CommandHistory';
import { CanvasStore } from '../data-model/store';
import { CanvasNode, NodeStyle, Size } from '../data-model/types';
import React from 'react';

export interface IPlugin {
  id: string;
  name: string;
  version: string;
  register(ctx: PluginContext): void;
  activate(): void;
  deactivate(): void;
  destroy(): void;

  metadata?: PluginMetadata;
  contributeToolbar?(): ToolbarContribution[];
  contributeNodeTypes?(): NodeTypeRegistration[];
  contributeEdgeTypes?(): EdgeTypeRegistration[];
  onNodeCreated?(node: CanvasNode): void;
  onNodeRemoved?(nodeId: string): void;
  onSelectionChanged?(nodeIds: string[], edgeIds: string[]): void;
}

export interface PluginMetadata {
  description: string;
  author: string;
  icon?: string;
  category: 'core' | 'shape' | 'tool' | 'export' | 'integration';
  keywords?: string[];
}

export interface ToolbarContribution {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  isActive?: () => boolean;
  group?: string;
}

export interface NodeTypeRegistration {
  type: string;
  label: string;
  defaultStyle: NodeStyle;
  defaultSize: Size;
}

export interface EdgeTypeRegistration {
  type: string;
  label: string;
}

export interface PluginContext {
  store: CanvasStore;
  eventBus: EventBus;
  commandHistory: CommandHistory;
}
