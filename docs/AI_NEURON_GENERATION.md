# AI Neuron Generation

Generate production-ready debugging scripts using natural language with OpenAI, Anthropic Claude, or Ollama.

## Overview

Cortex's AI neuron generation feature allows you to describe what you want to debug in plain English, and the AI will generate a complete, production-ready shell script (neuron) for you.

## Supported Providers

### 1. OpenAI (GPT-4)
- **Model**: `gpt-4o-mini` (default)
- **Requires**: OPENAI_API_KEY environment variable
- **Cost**: Paid API (https://platform.openai.com/api-keys)

### 2. Anthropic Claude
- **Model**: `claude-3-5-sonnet-20241022` (default)
- **Requires**: ANTHROPIC_API_KEY environment variable
- **Cost**: Paid API (https://console.anthropic.com/)

### 3. Ollama (Local)
- **Model**: `llama3.2` (default)
- **Requires**: Ollama running locally
- **Cost**: Free (runs on your machine)
- **Install**: https://ollama.ai

## Quick Start

### Using OpenAI

```bash
# Set your API key
export OPENAI_API_KEY='your-api-key-here'

# Generate a neuron
cortex generate-neuron \
  --prompt "Check if PostgreSQL is running and accepting connections" \
  --provider openai
```

### Using Anthropic Claude

```bash
# Set your API key
export ANTHROPIC_API_KEY='your-api-key-here'

# Generate a neuron
cortex generate-neuron \
  --prompt "Find which process is using port 8080 and show full command" \
  --provider anthropic
```

### Using Ollama (Local, Free)

```bash
# Install and start Ollama
curl https://ollama.ai/install.sh | sh
ollama serve &
ollama pull llama3.2

# Generate a neuron
cortex generate-neuron \
  --prompt "Check disk usage and alert if any mount exceeds 80%" \
  --provider ollama
```

## Examples

### Example 1: System Health Check

```bash
cortex generate-neuron \
  --prompt "Check if nginx is running, test port 80 connectivity, and verify config syntax" \
  --provider openai \
  --type check
```

**Generated neuron:**
- Name: `check_if_nginx_is_running_test_port_80_connectivity`
- Type: `check`
- Script: Production-ready bash script with error handling

### Example 2: Auto-Remediation

```bash
cortex generate-neuron \
  --prompt "Restart nginx service and verify it started successfully" \
  --provider anthropic \
  --type mutate
```

**Generated neuron:**
- Name: `restart_nginx_service_and_verify_it_started_succ`
- Type: `mutate`
- Script: Safe restart with verification

### Example 3: Complex Diagnostics

```bash
cortex generate-neuron \
  --prompt "Check PostgreSQL replication lag, connection pool usage, and slow queries" \
  --provider ollama
```

## Command Reference

```bash
cortex generate-neuron --prompt "<description>" [flags]
```

### Flags

- `--prompt, -p` (required): Natural language description of what the neuron should do
- `--provider` (default: openai): AI provider (openai, anthropic, or ollama)
- `--type, -t`: Neuron type (check or mutate). Auto-detected if not specified
- `--dir, -d` (default: .): Output directory for the generated neuron

### Environment Variables

- `OPENAI_API_KEY`: API key for OpenAI
- `ANTHROPIC_API_KEY`: API key for Anthropic
- `OLLAMA_BASE_URL`: Ollama API URL (default: http://localhost:11434)

## Generated Neuron Structure

When you generate a neuron, Cortex creates:

```
<neuron_name>/
├── neuron.yaml       # Configuration with AI metadata
└── run.sh            # AI-generated bash script
```

### Example neuron.yaml

```yaml
name: check_postgresql_is_running
type: check
description: Check if PostgreSQL is running and accepting connections
exec_file: /absolute/path/to/run.sh
pre_exec_debug: Executing check_postgresql_is_running (AI-generated)
assert_exit_status:
  - 0
post_exec_success_debug: check_postgresql_is_running completed successfully
post_exec_fail_debug:
  1: "Execution failed"
  110: "Warning: potential issues detected"
  120: "Error: issue detected, may need manual intervention"
  130: "Critical error"
ai_generated: true
ai_provider: openai
```

### Example run.sh

```bash
#!/bin/bash
# AI-generated neuron script
# Provider: openai
# Description: Check if PostgreSQL is running and accepting connections

# Check if PostgreSQL service is running
if ! systemctl is-active --quiet postgresql; then
    echo "ERROR: PostgreSQL service is not running"
    exit 130
fi

# Check if PostgreSQL is accepting connections
if ! sudo -u postgres psql -c '\q' 2>/dev/null; then
    echo "ERROR: PostgreSQL is not accepting connections"
    exit 120
fi

echo "PostgreSQL is running and accepting connections"
exit 0
```

## Best Practices

### 1. Be Specific in Your Prompts

**Good:**
```bash
--prompt "Check if nginx is running on port 80 and return error if config test fails"
```

**Better:**
```bash
--prompt "Check if nginx is running, verify port 80 is listening, test config with nginx -t, and return exit code 120 if config is invalid"
```

### 2. Review Generated Scripts

**Always review AI-generated scripts before running in production:**

```bash
# Generate neuron
cortex generate-neuron --prompt "..." --provider openai

# Review the script
cat <neuron_name>/run.sh

# Test in dev environment
cortex exec -p <neuron_name>

# If good, add to your synapse
```

### 3. Use Appropriate Types

- **check**: Read-only operations (system inspection, queries, tests)
- **mutate**: Operations that change state (restarts, fixes, cleanups)

The AI auto-detects type based on keywords:
- `restart`, `fix`, `clear`, `delete`, `modify` → mutate
- Everything else → check

### 4. Combine with Synapses

Generated neurons work seamlessly with synapses:

```yaml
# my_troubleshooting_synapse/synapse.yaml
name: postgresql_troubleshooting
definition:
  - neuron: check_postgresql_is_running  # AI-generated
    config:
      path: /path/to/check_postgresql_is_running
  - neuron: check_pg_replication_lag     # AI-generated
    config:
      path: /path/to/check_pg_replication_lag
plan:
  steps:
    serial:
      - check_postgresql_is_running
      - check_pg_replication_lag
```

## Provider Comparison

| Feature | OpenAI | Anthropic | Ollama |
|---------|--------|-----------|--------|
| **Cost** | Paid (~$0.01/neuron) | Paid (~$0.01/neuron) | Free |
| **Speed** | Fast (~3-5s) | Fast (~3-5s) | Slower (~10-30s) |
| **Quality** | Excellent | Excellent | Good |
| **Setup** | API key only | API key only | Install + Download models |
| **Privacy** | Data sent to OpenAI | Data sent to Anthropic | Fully local |
| **Internet Required** | Yes | Yes | No (after model download) |

## Troubleshooting

### OpenAI: "API key is required"

```bash
# Check if key is set
echo $OPENAI_API_KEY

# If not set:
export OPENAI_API_KEY='sk-...'

# Or add to ~/.bashrc:
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.bashrc
source ~/.bashrc
```

### Anthropic: "API key is required"

```bash
# Check if key is set
echo $ANTHROPIC_API_KEY

# If not set:
export ANTHROPIC_API_KEY='sk-ant-...'
```

### Ollama: "Ollama is not running"

```bash
# Check if Ollama is installed
which ollama

# If not installed:
curl https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve &

# Pull a model
ollama pull llama3.2

# Verify it's running
curl http://localhost:11434/api/tags
```

### Generated Script Has Errors

The AI is not perfect. If generated scripts have issues:

1. **Review and edit** the `run.sh` file manually
2. **Improve your prompt** - be more specific
3. **Try a different provider** - Claude and GPT-4 may produce different results
4. **Use a better model** - For complex tasks, use GPT-4 instead of GPT-3.5

## Advanced Usage

### Custom Output Directory

```bash
cortex generate-neuron \
  --prompt "Check Redis connection" \
  --provider openai \
  --dir ./my-team/database-neurons
```

### Batch Generation

```bash
#!/bin/bash
prompts=(
  "Check if MySQL is running"
  "Check PostgreSQL replication lag"
  "Check Redis memory usage"
  "Check MongoDB connection"
)

for prompt in "${prompts[@]}"; do
  cortex generate-neuron --prompt "$prompt" --provider openai
done
```

### Custom Models

Edit the AI provider configuration in code:

```go
// internal/ai/openai.go
if config.Model == "" {
    config.Model = "gpt-4o-mini"  // Change to "gpt-4" for better results
}
```

## Security Considerations

1. **Review all AI-generated scripts** before running in production
2. **Test in non-production** environments first
3. **AI may hallucinate** - verify commands and logic
4. **API keys are secrets** - never commit them to git
5. **Local option available** - use Ollama for sensitive environments

## Future Enhancements

- [ ] Support for custom system prompts
- [ ] Model selection via CLI flags
- [ ] Fine-tuning for specific infrastructure patterns
- [ ] Multi-step neuron generation
- [ ] Test case generation
- [ ] Integration with neuron marketplace

## Related Documentation

- [Creating Neurons](guides/getting-started.md#creating-neurons)
- [Synapse Orchestration](guides/getting-started.md#synapses)
- [Web UI](../web/frontend/README.md)
