import { useState, useEffect } from 'react';
import { X, Settings, Sparkles } from 'lucide-react';
import useStore, { WorkflowConfig } from '../store/useStore';

export const ConfigModal = () => {
  const { workflowConfig, setWorkflowConfig, isConfigModalOpen, setConfigModalOpen } = useStore();
  const [localConfig, setLocalConfig] = useState<WorkflowConfig>(workflowConfig);

  // Sync local config when modal opens
  useEffect(() => {
    if (isConfigModalOpen) {
      setLocalConfig(workflowConfig);
    }
  }, [isConfigModalOpen, workflowConfig]);

  const handleSave = () => {
    setWorkflowConfig(localConfig);
    setConfigModalOpen(false);
  };

  const handleCancel = () => {
    setLocalConfig(workflowConfig);
    setConfigModalOpen(false);
  };

  if (!isConfigModalOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
      onClick={handleCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Workflow Configuration</h2>
                <p className="text-sm text-white/70">Configure your workflow settings</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Workflow Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Workflow Name
            </label>
            <input
              type="text"
              value={localConfig.name}
              onChange={(e) => setLocalConfig({ ...localConfig, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Enter workflow name..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              value={localConfig.description}
              onChange={(e) => setLocalConfig({ ...localConfig, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              rows={3}
              placeholder="Describe your workflow..."
            />
          </div>

          {/* Framework */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Target Framework
            </label>
            <select
              value={localConfig.framework}
              onChange={(e) => setLocalConfig({ ...localConfig, framework: e.target.value as WorkflowConfig['framework'] })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
            >
              <option value="claude-code">Claude Code</option>
              <option value="langchain">LangChain</option>
              <option value="autogen">AutoGen</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Skill Format */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Skill Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['markdown', 'yaml', 'json'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setLocalConfig({ ...localConfig, skillFormat: format })}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    localConfig.skillFormat === format
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all shadow-md flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
