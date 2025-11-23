import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ReactFlow,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Plus, Trash2, Network } from 'lucide-react';
import { Synapse, Neuron } from '../types';
import { apiClient } from '../api/client';

// Custom Node Component with connection handles/ports (VERTICAL FLOW)
const NeuronNode: React.FC<NodeProps> = ({ data, selected }) => {
  const label = data.label as string;
  const description = data.description as string | undefined;

  return (
    <div
      className={`px-6 py-4 glass border-2 rounded-xl shadow-card-hover transition-all duration-200 w-[160px] ${
        selected
          ? 'border-accent-cyan ring-2 ring-accent-cyan/50 scale-105'
          : 'border-primary-500/40 hover:border-primary-500/60'
      }`}
    >
      {/* Input Handle (Port) - TOP for downward flow */}
      <Handle
        type="target"
        position={Position.Top}
        id="input-1"
        className="w-3 h-3 !bg-accent-cyan border-2 border-white"
        style={{ top: -6 }}
      />

      <div className="font-heading font-semibold text-sm text-text-primary text-center">
        {label}
      </div>
      {description && (
        <div className="text-xs text-text-secondary mt-1 text-center truncate">{description}</div>
      )}

      {/* Output Handle (Port) - BOTTOM for downward flow */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output-1"
        className="w-3 h-3 !bg-primary-500 border-2 border-white"
        style={{ bottom: -6 }}
      />
    </div>
  );
};

const nodeTypes = {
  neuron: NeuronNode,
};

interface DraggableNeuronProps {
  neuron: Neuron;
}

const DraggableNeuron: React.FC<DraggableNeuronProps> = ({ neuron }) => {
  const onDragStart = (event: React.DragEvent, neuron: Neuron) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(neuron));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, neuron)}
      className="p-3 glass border-2 border-primary-500/30 hover:border-primary-500/60 rounded-xl cursor-move transition-all duration-300 opacity-100 hover:scale-105"
    >
      <div className="font-heading font-semibold text-sm text-text-primary">{neuron.name}</div>
      <div className="text-xs text-text-secondary mt-1">{neuron.type}</div>
    </div>
  );
};

interface SynapseBuilderProps {
  neurons: Neuron[];
  onSave?: (synapse: Partial<Synapse>) => void;
}

