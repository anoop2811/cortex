# Cortex Web UI - Complete Guide

## Overview

Cortex Web UI is a modern React-based dashboard for managing neurons, building synapses visually, and monitoring executions in real-time. Built with **Vite**, React 18, and TailwindCSS.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Two Ways to Run the UI](#two-ways-to-run-the-ui)
3. [Features Overview](#features-overview)
4. [Detailed Usage Guide](#detailed-usage-guide)
5. [Development Guide](#development-guide)
6. [Architecture](#architecture)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 18+ (for development)
- Go 1.25+ (for production build)
- npm or yarn

### Option 1: Production Mode (Recommended)

```bash
# 1. Build the frontend with Vite
cd web/frontend
npm install
npm run build

# 2. Copy built assets to server directory (for Go embedding)
cd ../server
cp -r ../frontend/dist frontend

# 3. Build Cortex with embedded UI
cd ../..
go build -o cortex .

# 4. Start the Web UI
./cortex ui --port 8080

# 5. Open browser
open http://localhost:8080
```

### Option 2: Development Mode (Hot Reload)

```bash
# Terminal 1: Start backend server
cd /workspaces/cortex
go build -o cortex .
./cortex ui --port 8080

# Terminal 2: Start Vite dev server with hot reload
cd web/frontend
npm install
npm run dev

# Open browser at http://localhost:3000
# Vite will proxy API calls to backend at :8080
```

---

## Two Ways to Run the UI

### 🚀 Production Mode (Single Binary)

**Use when:**
- Deploying to production
- Want single binary deployment
- No need for hot reload

**Pros:**
- ✅ Single binary - easy deployment
- ✅ Fast startup
- ✅ No Node.js required to run
- ✅ Frontend assets embedded

**Cons:**
- ❌ Must rebuild for UI changes
- ❌ No hot reload

**Steps:**

```bash
# Build frontend
cd web/frontend
npm run build
# Output: dist/ directory created

# Copy to server directory
cd ../server
cp -r ../frontend/dist frontend

# Build Cortex
cd ../..
go build -o cortex .

# Run
./cortex ui --port 8080
```

### 🔧 Development Mode (Vite Dev Server)

**Use when:**
- Developing UI features
- Want hot reload
- Testing UI changes

**Pros:**
- ✅ Hot reload (instant updates)
- ✅ Fast Vite dev server
- ✅ Source maps for debugging
- ✅ Better error messages

**Cons:**
- ❌ Need two terminals
- ❌ Requires Node.js running

**Steps:**

```bash
# Terminal 1: Backend
./cortex ui --port 8080

# Terminal 2: Frontend
cd web/frontend
npm run dev
# Opens at http://localhost:3000
```

**How it works:**
- Vite dev server runs on port **3000**
- Backend API runs on port **8080**
- Vite proxy forwards `/api/*` and `/ws` to backend
- Any change to React files auto-reloads browser

---

## Features Overview

### 1. Dashboard

**Path:** `http://localhost:8080/`

**Features:**
- 📚 **Neuron Library**: Browse all available neurons
- ▶️ **Execute Neurons**: Run neurons with one click
- 📊 **System Metrics**: Live CPU, Memory, Disk usage
- 📝 **Execution Logs**: Real-time log streaming via WebSocket
- 🎨 **Beautiful UI**: Modern design with gradient backgrounds

**What you can do:**
- View all neurons from all teams
- Execute a neuron immediately
- Watch logs stream in real-time
- Monitor system health

### 2. Synapse Builder

**Path:** `http://localhost:8080/synapse-builder`

**Features:**
- 🎯 **Visual Editor**: Drag-and-drop workflow builder
- 🔗 **Connect Neurons**: Link neurons into workflows
- 💾 **Save Synapses**: Save your workflows
- 📋 **Neuron Palette**: Browse available neurons
- 🖼️ **Canvas**: Visual DAG representation

**What you can do:**
- Build complex troubleshooting workflows visually
- Connect neurons without editing YAML
- See workflow structure at a glance

### 3. Settings

**Path:** `http://localhost:8080/settings`

**Features:**
- ⚙️ Configuration interface (placeholder for future features)

---

## Detailed Usage Guide

### Starting the UI

#### Production Deployment

```bash
# Build once
cd web/frontend
npm install
npm run build
cd ../server
cp -r ../frontend/dist frontend
cd ../..
go build -o cortex .

# Run (can copy binary anywhere)
./cortex ui --port 8080

# Or bind to all interfaces
./cortex ui --host 0.0.0.0 --port 8080

# With custom neurons directory
CORTEX_NEURONS_DIR=/path/to/neurons ./cortex ui --port 8080
```

#### Development with Hot Reload

```bash
# Terminal 1: Backend
./cortex ui --port 8080 --verbose 3

# Terminal 2: Frontend with Vite
cd web/frontend
npm run dev

# Vite will open http://localhost:3000
# Changes to .tsx files auto-reload
```

### Using the Dashboard

1. **Browse Neurons**
   - Navigate to http://localhost:8080
   - See all neurons as cards
   - Each card shows:
     - Neuron name
     - Type (check/mutate)
     - Description
     - Execute button

2. **Execute a Neuron**
   - Click "Execute" on any neuron card
   - Logs appear in real-time below
   - Exit code shown on completion
   - Success/failure indicated with colors

3. **Monitor System Metrics**
   - Top right corner shows live metrics:
     - CPU usage %
     - Memory usage %
     - Disk usage %
   - Updates every 2 seconds via WebSocket

4. **View Execution Logs**
   - Logs stream in real-time via WebSocket
   - ANSI colors preserved
   - Auto-scroll to latest
   - Clear button to reset

### Using the Synapse Builder

1. **Open Builder**
   - Click "Synapse Builder" in navigation
   - Or navigate to http://localhost:8080/synapse-builder

2. **Drag Neurons**
   - Left side: Neuron palette (available neurons)
   - Right side: Canvas (drop zone)
   - Drag neuron from palette to canvas

3. **Connect Neurons**
   - Click output handle on neuron A
   - Drag to input handle on neuron B
   - Creates edge (connection)
   - Visual arrow shows flow

4. **Save Synapse**
   - Click "Save Synapse" button
   - Enter synapse name
   - Saves to synapse.yaml

### Mobile/Responsive Usage

The UI is fully responsive:

- **Desktop** (>768px): Full navigation bar
- **Mobile** (<768px): Hamburger menu
- **Tablet**: Optimized layout
- **Touch**: Drag-and-drop works on touch screens

---

## Development Guide

### Tech Stack

**Frontend:**
- ⚛️ React 18 (with TypeScript)
- ⚡ Vite 5 (build tool & dev server)
- 🎨 TailwindCSS 3 (styling)
- 🔀 React Router 6 (navigation)
- 📡 Axios (HTTP client)
- 🔌 WebSocket (real-time)
- 🎯 React Flow (@xyflow/react) (visual builder)
- 🎭 Lucide React (icons)

**Backend:**
- 🐹 Go 1.25
- 🌐 Gorilla Mux (HTTP router)
- 🔌 Gorilla WebSocket
- 📦 embed (asset embedding)

### Project Structure

```
web/
├── frontend/               # React app
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NeuronCard.tsx
│   │   │   ├── ExecutionLogs.tsx
│   │   │   ├── SynapseBuilder.tsx
│   │   │   └── SystemMetrics.tsx
│   │   ├── hooks/         # Custom hooks
│   │   │   └── useWebSocket.ts
│   │   ├── api/           # API client
│   │   │   └── client.ts
│   │   ├── types/         # TypeScript types
│   │   │   └── index.ts
│   │   ├── styles/        # Global CSS
│   │   │   └── index.css
│   │   ├── App.tsx        # Main app
│   │   └── main.tsx       # Entry point
│   ├── public/            # Static assets
│   ├── dist/              # Build output (Vite)
│   ├── vite.config.ts     # Vite config
│   ├── tailwind.config.js # Tailwind config
│   └── package.json
│
└── server/                # Go server
    ├── handlers/          # HTTP handlers
    ├── middleware/        # HTTP middleware
    ├── services/          # Business logic
    ├── models/            # Data models
    ├── frontend/          # Embedded assets (copied from dist/)
    └── server.go          # Main server
```

### Vite Configuration

**File:** `web/frontend/vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,              // Dev server port
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // Backend API
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',    // WebSocket
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',          // Output directory
    sourcemap: true,         // Generate source maps
  },
})
```

### npm Scripts

```json
{
  "scripts": {
    "dev": "vite",                    // Start dev server
    "build": "tsc && vite build",     // Build for production
    "preview": "vite preview",        // Preview production build
    "lint": "eslint . --ext ts,tsx",  // Lint code
    "typecheck": "tsc --noEmit"       // Type check only
  }
}
```

### Making Changes

#### UI Changes (with hot reload)

```bash
# Start dev mode
cd web/frontend
npm run dev

# Edit any .tsx file
# Vite auto-reloads browser
# See changes instantly
```

#### API Changes (backend)

```bash
# Edit server code
vim web/server/handlers/handlers.go

# Rebuild
go build -o cortex .

# Restart
./cortex ui --port 8080
```

#### Full Rebuild (production)

```bash
# Frontend
cd web/frontend
npm run build

# Copy to server
cd ../server
rm -rf frontend
cp -r ../frontend/dist frontend

# Build Go binary with embedded frontend
cd ../..
go build -o cortex .

# Run
./cortex ui --port 8080
```

### Adding New Features

#### Add a New Page

1. Create component:
```tsx
// web/frontend/src/components/MyNewPage.tsx
export const MyNewPage = () => {
  return <div>My New Page</div>
}
```

2. Add route in `App.tsx`:
```tsx
<Route path="/my-page" element={<MyNewPage />} />
```

3. Add to navigation:
```tsx
{ path: '/my-page', label: 'My Page', icon: IconName }
```

#### Add a New API Endpoint

1. Add handler:
```go
// web/server/handlers/handlers.go
func (h *Handlers) MyNewEndpoint(w http.ResponseWriter, r *http.Request) {
    // Handler logic
}
```

2. Register route:
```go
// web/server/server.go
s.router.HandleFunc("/api/my-endpoint", h.MyNewEndpoint).Methods("GET")
```

3. Call from frontend:
```tsx
// web/frontend/src/api/client.ts
export const apiClient = {
  myNewEndpoint: () => axios.get('/api/my-endpoint'),
}
```

---

## Architecture

### Request Flow

**Development Mode:**
```
Browser → Vite Dev Server (3000)
                ↓
        Vite Proxy (API calls)
                ↓
        Go Backend (8080)
                ↓
        File System / Services
```

**Production Mode:**
```
Browser → Go Backend (8080)
                ↓
        Embedded Frontend (static files)
        REST API (/api/*)
        WebSocket (/ws)
                ↓
        File System / Services
```

### WebSocket Flow

```
Frontend Component (useWebSocket hook)
        ↓
    /ws endpoint
        ↓
Go WebSocket Handler (services/websocket.go)
        ↓
Broadcast to all clients
        ↓
Real-time log updates
```

### Build Process

**Development (Vite):**
```
.tsx files → Vite → HMR → Browser
```

**Production:**
```
.tsx files → TypeScript Compiler → JavaScript
           ↓
       Vite Build → Optimized bundles
           ↓
       dist/assets/ → Static files
           ↓
       Copy to server/frontend/
           ↓
       Go embed → Binary
```

---

## Troubleshooting

### Issue: Cannot connect to backend

**Symptoms:** API calls fail, "Failed to fetch" errors

**Solutions:**

1. **Check backend is running:**
```bash
curl http://localhost:8080/api/metrics
```

2. **Check Vite proxy config:**
```bash
# web/frontend/vite.config.ts
# Ensure proxy target matches backend port
```

3. **Check CORS (production mode):**
```go
// web/server/middleware/middleware.go
// CORS middleware should allow localhost
```

### Issue: Frontend not found (404)

**Symptoms:** Browser shows 404 when accessing UI

**Solutions:**

1. **Check dist directory exists:**
```bash
ls -la web/frontend/dist/
```

2. **Check copy to server directory:**
```bash
ls -la web/server/frontend/
```

3. **Rebuild frontend:**
```bash
cd web/frontend
npm run build
cd ../server
cp -r ../frontend/dist frontend
```

4. **Rebuild Go binary:**
```bash
go build -o cortex .
```

### Issue: WebSocket not connecting

**Symptoms:** No real-time logs, "WebSocket connection failed"

**Solutions:**

1. **Check WebSocket endpoint:**
```bash
# Test with websocat
websocat ws://localhost:8080/ws
```

2. **Check Vite proxy (dev mode):**
```typescript
// vite.config.ts
'/ws': {
  target: 'ws://localhost:8080',
  ws: true,
},
```

3. **Check browser console:** Look for WebSocket errors

### Issue: npm run dev fails

**Symptoms:** Vite dev server won't start

**Solutions:**

1. **Clean install:**
```bash
rm -rf node_modules package-lock.json
npm install
```

2. **Check Node version:**
```bash
node --version  # Should be 18+
```

3. **Check port 3000 is free:**
```bash
lsof -i :3000
# Kill any process using port 3000
```

### Issue: Hot reload not working

**Symptoms:** Changes to .tsx files don't reload browser

**Solutions:**

1. **Ensure Vite dev server running:**
```bash
# Should see "Local: http://localhost:3000"
npm run dev
```

2. **Check file watchers:**
```bash
# Increase file watcher limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

3. **Hard refresh browser:** Ctrl+Shift+R

### Issue: Build fails with TypeScript errors

**Symptoms:** `npm run build` fails with type errors

**Solutions:**

1. **Check TypeScript:**
```bash
npm run typecheck
```

2. **Fix type errors** in reported files

3. **Skip type check (not recommended):**
```bash
vite build --skip-type-check
```

---

## Performance Tips

### Development

- **Use Vite dev server** for instant hot reload
- **Enable source maps** for easier debugging
- **Use React DevTools** for component inspection

### Production

- **Enable compression** in Go server (gzip)
- **Use CDN** for static assets (optional)
- **Enable HTTP/2** for faster loading
- **Minimize bundle size** with tree-shaking (Vite does this)

### Build Optimization

```bash
# Analyze bundle size
cd web/frontend
npm run build -- --mode analyze

# Check bundle sizes
ls -lh dist/assets/
```

---

## Next Steps

- ✅ UI is fully functional
- 🔜 Add authentication (OIDC)
- 🔜 Add team filtering
- 🔜 Add execution history page
- 🔜 Add AI generation UI
- 🔜 Add neuron marketplace

---

## Resources

- **Vite Docs**: https://vitejs.dev/
- **React Docs**: https://react.dev/
- **TailwindCSS**: https://tailwindcss.com/
- **React Flow**: https://reactflow.dev/
- **Go embed**: https://pkg.go.dev/embed

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev                # Start Vite dev server
go build && ./cortex ui    # Start backend

# Production
npm run build              # Build frontend
cp -r ../frontend/dist frontend  # Copy to server
go build -o cortex .       # Build with embedded UI
./cortex ui --port 8080    # Start server

# Testing
npm run typecheck          # Type check
npm run lint               # Lint code
curl http://localhost:8080/api/metrics  # Test API

# Deployment
./cortex ui --host 0.0.0.0 --port 8080  # Bind to all IPs
```

### Ports

- **3000**: Vite dev server (development)
- **8080**: Go backend (default)
- **Any**: Configurable via `--port` flag

---

**That's it! You're ready to use and develop the Cortex Web UI!** 🎉
