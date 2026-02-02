// =============================================================================
// Headless Session Hook
// Integrates socket events with Zustand store for canvas manipulation
// =============================================================================

import { useCallback, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { useSocket, UseSocketReturn } from './useSocket';
import useStore from '../store/useStore';
import {
  CanvasNodePayload,
  CanvasNodeUpdatePayload,
  CanvasEdgePayload,
  SessionMessage,
  SessionState,
} from '../../shared/socket-events';

// =============================================================================
// Phase 5: Smart Sizing & Agent Defaults
// =============================================================================

// Smart sizing based on container type - prevents "sardine can" effect
const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  DEPARTMENT: { width: 1800, height: 1000 }, // Large canvas for whole team
  AGENT_POOL: { width: 500, height: 800 },   // Tall column for vertical stacking
  DEFAULT: { width: 400, height: 300 },      // Fallback for other containers
};

// Default config so agents are immediately runnable
const AGENT_DEFAULTS = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-latest',
  temperature: 0.7,
  role: 'executor',
};

// Map NodeType to React Flow component type
const nodeTypeToComponent: Record<string, string> = {
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

// Container types that need special sizing
const CONTAINER_TYPES = ['DEPARTMENT', 'AGENT_POOL'];

export interface UseHeadlessSessionReturn extends UseSocketReturn {
  // Additional session-specific methods can be added here
}

export function useHeadlessSession(): UseHeadlessSessionReturn {
  const {
    nodes,
    edges,
    addNode,
    setNodes,
    setEdges,
    updateNodeData,
  } = useStore();

  // Handle node created from server
  const handleNodeCreated = useCallback((payload: CanvasNodePayload) => {
    // 1. Normalize type to UPPERCASE_UNDERSCORE format
    const normalizedType = payload.type.toUpperCase().replace(/-/g, '_');

    // 2. Resolve React Flow component type (fallback to 'customNode' prevents crash)
    const componentType = nodeTypeToComponent[normalizedType] || 'customNode';

    // 3. Smart sizing based on type
    const size = DEFAULT_SIZES[normalizedType] || DEFAULT_SIZES.DEFAULT;
    const isContainer = CONTAINER_TYPES.includes(normalizedType);
    const isAgent = normalizedType === 'AGENT';

    // ✅ Phase 5 Fix: Robust config extraction - handle nested or flat data
    const incomingConfig = payload.data?.config || payload.data || {};

    const newNode: Node = {
      id: payload.nodeId,
      type: componentType,
      position: payload.position,
      parentId: payload.parentId,
      extent: payload.parentId ? 'parent' : undefined,
      expandParent: payload.parentId ? true : undefined,

      data: {
        // ✅ CRITICAL: Spread payload.data FIRST so our fixes override it
        ...payload.data,

        label: payload.label,
        // ✅ FIX: Explicitly set 'type' key expected by PropertiesPanel
        type: normalizedType,
        // ✅ Phase 5 Fix: Inject agent defaults so they're immediately runnable
        config: isAgent
          ? { ...AGENT_DEFAULTS, ...incomingConfig }
          : incomingConfig,
      },

      // ✅ Phase 5 Fix: Smart container sizing (1800px for Departments, 500x800 for Pools)
      style: isContainer
        ? { width: size.width, height: size.height, ...(payload as any).style }
        : (payload as any).style,
    };

    // ✅ Phase 5 Fix: Use Zustand store's addNode for state management
    addNode(newNode);
    console.log(`[Headless] Node created: ${payload.nodeId} (type: ${normalizedType}, component: ${componentType})`);
  }, [addNode]);

  // Handle node updated from server
  const handleNodeUpdated = useCallback((payload: CanvasNodeUpdatePayload) => {
    const { nodeId, changes } = payload;

    if (changes.position) {
      setNodes(
        nodes.map((node) =>
          node.id === nodeId
            ? { ...node, position: changes.position! }
            : node
        )
      );
    }

    if (changes.data || changes.label) {
      const dataUpdate: Record<string, unknown> = {};
      if (changes.data) Object.assign(dataUpdate, changes.data);
      if (changes.label) dataUpdate.label = changes.label;
      updateNodeData(nodeId, dataUpdate);
    }

    console.log(`[Headless] Node updated: ${nodeId}`);
  }, [nodes, setNodes, updateNodeData]);

  // Handle node deleted from server
  const handleNodeDeleted = useCallback((nodeId: string) => {
    setNodes(nodes.filter((node) => node.id !== nodeId));
    // Also remove edges connected to this node
    setEdges(
      edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      )
    );
    console.log(`[Headless] Node deleted: ${nodeId}`);
  }, [nodes, edges, setNodes, setEdges]);

  // Handle edge created from server
  const handleEdgeCreated = useCallback((payload: CanvasEdgePayload) => {
    const newEdge: Edge = {
      id: payload.edgeId,
      source: payload.sourceId,
      target: payload.targetId,
      // ✅ Phase 5 Fix: Use smoothstep for clean 90-degree routing (no spaghetti lines)
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#b1b1b7', strokeWidth: 2 },
      data: payload.data,
    };

    // ✅ Phase 5 Fix: Use Zustand store's setEdges for state management
    setEdges([...edges, newEdge]);
    console.log(`[Headless] Edge created: ${payload.edgeId}`);
  }, [edges, setEdges]);

  // Handle edge deleted from server
  const handleEdgeDeleted = useCallback((edgeId: string) => {
    setEdges(edges.filter((edge) => edge.id !== edgeId));
    console.log(`[Headless] Edge deleted: ${edgeId}`);
  }, [edges, setEdges]);

  // Handle session state changes
  const handleSessionStateChange = useCallback(
    (state: SessionState, previousState?: SessionState) => {
      console.log(`[Headless] Session state: ${previousState} → ${state}`);
    },
    []
  );

  // Handle session messages
  const handleSessionMessage = useCallback((message: SessionMessage) => {
    console.log(`[Headless] ${message.role}: ${message.content}`);
  }, []);

  // Handle execution progress
  const handleExecutionStepStart = useCallback(
    (stepName: string, stepOrder: number, totalSteps: number) => {
      console.log(`[Headless] Step ${stepOrder}/${totalSteps}: ${stepName}`);
    },
    []
  );

  const handleExecutionStepComplete = useCallback(
    (stepName: string, success: boolean, error?: string) => {
      if (success) {
        console.log(`[Headless] Step completed: ${stepName}`);
      } else {
        console.error(`[Headless] Step failed: ${stepName} - ${error}`);
      }
    },
    []
  );

  // Handle errors
  const handleError = useCallback((code: string, message: string) => {
    console.error(`[Headless] Error ${code}: ${message}`);
  }, []);

  // Initialize socket with handlers
  const socketReturn = useSocket({
    onNodeCreated: handleNodeCreated,
    onNodeUpdated: handleNodeUpdated,
    onNodeDeleted: handleNodeDeleted,
    onEdgeCreated: handleEdgeCreated,
    onEdgeDeleted: handleEdgeDeleted,
    onSessionStateChange: handleSessionStateChange,
    onSessionMessage: handleSessionMessage,
    onExecutionStepStart: handleExecutionStepStart,
    onExecutionStepComplete: handleExecutionStepComplete,
    onError: handleError,
  });

  // Sync canvas to server when nodes/edges change (debounced in real implementation)
  useEffect(() => {
    if (socketReturn.isConnected && socketReturn.sessionId) {
      // Only sync if we have an active session
      socketReturn.syncCanvas(nodes, edges);
    }
  }, [nodes, edges, socketReturn.isConnected, socketReturn.sessionId]);

  return socketReturn;
}
