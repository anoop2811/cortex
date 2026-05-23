package models

import "time"

// Neuron represents a neuron definition
type Neuron struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`        // "check" or "mutate"
	Description string `json:"description"`
	Path        string `json:"path"`
	Status      string `json:"status,omitempty"` // "idle", "running", "completed", "failed"
}

// CreateNeuronRequest represents a request to create a new neuron
type CreateNeuronRequest struct {
	Name        string `json:"name"`
	Type        string `json:"type"`        // "check" or "mutate"
	Description string `json:"description"`
	Script      string `json:"script,omitempty"` // Optional shell script content
}

// GenerateNeuronRequest represents a request to generate a neuron using AI
type GenerateNeuronRequest struct {
	Prompt    string `json:"prompt"`              // Natural language description
	Type      string `json:"type"`                // "check" or "mutate"
	Provider  string `json:"provider"`            // "openai", "anthropic", or "ollama"
	APIKey    string `json:"apiKey,omitempty"`    // API key for OpenAI/Anthropic
	OllamaURL string `json:"ollamaUrl,omitempty"` // Ollama base URL (optional)
}

// SynapseNode represents a node in the visual synapse builder
type SynapseNode struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"` // "neuron"
	NeuronID string            `json:"neuronId"`
	Position map[string]int    `json:"position"` // x, y coordinates
	Data     map[string]string `json:"data"`     // label, description, etc.
}

// SynapseConnection represents a connection between nodes
type SynapseConnection struct {
	ID           string `json:"id"`
	Source       string `json:"source"`       // source node ID
	Target       string `json:"target"`       // target node ID
	Type         string `json:"type"`         // "data" or "control"
	SourceHandle string `json:"sourceHandle"` // handle/port ID on source node
	TargetHandle string `json:"targetHandle"` // handle/port ID on target node
}

// Synapse represents a synapse workflow with visual builder support
type Synapse struct {
	ID          string               `json:"id"`
	Name        string               `json:"name"`
	Description string               `json:"description"`
	Path        string               `json:"path,omitempty"`
	Nodes       []SynapseNode        `json:"nodes"`
	Connections []SynapseConnection  `json:"connections"`
	CreatedAt   time.Time            `json:"createdAt"`
	UpdatedAt   time.Time            `json:"updatedAt"`
	Neurons     []string             `json:"neurons,omitempty"` // Deprecated, kept for backward compatibility
}

// ExecuteRequest represents an execution request
type ExecuteRequest struct {
	Type string `json:"type"` // "neuron" or "synapse"
	Name string `json:"name"`
	Path string `json:"path"`
}

// ExecuteResponse represents an execution response
type ExecuteResponse struct {
	ID        string    `json:"id"`
	Status    string    `json:"status"`
	StartTime time.Time `json:"startTime"`
	Message   string    `json:"message,omitempty"`
}

// Execution represents an execution record
type Execution struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime,omitempty"`
	Duration  float64   `json:"duration,omitempty"` // seconds
	Logs      []string  `json:"logs,omitempty"`
}

// SystemMetrics represents system metrics
type SystemMetrics struct {
	CPU struct {
		Usage float64 `json:"usage"`
		Cores int     `json:"cores"`
	} `json:"cpu"`
	Memory struct {
		Used       uint64  `json:"used"`
		Total      uint64  `json:"total"`
		Percentage float64 `json:"percentage"`
	} `json:"memory"`
	Disk struct {
		Used       uint64  `json:"used"`
		Total      uint64  `json:"total"`
		Percentage float64 `json:"percentage"`
	} `json:"disk"`
	Uptime int `json:"uptime"`
}

// WebSocketMessage represents a WebSocket message
type WebSocketMessage struct {
	Type      string      `json:"type"` // "log", "status", "metrics", "error"
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// LogMessage represents a log message
type LogMessage struct {
	ExecutionID string `json:"executionId"`
	Level       string `json:"level"` // "info", "error", "debug"
	Message     string `json:"message"`
}

// StatusMessage represents a status update
type StatusMessage struct {
	ExecutionID string `json:"executionId"`
	Status      string `json:"status"` // "running", "completed", "failed"
}
