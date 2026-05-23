import React, { useEffect, useRef } from 'react';
import { Terminal, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';
import { useExecutionLogs } from '../hooks/useWebSocket';
import { ExecutionLog } from '../types';

interface ExecutionLogsProps {
  executionId?: string;
  autoScroll?: boolean;
}

const LogLevelIcon: React.FC<{ level: ExecutionLog['level'] }> = ({ level }) => {
  switch (level) {
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case 'warn':
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case 'debug':
      return <Bug className="w-4 h-4 text-primary-400" />;
    default:
      return <Info className="w-4 h-4 text-accent-blue" />;
  }
};

const LogEntry: React.FC<{ log: ExecutionLog }> = ({ log }) => {
  const getLevelClass = () => {
    switch (log.level) {
      case 'error':
        return 'border-l-red-400 bg-red-500/10';
      case 'warn':
        return 'border-l-yellow-400 bg-yellow-500/10';
      case 'debug':
        return 'border-l-primary-400 bg-primary-500/10';
      default:
        return 'border-l-accent-blue bg-accent-blue/10';
    }
  };

  // Check if message contains newlines for multi-line output
  const isMultiLine = log.message.includes('\n');

  return (
    <div className={`flex gap-3 p-3 border-l-4 rounded-r-lg ${getLevelClass()} font-mono text-sm transition-all duration-200 hover:bg-opacity-20`}>
      <LogLevelIcon level={log.level} />
      <span className="text-text-muted min-w-[80px] font-medium self-start">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <div className="flex-1 text-text-primary">
        {isMultiLine ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm m-0">{log.message}</pre>
        ) : (
          <span className="break-all">{log.message}</span>
        )}
      </div>
    </div>
  );
};

export const ExecutionLogs: React.FC<ExecutionLogsProps> = ({
  executionId,
  autoScroll = true,
}) => {
  const { logs, status, isConnected, clearLogs } = useExecutionLogs(executionId);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getStatusBadge = () => {
    if (!status) return null;

    const statusColors = {
      running: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
      completed: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    return (
      <div
        data-testid="execution-status"
        className={`px-4 py-1.5 rounded-full text-xs font-medium border ${statusColors[status.status]}`}
      >
        {status.status.toUpperCase()}
        {status.exitCode !== undefined && ` (Exit: ${status.exitCode})`}
      </div>
    );
  };

  return (
    <div className="glass rounded-2xl shadow-card overflow-hidden border border-primary-500/20">
      {/* Header */}
      <div className="relative bg-background-dark border-b border-primary-500/20">
        <div className="absolute inset-0 bg-gradient-purple opacity-5"></div>
        <div className="relative px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-accent-cyan" />
            <h3 className="font-heading font-bold text-text-primary text-lg">Execution Logs</h3>
            {isConnected ? (
              <span className="text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1 rounded-full">
                ● Connected
              </span>
            ) : (
              <span className="text-xs bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1 rounded-full animate-pulse">
                ● Disconnected
              </span>
            )}
            <span className="text-xs text-text-muted">
              ({logs.length} logs)
            </span>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <button
              onClick={clearLogs}
              className="text-sm bg-background-slate/50 hover:bg-background-slate text-text-secondary hover:text-text-primary px-4 py-2 rounded-lg transition-all duration-300 border border-primary-500/20 hover:border-primary-500/40"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={containerRef}
        data-testid="log-stream"
        className="h-96 overflow-y-auto bg-background-card p-4 space-y-2"
        role="log"
        aria-label="Execution logs"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <Terminal className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-50" />
              <p className="text-lg">No logs yet. Execute a neuron to see logs.</p>
            </div>
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>

      {/* Footer */}
      {status && (
        <div className="bg-background-dark px-6 py-3 text-xs text-text-secondary border-t border-primary-500/20">
          <div className="flex justify-between font-medium">
            <span>Started: {new Date(status.startTime).toLocaleString()}</span>
            {status.endTime && (
              <span>
                Duration:{' '}
                {Math.round(
                  (new Date(status.endTime).getTime() - new Date(status.startTime).getTime()) /
                    1000
                )}
                s
              </span>
            )}
          </div>
          {status.error && (
            <div className="mt-2 text-red-300 font-medium bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              Error: {status.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
