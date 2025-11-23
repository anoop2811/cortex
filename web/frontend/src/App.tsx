import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Network, Settings as SettingsIcon, Layers } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { SynapseBuilder } from './components/SynapseBuilder';
import { SynapseList } from './components/SynapseList';
import { NeuronCreator } from './components/NeuronCreator';
import { Settings } from './components/Settings';
import { apiClient } from './api/client';
import { Neuron } from './types';

const Navigation: React.FC<{ isMobileMenuOpen: boolean; onToggleMobileMenu: () => void }> = ({
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/synapses', label: 'Synapses', icon: Layers },
    { path: '/synapse-builder', label: 'Synapse Builder', icon: Network },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className="hidden md:flex items-center gap-8"
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="group flex items-center gap-2 text-text-secondary hover:text-text-primary transition-all duration-300"
          >
            <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">{item.label}</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-purple group-hover:w-full transition-all duration-300"></span>
          </Link>
        ))}
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={onToggleMobileMenu}
        className="md:hidden text-white hover:text-accent-cyan transition-colors"
        aria-label="Toggle mobile menu"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 glass shadow-2xl z-50 animate-slide-in">
          <nav className="flex flex-col p-6 gap-3" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onToggleMobileMenu}
                className="flex items-center gap-3 text-text-secondary hover:text-text-primary hover:bg-background-card px-4 py-3 rounded-xl transition-all duration-300"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
};


const SynapseBuilderPage: React.FC = () => {
  const [neurons, setNeurons] = useState<Neuron[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNeurons = async () => {
      try {
        const data = await apiClient.getNeurons();
        setNeurons(data);
      } catch (error) {
        console.error('Failed to fetch neurons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNeurons();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-navy">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary text-lg">Loading synapse builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SynapseBuilder neurons={neurons} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadStartTime] = useState(Date.now());

  useEffect(() => {
    // Track load time for performance monitoring
    const loadTime = Date.now() - loadStartTime;
    console.log(`App loaded in ${loadTime}ms`);

    // Ensure load time is under 2 seconds as per requirements
    if (loadTime > 2000) {
      console.warn('App load time exceeded 2 seconds');
    }
  }, [loadStartTime]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  return (
    <Router>
      <div className="min-h-screen bg-background-navy">
        {/* Header with gradient */}
        <header className="relative bg-gradient-to-r from-background-navy via-primary-900/30 to-background-navy border-b border-primary-500/20 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-purple opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center">
                <Link to="/" className="group flex items-center gap-3 hover:scale-105 transition-transform duration-300">
                  <div className="relative">
                    <Network className="w-10 h-10 text-white group-hover:text-accent-cyan transition-colors" />
                    <div className="absolute inset-0 bg-accent-cyan blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
                  </div>
                  <h1 className="text-2xl font-heading font-bold gradient-text">Cortex</h1>
                </Link>
              </div>
              <Navigation
                isMobileMenuOpen={isMobileMenuOpen}
                onToggleMobileMenu={toggleMobileMenu}
              />
            </div>
          </div>
        </header>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/neurons/new" element={<NeuronCreator />} />
          <Route path="/synapses" element={<SynapseList />} />
          <Route path="/synapse-builder" element={<SynapseBuilderPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
