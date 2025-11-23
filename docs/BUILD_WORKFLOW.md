# Cortex Build Workflow

## The Problem You Asked About

**Question:** "Should `cd ../server && cp -r ../frontend/dist frontend` be done all the time?"

**Answer:** No! This is now **automated** and you should **never** do it manually.

---

## Why the Copy is Needed

### Understanding Go's `embed` Directive

Go's `embed` package **requires files to be present at build time** in the same directory or subdirectory as the Go code using them.

**In `web/server/server.go`:**
```go
//go:embed frontend
var frontendFiles embed.FS
```

This tells Go: "Embed all files from `./frontend/` directory into the binary."

**Problem:**
- Frontend is built in `web/frontend/dist/`
- Go code is in `web/server/`
- Go embed can't reach `../frontend/dist/` (parent directory)

**Solution:**
- Copy `dist/*` to `web/server/frontend/`
- Now Go can embed: `//go:embed frontend`
- ✅ Frontend is embedded in binary

---

## Automated Solution

### Use Makefile Targets (Recommended)

The Makefile **automatically handles the copy** for you:

```bash
# One command builds everything
make build

# Internally runs:
# 1. cd web/frontend && npm run build
# 2. cp -r dist/* ../server/frontend/
# 3. go build -o cortex .
```

**You never need to manually copy!**

---

## Development Workflows

### Workflow 1: Production Build (No Manual Copy)

```bash
# One command does everything
make build

# Or step by step (still automated):
make ui-install    # Install npm dependencies (first time only)
make build         # Build frontend + backend
./cortex ui        # Run
```

**What happens:**
1. `make build` calls `build-frontend` target
2. `build-frontend` runs:
   - `npm run build` (creates `dist/`)
   - `cp -r dist/* ../server/frontend/` ✅ Automatic!
   - Prints "✓ Frontend built and copied"
3. Go builds binary with embedded frontend

### Workflow 2: Development with Hot Reload (No Copy Needed!)

When developing the UI, **don't copy at all**:

```bash
# Terminal 1: Backend
make ui-backend

# Terminal 2: Frontend (Vite dev server)
make ui-dev

# Edit .tsx files → browser auto-reloads
# No copy needed! Vite serves files directly
```

**Why no copy?**
- Vite dev server serves files from memory
- Changes reflected instantly (<100ms)
- No build step needed

---

## All Available Make Targets

### Quick Commands

```bash
make build           # Build everything (frontend + backend)
make ui              # Build and start UI server
make ui-full         # Install deps, build, start (first time)
```

### Development Commands

```bash
make ui-backend      # Start backend (port 8080)
make ui-dev          # Start Vite dev server (port 3000)
make ui-install      # Install npm dependencies
make ui-build        # Build frontend only
make ui-lint         # Lint frontend code
make ui-typecheck    # Type check TypeScript
```

### Build Commands

```bash
make build-frontend  # Build frontend and copy to server
make build-local     # Build Go binary (includes build-frontend)
make build           # Alias for build-local
make clean           # Remove built files
```

### Full Workflow

```bash
# First time setup
make ui-install      # Install npm dependencies
make build           # Build everything
./cortex ui          # Run

# Subsequent builds
make build           # Just rebuild
./cortex ui          # Run
```

---

## When Does Copy Happen?

### Automatic (via Makefile)

✅ `make build` → Copy happens automatically
✅ `make ui-build` → Copy happens automatically
✅ `make build-frontend` → Copy happens automatically

### Manual (DON'T DO THIS)

❌ Running `npm run build` directly → Copy does NOT happen
❌ Running `go build` directly → Uses stale frontend (or fails)

**Always use `make build` instead!**

---

## Git Ignore Configuration

The copied directory is **ignored by git**:

```gitignore
# .gitignore
web/frontend/dist/         # Build output (not committed)
web/server/frontend/       # Copied files (not committed)
```

**What this means:**
- Source files in `web/frontend/src/` → Committed
- Built files in `web/frontend/dist/` → Not committed
- Copied files in `web/server/frontend/` → Not committed
- Everyone rebuilds frontend when they clone

