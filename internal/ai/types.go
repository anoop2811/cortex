package ai

import "context"

// Provider represents an AI provider interface
type Provider interface {
	GenerateNeuron(ctx context.Context, prompt string) (*GeneratedNeuron, error)
	Name() string
	ValidateConfig() error
}

// GeneratedNeuron represents the AI-generated neuron content
type GeneratedNeuron struct {
	Name        string
	Type        string // "check" or "mutate"
	Description string
	Script      string
	ExitCodes   map[int]string
	Provider    string
}

// ProviderConfig holds configuration for AI providers
type ProviderConfig struct {
	OpenAI    *OpenAIConfig
	Anthropic *AnthropicConfig
	Ollama    *OllamaConfig
}

// OpenAIConfig holds OpenAI-specific configuration
type OpenAIConfig struct {
	APIKey      string
	Model       string
	Temperature float64
	MaxTokens   int
}

// AnthropicConfig holds Anthropic-specific configuration
type AnthropicConfig struct {
	APIKey      string
	Model       string
	Temperature float64
	MaxTokens   int
}

// OllamaConfig holds Ollama-specific configuration
type OllamaConfig struct {
	BaseURL     string
	Model       string
	Temperature float64
}

// GenerationRequest represents a request to generate a neuron
type GenerationRequest struct {
	Prompt      string
	NeuronType  string // "check" or "mutate"
	Provider    string // "openai", "anthropic", or "ollama"
	OutputDir   string
}
