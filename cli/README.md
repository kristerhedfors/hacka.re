# hacka.re CLI

A command-line interface for [hacka.re](https://hacka.re) - the privacy-focused, serverless chat interface for OpenAI-compatible APIs.

## Features

- 🔐 **Secure Configuration Import**: Parse and decrypt hacka.re shared links with password protection
- 📺 **ASCII Settings Modal**: Terminal-based UI mimicking the web interface
- 🔒 **TweetNaCl Encryption**: Industry-standard encryption for configuration sharing
- 📱 **QR Code Generation**: Share configurations easily via QR codes
- 🎯 **Minimal Dependencies**: Only essential libraries for maximum portability
- 🚀 **Zero Configuration**: Works with just a hacka.re URL fragment

## Installation

### From Source

```bash
cd cli
go build -o hacka.re cmd/hacka.re/main.go
```

### Dependencies

The CLI uses minimal external dependencies:
- `golang.org/x/crypto/nacl` - TweetNaCl encryption (matching the web version)
- `github.com/gdamore/tcell/v2` - Terminal UI library
- `github.com/skip2/go-qrcode` - QR code generation

## Usage

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

```bash
go test ./...
```

## Roadmap

- [ ] Chat interface with streaming responses
- [ ] Function calling support
- [ ] RAG (Retrieval-Augmented Generation) support
- [ ] MCP (Model Context Protocol) server connections
- [ ] Conversation history management
- [ ] Multiple configuration profiles
- [ ] Export/import configurations as JSON

## License

MIT License - Same as the hacka.re web application

## Contributing

Contributions are welcome! Please ensure:
- Minimal external dependencies
- Compatibility with the web version's encryption format
- Clean, idiomatic Go code
- Comprehensive error handling

## Related

- [hacka.re](https://hacka.re) - The web interface
- [TweetNaCl](https://tweetnacl.cr.yp.to/) - The encryption library
- [OpenAI API](https://platform.openai.com/docs/api-reference) - API specification