/*
Copyright © 2020 The Cortex Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package cmd

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/anoop2811/cortex/internal/ai"
	"github.com/fatih/color"
	"github.com/spf13/cobra"
)

var (
	generatePrompt   string
	generateProvider string
	generateType     string
	generateDir      string
)

// generateNeuronCmd represents the generate-neuron command
var generateNeuronCmd = &cobra.Command{
	Use:   "generate-neuron",
	Short: "Generate a neuron using AI",
	Long: `Generate a neuron using AI providers (OpenAI, Anthropic, or Ollama).

The AI will create a production-ready shell script based on your natural language prompt.

Examples:
  # Generate using OpenAI (requires OPENAI_API_KEY)
  cortex generate-neuron --prompt "Check if PostgreSQL is running and accepting connections" --provider openai

  # Generate using Anthropic Claude (requires ANTHROPIC_API_KEY)
  cortex generate-neuron --prompt "Find which process is using port 8080" --provider anthropic

  # Generate using Ollama (requires Ollama running locally)
  cortex generate-neuron --prompt "Check disk usage and alert if any mount exceeds 80%" --provider ollama

  # Specify output directory
  cortex generate-neuron --prompt "Restart nginx service" --provider openai --dir ./my-neurons

Environment Variables:
  OPENAI_API_KEY       - API key for OpenAI (required for --provider openai)
  ANTHROPIC_API_KEY    - API key for Anthropic (required for --provider anthropic)
  OLLAMA_BASE_URL      - Ollama API URL (default: http://localhost:11434)`,
	Run: func(cmd *cobra.Command, args []string) {
		generateNeuronWithAI()
	},
}

func init() {
	rootCmd.AddCommand(generateNeuronCmd)
	generateNeuronCmd.Flags().StringVarP(&generatePrompt, "prompt", "p", "", "Natural language description of what the neuron should do (required)")
	generateNeuronCmd.Flags().StringVar(&generateProvider, "provider", "openai", "AI provider to use (openai, anthropic, or ollama)")
	generateNeuronCmd.Flags().StringVarP(&generateType, "type", "t", "", "Neuron type (check or mutate). If not specified, will be inferred from prompt")
	generateNeuronCmd.Flags().StringVarP(&generateDir, "dir", "d", ".", "Directory where neuron should be created")
	generateNeuronCmd.MarkFlagRequired("prompt")
}

func generateNeuronWithAI() {
	// Validate provider
	validProviders := map[string]bool{
		"openai":    true,
		"anthropic": true,
		"ollama":    true,
	}

	if !validProviders[generateProvider] {
		color.Red("✗ Invalid provider: %s", generateProvider)
		color.Yellow("  Valid providers: openai, anthropic, ollama")
		os.Exit(1)
	}

	// Create AI generator
	generator := ai.NewGenerator()

	// Register providers based on selection
	switch generateProvider {
	case "openai":
		config := &ai.OpenAIConfig{
			APIKey: os.Getenv("OPENAI_API_KEY"),
		}
		provider := ai.NewOpenAIProvider(config)
		generator.RegisterProvider("openai", provider)

	case "anthropic":
		config := &ai.AnthropicConfig{
			APIKey: os.Getenv("ANTHROPIC_API_KEY"),
		}
		provider := ai.NewAnthropicProvider(config)
		generator.RegisterProvider("anthropic", provider)

	case "ollama":
		config := &ai.OllamaConfig{
			BaseURL: os.Getenv("OLLAMA_BASE_URL"),
		}
		provider := ai.NewOllamaProvider(config)
		generator.RegisterProvider("ollama", provider)
	}

	// Create generation request
	req := &ai.GenerationRequest{
		Prompt:      generatePrompt,
		NeuronType:  generateType,
		Provider:    generateProvider,
		OutputDir:   generateDir,
	}

	// Display generation info
	color.New(color.FgCyan, color.Bold).Printf("\n🤖 Generating neuron using %s...\n", generateProvider)
	color.Yellow("   Prompt: %s\n", generatePrompt)
	if generateType != "" {
		color.Yellow("   Type: %s\n", generateType)
	}
	fmt.Println()

	// Generate with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Show spinner
	done := make(chan bool)
	go func() {
		spinner := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
		i := 0
		for {
			select {
			case <-done:
				return
			default:
				color.New(color.FgYellow).Printf("\r   %s Waiting for AI response...", spinner[i%len(spinner)])
				i++
				time.Sleep(100 * time.Millisecond)
			}
		}
	}()

	// Generate neuron
	err := generator.GenerateNeuron(ctx, req)
	done <- true
	fmt.Print("\r" + string(make([]byte, 50)) + "\r") // Clear spinner line

	if err != nil {
		color.Red("\n✗ Failed to generate neuron: %v\n", err)

		// Provide helpful error messages
		if generateProvider == "openai" && os.Getenv("OPENAI_API_KEY") == "" {
			color.Yellow("\n💡 Tip: Set your OpenAI API key:")
			color.White("   export OPENAI_API_KEY='your-api-key'\n")
		} else if generateProvider == "anthropic" && os.Getenv("ANTHROPIC_API_KEY") == "" {
			color.Yellow("\n💡 Tip: Set your Anthropic API key:")
			color.White("   export ANTHROPIC_API_KEY='your-api-key'\n")
		} else if generateProvider == "ollama" {
			color.Yellow("\n💡 Tip: Make sure Ollama is running:")
			color.White("   1. Install: https://ollama.ai")
			color.White("   2. Start: ollama serve")
			color.White("   3. Pull model: ollama pull llama3.2\n")
		}

		os.Exit(1)
	}

	// Success message
	neuronName := ai.ParseNeuronName(generatePrompt)
	neuronPath := fmt.Sprintf("%s/%s", generateDir, neuronName)

	color.New(color.FgGreen, color.Bold).Printf("\n✓ Neuron generated successfully!\n\n")
	color.White("   Location: %s\n", neuronPath)
	color.White("   Files:\n")
	color.White("     - neuron.yaml  (configuration)\n")
	color.White("     - run.sh       (AI-generated script)\n\n")

	color.Cyan("Next steps:\n")
	color.White("   1. Review the generated script: cat %s/run.sh\n", neuronPath)
	color.White("   2. Test the neuron: cortex exec -p %s\n", neuronPath)
	color.White("   3. Add to a synapse if needed\n\n")

	color.Yellow("⚠️  Important: Always review AI-generated scripts before running in production!\n")
}
