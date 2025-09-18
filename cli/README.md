# hacka.re CLI

A Golang command-line interface for [hacka.re](https://hacka.re) - an architectural variant exploring rapid feature implementation in the console, mirroring the privacy-focused web application.

## Overview

The hacka.re CLI is a Golang implementation that serves as an experimental platform to explore how quickly the complete feature set of the hacka.re web application can be implemented in a terminal environment. It demonstrates that with a clear architectural vision, complex web features can be rapidly adapted to console interfaces.

## Current Implementation Status

### ✅ Core Features Implemented

- 🌐 **Embedded Web Server**: Full hacka.re web interface with single binary (browse command)
- 💬 **Terminal Chat**: Interactive AI chat sessions with streaming responses
- 🔐 **Secure Configuration Import**: Parse and decrypt hacka.re shared links with password protection
- 📺 **TUI Interface**: Advanced terminal UI with tcell/tview for settings and prompts management
- 🔒 **TweetNaCl Encryption**: Industry-standard encryption matching web version
- 📱 **QR Code Generation**: Share configurations via QR codes
- 📦 **Single Binary**: ~13MB with all web assets embedded
- 🎯 **Cross-Platform**: Works on macOS, Linux, and Windows
- 🚀 **Zero Configuration**: Works with just a hacka.re URL fragment

### 🚧 Features In Progress

- 📝 **Prompts Management**: UI implemented, refinements ongoing
- 🔧 **JavaScript Functions**: Basic support implemented, improving execution engine
- 🤖 **MCP (Model Context Protocol)**: Foundation laid, authentication mechanisms in development

### ⏳ Upcoming Features

#### Priority 1: Enhanced User Experience
- 🖱️ **Mouse Click Support**: Click to expand, check boxes, select items - making the terminal as intuitive as the web interface
- 📊 **Interactive Elements**: Collapsible sections, clickable buttons, drag-and-drop support
- 🎨 **Rich Terminal UI**: Full-color theming, smooth animations, responsive layouts

#### Priority 2: Complete MCP Implementation
- 🔌 **MCP Server Connections**: Full support for Model Context Protocol servers
- 🔐 **Authentication Mechanisms**:
  - GitHub (PAT authentication)
  - Gmail (OAuth flow)
  - Shodan (API key)
- 🔗 **Advanced MCP Features**:
  - Share Link MCP
  - Introspection MCP
  - Custom server configurations

#### Priority 3: Feature Parity
- 🔄 **Function Calling**: Complete JavaScript execution environment
- 🎯 **RAG Support**: Retrieval-Augmented Generation with embeddings
- 💾 **Conversation Management**: History, search, export capabilities
- 👤 **Multiple Profiles**: Switch between different configurations
- 🎨 **Theme System**: Match web app's theme options

## Installation

### From Source

```bash
cd cli
# Build with embedded web assets (recommended)
./build-with-assets.sh

# Or build without web assets (smaller binary, no browse command)
go build -o hacka.re cmd/hacka.re/main.go
```

### Dependencies

The CLI uses minimal external dependencies:
- `golang.org/x/crypto/nacl` - TweetNaCl encryption (matching the web version)
- `github.com/gdamore/tcell/v2` - Terminal UI library
- `github.com/skip2/go-qrcode` - QR code generation

## Usage

### Commands

The CLI uses a subcommand structure for different operations:

```bash
./hacka.re [COMMAND] [OPTIONS] [ARGUMENTS]
```

Available commands:
- `browse` - Start local web server to browse hacka.re interface
- `chat` - Start interactive chat session with AI models
- (no command) - Launch settings or process shared configuration

### Browse Command (Web Interface)

Start a local web server to use the full hacka.re web interface:

```bash
# Start on default port 8080
./hacka.re browse

# Use custom port
./hacka.re browse -p 3000
./hacka.re browse --port 9000

# Don't open browser automatically
./hacka.re browse --no-browser

# Use environment variable for port
HACKARE_WEB_PORT=8888 ./hacka.re browse
```

### Chat Command (Terminal Chat)

Start an interactive chat session in the terminal:

```bash
# Start with saved configuration
./hacka.re chat

# Load configuration from shared link
./hacka.re chat "gpt=eyJlbmM..."
./hacka.re chat "https://hacka.re/#gpt=eyJlbmM..."
```

### Interactive Mode (No Arguments)

Launch the settings modal:

```bash
./hacka.re
```

This opens an ASCII-based settings interface where you can:
- Configure API providers (OpenAI, Groq, Ollama, etc.)
- Set API keys and endpoints
- Adjust model parameters
- Save configuration for future use

### Import from hacka.re URL

Load configuration from a shared hacka.re link (three formats supported):

```bash
# Full URL
./hacka.re "https://hacka.re/#gpt=eyJlbmM..."

# Fragment with prefix
./hacka.re "gpt=eyJlbmM..."

# Just the encrypted data
./hacka.re "eyJlbmM..."
```

You'll be prompted for the password to decrypt the configuration.

### View/JSON Dump Mode

Decrypt and output configuration as JSON without launching the UI:

```bash
# Output decrypted configuration to stdout (using --json-dump)
./hacka.re --json-dump "eyJlbmM..."

# Same functionality using --view (shorter alias)
./hacka.re --view "gpt=..."

# Pipe to jq for processing
./hacka.re --view "gpt=..." | jq '.apiKey'

# Save to file
./hacka.re --json-dump "https://hacka.re/#gpt=..." > config.json
```

This is useful for:
- Inspecting shared configurations before loading
- Automating configuration extraction
- Integrating with other tools
- Debugging encrypted links

## Configuration

The CLI stores configuration in `~/.config/hacka.re/config.json`.

### Supported Providers

- 🇺🇸 **OpenAI** - `api.openai.com/v1`
- 🇸🇪 **Berget.AI** - `api.berget.ai/v1`
- 🇸🇦 **Groq Cloud** - `api.groq.com/openai/v1`
- **Ollama** - `localhost:11434/v1`
- **Llamafile** - `localhost:8080/v1`
- **GPT4All** - `localhost:4891/v1`
- **LM Studio** - `localhost:1234/v1`
- **LocalAI** - `localhost:8080/v1`
- **Custom** - Any OpenAI-compatible endpoint

### Configuration Structure

```json
{
  "provider": "openai",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-4",
  "maxTokens": 2048,
  "temperature": 0.7,
  "systemPrompt": "You are a helpful assistant.",
  "theme": "modern",
  "streamResponse": true
}
```

## Settings Modal

The ASCII settings interface provides:

- **Navigation**: Arrow keys to move between fields
- **Editing**: Enter to edit, ESC to cancel
- **Options**: Tab to cycle through dropdown options
- **Saving**: Ctrl+S to save configuration
- **Exit**: Ctrl+Q or ESC to quit

```
╔════════════════════════════════════════════╗
║         hacka.re: settings                  ║
╠════════════════════════════════════════════╣
║  API Provider:      🇺🇸 OpenAI              ║
║  Base URL:          api.openai.com/v1       ║
║  API Key:           sk-...wxyz              ║
║  Model:             gpt-4                   ║
║  Max Tokens:        2048                    ║
║  Temperature:       0.7                      ║
║  System Prompt:     You are helpful...      ║
╚════════════════════════════════════════════╝
  ↑↓ Navigate | ↵ Edit | ^S Save | ^Q Quit
```

## Sharing Configuration

### Generate QR Code

After loading or creating a configuration, you can generate a QR code for sharing:

1. Select option 4 from the menu
2. Enter a password for encryption
3. Scan the QR code with another device
4. Share the generated URL

### URL Format

hacka.re URLs use the fragment identifier (#) to store encrypted data:

```
https://hacka.re/#gpt=eyJlbmMiOiI...","salt":"...","nonce":"..."}
```

This ensures the configuration never reaches any server (fragments aren't sent in HTTP requests).

## Security

- **Encryption**: Uses NaCl secretbox (XSalsa20-Poly1305) for symmetric encryption
- **Key Derivation**: PBKDF2 with 10,000 iterations for password-based encryption
- **Local Storage**: All configuration stored locally, never transmitted
- **URL Fragments**: Configuration in URLs stays client-side only

## Development

### Project Structure

```
cli/
├── cmd/hacka.re/         # Entry point
├── internal/
│   ├── api/             # OpenAI-compatible API client
│   ├── config/          # Configuration management
│   ├── crypto/          # TweetNaCl encryption
│   ├── share/           # URL parsing and generation
│   └── ui/              # Terminal UI components
├── go.mod               # Go module definition
└── README.md            # This file
```

### Building

```bash
# Build for current platform
go build -o hacka.re cmd/hacka.re/main.go

# Cross-compile for Linux
GOOS=linux GOARCH=amd64 go build -o hacka.re-linux cmd/hacka.re/main.go

# Cross-compile for Windows
GOOS=windows GOARCH=amd64 go build -o hacka.re.exe cmd/hacka.re/main.go

# Cross-compile for macOS
GOOS=darwin GOARCH=amd64 go build -o hacka.re-darwin cmd/hacka.re/main.go
```

### Testing

The CLI uses a comprehensive Python/Playwright test suite for validation:

```bash
# Setup test environment
cd cli/_tests
./setup_test_env.sh

# Run full test suite
./run_cli_tests.sh

# Quick tests (no browser)
./run_quick_tests.sh

# Specific test categories
source .venv/bin/activate
pytest test_cli_browse_command.py -v
pytest test_cli_chat_command.py -v
```

**Note**: The project uses Python/Playwright for testing the Go binary, ensuring real-world validation of all features.

## Architecture Philosophy

The CLI demonstrates that complex web application features can be rapidly reimplemented in a console environment when you have:
- **Clear architectural vision**: Understanding the complete feature set upfront
- **Modern terminal capabilities**: Leveraging advanced TUI libraries
- **User-first design**: Making the console as intuitive as the web

### Key Architectural Decisions

1. **Golang for Performance**: Fast execution, single binary distribution
2. **Embedded Web Assets**: No external dependencies, instant deployment
3. **TUI-First Design**: Not just a port, but a reimagining for the terminal
4. **Mouse Support Focus**: Breaking the keyboard-only terminal paradigm
5. **Feature Parity Goal**: Proving console apps can match web functionality

## Development Roadmap

### Phase 1: Core Functionality ✅
- Basic chat interface
- Configuration management
- Web server embedding
- Encryption/decryption

### Phase 2: Advanced UI (Current)
- Mouse click events
- Interactive components
- Rich visual feedback
- Responsive layouts

### Phase 3: Complete Feature Set
- Full MCP implementation
- JavaScript function execution
- RAG support
- Complete testing coverage

### Phase 4: Innovation
- Terminal-exclusive features
- Performance optimizations
- Advanced automation
- CLI-specific workflows

## License

MIT License - Same as the hacka.re web application

## Why a CLI?

The hacka.re CLI serves multiple purposes:

1. **Rapid Prototyping**: Testing how quickly web features can be adapted to console
2. **Accessibility**: Terminal-based interface for power users and automation
3. **Performance**: Native Go performance vs browser overhead
4. **Privacy**: Even more minimal attack surface than the web app
5. **Innovation**: Exploring terminal-exclusive features not possible in browsers

## Technical Highlights

- **13MB Single Binary**: Complete application with embedded web assets
- **Zero Dependencies**: No runtime requirements, instant deployment
- **Cross-Platform**: Native support for macOS, Linux, Windows
- **Memory Serving**: Web assets served from memory, no disk extraction
- **Modern TUI**: Advanced terminal UI with mouse support (coming soon)

## Contributing

Contributions are welcome! Focus areas:

### High Priority
- 🖱️ Mouse event handling implementation
- 🔌 MCP server authentication flows
- 🎨 Terminal UI enhancements
- 📊 Interactive component development

### Guidelines
- Maintain single binary philosophy
- Ensure web version compatibility
- Focus on user experience
- Write Python/Playwright tests for new features
- Consider terminal-first design patterns

## Related

- [hacka.re](https://hacka.re) - The web interface
- [TweetNaCl](https://tweetnacl.cr.yp.to/) - The encryption library
- [OpenAI API](https://platform.openai.com/docs/api-reference) - API specification