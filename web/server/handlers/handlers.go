package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"

	"github.com/anoop2811/cortex/logger"
	"github.com/anoop2811/cortex/web/server/models"
	"github.com/anoop2811/cortex/web/server/services"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// Handlers holds all HTTP handlers
type Handlers struct {
	logger           *logger.StandardLogger
	neuronService    *services.NeuronService
	synapseService   *services.SynapseService
	executionService *services.ExecutionService
	wsHub            *services.WebSocketHub
}

// NewHandlers creates a new Handlers instance
func NewHandlers(log *logger.StandardLogger) *Handlers {
	hub := services.NewWebSocketHub()
	go hub.Run()

	return &Handlers{
		logger:           log,
		neuronService:    services.NewNeuronService(log),
		synapseService:   services.NewSynapseService(),
		executionService: services.NewExecutionService(log, hub),
		wsHub:            hub,
	}
}

// ListNeurons handles GET /api/neurons
func (h *Handlers) ListNeurons(w http.ResponseWriter, r *http.Request) {
	neurons, err := h.neuronService.ListNeurons()
	if err != nil {
		h.logger.Error(err, "Failed to list neurons")
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, neurons)
}

// GetNeuronScript handles GET /api/neurons/{id}/script
func (h *Handlers) GetNeuronScript(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Neuron ID is required"})
		return
	}

	script, err := h.neuronService.GetNeuronScript(id)
	if err != nil {
		h.logger.Error(err, fmt.Sprintf("Failed to get script for neuron: %s", id))
		respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"script": script})
}

// CreateNeuron handles POST /api/neurons
func (h *Handlers) CreateNeuron(w http.ResponseWriter, r *http.Request) {
	var req models.CreateNeuronRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	// Validate required fields
	if req.Name == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Neuron name is required"})
		return
	}
	if req.Type != "check" && req.Type != "mutate" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Neuron type must be 'check' or 'mutate'"})
		return
	}

	neuron, err := h.neuronService.CreateNeuron(&req)
	if err != nil {
		h.logger.Error(err, "Failed to create neuron")
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, neuron)
}

// GenerateNeuron handles POST /api/neurons/generate
func (h *Handlers) GenerateNeuron(w http.ResponseWriter, r *http.Request) {
	var req models.GenerateNeuronRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	// Validate required fields
	if req.Prompt == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Prompt is required"})
		return
	}
	if req.Type != "check" && req.Type != "mutate" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Neuron type must be 'check' or 'mutate'"})
		return
	}
	if req.Provider != "openai" && req.Provider != "anthropic" && req.Provider != "ollama" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Provider must be 'openai', 'anthropic', or 'ollama'"})
		return
	}

	// Validate API key for OpenAI/Anthropic
	if (req.Provider == "openai" || req.Provider == "anthropic") && req.APIKey == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("%s API key is required", req.Provider)})
		return
	}

	neuron, err := h.neuronService.GenerateNeuronWithAI(&req)
	if err != nil {
		h.logger.Error(err, "Failed to generate neuron with AI")
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, neuron)
}

// ListSynapses handles GET /api/synapses
func (h *Handlers) ListSynapses(w http.ResponseWriter, r *http.Request) {
	synapses, err := h.synapseService.ListSynapses()
	if err != nil {
		h.logger.Error(err, "Failed to list synapses")
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, synapses)
}

// CreateSynapse handles POST /api/synapses
func (h *Handlers) CreateSynapse(w http.ResponseWriter, r *http.Request) {
	var synapse models.Synapse
	if err := json.NewDecoder(r.Body).Decode(&synapse); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	created, err := h.synapseService.CreateSynapse(&synapse)
	if err != nil {
		h.logger.Error(err, "Failed to create synapse")
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, created)
}

// GetSynapse handles GET /api/synapses/{id}
func (h *Handlers) GetSynapse(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Synapse ID is required"})
		return
	}

	synapse, err := h.synapseService.GetSynapse(id)
	if err != nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, synapse)
}

// UpdateSynapse handles PUT /api/synapses/{id}
func (h *Handlers) UpdateSynapse(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Synapse ID is required"})
		return
	}

	var synapse models.Synapse
	if err := json.NewDecoder(r.Body).Decode(&synapse); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	synapse.ID = id
	updated, err := h.synapseService.UpdateSynapse(&synapse)
	if err != nil {
		h.logger.Error(err, "Failed to update synapse")
		respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

// DeleteSynapse handles DELETE /api/synapses/{id}
func (h *Handlers) DeleteSynapse(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Synapse ID is required"})
		return
	}

	err := h.synapseService.DeleteSynapse(id)
	if err != nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ExecuteNeuron handles POST /api/neurons/{id}/execute
func (h *Handlers) ExecuteNeuron(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Neuron ID is required"})
		return
	}

	// Get neuron details
	neurons, err := h.neuronService.ListNeurons()
	if err != nil {
		h.logger.Error(err, "Failed to list neurons")
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get neuron"})
		return
	}

	// Find the neuron by ID
	var neuron *models.Neuron
	for _, n := range neurons {
		if n.ID == id || n.Name == id {
			neuron = &n
			break
		}
	}

	if neuron == nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Neuron not found"})
		return
	}

	// Execute the neuron
	req := models.ExecuteRequest{
		Type: "neuron",
		Name: neuron.Name,
		Path: neuron.Path,
	}

	execution, err := h.executionService.Execute(req)
	if err != nil {
		h.logger.Error(err, "Execution failed")
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, execution)
}

