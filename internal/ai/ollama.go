package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// OllamaProvider implements the Provider interface for Ollama (local AI)
type OllamaProvider struct {
	config *OllamaConfig
	client *http.Client
}

// NewOllamaProvider creates a new Ollama provider
func NewOllamaProvider(config *OllamaConfig) *OllamaProvider {
	if config.BaseURL == "" {
		config.BaseURL = "http://localhost:11434"
	}
	if config.Model == "" {
		config.Model = "llama3.2"
	}
	if config.Temperature == 0 {
		config.Temperature = 0.7
	}

	return &OllamaProvider{
		config: config,
		client: &http.Client{
			Timeout: 120 * time.Second, // Ollama can be slower on first run
		},
	}
}

// Name returns the provider name
func (p *OllamaProvider) Name() string {
	return "ollama"
}

// ValidateConfig validates the provider configuration
func (p *OllamaProvider) ValidateConfig() error {
	// Check if Ollama is accessible
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/api/tags", p.config.BaseURL), nil)
	if err != nil {
		return fmt.Errorf("failed to create validation request: %w", err)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("Ollama is not running or not accessible at %s. Please start Ollama first: https://ollama.ai", p.config.BaseURL)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Ollama returned status %d. Please check your Ollama installation", resp.StatusCode)
	}

	return nil
}

// GenerateNeuron generates a neuron using Ollama
func (p *OllamaProvider) GenerateNeuron(ctx context.Context, prompt string) (*GeneratedNeuron, error) {
	// Determine neuron type from prompt
	neuronType := "check"
	promptLower := strings.ToLower(prompt)
	if strings.Contains(promptLower, "restart") ||
		strings.Contains(promptLower, "fix") ||
		strings.Contains(promptLower, "clear") ||
		strings.Contains(promptLower, "delete") ||
		strings.Contains(promptLower, "modify") {
		neuronType = "mutate"
	}

	systemPrompt := BuildSystemPrompt(neuronType)
	fullPrompt := fmt.Sprintf("%s\n\nUser request: %s", systemPrompt, prompt)

	// Prepare Ollama API request
	requestBody := map[string]interface{}{
		"model":  p.config.Model,
		"prompt": fullPrompt,
		"stream": false,
		"options": map[string]interface{}{
			"temperature": p.config.Temperature,
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make API request
	url := fmt.Sprintf("%s/api/generate", p.config.BaseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make API request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Ollama API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var response struct {
		Response string `json:"response"`
		Done     bool   `json:"done"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !response.Done {
		return nil, fmt.Errorf("incomplete response from Ollama")
	}

	script := response.Response

	// Clean up script (remove markdown code blocks if present)
	script = strings.TrimPrefix(script, "```bash\n")
	script = strings.TrimPrefix(script, "```sh\n")
	script = strings.TrimPrefix(script, "```\n")
	script = strings.TrimSuffix(script, "\n```")
	script = strings.TrimSpace(script)

	// Generate neuron name from prompt
	neuronName := ParseNeuronName(prompt)

	return &GeneratedNeuron{
		Name:        neuronName,
		Type:        neuronType,
		Description: prompt,
		Script:      script,
		ExitCodes: map[int]string{
			1:   "Execution failed",
			110: "Warning: potential issues detected",
			120: "Error: issue detected, may need manual intervention",
			130: "Critical error",
		},
		Provider: "ollama",
	}, nil
}
