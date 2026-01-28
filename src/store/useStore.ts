import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import { EdgeType } from '../types/core';
import { needsMigration, migrateWorkflow } from '../utils/workflowMigration';

export interface WorkflowConfig {
  name: string;
  description: string;
  framework: 'claude-code' | 'langchain' | 'autogen' | 'custom';
  skillFormat: 'markdown' | 'yaml' | 'json';
}

interface StoreState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  libraryCategory: string;
  addToAgentMode: boolean;
  workflowConfig: WorkflowConfig;
  isConfigModalOpen: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  setSelectedNode: (node: Node | null) => void;
  updateNodeData: (nodeId: string, newData: any) => void;
  setLibraryCategory: (category: string, addToAgentMode?: boolean) => void;
  // Workflow config
  setWorkflowConfig: (config: Partial<WorkflowConfig>) => void;
  setConfigModalOpen: (open: boolean) => void;
  // Hierarchy helpers
  addChildNode: (parentId: string, node: Node) => void;
  moveNodeToParent: (nodeId: string, parentId: string | null) => void;
  getChildNodes: (parentId: string) => Node[];
  // Edge type helper
  setEdgeType: (edgeId: string, edgeType: EdgeType) => void;
}

const useStore = create<StoreState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  libraryCategory: 'agents',
  addToAgentMode: false,
  workflowConfig: {
    name: 'Untitled Workflow',
    description: '',
    framework: 'claude-code',
    skillFormat: 'markdown',
  },
  isConfigModalOpen: false,

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  setNodes: (nodes) => {
    // Apply migration for legacy workflows if needed
    const migratedNodes = needsMigration(nodes) ? migrateWorkflow(nodes) : nodes;
    set({ nodes: migratedNodes });
  },
  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          // If this is the selected node, update it as well
          const updatedNode = { ...node, data: { ...node.data, ...newData } };
          if (get().selectedNode?.id === nodeId) {
             set({ selectedNode: updatedNode });
          }
          return updatedNode;
        }
        return node;
      }),
    });
  },

  setLibraryCategory: (category, addToAgentMode = false) => {
    set({ libraryCategory: category, addToAgentMode });
  },

  setWorkflowConfig: (config) => {
    set({ workflowConfig: { ...get().workflowConfig, ...config } });
  },

  setConfigModalOpen: (open) => {
    set({ isConfigModalOpen: open });
  },

  // Hierarchy helpers for container nodes (Department, Agent Pool)
  addChildNode: (parentId, node) => {
    // Add node as child of parent with proper React Flow hierarchy setup
    const childNode: Node = {
      ...node,
      parentId,
      extent: 'parent', // Constrain to parent bounds
      expandParent: true, // Allow parent to expand when dragged to edge
    };
    set({ nodes: [...get().nodes, childNode] });
  },

  moveNodeToParent: (nodeId, parentId) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          if (parentId === null) {
            // Remove from parent - create new object without parentId/extent
            const { parentId: _, extent: __, expandParent: ___, ...rest } = node;
            return rest as Node;
          }
          // Move to new parent
          return {
            ...node,
            parentId,
            extent: 'parent' as const,
            expandParent: true,
          };
        }
        return node;
      }),
    });
  },

  getChildNodes: (parentId) => {
    return get().nodes.filter((node) => node.parentId === parentId);
  },

  // Edge type helper for typed connections
  setEdgeType: (edgeId, edgeType) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            type: edgeType,
            data: { ...edge.data, edgeType },
          };
        }
        return edge;
      }),
    });
  },
}));

export default useStore;