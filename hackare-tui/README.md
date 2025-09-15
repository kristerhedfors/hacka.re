# hacka.re Terminal UI v2.0

A reimplemented terminal GUI for the hacka.re CLI with dual-mode support: a resilient socket mode for basic terminals and a rich TUI mode for full-featured terminals.

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

## Usage

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