import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Code, AlertCircle, CheckCircle, Sparkles, Wand2 } from 'lucide-react';
import { apiClient } from '../api/client';

type CreationMode = 'manual' | 'ai';

export const NeuronCreator: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CreationMode>('manual');
  const [formData, setFormData] = useState({
    name: '',
    type: 'check' as 'check' | 'mutate',
    description: '',
    script: '',
  });
  const [aiFormData, setAiFormData] = useState({
    prompt: '',
    type: 'check' as 'check' | 'mutate',
    provider: 'openai' as 'openai' | 'anthropic' | 'ollama',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('cortex_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (err) {
        console.error('Failed to parse settings:', err);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (mode === 'manual') {
        await apiClient.createNeuron(formData);
      } else {
        // AI generation mode
        const apiKey =
          aiFormData.provider === 'openai'
            ? settings?.openaiApiKey
            : aiFormData.provider === 'anthropic'
            ? settings?.anthropicApiKey
            : undefined;

        const ollamaUrl = aiFormData.provider === 'ollama' ? settings?.ollamaBaseUrl : undefined;

        if ((aiFormData.provider === 'openai' || aiFormData.provider === 'anthropic') && !apiKey) {
          setError(`Please configure your ${aiFormData.provider} API key in Settings first`);
          setLoading(false);
          return;
        }

        await apiClient.generateNeuron({
          prompt: aiFormData.prompt,
          type: aiFormData.type,
          provider: aiFormData.provider,
          apiKey,
          ollamaUrl,
        });
      }
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${mode === 'ai' ? 'generate' : 'create'} neuron`);
    } finally {
      setLoading(false);
    }
  };

  const handleAiChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAiFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const defaultScript = `#!/bin/bash
# ${formData.description || 'Your neuron implementation'}
# Type: ${formData.type}

echo "Running ${formData.name}..."

# Add your implementation here
# For check neurons: exit 0 for success, non-zero for failure
# For mutate neurons: perform actions and exit 0 on success

exit 0
`;

  return (
    <div className="min-h-screen bg-background-navy">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-text-secondary hover:text-text-primary mb-4 transition-colors"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-heading font-bold gradient-text mb-2">Create New Neuron</h1>
          <p className="text-text-secondary">
            Create a new neuron manually or use AI to generate one from a description
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="glass rounded-xl p-2 mb-6 flex gap-2">
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              mode === 'manual'
                ? 'bg-gradient-purple text-white shadow-glow-purple'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Code className="w-5 h-5" />
            Manual Creation
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              mode === 'ai'
                ? 'bg-gradient-purple text-white shadow-glow-purple'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            AI Generation
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="glass border-2 border-green-500/30 rounded-xl p-6 mb-6 animate-scale-in">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-green-400">Neuron Created Successfully!</h3>
                <p className="text-text-secondary">Redirecting to dashboard...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="glass border-2 border-red-500/30 rounded-xl p-6 mb-6 animate-scale-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-400">Error</h3>
                <p className="text-text-secondary">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Generation Form */}
        {mode === 'ai' && (
          <form onSubmit={handleSubmit} className="glass rounded-xl shadow-card p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Wand2 className="w-6 h-6 text-accent-cyan" />
              <h2 className="text-2xl font-heading font-bold text-text-primary">
                AI-Powered Generation
              </h2>
            </div>

            {/* Provider Selection */}
            <div>
              <label htmlFor="provider" className="block text-sm font-medium text-text-primary mb-2">
                AI Provider <span className="text-red-400">*</span>
              </label>
              <select
                id="provider"
                name="provider"
                value={aiFormData.provider}
                onChange={handleAiChange}
                required
                className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="ollama">Ollama (Local)</option>
              </select>
              <p className="text-sm text-text-secondary mt-1">
                {aiFormData.provider === 'ollama'
                  ? 'Uses locally running Ollama (no API key required)'
                  : `Configure your ${aiFormData.provider} API key in Settings`}
              </p>
            </div>

            {/* Type */}
            <div>
              <label htmlFor="ai-type" className="block text-sm font-medium text-text-primary mb-2">
                Neuron Type <span className="text-red-400">*</span>
              </label>
              <select
                id="ai-type"
                name="type"
                value={aiFormData.type}
                onChange={handleAiChange}
                required
                className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value="check">Check - Read-only health checks</option>
                <option value="mutate">Mutate - System modifications</option>
              </select>
            </div>

            {/* Prompt */}
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-text-primary mb-2">
                What should this neuron do? <span className="text-red-400">*</span>
              </label>
              <textarea
                id="prompt"
                name="prompt"
                value={aiFormData.prompt}
                onChange={handleAiChange}
                required
                rows={4}
                placeholder="e.g., Check if PostgreSQL is running and accepting connections on port 5432"
                className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-500 transition-colors resize-none"
              />
              <p className="text-sm text-text-secondary mt-1">
                Describe what you want the neuron to do in plain English. The AI will generate the script.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-purple hover:shadow-glow-purple text-white rounded-pill font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate with AI
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={loading}
                className="px-6 py-3 bg-background-card hover:bg-background-card/80 text-text-secondary hover:text-text-primary border border-primary-500/20 rounded-pill font-medium transition-all duration-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {/* AI Tips */}
            <div className="glass rounded-xl p-6 mt-6 border border-accent-cyan/20">
              <h3 className="text-lg font-semibold text-accent-cyan mb-3">✨ AI Generation Tips</h3>
              <ul className="space-y-2 text-text-secondary">
                <li>• Be specific: "Check PostgreSQL status on port 5432" is better than "Check database"</li>
                <li>• Mention exit codes if needed: "Exit with 110 if disk usage &gt; 80%"</li>
                <li>• Include error handling: "Check if nginx is running, restart if not"</li>
                <li>• {aiFormData.provider === 'ollama'
                  ? 'Make sure Ollama is running: ollama serve'
                  : `Configure your API key in Settings → AI API Keys`}</li>
                <li>• ⚠️ Always review AI-generated scripts before production use!</li>
              </ul>
            </div>
          </form>
        )}

        {/* Manual Creation Form */}
        {mode === 'manual' && (
          <form onSubmit={handleSubmit} className="glass rounded-xl shadow-card p-8 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
              Neuron Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., check-postgres-health"
              className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-500 transition-colors"
            />
            <p className="text-sm text-text-secondary mt-1">
              Use lowercase with hyphens (e.g., my-health-check)
            </p>
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-text-primary mb-2">
              Neuron Type <span className="text-red-400">*</span>
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="check">Check - Read-only health checks</option>
              <option value="mutate">Mutate - System modifications</option>
            </select>
            <p className="text-sm text-text-secondary mt-1">
              {formData.type === 'check'
                ? 'Check neurons perform read-only operations (e.g., health checks, status queries)'
                : 'Mutate neurons perform system modifications (e.g., restart services, clear caches)'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Describe what this neuron does..."
              className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-500 transition-colors resize-none"
            />
          </div>

          {/* Script (Optional) */}
          <div>
            <label htmlFor="script" className="block text-sm font-medium text-text-primary mb-2">
              <Code className="inline w-4 h-4 mr-1" />
              Shell Script (Optional)
            </label>
            <textarea
              id="script"
              name="script"
              value={formData.script}
              onChange={handleChange}
              rows={12}
              placeholder={defaultScript}
              className="w-full px-4 py-3 bg-background-card border border-primary-500/20 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-500 transition-colors resize-none font-mono text-sm"
            />
            <p className="text-sm text-text-secondary mt-1">
              Leave empty to use a default template. You can edit it later.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-purple hover:shadow-glow-purple text-white rounded-pill font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Neuron
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={loading}
              className="px-6 py-3 bg-background-card hover:bg-background-card/80 text-text-secondary hover:text-text-primary border border-primary-500/20 rounded-pill font-medium transition-all duration-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {/* Info Box */}
          <div className="glass rounded-xl p-6 mt-6">
            <h3 className="text-lg font-semibold text-text-primary mb-3">💡 Tips</h3>
            <ul className="space-y-2 text-text-secondary">
              <li>• <strong>Check neurons</strong> should exit with 0 for success, non-zero for failure</li>
              <li>• <strong>Mutate neurons</strong> should perform idempotent operations when possible</li>
              <li>• Use descriptive exit codes (e.g., 110 for warning, 120 for critical)</li>
              <li>• Add debug output with <code className="bg-background-card px-2 py-1 rounded">echo</code> statements</li>
              <li>• Test your script locally before deploying</li>
            </ul>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
