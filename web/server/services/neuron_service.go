package services

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	"github.com/anoop2811/cortex/internal/ai"
	"github.com/anoop2811/cortex/logger"
	"github.com/anoop2811/cortex/web/server/models"
	"gopkg.in/yaml.v2"
)

// NeuronService handles neuron operations
type NeuronService struct {
	logger *logger.StandardLogger
}

// NewNeuronService creates a new NeuronService
func NewNeuronService(log *logger.StandardLogger) *NeuronService {
	return &NeuronService{logger: log}
}

// ListNeurons returns all available neurons
func (s *NeuronService) ListNeurons() ([]models.Neuron, error) {
	neurons := []models.Neuron{}

	// Check neurons directory, current directory, and example directory
	dirs := []string{"./neurons", ".", "./example"}

	for _, dir := range dirs {
		err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil // Skip errors
			}

			// Look for neuron.yaml files
			if !info.IsDir() && info.Name() == "neuron.yaml" {
				neuron, err := s.loadNeuronFromFile(path)
				if err != nil {
					s.logger.Error(err, fmt.Sprintf("Failed to load neuron from file: %s", path))
					return nil
				}
				neurons = append(neurons, neuron)
			}

			return nil
		})

		if err != nil {
			s.logger.Error(err, "Failed to walk directory")
		}
	}

	return neurons, nil
}

// loadNeuronFromFile loads a neuron from a neuron.yaml file
func (s *NeuronService) loadNeuronFromFile(configPath string) (models.Neuron, error) {
	data, err := ioutil.ReadFile(configPath)
	if err != nil {
		return models.Neuron{}, err
	}

	var config struct {
		Name        string `yaml:"name"`
		Type        string `yaml:"type"`
		Description string `yaml:"description"`
	}

	if err := yaml.Unmarshal(data, &config); err != nil {
		return models.Neuron{}, err
	}

	neuronDir := filepath.Dir(configPath)
	neuronName := config.Name
	if neuronName == "" {
		neuronName = filepath.Base(neuronDir)
	}

	// Convert to absolute path
	absPath, err := filepath.Abs(neuronDir)
	if err != nil {
		absPath = neuronDir
	}

	return models.Neuron{
		ID:          neuronName,
		Name:        neuronName,
		Type:        config.Type,
		Description: config.Description,
		Path:        absPath,
		Status:      "idle",
	}, nil
}

// GetNeuronScript returns the script content for a neuron
func (s *NeuronService) GetNeuronScript(neuronID string) (string, error) {
	// Find the neuron first
	neurons, err := s.ListNeurons()
	if err != nil {
		return "", err
	}

	var neuronPath string
	for _, n := range neurons {
		if n.ID == neuronID || n.Name == neuronID {
			neuronPath = n.Path
			break
		}
	}

	if neuronPath == "" {
		return "", fmt.Errorf("neuron not found: %s", neuronID)
	}

	// Read the run.sh script
	scriptPath := filepath.Join(neuronPath, "run.sh")
	content, err := ioutil.ReadFile(scriptPath)
	if err != nil {
		return "", fmt.Errorf("failed to read script: %w", err)
	}

	return string(content), nil
}

// ListSynapses returns all available synapses
func (s *NeuronService) ListSynapses() ([]models.Synapse, error) {
	synapses := []models.Synapse{}

	// Check current directory and example directory for synapses
	dirs := []string{".", "./example"}

	for _, dir := range dirs {
		err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}

			if !info.IsDir() && info.Name() == "synapse.yaml" {
				synapse, err := s.loadSynapse(path)
				if err != nil {
					s.logger.Error(err, "Failed to load synapse")
					return nil
				}
				synapses = append(synapses, synapse)
			}

			return nil
		})

		if err != nil {
			s.logger.Error(err, "Failed to walk directory")
		}
	}

	// Add example synapse if none found
	if len(synapses) == 0 {
		synapses = []models.Synapse{
			{
				Name:        "example-workflow",
				Description: "Example workflow synapse",
				Path:        "./example/synapse",
				Neurons:     []string{"check-nginx", "check-redis"},
			},
		}
	}

	return synapses, nil
}

