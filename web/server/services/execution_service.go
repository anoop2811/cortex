package services

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"github.com/anoop2811/cortex/logger"
	"github.com/anoop2811/cortex/web/server/models"
	"github.com/google/uuid"
)

// ExecutionService handles execution operations
type ExecutionService struct {
	logger     *logger.StandardLogger
	executions map[string]*models.Execution
	mu         sync.RWMutex
	wsHub      *WebSocketHub
}

// NewExecutionService creates a new ExecutionService
func NewExecutionService(log *logger.StandardLogger, hub *WebSocketHub) *ExecutionService {
	return &ExecutionService{
		logger:     log,
		executions: make(map[string]*models.Execution),
		wsHub:      hub,
	}
}

// Execute executes a neuron or synapse
func (s *ExecutionService) Execute(req models.ExecuteRequest) (*models.ExecuteResponse, error) {
	executionID := uuid.New().String()
	execution := &models.Execution{
		ID:        executionID,
		Type:      req.Type,
		Name:      req.Name,
		Status:    "running",
		StartTime: time.Now(),
		Logs:      []string{},
	}

	s.mu.Lock()
	s.executions[executionID] = execution
	s.mu.Unlock()

	// Send initial test log immediately
	s.sendLog(executionID, "info", "🚀 Starting execution...")

	// Send status update via WebSocket
	s.sendWebSocketMessage("status", models.StatusMessage{
		ExecutionID: executionID,
		Status:      "running",
	})

	// Execute asynchronously
	go s.runExecution(executionID, req)

	return &models.ExecuteResponse{
		ID:        executionID,
		Status:    "running",
		StartTime: execution.StartTime,
		Message:   fmt.Sprintf("Started execution of %s: %s", req.Type, req.Name),
	}, nil
}