**Why?**
- Keeps repository clean
- Avoids conflicts
- Forces fresh builds
- Each developer gets optimized builds for their platform

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Cortex

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.25'

      - name: Build Cortex
        run: make build  # ✅ One command!

      - name: Test
        run: make test-all
```

**No manual copy steps needed!** The Makefile handles it.

---

## Docker Build

### Dockerfile

```dockerfile
FROM node:18 AS frontend-builder
WORKDIR /app/web/frontend
COPY web/frontend/package*.json ./
RUN npm install
COPY web/frontend/ ./
RUN npm run build

FROM golang:1.25 AS backend-builder
WORKDIR /app
COPY . .
COPY --from=frontend-builder /app/web/frontend/dist /app/web/server/frontend
RUN go build -o cortex .

FROM alpine:latest
COPY --from=backend-builder /app/cortex /cortex
EXPOSE 8080
CMD ["/cortex", "ui", "--host", "0.0.0.0"]
```

**In Docker:**
- Stage 1: Build frontend → `dist/`
- Stage 2: Copy `dist/` to `web/server/frontend/`, build Go
- Stage 3: Copy binary only (includes embedded frontend)

---

## Troubleshooting

### Issue: "Frontend not found" when running

**Symptoms:**
```
open http://localhost:8080
→ Shows fallback HTML (missing frontend)
```

**Cause:** Frontend not built or not copied

**Solution:**
```bash
# Rebuild everything
make clean
make build

# Verify copy happened
ls -la web/server/frontend/
# Should show: index.html, assets/
```

### Issue: "My UI changes aren't showing"

**Development mode:**
```bash
# Use Vite dev server (hot reload)
make ui-dev
# Changes appear instantly at localhost:3000
```

**Production mode:**
```bash
# Rebuild frontend
make ui-build

# Rebuild binary
go build -o cortex .

# Restart
./cortex ui
```

### Issue: "go build fails with embed error"

**Error:**
```
web/server/server.go:18:12: pattern frontend: no matching files found
```

**Cause:** `web/server/frontend/` directory is empty or missing

**Solution:**
```bash
# Build frontend first
make build-frontend

# Then build Go
go build -o cortex .

# Or just use make:
make build  # Does both!
```

---

## Best Practices

### ✅ DO

- **Use `make build`** for production builds
- **Use `make ui-dev`** for development
- **Commit source files** (`src/`) to git
- **Ignore build artifacts** (`dist/`, `frontend/`)
- **Run `make clean`** when switching branches

### ❌ DON'T

- **Don't manually copy** `dist/` to `frontend/`
- **Don't run `npm run build && go build`** separately
- **Don't commit** `dist/` or `frontend/` to git
- **Don't skip** `make build` and go straight to `go build`

---

## Quick Reference

### I want to...

#### ...build for production
```bash
make build
```

#### ...develop the UI
```bash
make ui-dev  # In terminal 2
```

#### ...just build the frontend
```bash
make ui-build
```

#### ...clean everything and rebuild
```bash
make clean
make build
```

#### ...install fresh dependencies
```bash
make ui-install
```

#### ...check if frontend is properly copied
```bash
ls -la web/server/frontend/
# Should contain: index.html, assets/
```

---

## Summary

**The key insight:**

1. **Development:** No copy needed (Vite serves directly)
2. **Production:** Copy is **automated by Makefile**
3. **Never manually copy** - always use `make build`

**Remember:**
```bash
# ✅ Good - automated
make build

# ❌ Bad - manual steps
cd web/frontend && npm run build
cd ../server && cp -r ../frontend/dist frontend
cd ../.. && go build .
```

**Just run:**
```bash
make build  # That's it!
```

---

## Related Documentation

- [QUICKSTART_UI.md](../QUICKSTART_UI.md) - Quick start guide
- [WEB_UI_GUIDE.md](WEB_UI_GUIDE.md) - Complete usage guide
- [UI_ARCHITECTURE.md](UI_ARCHITECTURE.md) - Architecture deep-dive
