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

// OpenAIProvider implements the Provider interface for OpenAI
type OpenAIProvider struct {
	config *OpenAIConfig
	client *http.Client
}

// NewOpenAIProvider creates a new OpenAI provider
func NewOpenAIProvider(config *OpenAIConfig) *OpenAIProvider {
	if config.Model == "" {
		config.Model = "gpt-4o-mini"
	}
	if config.Temperature == 0 {
		config.Temperature = 0.7
	}
	if config.MaxTokens == 0 {
		config.MaxTokens = 2000
	}

	return &OpenAIProvider{
		config: config,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Name returns the provider name
func (p *OpenAIProvider) Name() string {
	return "openai"
}

// ValidateConfig validates the provider configuration
func (p *OpenAIProvider) ValidateConfig() error {
	if p.config.APIKey == "" {
		return fmt.Errorf("OpenAI API key is required. Set OPENAI_API_KEY environment variable")
	}
	return nil
}

// GenerateNeuron generates a neuron using OpenAI
func (p *OpenAIProvider) GenerateNeuron(ctx context.Context, prompt string) (*GeneratedNeuron, error) {
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

	// Prepare OpenAI API request
	requestBody := map[string]interface{}{
		"model": p.config.Model,
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": systemPrompt,
			},
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"temperature": p.config.Temperature,
		"max_tokens":  p.config.MaxTokens,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make API request
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.config.APIKey))

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make API request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var response struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenAI")
	}

	script := response.Choices[0].Message.Content

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
		Provider: "openai",
	}, nil
}
