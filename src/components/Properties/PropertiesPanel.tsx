import { useState } from 'react';
import useStore from '../../store/useStore';
import {
  Settings2,
  Bot,
  Code2,
  Plug,
  Wrench,
  Cloud,
  Anchor,
  Terminal,
  BrainCircuit,
  Building2,
  Users,
  Server,
  LucideIcon,
  X,
} from 'lucide-react';
import { NodeType, NODE_TYPE_INFO } from '../../types/core';
import { getSchemaForType } from './schemas';
import { DynamicForm } from './DynamicForm';

// Map node types to icons
const nodeTypeIcons: Record<NodeType, LucideIcon> = {
  AGENT: Bot,
  SKILL: Code2,
  PLUGIN: Plug,
  TOOL: Wrench,
  PROVIDER: Cloud,
  HOOK: Anchor,
  COMMAND: Terminal,
  REASONING: BrainCircuit,
  DEPARTMENT: Building2,
  AGENT_POOL: Users,
  MCP_SERVER: Server,
};

// Map node types to gradient colors
const nodeTypeGradients: Record<NodeType, string> = {
  AGENT: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  SKILL: 'from-green-500/20 to-green-600/20 border-green-500/30',
  PLUGIN: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  TOOL: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
  PROVIDER: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
  HOOK: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
  COMMAND: 'from-slate-500/20 to-slate-600/20 border-slate-500/30',
  REASONING: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30',
  DEPARTMENT: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
  AGENT_POOL: 'from-teal-500/20 to-teal-600/20 border-teal-500/30',
  MCP_SERVER: 'from-violet-500/20 to-violet-600/20 border-violet-500/30',
};

const nodeTypeIconColors: Record<NodeType, string> = {
  AGENT: 'text-blue-400',
  SKILL: 'text-green-400',
  PLUGIN: 'text-purple-400',
  TOOL: 'text-amber-400',
  PROVIDER: 'text-cyan-400',
  HOOK: 'text-pink-400',
  COMMAND: 'text-slate-400',
  REASONING: 'text-indigo-400',
  DEPARTMENT: 'text-orange-400',
  AGENT_POOL: 'text-teal-400',
  MCP_SERVER: 'text-violet-400',
};

export const PropertiesPanel = () => {
  const { selectedNode, setSelectedNode } = useStore();
  const [isClosing, setIsClosing] = useState(false);

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedNode(null);
      setIsClosing(false);
    }, 150);
  };

  // Empty state - no node selected
  if (!selectedNode) {
    return (
      <aside className="w-[340px] bg-gradient-to-b from-slate-900 to-slate-950 border-l border-slate-800 z-10 hidden lg:flex flex-col shrink-0 h-full">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-700">
              <Settings2 className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-300">Properties</h2>
              <p className="text-[10px] text-slate-500">No selection</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Settings2 className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">
              Select a node on the canvas<br />to configure its properties
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const nodeType = selectedNode.data.type as NodeType;
  const schema = getSchemaForType(nodeType);
  const NodeIcon = nodeTypeIcons[nodeType] || Bot;
  const gradientClass = nodeTypeGradients[nodeType] || nodeTypeGradients.AGENT;
  const iconColor = nodeTypeIconColors[nodeType] || 'text-cyan-400';
  const typeInfo = NODE_TYPE_INFO[nodeType];

  return (
    <aside
      className={`
        w-[340px] bg-gradient-to-b from-slate-900 to-slate-950 border-l border-slate-800
        z-10 flex flex-col shrink-0 h-full shadow-2xl
        transition-all duration-150
        ${isClosing ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradientClass} border`}>
              <NodeIcon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                {selectedNode.data.label || 'Untitled'}
              </h2>
              <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded ${typeInfo?.bgColor || 'bg-slate-800'} ${typeInfo?.color || 'text-slate-400'}`}>
                  {typeInfo?.displayName || nodeType}
                </span>
                <span className="text-slate-600">{selectedNode.id.slice(0, 8)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            title="Deselect node"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-white/[0.02]">
        {schema ? (
          <DynamicForm node={selectedNode} schema={schema} />
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No schema defined for {nodeType}</p>
            <p className="text-xs mt-1">This node type is not yet configurable</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/80">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {typeInfo?.isContainer ? 'Container Node' : 'Component Node'}
          </span>
          <span className="font-mono">
            {Object.keys(selectedNode.data.config || {}).length} properties
          </span>
        </div>
      </div>
    </aside>
  );
};
