# hacka.re Terminal UI v2.0

A reimplemented terminal GUI for the hacka.re CLI with dual-mode support: a resilient socket mode for basic terminals and a rich TUI mode for full-featured terminals.

**Available as both a standalone application and a Go library for integration into other projects.**

## Features

### Core Architecture
- **Dual Mode Support**: Automatically detects terminal capabilities and selects the best UI mode
- **Event-Driven Architecture**: Clean separation between UI and business logic
- **Modular Design**: Each component is independent and testable
- **Graceful Degradation**: Falls back to simpler modes when features are unavailable

### Socket Mode (Resilient)
- Works over any character stream (SSH, telnet, serial, raw sockets)
- Simple line-based interface with slash commands
- No special terminal requirements - works even in `dumb` terminals
- Command autocomplete and history
- Minimal bandwidth usage

### Rich TUI Mode (Coming Soon)
- Full terminal UI with panels and windows
- Mouse support
- Syntax highlighting
- Real-time updates
- Split-pane views

## Installation

### As a Standalone Application

```bash
# Clone the repository
git clone https://github.com/hacka-re/hackare-tui
cd hackare-tui

# Build the application
./build.sh

# Or manually
go mod tidy
go build -o hackare-tui cmd/tui/main.go
```

### As a Go Library

```bash
go get github.com/hacka-re/tui
```

Add to your Go project:
```go
import "github.com/hacka-re/tui/pkg/tui"
```

## Usage

### Library Usage

The TUI can be embedded in other applications:

```go
package main

import (
	"fmt"
	"log"
	"github.com/hacka-re/tui/pkg/tui"
)

// Your existing config structure
type MyConfig struct {
	Provider    string  `json:"provider"`
	APIKey      string  `json:"api_key"`
	BaseURL     string  `json:"base_url"`
	Model       string  `json:"model"`
	Temperature float64 `json:"temperature"`
	// ... other fields
}

// Implement the ExternalConfig interface
func (c *MyConfig) GetProvider() string      { return c.Provider }
func (c *MyConfig) GetAPIKey() string        { return c.APIKey }
func (c *MyConfig) GetBaseURL() string       { return c.BaseURL }
func (c *MyConfig) GetModel() string         { return c.Model }
func (c *MyConfig) GetTemperature() float64  { return c.Temperature }
// ... implement other required methods

func main() {
	config := &MyConfig{
		Provider:    "openai",
		APIKey:      "your-api-key",
		BaseURL:     "https://api.openai.com/v1",
		Model:       "gpt-3.5-turbo",
		Temperature: 0.7,
	}

	callbacks := &tui.Callbacks{
		OnStartChat: func(cfg interface{}) error {
			fmt.Println("Starting chat with config:", cfg)
			// Start your chat implementation
			return nil
		},
		OnSaveConfig: func(cfg interface{}) error {
			fmt.Println("Saving config:", cfg)
			// Save config to your storage
			return nil
		},
		OnExit: func() {
			fmt.Println("TUI is exiting")
		},
	}

	options := &tui.LaunchOptions{
		Mode:      "auto",        // auto, rich, or socket
		Config:    config,        // Your configuration
		Callbacks: callbacks,     // Integration callbacks
		Debug:     false,         // Debug logging
	}

	if err := tui.LaunchTUI(options); err != nil {
		log.Fatalf("Failed to launch TUI: %v", err)
	}
}
```

### Basic Usage

```bash
# Auto-detect best mode based on terminal capabilities
./hackare-tui

# Force socket mode (most compatible)
./hackare-tui -mode socket

# Force rich TUI mode (requires capable terminal)
./hackare-tui -mode rich

# Enable debug output
./hackare-tui -debug
```

### Socket Mode Commands

All commands start with `/` and support autocomplete with Tab.

#### Chat Commands
- `/chat <message>` or `/c` - Send a chat message
- `/reset` - Reset the chat session
- `/export [filename]` - Export chat history

#### Configuration
- `/settings` or `/s` - Configure API settings, model, and features
- `/prompts` or `/p` - Manage system prompts
- `/functions` or `/f` - Manage callable functions
- `/mcp` or `/m` - MCP server connections
- `/rag` or `/r` - RAG configuration
- `/share` or `/sh` - Generate configuration share link

#### UI Commands
- `/mode [rich|socket|auto]` - Switch UI mode
- `/clear` or `/cls` - Clear the screen
- `/status` or `/st` - Show system status
- `/history` or `/h` - Show command history
- `/help` or `/?` - Show available commands
- `/exit` or `/q` - Exit the application

### Quick Examples

```bash
# Start chatting immediately
./hackare-tui -mode socket
> Hello, how are you?
Assistant: I received: Hello, how are you?

# Check status
> /status
System Status:
═══════════════════════════════════════
Mode: socket
Connected: true
Messages: 1
Functions: 0
Prompts: 0

# Configure settings
> /settings
Current Settings:
═══════════════════════════════════════
1. API Provider: openai
2. Model: gpt-3.5-turbo
3. API Key: ****
4. Temperature: 0.70
5. Max Tokens: 2048
6. Stream Mode: true
7. YOLO Mode: false

# Get help
> /help
Available Commands:
...
```

## Library API

### Core Types

- **`LaunchOptions`** - Configuration for launching the TUI
- **`Callbacks`** - Integration callbacks for parent application
- **`ExternalConfig`** - Interface for external configuration

### Callbacks

The `Callbacks` structure allows your application to integrate with TUI actions:

