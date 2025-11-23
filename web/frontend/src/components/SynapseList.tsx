import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, RefreshCw, Plus, Network } from 'lucide-react';
import { Synapse } from '../types';
import { apiClient } from '../api/client';
import { SynapseCard } from './SynapseCard';

export const SynapseList: React.FC = () => {
  const navigate = useNavigate();
  const [synapses, setSynapses] = useState<Synapse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSynapses = async () => {
    try {
      setRefreshing(true);
      const data = await apiClient.getSynapses();
      setSynapses(data);
      setError(null);
    } catch (err) {
      setError('Failed to load synapses');
      console.error('Error fetching synapses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSynapses();

    // Set up periodic refresh
    const interval = setInterval(fetchSynapses, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const handleDelete = (id: string) => {
    setSynapses((prev) => prev.filter((s) => s.id !== id));
  };

  const handleView = (synapse: Synapse) => {
    // For now, navigate to synapse builder
    // In the future, could have a dedicated view page
    navigate('/synapse-builder', { state: { synapse } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-navy">
        <div className="text-center animate-fade-in">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <Loader className="w-20 h-20 animate-spin text-accent-cyan" />
            <div className="absolute inset-0 bg-accent-cyan blur-2xl opacity-30 animate-pulse-slow"></div>
          </div>
          <p className="text-text-secondary text-lg font-medium">Loading synapses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-navy">
        <div className="glass border-2 border-red-500/30 rounded-2xl p-8 max-w-md animate-scale-in">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6 animate-pulse" />
          <h3 className="text-2xl font-heading font-bold text-text-primary mb-3">Error Loading Synapses</h3>
          <p className="text-red-300 mb-6 text-lg">{error}</p>
          <button
            onClick={fetchSynapses}
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
        <div className="absolute inset-0 bg-gradient-cyan opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-8 h-8 text-accent-cyan" />
              <h1 className="text-3xl font-heading font-bold text-text-primary">Synapses</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchSynapses}
                disabled={refreshing}
                className="flex items-center gap-2 px-6 py-3 bg-background-card hover:bg-background-card/80 text-text-secondary hover:text-text-primary border border-primary-500/20 hover:border-primary-500/40 rounded-pill font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                aria-label="Refresh synapses"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => navigate('/synapse-builder')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-cyan hover:shadow-glow-cyan text-white rounded-pill font-medium transition-all duration-300 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span>Create Synapse</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="animate-fade-in">
          {synapses.length === 0 ? (
            <div className="glass rounded-2xl shadow-card p-16 text-center border border-primary-500/20">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <Network className="w-24 h-24 text-accent-cyan opacity-20" />
                <div className="absolute inset-0 bg-gradient-cyan opacity-10 blur-2xl"></div>
              </div>
              <h2 className="text-2xl font-heading font-bold text-text-primary mb-3">No Synapses Yet</h2>
              <p className="text-text-secondary text-lg mb-8">
                Create your first synapse to connect neurons into powerful workflows
              </p>
              <button
                onClick={() => navigate('/synapse-builder')}
                className="bg-gradient-cyan hover:shadow-glow-cyan text-white px-8 py-4 rounded-pill font-medium text-lg transition-all duration-300 hover:scale-105"
              >
                Create Your First Synapse
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-text-secondary text-lg">
                  {synapses.length} synapse{synapses.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {synapses.map((synapse, index) => (
                  <div key={synapse.id} className="animate-scale-in" style={{ animationDelay: `${index * 0.05}s` }}>
                    <SynapseCard synapse={synapse} onDelete={handleDelete} onView={handleView} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};
