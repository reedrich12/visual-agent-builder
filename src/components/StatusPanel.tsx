import { Settings } from 'lucide-react';
import useStore from '../store/useStore';

export const StatusPanel = () => {
  const { workflowConfig, setConfigModalOpen, nodes, edges } = useStore();

  return (
    <div className="flex items-center gap-4 text-sm">
      {/* Stats */}
      <div className="flex items-center gap-3 text-slate-500">
        <span className="font-mono">{nodes.length} nodes</span>
        <span className="text-slate-300">|</span>
        <span className="font-mono">{edges.length} edges</span>
      </div>

      <div className="w-px h-4 bg-slate-200" />

      {/* Framework Badge */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500">Framework:</span>
        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
          {workflowConfig.framework}
        </span>
      </div>

      {/* Skill Format Badge */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500">Format:</span>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium uppercase">
          {workflowConfig.skillFormat}
        </span>
      </div>

      <div className="w-px h-4 bg-slate-200" />

      {/* Settings Button */}
      <button
        onClick={() => setConfigModalOpen(true)}
        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
        title="Workflow Settings"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
};