- `OnStartChat(config)` - Called when user wants to start chatting
- `OnBrowse(config)` - Called when user wants to start web server with browser
- `OnServe(config)` - Called when user wants to start web server
- `OnShareLink(config)` - Called when user wants to generate share link
- `OnSaveConfig(config)` - Called when configuration needs saving
- `OnLoadConfig()` - Called when configuration needs loading
- `OnExit()` - Called when TUI is exiting

### Configuration Interface

Implement the `ExternalConfig` interface to provide your configuration:

```go
type ExternalConfig interface {
	GetProvider() string
	GetAPIKey() string
	GetBaseURL() string
	GetModel() string
	GetTemperature() float64
	GetMaxTokens() int
	GetStreamMode() bool
	GetYoloMode() bool
	GetVoiceControl() bool
	GetSystemPrompt() string
	GetNamespace() string
	GetFunctions() []FunctionDef
	GetPrompts() []PromptDef
}
```

Or use the `CLIConfig` interface for CLI compatibility:

```go
type CLIConfig interface {
	GetProvider() string
	GetAPIKey() string
	GetBaseURL() string
	GetModel() string
	GetTemperature() float64
	GetMaxTokens() int
	GetStreamResponse() bool
	GetYoloMode() bool
	GetVoiceControl() bool
	GetSystemPrompt() string
	GetNamespace() string
}
```

## Architecture

### Project Structure

```
hackare-tui/
├── cmd/
│   └── tui/
│       └── main.go              # Entry point with mode detection
├── internal/
│   ├── core/
│   │   ├── config.go            # Configuration management
│   │   ├── state.go             # Application state
│   │   └── events.go            # Event system
│   ├── modes/
│   │   ├── rich/                # Rich TUI mode (coming soon)
│   │   └── socket/
│   │       ├── handler.go       # Socket mode handler
│   │       └── commands.go      # Command registry
│   ├── transport/
│   │   └── detector.go          # Terminal capability detection
│   └── ui/                      # Shared UI components
```

### Terminal Detection

The application automatically detects terminal capabilities:

- **Terminal Type**: Checks `$TERM` environment variable
- **Dimensions**: Gets terminal width and height
- **Color Support**: Detects 8-bit, 256-color, and truecolor support
- **Unicode**: Checks locale settings for UTF-8 support
- **Connection Type**: Detects SSH, telnet, or serial connections
- **ANSI Support**: Verifies escape sequence support

Based on these capabilities, it recommends:
- **Socket Mode**: For basic terminals, serial connections, or constrained environments
- **Rich Mode**: For modern terminals with full feature support

### Socket Mode Protocol

The socket mode uses a simple, resilient protocol:

```
INPUT:  /command [arguments]\n
OUTPUT: Response text\n

INPUT:  Regular text\n
OUTPUT: Chat response\n
```

This works over:
- SSH connections
- Telnet sessions
- Serial ports
- Raw TCP sockets
- Named pipes
- Any bidirectional character stream

## Configuration

Configuration is stored in `~/.config/hackare-tui/config.json`:

```json
{
  "provider": "openai",
  "api_key": "sk-...",
  "base_url": "https://api.openai.com/v1",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream_mode": true,
  "yolo_mode": false,
  "theme": "dark",
  "namespace": "default"
}
```

## Development

### Building

```bash
# Standard build
go build -o hackare-tui cmd/tui/main.go

# With specific Go version
go1.21 build -o hackare-tui cmd/tui/main.go

# Cross-compilation
GOOS=linux GOARCH=amd64 go build -o hackare-tui-linux cmd/tui/main.go
GOOS=darwin GOARCH=arm64 go build -o hackare-tui-mac cmd/tui/main.go
```

### Testing

```bash
# Run automated test
./test_socket.sh

# Manual testing with netcat
nc -l 8080 | ./hackare-tui -mode socket | nc localhost 8080

# Test over SSH
ssh user@host './hackare-tui -mode socket'
```

## Roadmap

### Phase 1: Socket Mode ✅
- [x] Basic command system
- [x] Chat interface
- [x] Settings management
- [x] Command history
- [x] Status display

### Phase 2: Enhanced Socket Mode (In Progress)
- [ ] Interactive settings editor
- [ ] Multi-line input support
- [ ] File upload/download
- [ ] Session persistence
- [ ] Command autocomplete with Tab

### Phase 3: Rich TUI Mode
- [ ] Panel-based layout
- [ ] Mouse support
- [ ] Syntax highlighting
- [ ] Real-time streaming
- [ ] Split views

### Phase 4: Advanced Features
- [ ] Function editor with syntax highlighting
- [ ] Visual prompt builder
- [ ] MCP server browser
- [ ] RAG document manager
- [ ] Share link QR codes

## Design Principles

1. **Resilience First**: The socket mode must work anywhere, even over the most basic connections
2. **Progressive Enhancement**: Features are added when available, not required
3. **Clean Separation**: UI modes are independent - the core logic doesn't know which UI is active
4. **User Control**: Always provide manual overrides and escape hatches
5. **Backwards Compatible**: Can connect to the existing hacka.re web API

## Contributing

This is a complete rewrite of the hacka.re CLI terminal interface. The goal is to provide a more robust and maintainable codebase while preserving all existing functionality.

Key areas for contribution:
- Rich TUI mode implementation using tview
- Enhanced socket mode features
- API client implementation
- Function execution engine
- MCP protocol support

## License

MIT License - See LICENSE file for details