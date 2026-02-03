// =============================================================================
// Terminal Panel Component
// Phase 6: Displays streaming execution logs from the runtime system
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Play, Square, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import useStore from '../../store/useStore';

interface LogEntry {
  id: string;
  timestamp: number;
  output: string;
  stream: 'stdout' | 'stderr';
}

export const TerminalPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { nodes, edges } = useStore();

  // Socket connection
  const { isConnected, sessionId, socket } = useSocket();

  // Listen for execution logs
  useEffect(() => {
    if (!socket) return;

    const handleExecutionLog = (payload: { output: string; stream?: 'stdout' | 'stderr'; timestamp?: number }) => {
      const entry: LogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: payload.timestamp || Date.now(),
        output: payload.output,
        stream: payload.stream || 'stdout',
      };
      setLogs(prev => [...prev, entry]);
      setIsExpanded(true); // Auto-open on activity
    };

    socket.on('execution:log', handleExecutionLog);
    return () => {
      socket.off('execution:log', handleExecutionLog);
    };
  }, [socket]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (isExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const handleRun = useCallback(() => {
    if (!isConnected || !socket || !sessionId) {
      console.warn('[Terminal] Cannot run: not connected');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setIsExpanded(true);

    // Emit system:start event with current canvas state
    socket.emit('system:start', {
      sessionId,
      nodes: nodes.map(n => ({
        id: n.id,
        data: n.data,
        type: n.type,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        data: e.data,
      })),
    });
  }, [isConnected, socket, sessionId, nodes, edges]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (socket && sessionId) {
      socket.emit('system:stop', { sessionId });
    }
  }, [socket, sessionId]);

  const handleClear = useCallback(() => {
    setLogs([]);
  }, []);

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Collapsed bar at bottom
  if (!isExpanded) {
    return (
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-slate-300
                     rounded-t-lg hover:bg-slate-800 transition-colors shadow-lg
                     border border-slate-700 border-b-0"
        >
          <Terminal size={16} className="text-emerald-400" />
          <span className="text-sm font-mono">Terminal</span>
          <ChevronUp size={16} />
          {logs.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded text-xs font-mono">
              {logs.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-10 left-4 right-4 z-40">
      <div className="bg-slate-900 rounded-t-lg shadow-2xl border border-slate-700 border-b-0 overflow-hidden max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Terminal size={16} className="text-emerald-400" />
            <span className="text-sm font-mono text-slate-300">Runtime Terminal</span>
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Run/Stop button */}
            {!isRunning ? (
              <button
                onClick={handleRun}
                disabled={!isConnected || nodes.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600
                           hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed
                           text-white text-sm rounded transition-colors font-medium"
                title={nodes.length === 0 ? 'Add nodes to canvas first' : 'Run system simulation'}
              >
                <Play size={14} />
                Run System
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600
                           hover:bg-red-500 text-white text-sm rounded transition-colors font-medium"
              >
                <Square size={14} />
                Stop
              </button>
            )}

            {/* Clear */}
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
              title="Clear logs"
            >
              <Trash2 size={16} className="text-slate-400 hover:text-slate-200" />
            </button>

            {/* Collapse */}
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
              title="Minimize terminal"
            >
              <ChevronDown size={16} className="text-slate-400 hover:text-slate-200" />
            </button>
          </div>
        </div>

        {/* Log output area */}
        <div className="h-48 overflow-y-auto p-3 font-mono text-sm bg-[#0d1117]">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              <Terminal size={24} className="mx-auto mb-2 opacity-50" />
              <p>No output yet.</p>
              <p className="text-xs mt-1">Click "Run System" to start simulation.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`flex gap-2 py-0.5 hover:bg-slate-800/30 px-1 -mx-1 rounded ${
                  log.stream === 'stderr' ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                <span className="text-slate-600 select-none shrink-0">
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <span className="whitespace-pre-wrap break-all">
                  {log.output.startsWith('>') || log.output.startsWith('[') ? (
                    <span className={log.output.includes('ERROR') || log.output.includes('WARN')
                      ? log.output.includes('ERROR') ? 'text-red-400' : 'text-yellow-400'
                      : log.output.startsWith('>') ? 'text-blue-400' : 'text-emerald-400'
                    }>
                      {log.output}
                    </span>
                  ) : (
                    log.output
                  )}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default TerminalPanel;
