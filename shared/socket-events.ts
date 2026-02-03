// =============================================================================
// Socket.io Event Types (Shared between Server and Client)
// =============================================================================

// -----------------------------------------------------------------------------
// Session Events
// -----------------------------------------------------------------------------

export type SessionState =
  | 'idle'
  | 'routing'      // Supervisor analyzing intent
  | 'planning'     // Architect generating plan
  | 'executing'    // Builder executing steps
  | 'paused'
  | 'completed'
  | 'error';

export interface SessionMessage {
  id: string;
  role: 'user' | 'supervisor' | 'architect' | 'builder' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    intent?: string;
    planId?: string;
    stepId?: string;
  };
}

export interface SessionStatePayload {
  sessionId: string;
  state: SessionState;
  previousState?: SessionState;
}

export interface SessionMessagePayload {
  sessionId: string;
  message: SessionMessage;
}

// -----------------------------------------------------------------------------
// Canvas Events
// -----------------------------------------------------------------------------

export interface CanvasNodePayload {
  nodeId: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  parentId?: string;
  data?: Record<string, unknown>;
}

export interface CanvasNodeUpdatePayload {
  nodeId: string;
  changes: {
    position?: { x: number; y: number };
    data?: Record<string, unknown>;
    label?: string;
  };
}

export interface CanvasEdgePayload {
  edgeId: string;
  sourceId: string;
  targetId: string;
  edgeType?: string;
  data?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Execution Events
// -----------------------------------------------------------------------------

export interface ExecutionStepPayload {
  sessionId: string;
  planId: string;
  stepId: string;
  stepName: string;
  stepOrder: number;
  totalSteps: number;
}

export interface ExecutionStepResultPayload extends ExecutionStepPayload {
  success: boolean;
  result?: unknown;
  error?: string;
  createdNodeId?: string;
  createdEdgeId?: string;
}

export interface ExecutionLogPayload {
  sessionId: string;
  output: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

// -----------------------------------------------------------------------------
// Server to Client Events
// -----------------------------------------------------------------------------

export interface ServerToClientEvents {
  // Session events
  'session:stateChange': (payload: SessionStatePayload) => void;
  'session:message': (payload: SessionMessagePayload) => void;

  // Canvas events
  'node:created': (payload: CanvasNodePayload) => void;
  'node:updated': (payload: CanvasNodeUpdatePayload) => void;
  'node:deleted': (payload: { nodeId: string }) => void;
  'edge:created': (payload: CanvasEdgePayload) => void;
  'edge:deleted': (payload: { edgeId: string }) => void;

  // Execution events
  'execution:stepStart': (payload: ExecutionStepPayload) => void;
  'execution:stepComplete': (payload: ExecutionStepResultPayload) => void;
  'execution:planComplete': (payload: { sessionId: string; planId: string; success: boolean }) => void;
  'execution:log': (payload: ExecutionLogPayload) => void;

  // Error events
  'error': (payload: { code: string; message: string; details?: unknown }) => void;
}

// -----------------------------------------------------------------------------
// Client to Server Events
// -----------------------------------------------------------------------------

export interface ClientToServerEvents {
  // Session events
  'session:start': (callback: (sessionId: string) => void) => void;
  'session:message': (payload: { sessionId: string; content: string }) => void;
  'session:cancel': (payload: { sessionId: string }) => void;

  // Execution control
  'execution:pause': (payload: { sessionId: string }) => void;
  'execution:resume': (payload: { sessionId: string }) => void;

  // Canvas sync (client informing server of manual changes)
  'canvas:sync': (payload: { nodes: unknown[]; edges: unknown[] }) => void;

  // Phase 6: Runtime control
  'system:start': (payload: { sessionId: string; nodes: unknown[]; edges: unknown[] }) => void;
  'system:stop': (payload: { sessionId: string }) => void;
}

// -----------------------------------------------------------------------------
// Inter-Server Events (for internal use)
// -----------------------------------------------------------------------------

export interface InterServerEvents {
  ping: () => void;
}

// -----------------------------------------------------------------------------
// Socket Data (per-connection state)
// -----------------------------------------------------------------------------

export interface SocketData {
  sessionId?: string;
}
