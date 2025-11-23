import React, { useState } from 'react';
import { Network, Eye, Trash2, Loader, Calendar, Play } from 'lucide-react';
import { Synapse } from '../types';
import { apiClient } from '../api/client';

interface SynapseCardProps {
  synapse: Synapse;
  onDelete?: (id: string) => void;
  onView?: (synapse: Synapse) => void;
}

export const SynapseCard: React.FC<SynapseCardProps> = ({ synapse, onDelete, onView }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete synapse "${synapse.name}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await apiClient.deleteSynapse(synapse.id);
      onDelete?.(synapse.id);
    } catch (error) {
      console.error('Failed to delete synapse:', error);
      alert('Failed to delete synapse');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = () => {
    onView?.(synapse);
  };

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      const result = await apiClient.executeSynapse(synapse.id);
      alert(result.message || 'Synapse execution started!');
    } catch (error) {
      console.error('Failed to execute synapse:', error);
      alert('Failed to execute synapse');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      data-testid="synapse-card"
      className="group relative glass rounded-2xl shadow-card hover:shadow-card-hover border border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 p-6 overflow-hidden"
    >
      {/* Gradient background effect on hover */}
      <div className="absolute inset-0 bg-gradient-cyan opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl"></div>

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-5 h-5 text-accent-cyan" />
              <h3 className="text-xl font-heading font-semibold text-text-primary group-hover:text-accent-cyan transition-colors">
                {synapse.name}
              </h3>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{synapse.description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-primary-500/10">
          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background-slate/50 rounded-md">
              <span className="font-semibold text-accent-cyan">{synapse.nodes.length}</span>
              <span>node{synapse.nodes.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background-slate/50 rounded-md">
              <span className="font-semibold text-accent-cyan">{synapse.connections.length}</span>
              <span>connection{synapse.connections.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Created Date */}
          {synapse.createdAt && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Calendar className="w-3 h-3" />
              <span>Created: {new Date(synapse.createdAt).toLocaleDateString()}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-pill font-medium transition-all duration-300 bg-gradient-purple hover:shadow-glow-purple text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              aria-label="Execute synapse"
            >
              {isExecuting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute</span>
                </>
              )}
            </button>
            <button
              onClick={handleView}
              className="flex items-center gap-2 px-4 py-2.5 rounded-pill font-medium transition-all duration-300 bg-gradient-cyan hover:shadow-glow-cyan text-white hover:scale-105"
              aria-label="View synapse"
            >
              <Eye className="w-4 h-4" />
              <span>View</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-pill font-medium transition-all duration-300 bg-background-card hover:bg-red-500/20 text-text-secondary hover:text-red-400 border border-primary-500/20 hover:border-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Delete synapse"
            >
              {isDeleting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
