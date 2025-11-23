package server

import (
	"context"
	"embed"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"time"

	"github.com/anoop2811/cortex/logger"
	"github.com/anoop2811/cortex/web/server/handlers"
	"github.com/anoop2811/cortex/web/server/middleware"
	"github.com/gorilla/mux"
)

//go:embed frontend
var frontendFiles embed.FS

// Server represents the web server
type Server struct {
	host       string
	port       int
	logger     *logger.StandardLogger
	httpServer *http.Server
	router     *mux.Router
}

// NewServer creates a new web server instance
func NewServer(host string, port int, log *logger.StandardLogger) *Server {
	s := &Server{
		host:   host,
		port:   port,
		logger: log,
		router: mux.NewRouter(),
	}

	s.setupRoutes()

	s.httpServer = &http.Server{
		Addr:         fmt.Sprintf("%s:%d", host, port),
		Handler:      s.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return s
}

// setupRoutes configures all routes
func (s *Server) setupRoutes() {
	// Apply middleware
	s.router.Use(middleware.CORS)
	s.router.Use(middleware.Logging(s.logger))
	s.router.Use(middleware.Recovery(s.logger))

	h := handlers.NewHandlers(s.logger)

	// WebSocket route (must be before API routes to avoid conflicts)
	s.router.HandleFunc("/ws", h.WebSocketHandler).Methods("GET")

	// API routes
	s.router.HandleFunc("/api/neurons", h.ListNeurons).Methods("GET")
	s.router.HandleFunc("/api/neurons", h.CreateNeuron).Methods("POST")
	s.router.HandleFunc("/api/neurons/generate", h.GenerateNeuron).Methods("POST")
	s.router.HandleFunc("/api/neurons/{id}/script", h.GetNeuronScript).Methods("GET")
	s.router.HandleFunc("/api/neurons/{id}/execute", h.ExecuteNeuron).Methods("POST")
	s.router.HandleFunc("/api/synapses", h.ListSynapses).Methods("GET")
	s.router.HandleFunc("/api/synapses", h.CreateSynapse).Methods("POST")
	s.router.HandleFunc("/api/synapses/{id}", h.GetSynapse).Methods("GET")
	s.router.HandleFunc("/api/synapses/{id}/execute", h.ExecuteSynapse).Methods("POST")
	s.router.HandleFunc("/api/synapses/{id}", h.UpdateSynapse).Methods("PUT")
	s.router.HandleFunc("/api/synapses/{id}", h.DeleteSynapse).Methods("DELETE")
	s.router.HandleFunc("/api/execute", h.Execute).Methods("POST")
	s.router.HandleFunc("/api/metrics", h.GetMetrics).Methods("GET")
	s.router.HandleFunc("/api/executions", h.ListExecutions).Methods("GET")

	// Serve frontend static files (must be last as it's a catch-all)
	s.serveFrontend()
}

// serveFrontend serves the embedded frontend files with SPA support
func (s *Server) serveFrontend() {
	// Get the embedded filesystem
	frontendFS, err := fs.Sub(frontendFiles, "frontend/dist")
	if err != nil {
		s.logger.Error(err, "Failed to load frontend files")
		// Fallback: serve a simple message
		s.router.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html")
			fmt.Fprintf(w, `
<!DOCTYPE html>
<html>
<head>
    <title>Cortex UI</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 30px; border-radius: 8px; }
        h1 { color: #333; }
        code { background: #e0e0e0; padding: 2px 6px; border-radius: 3px; }
        .info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cortex Web UI</h1>
        <div class="info">
            <p><strong>Status:</strong> Frontend not yet built</p>
            <p>To build the frontend:</p>
            <ol>
                <li>Navigate to <code>web/frontend</code></li>
                <li>Run <code>npm install</code></li>
                <li>Run <code>npm run build</code></li>
                <li>Restart the server</li>
            </ol>
        </div>
        <h2>API Endpoints</h2>
        <ul>
            <li>GET <code>/api/neurons</code> - List all neurons</li>
            <li>GET <code>/api/synapses</code> - List all synapses</li>
            <li>POST <code>/api/execute</code> - Execute neuron or synapse</li>
            <li>GET <code>/api/metrics</code> - System metrics</li>
            <li>GET <code>/api/executions</code> - Execution history</li>
            <li>WS <code>/ws</code> - WebSocket for real-time logs</li>
        </ul>
    </div>
</body>
</html>`)
		})
		return
	}

	// SPA handler that serves index.html for all non-file routes
	spaHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Try to open the file
		f, err := frontendFS.Open(path[1:]) // Remove leading slash
		if err == nil {
			// File exists, serve it
			f.Close()
			http.FileServer(http.FS(frontendFS)).ServeHTTP(w, r)
			return
		}

		// File doesn't exist, serve index.html for SPA routing
		indexFile, err := frontendFS.Open("index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusNotFound)
			return
		}
		defer indexFile.Close()

		indexContent, err := io.ReadAll(indexFile)
		if err != nil {
			http.Error(w, "Failed to read index.html", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		w.Write(indexContent)
	})

	s.router.PathPrefix("/").Handler(spaHandler)
}

// Start starts the HTTP server
func (s *Server) Start() error {
	s.logger.Infof("Server listening on %s", s.httpServer.Addr)
	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return s.httpServer.Shutdown(ctx)
}

// Router returns the server's HTTP router for testing purposes
func (s *Server) Router() *mux.Router {
	return s.router
}
