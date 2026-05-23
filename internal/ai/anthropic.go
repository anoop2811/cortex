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

// AnthropicProvider implements the Provider interface for Anthropic Claude
type AnthropicProvider struct {
	config *AnthropicConfig
	client *http.Client
}

// NewAnthropicProvider creates a new Anthropic provider
func NewAnthropicProvider(config *AnthropicConfig) *AnthropicProvider {
	if config.Model == "" {
		config.Model = "claude-3-5-sonnet-20241022"
	}
	if config.Temperature == 0 {
		config.Temperature = 0.7
	}
	if config.MaxTokens == 0 {
		config.MaxTokens = 2000
	}

	return &AnthropicProvider{
		config: config,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Name returns the provider name
func (p *AnthropicProvider) Name() string {
	return "anthropic"
}

// ValidateConfig validates the provider configuration
func (p *AnthropicProvider) ValidateConfig() error {
	if p.config.APIKey == "" {
		return fmt.Errorf("Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable")
	}
	return nil
}

// GenerateNeuron generates a neuron using Anthropic Claude
func (p *AnthropicProvider) GenerateNeuron(ctx context.Context, prompt string) (*GeneratedNeuron, error) {
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

	// Prepare Anthropic API request
	requestBody := map[string]interface{}{
		"model":      p.config.Model,
		"max_tokens": p.config.MaxTokens,
		"system":     systemPrompt,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"temperature": p.config.Temperature,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make API request
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", p.config.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make API request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Anthropic API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var response struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(response.Content) == 0 {
		return nil, fmt.Errorf("no response from Anthropic")
	}

	script := response.Content[0].Text

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
		Provider: "anthropic",
	}, nil
}
