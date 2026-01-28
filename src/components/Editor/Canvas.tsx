import { useCallback, useRef, DragEvent, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Node,
  ConnectionMode,
  Connection,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import useStore from '../../store/useStore';
import { CustomNode } from './Nodes/CustomNode';
import { DepartmentNode } from './Nodes/DepartmentNode';
import { AgentPoolNode } from './Nodes/AgentPoolNode';
import { MCPServerNode } from './Nodes/MCPServerNode';
import { DataEdge, ControlEdge, EventEdge, DelegationEdge, FailoverEdge } from './Edges';
import { EdgeTypeSelector } from './EdgeTypeSelector';
import { NodeType, EdgeType, isContainerType } from '../../types/core';
import { Toolbar } from './Toolbar';
import { fetchComponentContent, BundleData, BundleComponent } from '../../services/api';

// Map bundle component categories to NodeTypes
const categoryToNodeType: Record<string, NodeType> = {
  agents: 'AGENT',
  commands: 'COMMAND',
  skills: 'SKILL',
  hooks: 'HOOK',
  departments: 'DEPARTMENT',
  'agent-pools': 'AGENT_POOL',
  'mcp-servers': 'MCP_SERVER',
};

// Map NodeType to React Flow node type string
const nodeTypeToComponent: Record<NodeType, string> = {
  AGENT: 'customNode',
  SKILL: 'customNode',
  PLUGIN: 'customNode',
  TOOL: 'customNode',
  PROVIDER: 'customNode',
  HOOK: 'customNode',
  COMMAND: 'customNode',
  REASONING: 'customNode',
  DEPARTMENT: 'departmentNode',
  AGENT_POOL: 'agentPoolNode',
  MCP_SERVER: 'mcpServerNode',
};

// Define the node types map outside component to prevent re-creation
const nodeTypes = {
  customNode: CustomNode,
  departmentNode: DepartmentNode,
  agentPoolNode: AgentPoolNode,
  mcpServerNode: MCPServerNode,
};

// Define edge types map
const edgeTypes = {
  data: DataEdge,
  control: ControlEdge,
  event: EventEdge,
  delegation: DelegationEdge,
  failover: FailoverEdge,
};

let id = 0;
const getId = () => `dndnode_${id++}`;
let edgeId = 0;
const getEdgeId = () => `edge_${edgeId++}`;

const CanvasContent = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // State for edge type selector popup
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [selectorPosition, setSelectorPosition] = useState<{ x: number; y: number } | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    setSelectedNode,
    setEdges,
  } = useStore();

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    async (event: DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');
      const filePath = event.dataTransfer.getData('application/filepath');
      const bundleDataStr = event.dataTransfer.getData('application/bundledata');

      if (!type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Handle bundle drop - create multiple nodes
      if (type === 'BUNDLE' && bundleDataStr) {
        try {
          const bundleData: BundleData = JSON.parse(bundleDataStr);

          // Collect all components from all categories
          const allComponents: (BundleComponent & { nodeType: NodeType })[] = [];

          (Object.keys(bundleData.components) as Array<keyof BundleData['components']>).forEach((cat) => {
            const comps = bundleData.components[cat];
            const nodeType = categoryToNodeType[cat] || 'AGENT';
            comps.forEach((comp) => {
              allComponents.push({ ...comp, nodeType });
            });
          });

          // Create nodes in a grid layout
          const GRID_COLS = 3;
          const SPACING = { x: 280, y: 180 };

          // Fetch content for all components in parallel
          const contentPromises = allComponents.map(async (comp) => {
            try {
              const content = await fetchComponentContent(comp.path);
              return content;
            } catch {
              return '';
            }
          });

          const contents = await Promise.all(contentPromises);

          // Create nodes
          allComponents.forEach((comp, index) => {
            const col = index % GRID_COLS;
            const row = Math.floor(index / GRID_COLS);

            const newNode: Node = {
              id: getId(),
              type: nodeTypeToComponent[comp.nodeType] || 'customNode',
              position: {
                x: position.x + col * SPACING.x,
                y: position.y + row * SPACING.y,
              },
              data: {
                label: comp.name,
                type: comp.nodeType,
                config: {
                  description: contents[index],
                },
              },
            };

            addNode(newNode);
          });
        } catch (err) {
          console.error('Failed to parse bundle data:', err);
        }
        return;
      }

      // Handle single component drop
      // Fetch markdown content if path is available
      let componentCode = '';
      if (filePath) {
        try {
          componentCode = await fetchComponentContent(filePath);
        } catch (err) {
          console.error('Failed to fetch component content:', err);
        }
      }

      const nodeType = type as NodeType;
      const newNode: Node = {
        id: getId(),
        type: nodeTypeToComponent[nodeType] || 'customNode',
        position,
        data: {
          label: label || `${type} Node`,
          type: nodeType,
          config: {
            description: componentCode, // Pre-populate with full markdown
          },
        },
        // Container nodes get default dimensions
        ...(isContainerType(nodeType) && {
          style: { width: 400, height: 300 },
        }),
      };

      addNode(newNode);
    },
    [reactFlowInstance, addNode]
  );

  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNode(nodes[0] || null);
  }, [setSelectedNode]);

  // Handle new connections - show edge type selector
  const handleConnect = useCallback((connection: Connection) => {
    // Find the target node to position the selector near it
    const targetNode = nodes.find(n => n.id === connection.target);
    if (targetNode && reactFlowInstance) {
      const screenPos = reactFlowInstance.flowToScreenPosition({
        x: targetNode.position.x,
        y: targetNode.position.y,
      });
      setSelectorPosition({ x: screenPos.x, y: screenPos.y });
      setPendingConnection(connection);
    } else {
      // Fallback: create edge with default type
      const newEdge = {
        ...connection,
        id: getEdgeId(),
        type: 'data' as EdgeType,
      };
      setEdges(addEdge(newEdge, edges));
    }
  }, [nodes, edges, reactFlowInstance, setEdges]);

  // Handle edge type selection
  const handleEdgeTypeSelect = useCallback((edgeType: EdgeType) => {
    if (pendingConnection) {
      const newEdge = {
        ...pendingConnection,
        id: getEdgeId(),
        type: edgeType,
      };
      setEdges(addEdge(newEdge, edges));
      setPendingConnection(null);
      setSelectorPosition(null);
    }
  }, [pendingConnection, edges, setEdges]);

  // Cancel edge type selection
  const handleEdgeTypeCancel = useCallback(() => {
    setPendingConnection(null);
    setSelectorPosition(null);
  }, []);

  return (
    <div className="flex-grow h-full relative" ref={reactFlowWrapper}>
      {/* Canvas Background Pattern */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      <Toolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="bg-transparent"
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls
          className="bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200 rounded-xl overflow-hidden"
          showInteractive={false}
        />
        <MiniMap
          className="border border-slate-200 shadow-xl rounded-xl overflow-hidden bg-white/95 backdrop-blur-sm"
          nodeColor={(node) => {
            switch (node.data.type) {
              case 'AGENT': return '#3b82f6';
              case 'SKILL': return '#22c55e';
              case 'TOOL': return '#f59e0b';
              case 'PLUGIN': return '#a855f7';
              case 'DEPARTMENT': return '#f97316';
              case 'AGENT_POOL': return '#14b8a6';
              case 'MCP_SERVER': return '#8b5cf6';
              case 'HOOK': return '#ec4899';
              case 'COMMAND': return '#64748b';
              case 'PROVIDER': return '#06b6d4';
              default: return '#64748b';
            }
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
        />
      </ReactFlow>

      {/* Edge Type Selector Popup */}
      {selectorPosition && (
        <EdgeTypeSelector
          position={selectorPosition}
          onSelect={handleEdgeTypeSelect}
          onCancel={handleEdgeTypeCancel}
        />
      )}
    </div>
  );
};

export const Canvas = () => (
  <ReactFlowProvider>
    <CanvasContent />
  </ReactFlowProvider>
);