// ExecuteSynapse handles POST /api/synapses/{id}/execute
func (h *Handlers) ExecuteSynapse(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if id == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Synapse ID is required"})
		return
	}

	// Get synapse details
	synapse, err := h.synapseService.GetSynapse(id)
	if err != nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	// Get all neurons to map neuronId to path
	neurons, err := h.neuronService.ListNeurons()
	if err != nil {
		h.logger.Error(err, "Failed to list neurons")
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get neurons"})
		return
	}

	neuronMap := make(map[string]*models.Neuron)
	for i := range neurons {
		neuronMap[neurons[i].ID] = &neurons[i]
		neuronMap[neurons[i].Name] = &neurons[i]
	}

	executionID := uuid.New().String()

	// Execute neurons in the synapse sequentially
	go func() {
		h.logger.Infof("Starting synapse execution: %s", synapse.Name)

		for _, node := range synapse.Nodes {
			neuron, exists := neuronMap[node.NeuronID]
			if !exists {
				h.logger.Infof("Neuron not found: %s", node.NeuronID)
				continue
			}

			h.logger.Infof("Executing neuron in synapse: %s", neuron.Name)

			// Execute each neuron
			req := models.ExecuteRequest{
				Type: "neuron",
				Name: neuron.Name,
				Path: neuron.Path,
			}

			_, err := h.executionService.Execute(req)
			if err != nil {
				h.logger.Error(err, fmt.Sprintf("Failed to execute neuron %s", neuron.Name))
				// Continue with next neuron even if one fails
			}
		}

		h.logger.Infof("Synapse execution completed: %s", synapse.Name)
	}()

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"id":      executionID,
		"status":  "running",
		"message": fmt.Sprintf("Started execution of synapse: %s", synapse.Name),
	})
}

// Execute handles POST /api/execute
func (h *Handlers) Execute(w http.ResponseWriter, r *http.Request) {
	var req models.ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	execution, err := h.executionService.Execute(req)
	if err != nil {
		h.logger.Error(err, "Execution failed")
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, execution)
}

// GetMetrics handles GET /api/metrics
func (h *Handlers) GetMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := getSystemMetrics()
	respondJSON(w, http.StatusOK, metrics)
}

// ListExecutions handles GET /api/executions
func (h *Handlers) ListExecutions(w http.ResponseWriter, r *http.Request) {
	executions := h.executionService.ListExecutions()
	respondJSON(w, http.StatusOK, executions)
}

// WebSocketHandler handles WebSocket connections
func (h *Handlers) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Error(err, "WebSocket upgrade failed")
		return
	}

	client := &services.WebSocketClient{
		ID:   uuid.New().String(),
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	h.wsHub.RegisterClient(client)

	// Start goroutines for reading and writing
	go client.WritePump()
	go client.ReadPump(h.wsHub)
}

// respondJSON sends a JSON response
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// getSystemMetrics returns current system metrics
func getSystemMetrics() models.SystemMetrics {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// Get disk stats
	diskTotal, diskUsed, diskPercent := getDiskUsage()

	// Build metrics response
	metrics := models.SystemMetrics{}

	// CPU metrics
	metrics.CPU.Usage = getCPUUsage()
	metrics.CPU.Cores = runtime.NumCPU()

	// Memory metrics
	metrics.Memory.Used = m.Alloc
	metrics.Memory.Total = m.Sys
	metrics.Memory.Percentage = float64(m.Alloc) / float64(m.Sys) * 100

	// Disk metrics
	metrics.Disk.Used = diskUsed
	metrics.Disk.Total = diskTotal
	metrics.Disk.Percentage = diskPercent

	// Uptime (simplified - just return 0 for now)
	metrics.Uptime = 0

	return metrics
}

// getCPUUsage returns CPU usage (simplified implementation)
func getCPUUsage() float64 {
	// This is a simplified implementation
	// In production, use a proper CPU monitoring library
	return float64(runtime.NumGoroutine()) / float64(runtime.NumCPU()) * 10
}

// getDiskUsage is implemented in platform-specific files:
// - disk_usage_unix.go for Unix/Linux/macOS
// - disk_usage_windows.go for Windows
