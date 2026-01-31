// =============================================================================
// Headless Session Hook
// Integrates socket events with Zustand store for canvas manipulation
// =============================================================================

import { useCallback, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { useSocket, UseSocketReturn } from './useSocket';
import useStore from '../store/useStore';
import { NodeType } from '../types/core';
import {
  CanvasNodePayload,
  CanvasNodeUpdatePayload,
  CanvasEdgePayload,
  SessionMessage,
  SessionState,
} from '../../shared/socket-events';

// Map from socket node types to internal NodeType
const NODE_TYPE_MAP: Record<string, NodeType> = {
  agent: 'AGENT',
  skill: 'SKILL',
  plugin: 'PLUGIN',
  tool: 'TOOL',
  provider: 'PROVIDER',
  hook: 'HOOK',
  command: 'COMMAND',
  reasoning: 'REASONING',
  department: 'DEPARTMENT',
  'agent-pool': 'AGENT_POOL',
  'mcp-server': 'MCP_SERVER',
};

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
    const nodeType = NODE_TYPE_MAP[payload.type.toLowerCase()] || 'AGENT';

    const newNode: Node = {
      id: payload.nodeId,
      type: 'custom',
      position: payload.position,
      parentId: payload.parentId,
      extent: payload.parentId ? 'parent' : undefined,
      data: {
        label: payload.label,
        nodeType,
        ...payload.data,
      },
    };

    addNode(newNode);
    console.log(`[Headless] Node created: ${payload.nodeId}`);
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
      type: payload.edgeType || 'default',
      data: payload.data,
    };

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
