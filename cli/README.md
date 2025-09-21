# hacka.re CLI

A Golang command-line interface for [hacka.re](https://hacka.re) - an architectural variant exploring rapid feature implementation in the console, mirroring the privacy-focused web application.

## Overview

The hacka.re CLI is a Golang implementation that serves as an experimental platform to explore how quickly the complete feature set of the hacka.re web application can be implemented in a terminal environment. It demonstrates that with a clear architectural vision, complex web features can be rapidly adapted to console interfaces.

## Recent Updates (2024-01)

### New Features
- 🔧 **`dump` Command**: Inspect and decrypt shared link contents as JSON with optional password flag
- 🌐 **Browser-Specific Commands**: Launch in Firefox, Chrome, Brave, Edge, or Safari with profile support
- 📡 **`serve` Command**: Start web server without opening browser, with verbose logging options
- 🤖 **Enhanced Offline Mode**: Auto-detect local LLMs, override shared links to use local models
- 🔑 **Password Preservation**: Offline mode reuses original passwords when converting shared links
- 🔗 **Session Environment Variables**: Support for `HACKARE_LINK`, `HACKARE_SESSION`, and `HACKARE_CONFIG` (all synonymous)

### Improvements
- Fixed duplicate share link generation in offline mode
- Fixed command parsing for `serve -o` and other subcommand+flag combinations
- Improved offline mode to preserve prompts, functions, and welcome messages from shared links
- Added support for custom base URLs without requiring provider specification
- Enhanced browser profile support across all browser commands

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
- `browse` - Start local web server and open browser with hacka.re interface
- `serve` - Start web server without opening browser (server-only mode)
- `chat` - Start interactive chat session with AI models
- `dump` - Decrypt and inspect shared link contents as JSON
- `firefox`, `ff` - Open hacka.re in Firefox with optional profile
- `chrome` - Open hacka.re in Chrome with optional profile
- `brave` - Open hacka.re in Brave with optional profile
- `edge` - Open hacka.re in Microsoft Edge with optional profile
- `safari` - Open hacka.re in Safari (macOS only)
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

# Load with shared configuration
./hacka.re browse "gpt=eyJlbmM..."

# Start in offline mode (see Offline Mode section below)
./hacka.re browse --offline
./hacka.re browse -o
```

### Serve Command (Web Server Only)

Start the web server without opening a browser:

```bash
# Start on default port 8080
./hacka.re serve

# Custom port and host
./hacka.re serve -p 3000 --host 0.0.0.0

# Verbose logging (shows each request)
./hacka.re serve -v
./hacka.re serve --verbose

# Very verbose (includes headers)
./hacka.re serve -vv

# With shared configuration
./hacka.re serve "gpt=eyJlbmM..."

# Offline mode
./hacka.re serve --offline
./hacka.re serve -o
```

### Browser-Specific Commands

Open hacka.re in a specific browser with optional profile support:

```bash
# Firefox
./hacka.re firefox
./hacka.re ff  # short form
./hacka.re firefox --profile "work"
./hacka.re ff -P "personal"

# Chrome
./hacka.re chrome
./hacka.re chrome --profile-directory="Profile 1"

# Brave
./hacka.re brave
./hacka.re brave --profile-directory="Dev"

# Edge
./hacka.re edge
./hacka.re edge --profile-directory="Default"

# Safari (macOS only, no profile support)
./hacka.re safari
```

All browser commands support:
- Loading shared configurations
- Setting custom ports with `-p` or `--port`
- Offline mode with `-o` or `--offline`
- Environment variable `HACKARE_WEB_PORT`

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

### Dump Command (Inspect Shared Links)

The `dump` subcommand decrypts and displays shared link contents as JSON:

```bash
# Basic usage - prompts for password
./hacka.re dump "gpt=eyJlbmM..."

# Provide password via command line
./hacka.re dump "gpt=eyJlbmM..." --password mypassword

# Works with all formats
./hacka.re dump "https://hacka.re/#gpt=..."  # Full URL
./hacka.re dump "gpt=eyJlbmM..."              # Fragment
./hacka.re dump "eyJlbmM..."                  # Raw data

# Pipe to jq for processing
./hacka.re dump "gpt=..." --password pass | jq '.model'

# Save to file
./hacka.re dump "gpt=..." > config.json
```

This is useful for:
- Inspecting shared configurations before loading
- Debugging encrypted links
- Automating configuration extraction
- Verifying link contents

### View/JSON Dump Mode (Legacy)

For backward compatibility, the main command also supports JSON output:

```bash
# Output decrypted configuration to stdout (using --json-dump)
./hacka.re --json-dump "eyJlbmM..."

# Same functionality using --view (shorter alias)
./hacka.re --view "gpt=..."
```

Note: The `dump` subcommand is preferred over these legacy flags.

## Offline Mode (Local LLM Support)

The `--offline` or `-o` flag enables offline mode for using local Large Language Models (LLMs) without any external API connections.

### Basic Usage

```bash
# Start offline mode with auto-detected local LLM
./hacka.re --offline
./hacka.re -o  # short form

# With specific browser
./hacka.re -o firefox
./hacka.re --offline chrome

# With serve command (no browser)
./hacka.re serve --offline
./hacka.re serve -o

# With browse command
./hacka.re browse --offline
```

### Supported Local LLM Providers

Offline mode automatically detects and configures:
- **Llamafile** - Single-file LLM executables
- **Ollama** - Local model server (port 11434)
- **LM Studio** - Desktop app for local models (port 1234)
- **GPT4All** - Privacy-focused local models (port 4891)
- **LocalAI** - OpenAI-compatible local API (port 8080)
- **Custom** - Any OpenAI-compatible local endpoint

### Configuration via Environment Variables

```bash
# Specify llamafile path
HACKARE_LLAMAFILE=/path/to/model.llamafile ./hacka.re -o

# Use custom local endpoint
HACKARE_BASE_URL="http://localhost:11434/v1" ./hacka.re -o

# Specify model name
HACKARE_MODEL="llama2:7b" ./hacka.re -o

# Set API provider explicitly
HACKARE_API_PROVIDER="ollama" ./hacka.re -o

# Custom llamafile port
HACKARE_LLAMAFILE_PORT=8080 ./hacka.re -o
```

### Offline Mode with Shared Links

Offline mode can override external API configurations in shared links, forcing them to use local models instead:

```bash
# Convert any shared link to use local LLM
./hacka.re -o "gpt=eyJlbmM..."

# This will:
# 1. Decrypt the shared configuration
# 2. Preserve prompts, functions, and settings
# 3. Override the API endpoint to use local LLM
# 4. Use the original password for the new share link
```

### Key Features

1. **Privacy First**: All processing happens locally, no data leaves your machine
2. **Auto-Detection**: Automatically finds and configures local LLM servers
3. **Configuration Override**: Can convert any shared link to use local models
4. **Password Preservation**: When overriding shared links, uses the original password
5. **Zero Configuration**: Works out of the box with common local LLM setups

### Security Controls

```bash
# Allow remote MCP connections in offline mode
./hacka.re -o --allow-remote-mcp

# Allow remote embeddings API in offline mode
./hacka.re -o --allow-remote-embeddings
```

### Examples

```bash
# Start offline chat with Ollama
HACKARE_API_PROVIDER=ollama ./hacka.re chat --offline

# Serve web interface with llamafile
HACKARE_LLAMAFILE=./llama-7b.llamafile ./hacka.re serve -o

# Open in Firefox with LM Studio
HACKARE_BASE_URL="http://localhost:1234/v1" ./hacka.re -o firefox

# Convert OpenAI config to local
./hacka.re -o "gpt=eyJlbmM..."  # Enter original password when prompted
```

### Troubleshooting

If offline mode fails to start:
1. Ensure your local LLM server is running
2. Check the port is not blocked by firewall
3. Set `HACKARE_BASE_URL` explicitly if auto-detection fails
4. Use `HACKARE_LLAMAFILE` to specify the exact path

## Configuration

The CLI stores configuration in `~/.config/hacka.re/config.json`.

### Session Environment Variables

The CLI supports loading shared configurations from environment variables. These three variables are **synonymous** and represent the same thing - a session (encrypted configuration):

```bash
# All three are equivalent - use whichever you prefer
HACKARE_LINK="gpt=eyJlbmM..."     # Option 1
HACKARE_SESSION="gpt=eyJlbmM..."  # Option 2
HACKARE_CONFIG="gpt=eyJlbmM..."   # Option 3

# They accept all the same formats
HACKARE_LINK="https://hacka.re/#gpt=..."  # Full URL
HACKARE_SESSION="gpt=eyJlbmM..."          # Fragment
HACKARE_CONFIG="eyJlbmM..."               # Raw data

# Examples
HACKARE_SESSION="gpt=..." ./hacka.re browse
HACKARE_LINK="gpt=..." ./hacka.re chat
HACKARE_CONFIG="eyJlbmM..." ./hacka.re serve
```

**Important**: Only set ONE of these variables. Setting multiple will cause an error.

### Port Configuration

```bash
# Set default port for web server
HACKARE_WEB_PORT=3000 ./hacka.re browse
HACKARE_WEB_PORT=8888 ./hacka.re serve

# Command line flags take precedence
HACKARE_WEB_PORT=3000 ./hacka.re browse -p 9000  # Uses port 9000
```

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