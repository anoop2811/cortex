export interface Neuron {
  id: string;
  name: string;
  description: string;
  type: string;
  path: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionLog {
  id: string;
  neuronId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface ExecutionStatus {
  id: string;
  neuronId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  exitCode?: number;
  error?: string;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
}

// React Flow compatible node type
export interface SynapseNode {
  id: string;
  type: 'neuron' | 'input' | 'output';
  neuronId: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    description?: string;
    neuronId?: string;
  };
}

// React Flow compatible edge/connection type
export interface SynapseConnection {
  id: string;
  source: string;
  target: string;
  type?: 'data' | 'control';
  sourceHandle?: string; // Handle/port on source node
  targetHandle?: string; // Handle/port on target node
}

export interface Synapse {
  id: string;
  name: string;
  description: string;
  nodes: SynapseNode[];
  connections: SynapseConnection[];
  createdAt: string;
  updatedAt: string;
}

export interface WebSocketMessage {
  type: 'log' | 'status' | 'metrics';
  timestamp: string;
  data: any;
  payload?: any; // For backwards compatibility
}
