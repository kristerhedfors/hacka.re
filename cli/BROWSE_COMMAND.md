# Browse Command Implementation

## Overview

The `browse` subcommand for the hacka.re CLI serves the web interface from embedded assets, creating a single-binary distribution that includes the entire hacka.re web application.

## Architecture

### Embedded Assets
- Release ZIP file is embedded at compile time using Go's `embed` package
- ZIP contains all web files from `hacka-re-latest.zip`
- Files are served directly from the embedded ZIP in memory
- No external files or extraction needed

### HTTP Server
- Lightweight HTTP server using Go's standard library
- Serves files from embedded ZIP archive
- Automatic MIME type detection
- Port selection with fallback mechanism

## Usage

```bash
# Start on default port (8080)
hacka.re browse

# Custom port via flag
hacka.re browse -p 3000
hacka.re browse --port 9000

# Custom port via environment
HACKARE_BROWSE_PORT=8888 hacka.re browse

# Don't open browser automatically
hacka.re browse --no-browser

# Bind to specific host
hacka.re browse --host 0.0.0.0
```

## Build Process

1. **Build Release ZIP**: Uses existing `/scripts/build-release-zip.sh`
2. **Copy ZIP**: Copies `hacka-re-latest.zip` to `internal/web/`
3. **Embed ZIP**: Go compiler embeds ZIP via `//go:embed` directive
4. **Create Binary**: Single executable with ZIP embedded

```bash
# Full build with embedded ZIP
./build-with-assets.sh
```

## Implementation Details

### File Structure
```
cli/
├── cmd/hacka.re/
│   ├── main.go       # Subcommand routing
│   ├── browse.go     # Browse command implementation
│   └── serve.go      # Serve command implementation
├── internal/web/
│   ├── zipserver.go  # ZIP-based HTTP server
│   └── hacka.re-release.zip # Embedded ZIP (gitignored)
└── build-with-assets.sh # Build script
```

### Key Components

**browse.go**: Command-line interface and server lifecycle
- Flag parsing for port/host configuration
- Browser auto-launch functionality
- Graceful shutdown handling

**zipserver.go**: ZIP-based HTTP server implementation
- Serves files directly from embedded ZIP
- Memory-efficient (no extraction)
- MIME type detection
- Request logging with -v/-vv flags
- Port availability checking

### Port Selection Logic

1. Check command-line flags (`-p`, `--port`)
2. Check environment variable (`HACKARE_BROWSE_PORT`)
3. Use default (8080)
4. If port busy, try next 10 ports
5. Fail if no ports available

### Security Features

- Serves only embedded files (no file system traversal)
- Default binding to localhost
- No directory listing
- Read-only filesystem
- No external dependencies

## Binary Size

- Embedded ZIP: ~5.8MB (compressed)
- Go runtime: ~7MB
- Total binary: ~13MB

## Benefits

1. **Single Binary**: No installation or file extraction needed
2. **Portable**: Works across platforms (Linux, macOS, Windows)
3. **Secure**: Assets embedded and read-only
4. **Offline**: No internet connection required
5. **Consistent**: Same version of web UI and CLI

## Future Enhancements

- [ ] Compression of embedded assets (reduce binary size)
- [ ] Hot reload for development mode
- [ ] HTTPS support with self-signed certificates
- [ ] WebSocket support for real-time features
- [ ] Multiple instance management