import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { Neuron, ExecutionStatus } from '../types';
import { apiClient } from '../api/client';
import { NeuronCard } from './NeuronCard';
import { SystemMetrics } from './SystemMetrics';
import { ExecutionLogs } from './ExecutionLogs';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [neurons, setNeurons] = useState<Neuron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNeurons = async () => {
    try {
      setRefreshing(true);
      const data = await apiClient.getNeurons();
      setNeurons(data);
      setError(null);
    } catch (err) {
      setError('Failed to load neurons');
      console.error('Error fetching neurons:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNeurons();

    // Set up periodic refresh
    const interval = setInterval(fetchNeurons, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleNeuronExecute = (neuron: Neuron) => {
    // Update neuron status optimistically
    setNeurons((prev) =>
      prev.map((n) => (n.id === neuron.id ? { ...n, status: 'running' } : n))
    );
  };

  const handleStatusChange = (status: ExecutionStatus) => {
    console.log('Dashboard handleStatusChange called with:', status);
    setSelectedExecution(status.id);
    console.log('Set selectedExecution to:', status.id);

    // Update neuron status when execution completes
    if (status.status !== 'running') {
      setNeurons((prev) =>
        prev.map((n) => (n.id === status.neuronId ? { ...n, status: status.status } : n))
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-navy">
        <div className="text-center animate-fade-in">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <Loader className="w-20 h-20 animate-spin text-primary-500" />
            <div className="absolute inset-0 bg-primary-500 blur-2xl opacity-30 animate-pulse-slow"></div>
          </div>
          <p className="text-text-secondary text-lg font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-navy">
        <div className="glass border-2 border-red-500/30 rounded-2xl p-8 max-w-md animate-scale-in">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6 animate-pulse" />
          <h3 className="text-2xl font-heading font-bold text-text-primary mb-3">Error Loading Dashboard</h3>
          <p className="text-red-300 mb-6 text-lg">{error}</p>
          <button
            onClick={fetchNeurons}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-pill font-medium shadow-glow-purple transition-all duration-300 hover:scale-105"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-navy">
      {/* Header with gradient accent */}
      <header className="relative glass border-b border-primary-500/20">
        <div className="absolute inset-0 bg-gradient-purple opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-heading font-bold gradient-text">Cortex Dashboard</h1>
            <button
              onClick={fetchNeurons}
              disabled={refreshing}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-purple hover:shadow-glow-purple text-white rounded-pill font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* System Metrics */}
        <section className="mb-12 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-1 bg-gradient-purple rounded-full"></div>
            <h2 className="text-2xl font-heading font-bold text-text-primary">System Metrics</h2>
          </div>
          <SystemMetrics />
        </section>

        {/* Neuron Library */}
        <section className="mb-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-gradient-cyan rounded-full"></div>
              <h2
                className="text-2xl font-heading font-bold text-text-primary"
                aria-label="Neuron library"
              >
                Neuron Library
              </h2>
            </div>
            <button
              onClick={() => navigate('/neurons/new')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-purple hover:shadow-glow-purple text-white rounded-pill font-medium transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Create Neuron
            </button>
          </div>
          {neurons.length === 0 ? (
            <div className="glass rounded-2xl shadow-card p-16 text-center border border-primary-500/20">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-purple opacity-20"></div>
              <p className="text-text-secondary text-xl mb-8">No neurons available</p>
              <button
                onClick={() => navigate('/neurons/new')}
                className="bg-gradient-purple hover:shadow-glow-purple text-white px-8 py-4 rounded-pill font-medium text-lg transition-all duration-300 hover:scale-105"
              >
                Create Your First Neuron
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {neurons.map((neuron, index) => (
                <div key={neuron.id} className="animate-scale-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <NeuronCard
                    neuron={neuron}
                    onExecute={handleNeuronExecute}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Execution Logs */}
        <section className="animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-1 bg-accent-cyan rounded-full"></div>
            <h2 className="text-2xl font-heading font-bold text-text-primary">Live Execution Logs</h2>
            {selectedExecution && <span className="text-sm text-text-muted">(Execution: {selectedExecution})</span>}
          </div>
          <ExecutionLogs />
        </section>
      </main>
    </div>
  );
};
