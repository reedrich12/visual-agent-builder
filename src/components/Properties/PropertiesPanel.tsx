import { useState, useCallback } from 'react';
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
  ChevronRight,
  Network,
  ArrowRight,
} from 'lucide-react';
import { NodeType, NODE_TYPE_INFO } from '../../types/core';
import { getSchemaForType } from './schemas';
import { DynamicForm } from './DynamicForm';
import { EDGE_TYPES } from '../../config/edgeConfig';
import { useSocket } from '../../hooks/useSocket';

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

// Map node types to colors
const nodeTypeColors: Record<NodeType, { bg: string; text: string; border: string }> = {
  AGENT: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  SKILL: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  PLUGIN: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  TOOL: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  PROVIDER: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  HOOK: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  COMMAND: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  REASONING: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  DEPARTMENT: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  AGENT_POOL: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  MCP_SERVER: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
};

export const PropertiesPanel = () => {
  const { selectedNode, setSelectedNode, selectedEdge, setSelectedEdge, updateEdgeType, nodes } = useStore();
  const { socket } = useSocket();
  const [isClosing, setIsClosing] = useState(false);

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedNode(null);
      setSelectedEdge(null);
      setIsClosing(false);
    }, 150);
  };

  // Phase 6.3: Handle edge type change with backend sync
  const handleEdgeTypeChange = useCallback((newType: string) => {
    if (!selectedEdge) return;

    // 1. Update UI immediately (optimistic update)
    updateEdgeType(selectedEdge.id, newType);

    // 2. Sync to Backend for persistence in layout.json
    socket?.emit('canvas:update_edge' as any, {
      edgeId: selectedEdge.id,
      changes: { data: { type: newType } }
    });

    console.log('[PropertiesPanel] Edge type changed:', selectedEdge.id, '->', newType);
  }, [selectedEdge, updateEdgeType, socket]);

  // Phase 6.3: Render Edge Inspector Panel
  if (selectedEdge) {
    const currentType = (selectedEdge.data as any)?.type || 'default';
    const sourceNode = nodes.find(n => n.id === selectedEdge.source);
    const targetNode = nodes.find(n => n.id === selectedEdge.target);
    const sourceLabel = sourceNode?.data?.label || 'Source';
    const targetLabel = targetNode?.data?.label || 'Target';

    return (
      <aside
        className={`
          w-80 bg-white border-l border-slate-200
          z-10 flex flex-col shrink-0 h-full
          transition-all duration-150
          ${isClosing ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                <Network className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-slate-800">Connection</h2>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {selectedEdge.id.slice(0, 16)}...
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Deselect edge"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Visual Flow Map */}
          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
            <div className="text-xs font-medium text-slate-700 truncate w-24 text-center">
              {sourceLabel}
            </div>
            <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />
            <div className="text-xs font-medium text-slate-700 truncate w-24 text-center">
              {targetLabel}
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Relationship Type
            </label>
            <div className="space-y-2">
              {Object.entries(EDGE_TYPES).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleEdgeTypeChange(key)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                    currentType === key
                      ? 'ring-2 ring-blue-500 border-transparent bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config.stroke }}
                  />
                  <span className="text-xs font-medium text-slate-700">
                    {config.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Edge
            </span>
            <span className="font-mono text-slate-400">
              Type: {currentType}
            </span>
          </div>
        </div>
      </aside>
    );
  }

  // Empty state - no node or edge selected
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-white border-l border-slate-200 z-10 hidden lg:flex flex-col shrink-0 h-full">
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100">
              <Settings2 className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Properties</h2>
              <p className="text-xs text-slate-400">No selection</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
              <ChevronRight className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">No selection</p>
            <p className="text-slate-400 text-xs">
              Click a node or edge on the canvas<br />to edit its properties
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const nodeType = selectedNode.data.type as NodeType;
  const schema = getSchemaForType(nodeType);
  const NodeIcon = nodeTypeIcons[nodeType] || Bot;
  const colors = nodeTypeColors[nodeType] || nodeTypeColors.AGENT;
  const typeInfo = NODE_TYPE_INFO[nodeType];

  return (
    <aside
      className={`
        w-80 bg-white border-l border-slate-200
        z-10 flex flex-col shrink-0 h-full
        transition-all duration-150
        ${isClosing ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${colors.bg} ${colors.border} border`}>
              <NodeIcon className={`w-5 h-5 ${colors.text}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-800 truncate">
                {selectedNode.data.label || 'Untitled'}
              </h2>
              {selectedNode.data.repo && (
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {selectedNode.data.repo}
                </p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${colors.bg} ${colors.text}`}>
                  {typeInfo?.displayName || nodeType}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  #{selectedNode.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Deselect node"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto">
        {schema ? (
          <div className="p-4">
            <DynamicForm node={selectedNode} schema={schema} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <div>
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 flex items-center justify-center">
                <Settings2 className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No schema</p>
              <p className="text-xs text-slate-400 mt-1">
                This node type is not<br />yet configurable
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${typeInfo?.isContainer ? 'bg-orange-400' : 'bg-blue-400'}`} />
            {typeInfo?.isContainer ? 'Container' : 'Component'}
          </span>
          <span className="font-mono text-slate-400">
            {Object.keys(selectedNode.data.config || {}).length} properties
          </span>
        </div>
      </div>
    </aside>
  );
};
