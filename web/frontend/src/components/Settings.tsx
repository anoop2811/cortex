import React, { useState, useEffect } from 'react';
import { Save, Key, Bell, Palette, Server, CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsData {
  // API Keys
  openaiApiKey: string;
  anthropicApiKey: string;
  ollamaBaseUrl: string;

  // UI Preferences
  theme: 'dark' | 'light';
  refreshInterval: number;
  showNotifications: boolean;

  // System
  neuronDirectory: string;
  maxConcurrentExecutions: number;
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    openaiApiKey: '',
    anthropicApiKey: '',
    ollamaBaseUrl: 'http://localhost:11434',
    theme: 'dark',
    refreshInterval: 10,
    showNotifications: true,
    neuronDirectory: './neurons',
    maxConcurrentExecutions: 5,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('cortex_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (err) {
        console.error('Failed to parse saved settings:', err);
      }
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem('cortex_settings', JSON.stringify(settings));
      setSaved(true);
      setError(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
      console.error('Save error:', err);
    }
  };

  const handleChange = (field: keyof SettingsData, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background-navy">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold gradient-text mb-2">Settings</h1>
          <p className="text-text-secondary">Configure your Cortex environment and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {saved && (
          <div className="glass border-2 border-green-500/30 rounded-xl p-4 mb-6 animate-scale-in">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Settings saved successfully!</span>
            </div>
          </div>
        )}

        {error && (
          <div className="glass border-2 border-red-500/30 rounded-xl p-4 mb-6 animate-scale-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* API Keys Section */}
        <section className="glass rounded-xl shadow-card p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-accent-cyan" />
            <h2 className="text-2xl font-heading font-bold text-text-primary">AI API Keys</h2>
          </div>
          <p className="text-text-secondary mb-6">
            Configure AI providers for neuron generation. Keys are stored locally in your browser.
          </p>

          <div className="space-y-4">
            {/* OpenAI */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                OpenAI API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showKeys.openai ? 'text' : 'password'}
                  value={settings.openaiApiKey}
                  onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-500 transition-colors font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys((prev) => ({ ...prev, openai: !prev.openai }))}
                  className="px-4 py-3 bg-background-card hover:bg-background-card/80 border border-primary-500/20 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showKeys.openai ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline">platform.openai.com</a>
              </p>
            </div>

            {/* Anthropic */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Anthropic API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showKeys.anthropic ? 'text' : 'password'}
                  value={settings.anthropicApiKey}
                  onChange={(e) => handleChange('anthropicApiKey', e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-500 transition-colors font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys((prev) => ({ ...prev, anthropic: !prev.anthropic }))}
                  className="px-4 py-3 bg-background-card hover:bg-background-card/80 border border-primary-500/20 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showKeys.anthropic ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline">console.anthropic.com</a>
              </p>
            </div>

            {/* Ollama */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Ollama Base URL
              </label>
              <input
                type="text"
                value={settings.ollamaBaseUrl}
                onChange={(e) => handleChange('ollamaBaseUrl', e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-500 transition-colors"
              />
              <p className="text-xs text-text-secondary mt-1">
                Local Ollama server URL (no API key required)
              </p>
            </div>
          </div>
        </section>

        {/* UI Preferences Section */}
        <section className="glass rounded-xl shadow-card p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-6 h-6 text-primary-500" />
            <h2 className="text-2xl font-heading font-bold text-text-primary">UI Preferences</h2>
          </div>

          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value="dark">Dark Mode</option>
                <option value="light">Light Mode (Coming Soon)</option>
              </select>
            </div>

            {/* Refresh Interval */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Dashboard Refresh Interval (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={settings.refreshInterval}
                onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary focus:outline-none focus:border-primary-500 transition-colors"
              />
              <p className="text-xs text-text-secondary mt-1">How often to refresh neuron status</p>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Enable Notifications</p>
                  <p className="text-xs text-text-secondary">Show execution status notifications</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showNotifications}
                  onChange={(e) => handleChange('showNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-background-card peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          </div>
        </section>

        {/* System Configuration Section */}
        <section className="glass rounded-xl shadow-card p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Server className="w-6 h-6 text-accent-cyan" />
            <h2 className="text-2xl font-heading font-bold text-text-primary">System Configuration</h2>
          </div>

          <div className="space-y-4">
            {/* Neuron Directory */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Neuron Directory
              </label>
              <input
                type="text"
                value={settings.neuronDirectory}
                onChange={(e) => handleChange('neuronDirectory', e.target.value)}
                placeholder="./neurons"
                className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-500 transition-colors"
              />
              <p className="text-xs text-text-secondary mt-1">
                Directory where neurons are stored (server-side setting)
              </p>
            </div>

            {/* Max Concurrent Executions */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Max Concurrent Executions
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.maxConcurrentExecutions}
                onChange={(e) => handleChange('maxConcurrentExecutions', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary focus:outline-none focus:border-primary-500 transition-colors"
              />
              <p className="text-xs text-text-secondary mt-1">
                Maximum number of neurons that can run simultaneously
              </p>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-purple hover:shadow-glow-purple text-white rounded-pill font-medium transition-all duration-300 hover:scale-105"
          >
            <Save className="w-5 h-5" />
            Save Settings
          </button>
        </div>

        {/* Info Box */}
        <div className="glass rounded-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3">🔒 Privacy & Security</h3>
          <ul className="space-y-2 text-text-secondary text-sm">
            <li>• API keys are stored locally in your browser's localStorage</li>
            <li>• Keys are never sent to the Cortex server</li>
            <li>• Use environment variables for production deployments</li>
            <li>• Clear your browser data to remove stored keys</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