// CreateNeuron creates a new neuron with the given configuration
func (s *NeuronService) CreateNeuron(neuron *models.CreateNeuronRequest) (*models.Neuron, error) {
	// Create neuron directory
	neuronDir := filepath.Join("./neurons", neuron.Name)
	if err := os.MkdirAll(neuronDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create neuron directory: %w", err)
	}

	// Create neuron.yaml
	neuronConfig := map[string]interface{}{
		"name":                      neuron.Name,
		"type":                      neuron.Type,
		"description":               neuron.Description,
		"exec_file":                 filepath.Join(neuronDir, "run.sh"),
		"pre_exec_debug":            fmt.Sprintf("Executing %s", neuron.Name),
		"post_exec_success_debug":   fmt.Sprintf("%s completed successfully", neuron.Name),
		"post_exec_fail_debug":      map[int]string{1: "Execution failed"},
		"assert_exit_status":        []int{0},
	}

	configData, err := yaml.Marshal(neuronConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal neuron config: %w", err)
	}

	configPath := filepath.Join(neuronDir, "neuron.yaml")
	if err := ioutil.WriteFile(configPath, configData, 0644); err != nil {
		return nil, fmt.Errorf("failed to write neuron config: %w", err)
	}

	// Create run.sh script
	script := neuron.Script
	if script == "" {
		script = fmt.Sprintf(`#!/bin/bash
# %s
# Type: %s

echo "Running %s..."

# Add your implementation here

exit 0
`, neuron.Description, neuron.Type, neuron.Name)
	}

	scriptPath := filepath.Join(neuronDir, "run.sh")
	if err := ioutil.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		return nil, fmt.Errorf("failed to write run script: %w", err)
	}

	return &models.Neuron{
		ID:          neuron.Name,
		Name:        neuron.Name,
		Type:        neuron.Type,
		Description: neuron.Description,
		Path:        neuronDir,
		Status:      "idle",
	}, nil
}

// GenerateNeuronWithAI generates a neuron using AI providers
func (s *NeuronService) GenerateNeuronWithAI(req *models.GenerateNeuronRequest) (*models.Neuron, error) {
	// Create AI generator
	generator := ai.NewGenerator()

	// Register the specified provider
	switch req.Provider {
	case "openai":
		if req.APIKey == "" {
			return nil, fmt.Errorf("OpenAI API key is required")
		}
		config := &ai.OpenAIConfig{
			APIKey: req.APIKey,
		}
		provider := ai.NewOpenAIProvider(config)
		generator.RegisterProvider("openai", provider)

	case "anthropic":
		if req.APIKey == "" {
			return nil, fmt.Errorf("Anthropic API key is required")
		}
		config := &ai.AnthropicConfig{
			APIKey: req.APIKey,
		}
		provider := ai.NewAnthropicProvider(config)
		generator.RegisterProvider("anthropic", provider)

	case "ollama":
		baseURL := req.OllamaURL
		if baseURL == "" {
			baseURL = "http://localhost:11434"
		}
		config := &ai.OllamaConfig{
			BaseURL: baseURL,
		}
		provider := ai.NewOllamaProvider(config)
		generator.RegisterProvider("ollama", provider)

	default:
		return nil, fmt.Errorf("invalid provider: %s (must be openai, anthropic, or ollama)", req.Provider)
	}

	// Create generation request
	genReq := &ai.GenerationRequest{
		Prompt:     req.Prompt,
		NeuronType: req.Type,
		Provider:   req.Provider,
		OutputDir:  "./neurons",
	}

	// Generate with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Generate neuron
	if err := generator.GenerateNeuron(ctx, genReq); err != nil {
		return nil, fmt.Errorf("AI generation failed: %w", err)
	}

	// Get the generated neuron name
	neuronName := ai.ParseNeuronName(req.Prompt)
	neuronPath := filepath.Join("./neurons", neuronName)

	// Return neuron info
	return &models.Neuron{
		ID:          neuronName,
		Name:        neuronName,
		Type:        req.Type,
		Description: req.Prompt,
		Path:        neuronPath,
		Status:      "idle",
	}, nil
}

// loadSynapse loads a synapse from a YAML file
func (s *NeuronService) loadSynapse(path string) (models.Synapse, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return models.Synapse{}, err
	}

	var config struct {
		Name       string `yaml:"name"`
		Definition []struct {
			Name string `yaml:"name"`
		} `yaml:"definition"`
	}

	if err := yaml.Unmarshal(data, &config); err != nil {
		return models.Synapse{}, err
	}

	neurons := []string{}
	for _, def := range config.Definition {
		neurons = append(neurons, def.Name)
	}

	return models.Synapse{
		Name:        config.Name,
		Description: fmt.Sprintf("Synapse: %s", config.Name),
		Path:        filepath.Dir(path),
		Neurons:     neurons,
	}, nil
}
