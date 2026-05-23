# Cortex Web UI - Complete Guide

Complete documentation for building, running, and deploying the Cortex Web UI with React + Vite.

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Build (Recommended)](#docker-build-recommended)
- [Local Build](#local-build)
- [Features](#features)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [Development Guide](#development-guide)

---

## Quick Start

### Option 1: Docker Build (Recommended) 🐳

**Best for: Production, avoiding platform issues, consistent builds**

```bash
# Build Docker image with UI
make docker-build-ui

# Run Cortex UI
make docker-run-ui

# Open browser
open http://localhost:8080
```

**Benefits:**
- ✅ No ARM64/platform issues
- ✅ No Node.js installation needed
- ✅ Consistent environment
- ✅ Single command deployment

### Option 2: Local Build

**Best for: Development with hot reload**

```bash
# Build frontend
cd web/frontend
npm install
npm run build

# Copy to server directory
cd ../server
cp -r ../frontend/dist frontend

# Build Cortex
cd ../..
go build -o cortex .

# Start UI
./cortex ui --port 8080

# Open browser
open http://localhost:8080
```

---

## Docker Build (Recommended)

### Recent Certificate Fix Applied ✅

If you synced code from the main repo and encountered certificate verification errors during Docker build, these have been **fixed** in `Dockerfile.ui`.

#### Problems Fixed:

1. **TLS Certificate Verification Failures**
   ```
   error:0A000086:SSL routines:tls_post_process_server_certificate:certificate verify failed
   ```

2. **Alpine Package Manager Errors**
   ```
   ERROR: unable to select packages: git (no such package)
   ```

3. **Go Module Download Failures**
   ```
   tls: failed to verify certificate: x509: certificate signed by unknown authority
   ```

#### Solutions Applied:

The `Dockerfile.ui` now includes:

1. **HTTP Repository Bootstrap** - Temporarily uses HTTP to install CA certificates
2. **Certificate Store Update** - Properly configures system certificates
3. **Go SSL Configuration** - Sets `SSL_CERT_FILE` for Go module downloads

**The build now works in corporate networks, proxies, and restricted environments!**

### Docker Build Commands

```bash
# Build image
make docker-build-ui

# Run container
make docker-run-ui

# Or manually
docker run --rm -it -p 8080:8080 cortex-ui:latest cortex ui --host 0.0.0.0 --port 8080
```

### Docker Compose

Create `docker-compose.ui.yml`:

```yaml
version: '3.8'

services:
  cortex-ui:
    build:
      context: .
      dockerfile: Dockerfile.ui
    image: cortex-ui:latest
    container_name: cortex-ui
    ports:
      - "8080:8080"
    command: cortex ui --host 0.0.0.0 --port 8080
    restart: unless-stopped
```

Run:
```bash
docker-compose -f docker-compose.ui.yml up -d
```

### Advanced Docker Usage

**Run on different port:**
```bash
docker run --rm -it -p 3000:3000 cortex-ui:latest cortex ui --host 0.0.0.0 --port 3000
```

**Mount custom neurons:**
```bash
docker run --rm -it \
  -p 8080:8080 \
  -v $(pwd)/my-neurons:/cortex/neurons \
  cortex-ui:latest \
  cortex ui --host 0.0.0.0 --port 8080
```

**With environment variables:**
```bash
docker run --rm -it \
  -p 8080:8080 \
  -e OPENAI_API_KEY="sk-..." \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  cortex-ui:latest \
  cortex ui --host 0.0.0.0 --port 8080
```

---

## Local Build

### Prerequisites

- Node.js 18+
- Go 1.25+

### Production Mode (Single Binary)

```bash
# Step 1: Build frontend
cd web/frontend
npm install
npm run build

# Step 2: Copy to server directory
cd ../server
cp -r ../frontend/dist frontend

# Step 3: Build Cortex with embedded UI
cd ../..
go build -o cortex .

# Step 4: Start the UI
./cortex ui --port 8080

# Step 5: Open browser
open http://localhost:8080
```

### Development Mode (Hot Reload)

For UI development with instant updates:

```bash
# Terminal 1: Start backend
go build -o cortex .
./cortex ui --port 8080

# Terminal 2: Start Vite dev server
cd web/frontend
npm install
npm run dev

# Opens at http://localhost:3000
# Changes to .tsx files auto-reload
```

**Development Benefits:**
- ⚡ Instant hot reload
- 🐛 Better error messages
- 📍 Source maps for debugging

---

## Features

### 1. AI Neuron Generation

AI-powered neuron generation allows SRE teams to create debugging scripts using natural language prompts.

**Supported Providers:**
- OpenAI GPT-4
- Anthropic Claude 3.5
- Ollama (local, free, privacy-first)

**Usage:**

```bash
# Using OpenAI
export OPENAI_API_KEY='sk-...'
cortex generate-neuron \
  --prompt "Check if PostgreSQL is running and accepting connections" \
  --provider openai

# Using Anthropic
export ANTHROPIC_API_KEY='sk-ant-...'
cortex generate-neuron \
  --prompt "Find which process is using port 8080" \
  --provider anthropic

# Using Ollama (local, free)
ollama serve &
cortex generate-neuron \
  --prompt "Check disk usage and alert if any mount exceeds 80%" \
  --provider ollama
```

**Features:**
- ✅ Multi-provider support
- ✅ Smart type detection (check vs mutate)
- ✅ Production-ready scripts with error handling
- ✅ Metadata tracking
- ✅ Privacy options with Ollama

**Benefits:**
- 10x faster script creation
- Junior engineers can create production-quality scripts
- Consistent quality across teams
- Reduced toil

### 2. Web UI Dashboard

Modern React-based web interface for managing neurons, creating synapses visually, and monitoring executions in real-time.

**Technology Stack:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Flow (visual synapse builder)
- Axios (API client)
- WebSocket (real-time updates)

**Features:**

**Dashboard:**
- Neuron library with cards
- Execute neurons with one click
- System metrics (CPU, Memory, Disk)
- Real-time execution logs

**Synapse Builder:**
- Drag-and-drop visual editor
- Connect neurons into workflows
- Save synapses

**REST API Endpoints:**
- `GET /api/neurons` - List neurons
- `GET /api/synapses` - List synapses
- `POST /api/synapses` - Create synapse
- `GET /api/synapses/{id}` - Get synapse
- `PUT /api/synapses/{id}` - Update synapse
- `DELETE /api/synapses/{id}` - Delete synapse
- `POST /api/execute` - Execute neuron/synapse
- `GET /api/metrics` - System metrics
- `GET /api/executions` - Execution history

**WebSocket:**
- Real-time log streaming
- Execution status updates

**Benefits:**
- Visual workflow creation (no YAML editing)
- Real-time visibility
- Centralized management
- Team collaboration

---

## Troubleshooting

### Docker Build Issues

#### Error: Certificate Verification Failed

**Fixed in latest Dockerfile.ui!** If you still encounter issues:

```bash
# Rebuild with latest Dockerfile
docker builder prune -af
make docker-build-ui
```

#### Error: npm E403 Forbidden (Artifactory)

Your `package-lock.json` may have hardcoded corporate registry URLs.

**Solution:**
```bash
cd web/frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm config set registry https://registry.npmjs.org/
npm install

# Now rebuild Docker image
cd ../..
make docker-build-ui
```

### Local Build Issues

#### Error: Cannot find module @rollup/rollup-darwin-arm64

**Root Cause:** Apple Silicon (M1/M2/M3) Mac with npm optional dependency bug.

**Solution:**

```bash
cd web/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
cd ../..
make build
```

**Or use Makefile shortcut:**
```bash
make ui-fix-arm64 && make build
```

**If that doesn't work:**
```bash
cd web/frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --force
npm run build
```

#### Error: sh: tsc: command not found

**Root Cause:** TypeScript compiler not installed.

**Solution:**
```bash
cd web/frontend
npm install
cd ../..
make build
```

#### Error: crypto$2.getRandomValues is not a function

**Root Cause:** Corrupted node_modules cache.

**Solution:**
```bash
cd web/frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run build
```

**Update npm (if old version):**
```bash
npm install -g npm@latest
npm --version  # Should show 10.x.x or higher
```

#### Error: Port 8080 already in use

**Solution:**
```bash
# Use different port
docker run --rm -it -p 3000:8080 cortex-ui:latest cortex ui --host 0.0.0.0 --port 8080

# Or kill process on 8080
lsof -ti:8080 | xargs kill -9
```

#### Error: Cannot connect to backend

**Solution:**
```bash
# Check backend is running
curl http://localhost:8080/api/metrics

# Should return JSON with system metrics
```

#### Error: 404 Not Found in browser

**Solution:**
```bash
# Ensure frontend is built and copied
ls web/frontend/dist/
ls web/server/frontend/

# If missing, rebuild:
cd web/frontend && npm run build
cd ../server && cp -r ../frontend/dist frontend
cd ../.. && go build -o cortex .
```

### Platform-Specific Issues

**macOS:**

Update npm if old version (8.x):
```bash
npm install -g npm@latest
```

Fix npm permissions:
```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

**Linux:**

Fix npm permissions:
```bash
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER /usr/local/lib/node_modules
```

File watcher limit:
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Windows:**

Long path errors:
```powershell
# Run as Administrator
git config --system core.longpaths true
```

---

## Architecture

### Multi-Stage Docker Build

The `Dockerfile.ui` uses a 3-stage build process:

**Stage 1: Build Frontend**
```dockerfile
FROM node:18-alpine AS frontend-builder
# Uses Node 18 in Alpine (small, fast)
# Builds frontend inside container
# No ARM64 issues because Docker handles architecture
```

**Stage 2: Build Backend**
```dockerfile
FROM golang:1.25-alpine AS backend-builder
# Copies built frontend from Stage 1
# Embeds frontend in Go binary
```

**Stage 3: Runtime**
```dockerfile
FROM alpine:latest
# Copies only the binary (~50MB total)
# No Node.js, no Go in final image
# Small, secure, fast
```

**Benefits:**
- ✅ Multi-stage build = small final image (~50MB)
- ✅ All dependencies inside container
- ✅ Works on any platform
- ✅ Reproducible builds

### Frontend Architecture

**Component Structure:**
```
web/frontend/src/
├── App.tsx                 # Main app with routing
├── components/
│   ├── Dashboard.tsx       # Neuron library & execution
│   ├── SynapseBuilder.tsx  # Visual workflow editor
│   ├── Settings.tsx        # Configuration
│   ├── NeuronCard.tsx      # Neuron display component
│   └── ExecutionLogs.tsx   # Real-time log viewer
├── hooks/
│   └── useWebSocket.ts     # WebSocket connection hook
├── api/
│   └── client.ts           # API client
└── types/
    └── index.ts            # TypeScript types
```

**Build Pipeline:**
```
1. TypeScript compilation (tsc)
2. Vite bundling & optimization
3. Asset generation (JS, CSS)
4. Output to dist/
5. Copy to web/server/frontend/
6. Embed in Go binary
```

### Backend Architecture

**Server Structure:**
```
web/server/
├── server.go              # Main server with embedded frontend
├── handlers/
│   └── handlers.go        # REST API handlers
├── services/
│   ├── websocket.go       # WebSocket service
│   ├── neuron_service.go  # Neuron operations
│   └── execution_service.go # Execution management
├── middleware/
│   └── middleware.go      # CORS, logging, recovery
└── frontend/              # Embedded frontend assets
    └── dist/              # Built frontend (copied from web/frontend/dist)
```

### Development vs Production

| Feature | Development (Vite) | Production (Embedded) |
|---------|-------------------|----------------------|
| **Port** | 3000 | 8080 (or custom) |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Node.js Required** | ✅ Yes | ❌ No |
| **Build Time** | None (instant start) | ~5s for frontend build |
| **Deployment** | Not for production | ✅ Single binary |

**Development Flow:**
```
Browser ← Vite (3000) ← Proxy → Backend (8080)
```

**Production Flow:**
```
Browser ← Go Server (8080) with embedded frontend
```

---

## Development Guide

### Making Changes to the UI

**1. Component Changes:**
```bash
cd web/frontend
npm run dev  # Start Vite dev server

# Edit .tsx files in src/components/
# Changes appear instantly in browser
```

**2. Adding a New Page:**
```bash
# Create component
touch web/frontend/src/components/MyPage.tsx

# Add route in App.tsx
<Route path="/my-page" element={<MyPage />} />

# Add to navigation menu
```

**3. Adding a New API Endpoint:**

Backend (`web/server/handlers/handlers.go`):
```go
func (h *Handlers) MyNewEndpoint(w http.ResponseWriter, r *http.Request) {
    // Implementation
}
```

Register route (`web/server/server.go`):
```go
router.HandleFunc("/api/my-endpoint", handlers.MyNewEndpoint).Methods("GET")
```

Frontend (`web/frontend/src/api/client.ts`):
```typescript
export const getMyData = async () => {
  const response = await axios.get('/api/my-endpoint');
  return response.data;
};
```

**4. Styling Changes:**
```bash
# Edit component with TailwindCSS classes
# Or edit global styles
vim web/frontend/src/styles/index.css
```

### Building for Production

```bash
# Build frontend
cd web/frontend
npm run build

# Verify output
ls -la dist/
# Should show: index.html, assets/index-*.js, assets/index-*.css

# Copy to server directory
cd ../server
cp -r ../frontend/dist frontend

# Build Go binary with embedded frontend
cd ../..
go build -o cortex .

# Test
./cortex ui --port 8080
```

### Deployment

**Single Binary Deployment:**
```bash
# Build
make docker-build-ui

# Tag for registry
docker tag cortex-ui:latest myregistry.com/cortex-ui:v1.0

# Push
docker push myregistry.com/cortex-ui:v1.0

# Deploy
docker run -d -p 8080:8080 myregistry.com/cortex-ui:v1.0 cortex ui --host 0.0.0.0
```

**Or deploy binary directly:**
```bash
# Build locally
go build -o cortex .

# Copy to server
scp cortex user@server:/usr/local/bin/

# Run on server
ssh user@server "cortex ui --host 0.0.0.0 --port 8080"
```

### Common Development Commands

```bash
# Development
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production (output: dist/)
npm run preview      # Preview production build
npm run typecheck    # Check TypeScript types

# Production
./cortex ui --port 8080              # Start on port 8080
./cortex ui --host 0.0.0.0 --port 80 # Bind to all interfaces

# Docker
make docker-build-ui   # Build Docker image
make docker-run-ui     # Run Docker container
```

---

## Performance

### Bundle Sizes

- **JavaScript**: ~420 KB (gzip: ~136 KB)
- **CSS**: ~40 KB (gzip: ~8 KB)
- **Binary**: ~10 MB (includes backend + embedded frontend)

### Load Times

- **Initial load**: <2 seconds
- **Time to interactive**: <3 seconds
- **Hot reload**: <100ms (development)
- **WebSocket latency**: <100ms

### Image Size Comparison

```
Regular build (with Node + Go): ~800 MB
Multi-stage Docker build:        ~50 MB  ✨
```

---

## Verification Steps

After building, verify everything works:

```bash
# 1. Check Node/npm versions
node --version   # Should be 18+ or 20+
npm --version    # Should be 9+ or 10+

# 2. Clean build
cd web/frontend
rm -rf node_modules package-lock.json dist
npm install

# 3. Build
npm run build

# 4. Verify output
ls -la dist/
# Should show: index.html, assets/index-*.js, assets/index-*.css

# 5. Full Cortex build
cd ../..
make build

# 6. Test
./cortex ui --port 8080
# Open http://localhost:8080
```

---

## Summary

### Docker Build (Recommended)

✅ **No platform issues** - Works on Mac (Intel/ARM), Linux, Windows
✅ **Certificate fixes applied** - Works in corporate networks
✅ **Single command** - `make docker-build-ui && make docker-run-ui`
✅ **Small image** - ~50MB final image
✅ **Easy deployment** - Docker image or single binary

### Local Build

✅ **Fast development** - Hot reload with Vite
✅ **Full control** - Direct access to all tools
✅ **Debugging** - Source maps and DevTools

### Choose Based on Your Needs:

- **Production/Testing/ARM64 Issues**: Use Docker
- **UI Development with Hot Reload**: Use Local Build (dev mode)
- **Quick Testing**: Use Docker
- **Deployment**: Use Docker or single binary

---

## Related Documentation

- [AI_NEURON_GENERATION.md](AI_NEURON_GENERATION.md) - AI neuron generation guide
- [BUILD_WORKFLOW.md](BUILD_WORKFLOW.md) - Build automation
- [UI_ARCHITECTURE.md](UI_ARCHITECTURE.md) - Architecture deep-dive

---

## External Resources

- **Vite Documentation**: https://vitejs.dev/
- **React Documentation**: https://react.dev/
- **TailwindCSS**: https://tailwindcss.com/
- **React Flow**: https://reactflow.dev/
- **Go embed**: https://pkg.go.dev/embed
- **Docker Multi-Stage Builds**: https://docs.docker.com/build/building/multi-stage/

---

**Happy building!** 🚀✨
