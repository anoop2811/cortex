package ai

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v2"
)

// Generator orchestrates AI neuron generation
type Generator struct {
	providers map[string]Provider
}

// NewGenerator creates a new AI generator
func NewGenerator() *Generator {
	return &Generator{
		providers: make(map[string]Provider),
	}
}

// RegisterProvider registers an AI provider
func (g *Generator) RegisterProvider(name string, provider Provider) {
	g.providers[name] = provider
}

// GenerateNeuron generates a neuron using the specified provider
func (g *Generator) GenerateNeuron(ctx context.Context, req *GenerationRequest) error {
	provider, exists := g.providers[req.Provider]
	if !exists {
		return fmt.Errorf("provider %s not found. Available providers: %v",
			req.Provider, g.AvailableProviders())
	}

	// Validate provider configuration
	if err := provider.ValidateConfig(); err != nil {
		return fmt.Errorf("provider validation failed: %w", err)
	}

	// Generate neuron content from AI
	generated, err := provider.GenerateNeuron(ctx, req.Prompt)
	if err != nil {
		return fmt.Errorf("failed to generate neuron: %w", err)
	}

	// Override type if specified in request
	if req.NeuronType != "" {
		generated.Type = req.NeuronType
	}

	// Create neuron directory
	neuronPath := filepath.Join(req.OutputDir, generated.Name)
	if err := os.MkdirAll(neuronPath, 0755); err != nil {
		return fmt.Errorf("failed to create neuron directory: %w", err)
	}

	// Write neuron.yaml
	if err := g.writeNeuronConfig(neuronPath, generated); err != nil {
		return fmt.Errorf("failed to write neuron config: %w", err)
	}

	// Write run.sh script
	if err := g.writeNeuronScript(neuronPath, generated); err != nil {
		return fmt.Errorf("failed to write neuron script: %w", err)
	}

	return nil
}

// writeNeuronConfig writes the neuron.yaml file
func (g *Generator) writeNeuronConfig(neuronPath string, generated *GeneratedNeuron) error {
	absNeuronPath, _ := filepath.Abs(neuronPath)
	execFile := filepath.Join(absNeuronPath, "run.sh")

	config := map[string]interface{}{
		"name":                     generated.Name,
		"type":                     generated.Type,
		"description":              generated.Description,
		"exec_file":                execFile,
		"pre_exec_debug":           fmt.Sprintf("Executing %s (AI-generated)", generated.Name),
		"assert_exit_status":       []int{0},
		"post_exec_success_debug":  fmt.Sprintf("%s completed successfully", generated.Name),
		"post_exec_fail_debug":     generated.ExitCodes,
	}

	// Add AI generation metadata
	if generated.Provider != "" {
		config["ai_generated"] = true
		config["ai_provider"] = generated.Provider
	}

	yamlData, err := yaml.Marshal(config)
	if err != nil {
		return err
	}

	configPath := filepath.Join(neuronPath, "neuron.yaml")
	return os.WriteFile(configPath, yamlData, 0644)
}

// writeNeuronScript writes the run.sh script file
func (g *Generator) writeNeuronScript(neuronPath string, generated *GeneratedNeuron) error {
	scriptContent := fmt.Sprintf(`#!/bin/bash
# AI-generated neuron script
# Provider: %s
# Description: %s

%s
`, generated.Provider, generated.Description, generated.Script)

	scriptPath := filepath.Join(neuronPath, "run.sh")
	return os.WriteFile(scriptPath, []byte(scriptContent), 0755)
}

// AvailableProviders returns list of registered providers
func (g *Generator) AvailableProviders() []string {
	var providers []string
	for name := range g.providers {
		providers = append(providers, name)
	}
	return providers
}

// BuildSystemPrompt creates a system prompt for AI providers
func BuildSystemPrompt(neuronType string) string {
	return fmt.Sprintf(`You are an expert DevOps/SRE engineer helping to create debugging scripts (called neurons) for infrastructure troubleshooting.

Your task is to generate a shell script that performs a specific debugging task.

Requirements:
1. Generate a BASH script only (no explanations, just the script)
2. The script should be for a "%s" operation:
   - "check": Read-only operations that inspect system state (no modifications)
   - "mutate": Operations that modify system state (restart services, clear caches, etc.)
3. Use appropriate exit codes:
   - 0: Success
   - 110-119: Warnings (operation succeeded but with concerns)
   - 120-129: Errors that can be auto-fixed
   - 130+: Critical errors
4. Include error handling
5. Make the script production-ready and safe
6. Add comments explaining key steps

Output ONLY the shell script content, nothing else.`, neuronType)
}

// ParseNeuronName extracts a valid neuron name from AI output
func ParseNeuronName(description string) string {
	// Convert description to snake_case neuron name
	name := strings.ToLower(description)
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "-", "_")

	// Remove special characters
	var result strings.Builder
	for _, char := range name {
		if (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '_' {
			result.WriteRune(char)
		}
	}

	neuronName := result.String()

	// Limit length
	if len(neuronName) > 50 {
		neuronName = neuronName[:50]
	}

	// Trim underscores
	neuronName = strings.Trim(neuronName, "_")

	if neuronName == "" {
		neuronName = "ai_generated_neuron"
	}

	return neuronName
}
