import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage, ExecutionLog, ExecutionStatus } from '../types';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const {
    url,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number>();

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    try {
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = url.startsWith('ws') ? url : `${protocol}//${window.location.host}${url}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          console.log('Raw WebSocket message:', event.data);
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('Parsed WebSocket message:', message);
          setLastMessage(message);

          // Wrap onMessage in try-catch to prevent errors from closing connection
          try {
            onMessage?.(message);
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        onDisconnect?.();

        // Attempt reconnection
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, reconnect, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
};

export const useExecutionLogs = (executionId?: string) => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [status, setStatus] = useState<ExecutionStatus | null>(null);

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      try {
        console.log('ExecutionLogs handling message:', message);

        // Backend uses 'data' field, not 'payload'
        const messageData = message.data || message.payload;

        if (!messageData) {
          console.warn('No data in message:', message);
          return;
        }

        if (message.type === 'log') {
          const logData = messageData as any;
          const log: ExecutionLog = {
            id: `${Date.now()}-${Math.random()}`,
            neuronId: logData.executionId || logData.ExecutionID || '',
            timestamp: message.timestamp || new Date().toISOString(),
            level: (logData.level || logData.Level || 'info') as 'info' | 'warn' | 'error' | 'debug',
            message: logData.message || logData.Message || JSON.stringify(logData),
          };

          console.log('Processing log:', log, 'executionId filter:', executionId);

          // Show all logs if no executionId filter, or match executionId
          if (!executionId || log.neuronId === executionId || !log.neuronId) {
            console.log('Adding log to display');
            setLogs((prev) => [...prev, log]);
          } else {
            console.log('Skipping log - executionId mismatch');
          }
        } else if (message.type === 'status') {
          const statusData = messageData as any;
          console.log('Processing status:', statusData);
          const newStatus: ExecutionStatus = {
            id: statusData.executionId || statusData.ExecutionID || '',
            neuronId: statusData.executionId || statusData.ExecutionID || '',
            status: (statusData.status || statusData.Status || 'running') as 'running' | 'completed' | 'failed',
            startTime: new Date().toISOString(),
          };

          if (!executionId || newStatus.neuronId === executionId || !newStatus.neuronId) {
            setStatus(newStatus);
          }
        }
      } catch (error) {
        console.error('Error in handleMessage:', error, 'Message:', message);
      }
    },
    [executionId]
  );

  const { isConnected, sendMessage } = useWebSocket({
    url: '/ws',
    onMessage: handleMessage,
  });

  const clearLogs = useCallback(() => {
    setLogs([]);
    setStatus(null);
  }, []);

  return {
    logs,
    status,
    isConnected,
    clearLogs,
    sendMessage,
  };
};
