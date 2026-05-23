import React, { useState } from 'react';
import { Play, Square, Clock, CheckCircle, XCircle, Loader, Code, X } from 'lucide-react';
import { Neuron, ExecutionStatus } from '../types';
import { apiClient } from '../api/client';

interface NeuronCardProps {
  neuron: Neuron;
  onExecute?: (neuron: Neuron) => void;
  onStatusChange?: (status: ExecutionStatus) => void;
}

export const NeuronCard: React.FC<NeuronCardProps> = ({ neuron, onExecute, onStatusChange }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [script, setScript] = useState<string>('');
  const [loadingScript, setLoadingScript] = useState(false);

  const getStatusIcon = () => {
    switch (neuron.status) {
      case 'running':
        return <Loader className="w-5 h-5 text-accent-blue animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-accent-cyan" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusColor = () => {
    switch (neuron.status) {
      case 'running':
        return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
      case 'completed':
        return 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-background-slate/30 text-text-muted border-text-muted/20';
    }
  };

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      console.log('Executing neuron:', neuron.id);
      const status = await apiClient.executeNeuron(neuron.id);
      console.log('Execute response:', status);
      setExecutionId(status.id);
      onExecute?.(neuron);
      console.log('Calling onStatusChange with:', status);
      onStatusChange?.(status);
    } catch (error) {
      console.error('Failed to execute neuron:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleViewScript = async () => {
    if (showScript) {
      setShowScript(false);
      return;
    }

    try {
      setLoadingScript(true);
      const scriptContent = await apiClient.getNeuronScript(neuron.id);
      setScript(scriptContent);
      setShowScript(true);
    } catch (error) {
      console.error('Failed to load script:', error);
    } finally {
      setLoadingScript(false);
    }
  };

  const handleStop = async () => {
    if (!executionId) return;

    try {
      await apiClient.stopNeuronExecution(neuron.id, executionId);
      setExecutionId(null);
    } catch (error) {
      console.error('Failed to stop execution:', error);
    }
  };

  const isRunning = neuron.status === 'running' || isExecuting;

  return (
    <div
      data-testid="neuron-card"
      className="group relative glass rounded-2xl shadow-card hover:shadow-card-hover border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 p-6 overflow-hidden"
    >
      {/* Gradient background effect on hover */}
      <div className="absolute inset-0 bg-gradient-purple opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl"></div>

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-heading font-semibold text-text-primary mb-2 group-hover:text-primary-300 transition-colors">
              {neuron.name}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">{neuron.description}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <div className="relative">
              {getStatusIcon()}
              {neuron.status === 'running' && (
                <div className="absolute inset-0 bg-accent-blue blur-lg opacity-50 animate-pulse-slow"></div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-primary-500/10">
          <div className="flex flex-col gap-2">
            <span className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium border w-fit ${getStatusColor()}`}>
              {neuron.status}
            </span>
            <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
              <span className="px-2 py-1 bg-background-slate/50 rounded-md">{neuron.type}</span>
              <span className="px-2 py-1 bg-background-slate/50 rounded-md truncate max-w-[200px]" title={neuron.path}>
                {neuron.path}
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleViewScript}
              disabled={loadingScript}
              className="flex items-center gap-2 px-4 py-2.5 rounded-pill font-medium transition-all duration-300 bg-background-card hover:bg-background-card/80 text-text-secondary hover:text-text-primary border border-primary-500/20 hover:border-primary-500/40 hover:scale-105"
              aria-label="View script"
            >
              {loadingScript ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : showScript ? (
                <X className="w-4 h-4" />
              ) : (
                <Code className="w-4 h-4" />
              )}
              <span>{showScript ? 'Hide' : 'View'}</span>
            </button>
            <button
              onClick={isRunning ? handleStop : handleExecute}
              disabled={isExecuting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-pill font-medium transition-all duration-300 ${
                isRunning
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:shadow-glow-purple hover:scale-105'
                  : 'bg-gradient-purple hover:shadow-glow-purple text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105'
              }`}
              aria-label={isRunning ? 'Stop execution' : 'Execute neuron'}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                <span>Execute</span>
              </>
            )}
          </button>
          </div>
        </div>

        {/* Script Viewer */}
        {showScript && (
          <div className="mt-6 pt-6 border-t border-primary-500/10 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Code className="w-4 h-4 text-accent-cyan" />
              <h4 className="text-sm font-semibold text-text-primary">Script Content (run.sh)</h4>
            </div>
            <pre className="bg-background-card border border-primary-500/20 rounded-lg p-4 text-xs text-text-secondary font-mono overflow-x-auto max-h-96 overflow-y-auto">
              {script}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
