import React, { useState } from 'react';
import { PluginManager } from '../core/plugin-system/PluginManager';
import { useT } from '../i18n';

interface PluginMarketplaceProps {
  pluginManager: PluginManager;
  onClose: () => void;
}

export const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({ pluginManager, onClose }) => {
  const { t } = useT();
  const [, forceUpdate] = useState(0);

  const plugins = pluginManager.getAllPlugins();

  const handleToggle = (id: string) => {
    if (pluginManager.isEnabled(id)) {
      pluginManager.disablePlugin(id);
    } else {
      pluginManager.enablePlugin(id);
    }
    forceUpdate(n => n + 1);
  };

  const getCategoryColor = (category?: string): string => {
    switch (category) {
      case 'core': return 'bg-blue-100 text-blue-700';
      case 'shape': return 'bg-purple-100 text-purple-700';
      case 'tool': return 'bg-green-100 text-green-700';
      case 'export': return 'bg-orange-100 text-orange-700';
      case 'integration': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">{t('plugins.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {plugins.map(plugin => {
            const enabled = pluginManager.isEnabled(plugin.id);
            const meta = plugin.metadata;
            return (
              <div key={plugin.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="text-2xl w-9 text-center">{meta?.icon || '🧩'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800">{plugin.name}</span>
                    {meta?.category && (
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${getCategoryColor(meta.category)}`}>
                        {meta.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{meta?.description || ''}</p>
                </div>
                <button
                  onClick={() => handleToggle(plugin.id)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    enabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {enabled ? t('plugins.enabled') : t('plugins.disabled')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