// runExecution runs the actual execution
func (s *ExecutionService) runExecution(executionID string, req models.ExecuteRequest) {
	s.mu.RLock()
	execution := s.executions[executionID]
	s.mu.RUnlock()

	s.logger.Infof("🚀 Starting execution %s for %s: %s", executionID, req.Type, req.Name)

	// Send initial logs
	s.sendLog(executionID, "info", fmt.Sprintf("📋 Executing %s: %s", req.Type, req.Name))
	s.sendLog(executionID, "info", fmt.Sprintf("📁 Path: %s", req.Path))

	// Execute cortex command
	// Try to find cortex binary (it might be in PATH or at /usr/local/bin/cortex)
	cortexBinary := "cortex"
	if _, err := exec.LookPath("cortex"); err != nil {
		// Try common locations
		if _, err := exec.LookPath("/usr/local/bin/cortex"); err == nil {
			cortexBinary = "/usr/local/bin/cortex"
		} else if _, err := exec.LookPath("./cortex"); err == nil {
			cortexBinary = "./cortex"
		}
	}

	var cmd *exec.Cmd
	if req.Type == "neuron" {
		// For neurons, execute the run.sh script directly
		scriptPath := filepath.Join(req.Path, "run.sh")

		// Get absolute paths for debugging
		absScriptPath, _ := filepath.Abs(scriptPath)
		absReqPath, _ := filepath.Abs(req.Path)
		currentDir, _ := os.Getwd()

		s.sendLog(executionID, "info", fmt.Sprintf("🔧 Script: %s", scriptPath))
		s.sendLog(executionID, "debug", fmt.Sprintf("📍 Absolute script path: %s", absScriptPath))
		s.sendLog(executionID, "debug", fmt.Sprintf("📍 Request path: %s (abs: %s)", req.Path, absReqPath))
		s.sendLog(executionID, "debug", fmt.Sprintf("📍 Current directory: %s", currentDir))
		s.logger.Infof("Script path: %s (absolute: %s)", scriptPath, absScriptPath)
		s.logger.Infof("Current working directory: %s", currentDir)

		// Check if script exists
		if _, err := os.Stat(scriptPath); err != nil {
			errMsg := fmt.Sprintf("Script not found: %s (absolute: %s)", scriptPath, absScriptPath)
			s.logger.Errorf(err, "❌ %s", errMsg)
			s.sendLog(executionID, "error", errMsg)
			execution.Status = "failed"
			s.sendWebSocketMessage("status", models.StatusMessage{
				ExecutionID: executionID,
				Status:      "failed",
			})
			return
		}

		cmd = exec.Command("/bin/bash", scriptPath)
		// Set working directory to neuron directory for relative paths
		absPath, _ := filepath.Abs(req.Path)
		cmd.Dir = absPath
		s.sendLog(executionID, "info", fmt.Sprintf("📂 Working dir: %s", absPath))
		s.logger.Infof("Working directory: %s", absPath)
		s.logger.Infof("Executing command: /bin/bash %s", scriptPath)
	} else {
		// For synapses, use cortex exec command
		s.sendLog(executionID, "debug", fmt.Sprintf("Using cortex binary: %s", cortexBinary))
		s.sendLog(executionID, "debug", fmt.Sprintf("Executing synapse path: %s", req.Path))
		s.logger.Infof("Executing synapse with cortex: %s exec -p %s", cortexBinary, req.Path)
		cmd = exec.Command(cortexBinary, "exec", "-p", req.Path)
	}

	// Create pipes for stdout and stderr to stream output in real-time
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		errMsg := fmt.Sprintf("Failed to create stdout pipe: %v", err)
		s.logger.Errorf(err, "❌ %s", errMsg)
		s.sendLog(executionID, "error", errMsg)
		execution.Status = "failed"
		s.sendWebSocketMessage("status", models.StatusMessage{
			ExecutionID: executionID,
			Status:      "failed",
		})
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		errMsg := fmt.Sprintf("Failed to create stderr pipe: %v", err)
		s.logger.Errorf(err, "❌ %s", errMsg)
		s.sendLog(executionID, "error", errMsg)
		execution.Status = "failed"
		s.sendWebSocketMessage("status", models.StatusMessage{
			ExecutionID: executionID,
			Status:      "failed",
		})
		return
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		errMsg := fmt.Sprintf("Failed to start command: %v", err)
		s.logger.Errorf(err, "❌ %s", errMsg)
		s.sendLog(executionID, "error", errMsg)
		execution.Status = "failed"
		s.sendWebSocketMessage("status", models.StatusMessage{
			ExecutionID: executionID,
			Status:      "failed",
		})
		return
	}

	s.logger.Infof("✅ Command started successfully, streaming output...")
	s.sendLog(executionID, "info", "📡 Streaming output...")

	// Stream stdout in real-time
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			s.logger.Infof("STDOUT: %s", line)
			s.sendLog(executionID, "info", line)
			execution.Logs = append(execution.Logs, line)
		}
		if err := scanner.Err(); err != nil {
			s.logger.Errorf(err, "Error reading stdout")
		}
	}()

	// Stream stderr in real-time
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			s.logger.Errorf(nil, "STDERR: %s", line)
			s.sendLog(executionID, "error", line)
			execution.Logs = append(execution.Logs, line)
		}
		if err := scanner.Err(); err != nil {
			s.logger.Errorf(err, "Error reading stderr")
		}
	}()

	// Wait for command to complete
	err = cmd.Wait()

	execution.EndTime = time.Now()
	execution.Duration = execution.EndTime.Sub(execution.StartTime).Seconds()

	s.logger.Infof("Command completed. Duration: %.2fs, Error: %v", execution.Duration, err)

	if err != nil {
		execution.Status = "failed"
		errMsg := fmt.Sprintf("❌ Execution failed: %v", err)
		s.logger.Errorf(err, "%s", errMsg)
		s.sendLog(executionID, "error", errMsg)
		s.sendWebSocketMessage("status", models.StatusMessage{
			ExecutionID: executionID,
			Status:      "failed",
		})
		return
	}

	execution.Status = "completed"
	s.logger.Infof("✅ Execution completed successfully")
	s.sendLog(executionID, "info", "✅ Execution completed successfully")
	s.sendWebSocketMessage("status", models.StatusMessage{
		ExecutionID: executionID,
		Status:      "completed",
	})
}

// ListExecutions returns all executions
func (s *ExecutionService) ListExecutions() []models.Execution {
	s.mu.RLock()
	defer s.mu.RUnlock()

	executions := make([]models.Execution, 0, len(s.executions))
	for _, exec := range s.executions {
		executions = append(executions, *exec)
	}

	return executions
}

// sendLog sends a log message via WebSocket
func (s *ExecutionService) sendLog(executionID, level, message string) {
	s.sendWebSocketMessage("log", models.LogMessage{
		ExecutionID: executionID,
		Level:       level,
		Message:     message,
	})
}

// sendWebSocketMessage sends a message to all WebSocket clients
func (s *ExecutionService) sendWebSocketMessage(msgType string, data interface{}) {
	msg := models.WebSocketMessage{
		Type:      msgType,
		Timestamp: time.Now(),
		Data:      data,
	}

	s.logger.Infof("Broadcasting WebSocket message: type=%s, data=%+v", msgType, data)
	s.wsHub.Broadcast(msg)
}