export const SynapseBuilder: React.FC<SynapseBuilderProps> = ({ neurons, onSave }) => {
  const location = useLocation();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [synapseName, setSynapseName] = useState('');
  const [synapseDescription, setSynapseDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load synapse if passed via navigation state
  useEffect(() => {
    const synapse = (location.state as any)?.synapse as Synapse | undefined;

    if (synapse) {
      console.log('Loading synapse:', synapse);
      console.log('Synapse nodes:', synapse.nodes);
      console.log('Synapse connections:', synapse.connections);

      try {
        // Convert synapse nodes to ReactFlow nodes
        const reactFlowNodes: Node[] = synapse.nodes.map((node) => {
          console.log('Converting node:', node);
          return {
            id: node.id,
            type: 'neuron',
            position: {
              x: typeof node.position === 'object' ? (node.position as any).x : 0,
              y: typeof node.position === 'object' ? (node.position as any).y : 0,
            },
            data: {
              label: (node.data as any)?.label || 'Unknown',
              description: (node.data as any)?.description || '',
              neuronId: (node.data as any)?.neuronId || node.neuronId || '',
            },
          };
        });

        // Convert synapse connections to ReactFlow edges
        const reactFlowEdges: Edge[] = synapse.connections.map((conn) => ({
          id: conn.id,
          source: conn.source,
          target: conn.target,
          sourceHandle: conn.sourceHandle || 'output-1',
          targetHandle: conn.targetHandle || 'input-1',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#41E9E0', strokeWidth: 2 },
        }));

        console.log('Converted to ReactFlow nodes:', reactFlowNodes);
        console.log('Converted to ReactFlow edges:', reactFlowEdges);

        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
        setSynapseName(synapse.name);
        setSynapseDescription(synapse.description);
      } catch (error) {
        console.error('Error loading synapse:', error);
      }
    }
  }, [location.state, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle || 'output-1',
        targetHandle: connection.targetHandle || 'input-1',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#41E9E0', strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Expose onConnect and addNode for testing
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__synapseBuilder = {
        onConnect,
        addNode: (neuron: Neuron, position: { x: number; y: number }) => {
          const newNode: Node = {
            id: `node-${Date.now()}-${Math.random()}`,
            type: 'neuron',
            position,
            data: {
              label: neuron.name,
              description: neuron.description,
              neuronId: neuron.name,
            },
          };
          setNodes((nds) => nds.concat(newNode));
        },
        getNodes: () => nodes,
        getEdges: () => edges,
      };
    }
  }, [onConnect, nodes, edges, setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const neuronData = event.dataTransfer.getData('application/reactflow');

      if (!neuronData) return;

      const neuron = JSON.parse(neuronData) as Neuron;

      setNodes((nds) => {
        // Calculate position: top-center instead of mouse position
        // Place at top of canvas (y=50) and center horizontally
        const position = {
          x: (reactFlowBounds.width / 2) - 80, // Center (subtract half node width ~160px)
          y: 50 + (nds.length * 120), // Stack vertically with 120px spacing
        };

        const newNode: Node = {
          id: `node-${Date.now()}`,
          type: 'neuron',
          position,
          data: {
            label: neuron.name,
            description: neuron.description,
            neuronId: neuron.name, // Neurons use 'name' as ID
          },
        };

        return nds.concat(newNode);
      });
    },
    [setNodes]
  );

  const handleSave = async () => {
    if (!synapseName.trim()) {
      alert('Please enter a synapse name');
      return;
    }

    // Convert React Flow nodes/edges to backend format
    const synapseNodes = nodes.map((node) => ({
      id: node.id,
      type: (node.type || 'neuron') as 'neuron' | 'input' | 'output',
      neuronId: node.data.neuronId as string || '',
      position: {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      },
      data: {
        label: node.data.label as string || '',
        description: (node.data.description as string) || '',
      },
    }));

    const connections = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'data' as 'data' | 'control',
      sourceHandle: edge.sourceHandle || 'output-1',
      targetHandle: edge.targetHandle || 'input-1',
    }));

    const synapse = {
      name: synapseName,
      description: synapseDescription,
      nodes: synapseNodes,
      connections,
    };

    try {
      setIsSaving(true);
      const saved = await apiClient.createSynapse(synapse);
      onSave?.(saved);
      alert(`Synapse saved successfully with ${connections.length} connection(s)!`);
    } catch (error) {
      console.error('Failed to save synapse:', error);
      alert('Failed to save synapse');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    setSynapseName('');
    setSynapseDescription('');
  };

  return (
    <div className="glass rounded-2xl shadow-card overflow-hidden border border-primary-500/20">
      {/* Header */}
      <div className="relative bg-gradient-purple">
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-7 h-7 text-white" />
              <h2 className="text-2xl font-heading font-bold text-white">Visual Synapse Builder</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-pill transition-all duration-300 text-white font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || nodes.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-primary-600 hover:bg-gray-100 rounded-pill transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Synapse Info */}
        <div className="mb-6 space-y-3">
          <input
            type="text"
            value={synapseName}
            onChange={(e) => setSynapseName(e.target.value)}
            placeholder="Synapse name..."
            className="w-full px-5 py-3 bg-background-card border-2 border-primary-500/30 focus:border-primary-500 rounded-xl text-text-primary placeholder-text-muted focus:outline-none transition-colors"
            aria-label="Synapse name"
          />
          <textarea
            value={synapseDescription}
            onChange={(e) => setSynapseDescription(e.target.value)}
            placeholder="Description (optional)..."
            rows={2}
            className="w-full px-5 py-3 bg-background-card border-2 border-primary-500/30 focus:border-primary-500 rounded-xl text-text-primary placeholder-text-muted focus:outline-none transition-colors resize-none"
            aria-label="Synapse description"
          />
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Neuron Palette */}
          <div className="col-span-1">
            <div
              data-testid="neuron-palette"
              className="bg-background-card rounded-xl p-5 border-2 border-dashed border-primary-500/30"
            >
              <h3 className="font-heading font-bold text-text-primary mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent-cyan" />
                Neuron Palette
              </h3>
              <div className="space-y-3">
                {neurons.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">No neurons available</p>
                ) : (
                  neurons.map((neuron) => (
                    <DraggableNeuron key={neuron.id} neuron={neuron} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* React Flow Canvas */}
          <div className="col-span-3">
            <div
              className="bg-background-card rounded-xl border-2 border-dashed border-primary-500/30 h-[600px] overflow-hidden"
              data-testid="synapse-canvas"
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                fitView
                className="bg-background-card"
              >
                <Background color="#41E9E0" gap={16} />
                <Controls className="!bg-background-card !border-primary-500/30" />
              </ReactFlow>
            </div>
            <div className="mt-3 text-sm text-text-secondary font-medium flex items-center gap-4">
              <span>
                {nodes.length} node{nodes.length !== 1 ? 's' : ''}
              </span>
              <span className="text-accent-cyan">•</span>
              <span>
                {edges.length} connection{edges.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
