# Cortex Web UI Architecture

## Overview

The Cortex Web UI uses a modern architecture with **Vite** for fast development and **embedded assets** for production deployment.

---

## Architecture Diagram

### Development Mode (Hot Reload)

```
┌─────────────────────────────────────────────────────────────┐
│                        Developer                             │
│                            ↓                                 │
│                    Edits .tsx file                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Vite Dev Server (Port 3000)                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Hot Module Replacement (HMR)                      │    │
│  │  • Detects file changes                            │    │
│  │  • Rebuilds only changed modules                   │    │
│  │  • Updates browser without full reload             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Proxy Configuration                               │    │
│  │  • /api/* → http://localhost:8080                  │    │
│  │  • /ws → ws://localhost:8080                       │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  React Components (live reload)                    │    │
│  │  • Dashboard                                       │    │
│  │  • Synapse Builder                                 │    │
│  │  • System Metrics                                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
                      API Calls /api/*
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Go Backend (Port 8080)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  REST API                                          │    │
│  │  • GET  /api/neurons                               │    │
│  │  • GET  /api/synapses                              │    │
│  │  • POST /api/execute                               │    │
│  │  • GET  /api/metrics                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  WebSocket                                         │    │
│  │  • WS /ws (real-time logs)                         │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ⚡ Instant feedback (changes in <100ms)
- 🐛 Better debugging with source maps
- 🔄 Keep state between changes

---

### Production Mode (Embedded Assets)

```
┌─────────────────────────────────────────────────────────────┐
│                     Build Process                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 1: TypeScript Compilation                             │
│  ─────────────────────────────────────────────────────────  │
│  .tsx files → TypeScript Compiler → .js files               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Vite Build                                         │
│  ─────────────────────────────────────────────────────────  │
│  .js files → Vite → Optimized bundles                       │
│                                                              │
│  Optimizations:                                             │
│  • Code splitting                                           │
│  • Tree shaking (remove unused code)                        │
│  • Minification                                             │
│  • Asset hashing (for caching)                              │
│                                                              │
│  Output: web/frontend/dist/                                 │
│    ├── index.html                                           │
│    └── assets/                                              │
│        ├── index-[hash].js   (419 KB)                       │
│        └── index-[hash].css  (39 KB)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Copy to Server Directory                           │
│  ─────────────────────────────────────────────────────────  │
│  cp -r web/frontend/dist web/server/frontend                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Go Embed                                           │
│  ─────────────────────────────────────────────────────────  │
│  //go:embed frontend                                        │
│  var frontendFiles embed.FS                                 │
│                                                              │
│  Result: All frontend files embedded in Go binary           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Single Binary: ./cortex                       │
│                     (~10 MB)                                 │
│                                                              │
│  Contains:                                                   │
│  • Go backend code                                          │
│  • REST API handlers                                        │
│  • WebSocket server                                         │
│  • Embedded frontend assets                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
                     ./cortex ui --port 8080
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Runtime Architecture                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Browser (http://localhost:8080)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Go HTTP Server (Port 8080)              │  │
│  │                                                       │  │
│  │  Request Routing:                                    │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ Static Files (/*, /assets/*)                   │ │  │
│  │  │   → Serve from embedded FS                     │ │  │
│  │  │   → Returns HTML/JS/CSS                        │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ API Endpoints (/api/*)                         │ │  │
│  │  │   → REST API handlers                          │ │  │
│  │  │   → Returns JSON                               │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ WebSocket (/ws)                                │ │  │
│  │  │   → Real-time log streaming                    │ │  │
│  │  │   → Bidirectional communication                │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- 📦 Single binary deployment
- 🚀 Fast startup (no separate web server)
- 🔒 No Node.js required in production
- ☁️ Easy to containerize

---

## Vite in Detail

### What is Vite?

**Vite** (French for "fast") is a modern frontend build tool created by Evan You (creator of Vue.js).

**Key Features:**

1. **Lightning-Fast HMR (Hot Module Replacement)**
   - Updates browser in <100ms
   - Preserves component state
   - No full page reload

2. **Native ES Modules**
   - Uses browser's native import
   - No bundling in development
   - Instant server start

3. **Optimized Builds**
   - Uses Rollup for production
   - Tree-shaking (removes unused code)
   - Code splitting
   - Asset optimization

4. **Plugin Ecosystem**
   - React plugin (`@vitejs/plugin-react`)
   - TypeScript support (built-in)
   - CSS preprocessors
   - Many more...

### Vite Configuration

**File:** `web/frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Plugins
  plugins: [
    react(),  // Enables React Fast Refresh
  ],

  // Dev server configuration
  server: {
    port: 3000,  // Dev server port

    // Proxy API calls to backend
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,  // Enable WebSocket proxy
      },
    },
  },

  // Build configuration
  build: {
    outDir: 'dist',      // Output directory
    sourcemap: true,     // Generate source maps
    rollupOptions: {
      // Custom Rollup config (optional)
    },
  },
})
```

### How Vite Proxy Works

**Development Request Flow:**

```
Browser (http://localhost:3000)
    │
    ├─ GET /             → Vite serves index.html
    ├─ GET /assets/*     → Vite serves with HMR
    │
    ├─ GET /api/neurons  → Vite proxies to :8080
    │       ↓
    │   Backend (http://localhost:8080)
    │       ↓
    │   Returns JSON
    │       ↓
    ├─ Browser receives response
    │
    └─ WS /ws           → Vite proxies to :8080
            ↓
        Backend WebSocket
            ↓
        Real-time logs
```

**Why Proxy?**
- Avoids CORS issues in development
- Backend runs on different port (8080)
- Frontend dev server runs on port 3000
- Proxy makes them work together seamlessly

---

## Build Pipeline

### npm Scripts Explained

```json
{
  "scripts": {
    // Development
    "dev": "vite",
    // Starts Vite dev server on port 3000
    // Enables hot module replacement
    // Proxies /api and /ws to backend

    // Production build
    "build": "tsc && vite build",
    // Step 1: tsc - TypeScript type checking
    // Step 2: vite build - Bundle for production

    // Preview production build
    "preview": "vite preview",
    // Serves the dist/ folder locally
    // For testing production build

    // Linting
    "lint": "eslint . --ext ts,tsx",
    // Checks code quality

    // Type checking only
    "typecheck": "tsc --noEmit",
    // Checks types without generating files
  }
}
```

### Build Output

**After `npm run build`:**

```
web/frontend/dist/
├── index.html                   (652 bytes)
└── assets/
    ├── index-De4sVNsY.js       (419 KB, gzip: 136 KB)
    └── index--MeIacu2.css      (39 KB, gzip: 7.6 KB)
```

**Optimizations Applied:**
- ✅ Minification (removes whitespace, shortens variable names)
- ✅ Tree-shaking (removes unused code)
- ✅ Code splitting (separates vendor code)
- ✅ Asset hashing (for cache busting)
- ✅ Gzip compression (smaller file size)

---

## Component Architecture

### React Component Tree

```
App (Router)
├── Header (Navigation)
│   └── Navigation Links
│       ├── Dashboard
│       ├── Synapse Builder
│       └── Settings
│
├── Route: / (Dashboard)
│   ├── NeuronCard[] (map over neurons)
│   ├── SystemMetrics (CPU, Memory, Disk)
│   └── ExecutionLogs (WebSocket)
│
├── Route: /synapse-builder (SynapseBuilder)
│   ├── NeuronPalette (draggable neurons)
│   ├── Canvas (drop zone)
│   └── ReactFlow (visual graph)
│
└── Route: /settings (Settings)
    └── Configuration UI
```

### State Management

**Local State (useState):**
- Component-specific state
- Form inputs
- UI toggles

**Context (useContext):**
- Not currently used, but can add for:
  - Theme (dark/light mode)
  - User auth
  - Global settings

**WebSocket State (useWebSocket custom hook):**
- Real-time log updates
- System metrics
- Execution status

---

## API Architecture

### REST Endpoints

```
GET    /api/neurons              List all neurons
GET    /api/synapses             List all synapses
POST   /api/synapses             Create new synapse
GET    /api/synapses/:id         Get synapse by ID
PUT    /api/synapses/:id         Update synapse
DELETE /api/synapses/:id         Delete synapse
POST   /api/execute              Execute neuron/synapse
GET    /api/metrics              Get system metrics
GET    /api/executions           Get execution history
```

### WebSocket Protocol

```
Client → Server:
{
  "action": "subscribe",
  "channel": "logs"
}

Server → Client:
{
  "type": "log",
  "data": {
    "message": "Executing neuron...",
    "timestamp": "2024-11-22T05:15:00Z",
    "level": "info"
  }
}

Server → Client:
{
  "type": "metrics",
  "data": {
    "cpu": 45.2,
    "memory": 62.8,
    "disk": 73.1
  }
}
```

---

## Performance Characteristics

### Development Mode

| Metric | Value |
|--------|-------|
| Dev server start | ~500ms |
| Hot reload latency | <100ms |
| Full page reload | ~1s |
| API response time | <50ms |
| WebSocket latency | <20ms |

### Production Mode

| Metric | Value |
|--------|-------|
| Binary size | ~10 MB |
| Frontend size | ~460 KB (gzip: 144 KB) |
| Initial load | <2s |
| Time to interactive | <3s |
| API response time | <50ms |
| WebSocket latency | <20ms |

### Bundle Analysis

```
web/frontend/dist/assets/
├── index-*.js     419 KB  (main bundle)
│   ├── React       130 KB  (31%)
│   ├── React Flow  180 KB  (43%)
│   ├── Axios        40 KB  (10%)
│   └── App code     69 KB  (16%)
│
└── index-*.css     39 KB   (Tailwind CSS)
```

---

## Deployment Architectures

### Single Server

```
┌─────────────────────────────┐
│      Server (VM/EC2)        │
│                             │
│  ┌───────────────────────┐ │
│  │   ./cortex ui         │ │
│  │   (Port 8080)         │ │
│  │                       │ │
│  │  • Serves frontend    │ │
│  │  • REST API           │ │
│  │  • WebSocket          │ │
│  └───────────────────────┘ │
│                             │
│  ┌───────────────────────┐ │
│  │   Nginx (reverse proxy) │
│  │   (Port 80/443)       │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
```

### Docker Container

```
FROM golang:1.25 AS builder
COPY . /app
WORKDIR /app
RUN cd web/frontend && npm install && npm run build
RUN cd web/server && cp -r ../frontend/dist frontend
RUN go build -o cortex .

FROM alpine:latest
COPY --from=builder /app/cortex /cortex
EXPOSE 8080
CMD ["/cortex", "ui", "--host", "0.0.0.0", "--port", "8080"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-ui
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: cortex
        image: cortex:latest
        command: ["/cortex", "ui"]
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: cortex-ui
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
```

---

## Security Considerations

### Production Checklist

- [ ] Enable HTTPS (TLS termination at load balancer)
- [ ] Add authentication (OIDC recommended)
- [ ] Implement CSRF protection
- [ ] Set secure headers (CSP, X-Frame-Options, etc.)
- [ ] Rate limiting on API endpoints
- [ ] WebSocket authentication
- [ ] Audit logging for sensitive operations

### CORS Configuration

**Development:**
```go
// Allow localhost:3000 (Vite dev server)
w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
```

**Production:**
```go
// Same origin only (frontend served by same server)
// No CORS headers needed
```

---

## Future Enhancements

### Planned Features

1. **Authentication**
   - OIDC integration
   - JWT tokens
   - Role-based access control

2. **Enhanced UI**
   - Dark mode
   - AI neuron generation UI
   - Execution history page
   - Neuron marketplace

3. **Performance**
   - Service worker (offline support)
   - Progressive Web App (PWA)
   - Virtual scrolling for large lists

4. **Developer Experience**
   - Storybook for component development
   - Playwright E2E tests
   - Visual regression testing

---

## Resources

- **Vite**: https://vitejs.dev/
- **React**: https://react.dev/
- **Go embed**: https://pkg.go.dev/embed
- **WebSocket**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

---

**Questions?** Check the [WEB_UI_GUIDE.md](WEB_UI_GUIDE.md) for detailed usage instructions.
