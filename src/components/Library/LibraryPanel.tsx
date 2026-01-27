import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchInventory, InventoryItem, BundleComponent } from '../../services/api';
import {
  Search,
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Bot,
  Hammer,
  Plug,
  Loader2,
  Terminal,
  Anchor,
  Sparkles,
  Plus,
  Check,
  ArrowLeft,
  Building2,
  Users,
  Server,
  Cloud,
  Package,
} from 'lucide-react';
import { NodeType } from '../../types/core';
import { BundleCard } from './BundleCard';
import useStore from '../../store/useStore';

// Map bundle component category to NodeType
const categoryToNodeType: Record<string, NodeType> = {
  agents: 'AGENT',
  commands: 'COMMAND',
  skills: 'SKILL',
  hooks: 'HOOK',
  departments: 'DEPARTMENT',
  'agent-pools': 'AGENT_POOL',
  'mcp-servers': 'MCP_SERVER',
  mcps: 'MCP_SERVER',
};

// Draggable node templates for creating new nodes
interface NodeTemplate {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const containerNodeTemplates: NodeTemplate[] = [
  {
    type: 'DEPARTMENT',
    label: 'Department',
    icon: <Building2 size={16} />,
    color: 'orange',
    description: 'Container for organizing agent pools',
  },
  {
    type: 'AGENT_POOL',
    label: 'Agent Pool',
    icon: <Users size={16} />,
    color: 'teal',
    description: 'Scalable group of agents',
  },
  {
    type: 'MCP_SERVER',
    label: 'MCP Server',
    icon: <Server size={16} />,
    color: 'violet',
    description: 'Model Context Protocol server config',
  },
];

const componentNodeTemplates: NodeTemplate[] = [
  {
    type: 'AGENT',
    label: 'Agent',
    icon: <Bot size={16} />,
    color: 'blue',
    description: 'AI agent with tools and skills',
  },
  {
    type: 'SKILL',
    label: 'Skill',
    icon: <Sparkles size={16} />,
    color: 'green',
    description: 'Reusable capability',
  },
  {
    type: 'HOOK',
    label: 'Hook',
    icon: <Anchor size={16} />,
    color: 'pink',
    description: 'Event-triggered automation',
  },
  {
    type: 'COMMAND',
    label: 'Command',
    icon: <Terminal size={16} />,
    color: 'slate',
    description: 'Slash command definition',
  },
];

// Helper to get icon based on category or type
const getIcon = (item: InventoryItem) => {
    if (item.type === 'folder') return <Folder size={14} className="text-blue-300" />;
    if (item.type === 'bundle') return <Package size={14} className="text-indigo-500" />;

    switch(item.category) {
        case 'AGENT': return <Bot size={14} className="text-blue-500" />;
        case 'SKILL': return <Sparkles size={14} className="text-green-500" />;
        case 'TOOL': return <Hammer size={14} className="text-amber-500" />;
        case 'PLUGIN': return <Plug size={14} className="text-purple-500" />;
        case 'COMMAND': return <Terminal size={14} className="text-slate-500" />;
        case 'HOOK': return <Anchor size={14} className="text-pink-500" />;
        case 'DEPARTMENT': return <Building2 size={14} className="text-orange-500" />;
        case 'AGENT_POOL': return <Users size={14} className="text-teal-500" />;
        case 'MCP_SERVER': return <Server size={14} className="text-violet-500" />;
        case 'PROVIDER': return <Cloud size={14} className="text-cyan-500" />;
        default: return <File size={14} className="text-slate-400" />;
    }
};

interface FileTreeItemProps {
    item: InventoryItem;
    level?: number;
    onDragStart: (e: React.DragEvent, item: InventoryItem) => void;
    addMode?: boolean;
    isAdded?: boolean;
    onAddClick?: (item: InventoryItem) => void;
}

const FileTreeItem = ({ item, level = 0, onDragStart, addMode, isAdded, onAddClick }: FileTreeItemProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = item.type === 'folder' && item.children && item.children.length > 0;

    // Simple filter to hide non-relevant files if desired, or show all
    // For now, we show everything.

    const handleClick = () => {
        if (hasChildren) {
            setIsOpen(!isOpen);
        }
    };

    const handleAddClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAddClick && item.type === 'file') {
            onAddClick(item);
        }
    };

    return (
        <div>
            <div
                className={`
                    flex items-center gap-1.5 py-1 pr-2 rounded-md cursor-pointer select-none
                    hover:bg-slate-100 transition-colors
                    ${level > 0 ? 'ml-2' : ''}
                    ${isAdded ? 'bg-emerald-50' : ''}
                `}
                style={{ paddingLeft: `${level * 12 + 4}px` }}
                onClick={handleClick}
                draggable={item.type === 'file' && !addMode}
                onDragStart={(e) => item.type === 'file' && !addMode && onDragStart(e, item)}
            >
                {/* Add/Check button in add mode */}
                {addMode && item.type === 'file' && (
                    <button
                        onClick={handleAddClick}
                        className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors ${
                            isAdded
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 hover:bg-indigo-500 hover:text-white text-slate-500'
                        }`}
                    >
                        {isAdded ? <Check size={12} /> : <Plus size={12} />}
                    </button>
                )}

                {/* Chevron for folders (only when not in add mode for files) */}
                {(!addMode || item.type === 'folder') && (
                    <div className="text-slate-400 shrink-0 w-4 h-4 flex items-center justify-center">
                        {hasChildren && (
                            isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                        )}
                    </div>
                )}

                <div className="shrink-0">
                    {getIcon(item)}
                </div>

                <span
                    className={`text-sm truncate flex-1 ${isAdded ? 'text-emerald-700 font-medium' : 'text-slate-700'}`}
                    title={item.description}
                >
                    {item.name}
                </span>
            </div>

            {hasChildren && isOpen && (
                <div>
                    {item.children?.map(child => (
                        <FileTreeItem
                            key={child.id}
                            item={child}
                            level={level + 1}
                            onDragStart={onDragStart}
                            addMode={addMode}
                            isAdded={isAdded}
                            onAddClick={onAddClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const LibraryPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { libraryCategory, addToAgentMode, setLibraryCategory, selectedNode, updateNodeData } = useStore();

  const { data: inventory, isLoading, error } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  // Filter inventory to selected category's children
  const filteredInventory = inventory?.find(item => item.name === libraryCategory)?.children || [];

  // Map category to config key
  const categoryToConfigKey: Record<string, 'skills' | 'mcps' | 'commands'> = {
    skills: 'skills',
    mcps: 'mcps',
    commands: 'commands',
  };

  // Get currently added items for the selected node
  const configKey = categoryToConfigKey[libraryCategory];
  const addedItems: string[] = selectedNode?.data?.config?.[configKey] || [];

  // Check if an item is added to the current agent
  const isItemAdded = (itemName: string): boolean => {
    return addedItems.includes(itemName);
  };

  // Toggle an item on/off the agent's config
  const toggleItemOnAgent = (item: InventoryItem) => {
    if (!selectedNode || !configKey) return;

    const current = selectedNode.data.config?.[configKey] || [];
    const itemValue = item.name;
    const updated = current.includes(itemValue)
      ? current.filter((v: string) => v !== itemValue)
      : [...current, itemValue];

    updateNodeData(selectedNode.id, {
      config: { ...selectedNode.data.config, [configKey]: updated }
    });
  };

  // Exit add mode
  const handleExitAddMode = () => {
    setLibraryCategory(libraryCategory, false);
  };

  // Handle drag for node templates
  const onTemplateDragStart = (event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', template.type);
    event.dataTransfer.setData('application/label', template.label);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag for regular items
  const onDragStart = (event: React.DragEvent, item: InventoryItem) => {
    const nodeType = (item.category || 'AGENT') as NodeType;

    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', item.name);
    event.dataTransfer.setData('application/filepath', item.path);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag for bundles and bundle components
  const onBundleDragStart = (
    event: React.DragEvent,
    item: InventoryItem | BundleComponent,
    isBundle?: boolean
  ) => {
    if (isBundle && 'bundleData' in item && item.bundleData) {
      // Dragging entire bundle - pass bundle data as JSON
      event.dataTransfer.setData('application/reactflow', 'BUNDLE');
      event.dataTransfer.setData('application/label', item.name);
      event.dataTransfer.setData('application/bundledata', JSON.stringify(item.bundleData));
    } else {
      // Dragging individual component from bundle
      const comp = item as BundleComponent;
      const nodeType = categoryToNodeType[comp.category] || 'AGENT';
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.setData('application/label', comp.name);
      event.dataTransfer.setData('application/filepath', comp.path);
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  // Bundles view - special rendering for bundles category
  const renderBundlesContent = () => {
    if (!filteredInventory.length) {
      return <div className="p-4 text-xs text-slate-400 text-center">No bundles available</div>;
    }

    // Filter by search if active
    let bundles = filteredInventory.filter((item) => item.type === 'bundle');

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      bundles = bundles.filter(
        (b) =>
          b.name.toLowerCase().includes(term) ||
          b.description?.toLowerCase().includes(term)
      );
    }

    if (bundles.length === 0) {
      return <div className="p-4 text-xs text-slate-400 text-center">No matching bundles found</div>;
    }

    return (
      <div className="p-3 space-y-3">
        {bundles.map((bundle) => (
          <BundleCard key={bundle.id} bundle={bundle} onDragStart={onBundleDragStart} />
        ))}
      </div>
    );
  };

  const renderContent = () => {
    // Special handling for bundles category
    if (libraryCategory === 'bundles') {
      return renderBundlesContent();
    }

    if (!filteredInventory.length) return null;

    // Check if we're in add mode for this category
    const showAddMode = addToAgentMode && selectedNode && configKey;

    if (searchTerm) {
      // Flatten for search within selected category
      const results: InventoryItem[] = [];
      const traverse = (items: InventoryItem[]) => {
        for (const item of items) {
          if (item.name.toLowerCase().includes(searchTerm.toLowerCase()) && item.type === 'file') {
            results.push(item);
          }
          if (item.children) traverse(item.children);
        }
      };
      traverse(filteredInventory);

      if (results.length === 0) {
        return <div className="p-4 text-xs text-slate-400 text-center">No matching components found</div>;
      }

      return (
        <div className="p-2">
            <div className="text-xs font-semibold text-slate-400 mb-2 px-2">Search Results</div>
            {results.map(item => {
                const itemIsAdded = isItemAdded(item.name);
                return (
                    <div
                        key={item.id}
                        className={`flex items-center gap-2 p-2 rounded hover:bg-slate-100 ${
                            showAddMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                        } ${itemIsAdded ? 'bg-emerald-50' : ''}`}
                        draggable={!showAddMode}
                        onDragStart={(e) => !showAddMode && onDragStart(e, item)}
                        onClick={() => showAddMode && toggleItemOnAgent(item)}
                    >
                        {showAddMode && (
                            <div className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors ${
                                itemIsAdded
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-200 text-slate-500'
                            }`}>
                                {itemIsAdded ? <Check size={12} /> : <Plus size={12} />}
                            </div>
                        )}
                        {getIcon(item)}
                        <div className="flex flex-col overflow-hidden flex-1">
                            <span
                                className={`text-sm truncate ${itemIsAdded ? 'text-emerald-700 font-medium' : 'text-slate-700'}`}
                                title={item.description}
                            >
                                {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">{item.path.split('/').slice(-3, -1).join('/')}</span>
                        </div>
                    </div>
                );
            })}
        </div>
      );
    }

    // Default Tree View - show filtered category's children
    return (
        <div className="py-2">
            {filteredInventory.map(item => (
                <FileTreeItem
                    key={item.id}
                    item={item}
                    onDragStart={onDragStart}
                    addMode={!!showAddMode}
                    isAdded={isItemAdded(item.name)}
                    onAddClick={toggleItemOnAgent}
                />
            ))}
        </div>
    );
  };

  if (isLoading) return (
    <div className="w-64 border-r bg-white flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="animate-spin" />
            <span className="text-sm">Loading Library...</span>
        </div>
    </div>
  );

  if (error) return (
    <div className="w-64 border-r bg-white p-4 text-red-500 text-sm">
      Failed to load inventory. Is the server running?
    </div>
  );

  // Show add mode header when applicable
  const showAddModeHeader = addToAgentMode && selectedNode && configKey;

  // Render draggable node template card
  const renderNodeTemplateCard = (template: NodeTemplate) => {
    const colorClasses: Record<string, string> = {
      orange: 'border-orange-200 bg-orange-50 hover:border-orange-400',
      teal: 'border-teal-200 bg-teal-50 hover:border-teal-400',
      violet: 'border-violet-200 bg-violet-50 hover:border-violet-400',
      blue: 'border-blue-200 bg-blue-50 hover:border-blue-400',
      green: 'border-green-200 bg-green-50 hover:border-green-400',
      pink: 'border-pink-200 bg-pink-50 hover:border-pink-400',
      slate: 'border-slate-200 bg-slate-50 hover:border-slate-400',
    };
    const iconColorClasses: Record<string, string> = {
      orange: 'text-orange-600',
      teal: 'text-teal-600',
      violet: 'text-violet-600',
      blue: 'text-blue-600',
      green: 'text-green-600',
      pink: 'text-pink-600',
      slate: 'text-slate-600',
    };

    return (
      <div
        key={template.type}
        draggable
        onDragStart={(e) => onTemplateDragStart(e, template)}
        className={`p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-colors ${colorClasses[template.color] || colorClasses.slate}`}
      >
        <div className="flex items-center gap-2">
          <span className={iconColorClasses[template.color] || iconColorClasses.slate}>
            {template.icon}
          </span>
          <span className="text-sm font-medium text-slate-700">{template.label}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{template.description}</p>
      </div>
    );
  };

  // Render the Create Nodes section
  const renderNodeTemplates = () => (
    <div className="p-3 border-b bg-slate-50">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Create Nodes
      </h3>

      {/* Container Nodes */}
      <div className="mb-3">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Containers</div>
        <div className="space-y-1.5">
          {containerNodeTemplates.map(renderNodeTemplateCard)}
        </div>
      </div>

      {/* Component Nodes */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Components</div>
        <div className="space-y-1.5">
          {componentNodeTemplates.map(renderNodeTemplateCard)}
        </div>
      </div>
    </div>
  );

  return (
    <aside className="w-64 border-r bg-white flex flex-col h-full z-10 shadow-sm shrink-0">
      <div className="p-4 border-b">
        {showAddModeHeader ? (
          <>
            {/* Add mode header */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleExitAddMode}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <ArrowLeft size={16} className="text-slate-500" />
              </button>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">{libraryCategory}</h2>
                <p className="text-xs text-indigo-600">
                  Add to: <span className="font-medium">{selectedNode.data.label || selectedNode.id}</span>
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 mb-3 bg-indigo-50 p-2 rounded">
              Click [+] to add items to this agent's {configKey}
            </div>
          </>
        ) : (
          <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wider mb-3">{libraryCategory}</h2>
        )}
        <div className="relative">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
            <input
                type="text"
                placeholder="Search components..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Show node templates only when not in add mode */}
        {!showAddModeHeader && renderNodeTemplates()}
        {renderContent()}
      </div>
    </aside>
  );
};