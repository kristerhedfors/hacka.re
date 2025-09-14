# hacka.re CLI Chat Features

## 🚀 Streaming Chat Interface

The hacka.re CLI now includes a powerful streaming chat interface with automatic model compatibility handling.

### Quick Start

```bash
# Start chat with existing configuration
./hacka.re --chat

# Start chat with shared configuration URL
./hacka.re --chat "https://hacka.re/#gpt=..."
```

## ✨ Key Features

### 1. Automatic Model Compatibility

The CLI automatically handles model-specific parameter differences:

- **max_tokens vs max_completion_tokens**: Automatically uses the correct parameter
- **Temperature restrictions**: Omits temperature for models that only support default values
- **Token limits**: Respects each model's maximum token limit

### 2. Visual Feedback

- **Animated spinner** while waiting for responses: `⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏`
- **Real-time streaming** of AI responses
- **Model capabilities display** on startup and model changes

### 3. Interactive Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/clear` | Clear chat history and start fresh |
| `/compact` | Compact history to save tokens |
| `/model <name>` | Change to a different model |
| `/system <prompt>` | Update the system prompt |
| `/config` | Show current configuration |
| `/tokens` | Show estimated token count |
| `/history` | View full chat history |
| `/save <file>` | Save chat to file |
| `/exit` | Exit the chat session |

### 4. Keyboard Controls

- **Ctrl+C**: Interrupt streaming response (press twice to exit)
- **Arrow keys**: Navigate command history
- **Standard terminal editing**: Backspace, Delete, Home, End, etc.

## 🛠️ Model Compatibility Matrix

| Model Family | Max Tokens Parameter | Temperature Support | Max Token Limit |
|-------------|---------------------|-------------------|-----------------|
| **gpt-5-nano** | `max_completion_tokens` | Fixed (1.0) | 8,192 |
| **gpt-5-mini** | `max_completion_tokens` | Fixed (1.0) | 8,192 |
| **gpt-5** | `max_completion_tokens` | Custom (0-2) | 16,384 |
| **gpt-4.1-nano** | `max_completion_tokens` | Fixed (1.0) | 4,096 |
| **gpt-4.1-mini** | `max_completion_tokens` | Custom (0-2) | 8,192 |
| **gpt-4.1** | `max_completion_tokens` | Custom (0-2) | 131,072 |
| **gpt-4o** | `max_tokens` | Custom (0-2) | 16,384 |
| **gpt-4o-mini** | `max_tokens` | Custom (0-2) | 16,384 |
| **gpt-4-turbo** | `max_tokens` | Custom (0-2) | 4,096 |
| **gpt-4** | `max_tokens` | Custom (0-2) | 8,192 |
| **gpt-3.5-turbo** | `max_tokens` | Custom (0-2) | 4,096 |

## 🔄 Error Handling

The CLI automatically handles API errors and retries with corrected parameters:

1. **Parameter errors**: Automatically switches between `max_tokens` and `max_completion_tokens`
2. **Temperature errors**: Removes temperature parameter for models with fixed values
3. **Token limit errors**: Caps requests at model's maximum

### Example Session

```
╔════════════════════════════════════════════╗
║       hacka.re CLI - Streaming Chat        ║
╚════════════════════════════════════════════╝

Model: gpt-5-nano
Provider: openai
Capabilities: Uses max_completion_tokens, Fixed temperature (1.0), Max tokens: 8192

Commands:
  /help     - Show all commands
  /clear    - Clear chat history
  /compact  - Compact history (save tokens)
  /exit     - Exit chat

Press Ctrl+C to interrupt streaming responses
─────────────────────────────────────────────

> Hello!

[You]: Hello!

[AI]: ⠹ Thinking...

[AI]: Hello! How can I assist you today?

> /model gpt-4o
✓ Model changed to: gpt-4o
  Capabilities: Uses max_tokens, Supports custom temperature, Max tokens: 16384

> What's the weather like?

[You]: What's the weather like?

[AI]: ⠼ Thinking...

[AI]: I don't have access to real-time weather data...
```

## 🎯 Benefits

- **Zero configuration**: Model quirks are handled automatically
- **Seamless experience**: No manual parameter adjustments needed
- **Future-proof**: New models are detected by family patterns
- **Visual feedback**: Always know what's happening
- **Efficient**: Automatic token management and history compaction

## 📝 Implementation Details

The chat system uses a sophisticated model compatibility layer that:

1. **Detects model families** from the model name
2. **Applies appropriate parameters** based on model capabilities
3. **Handles API errors gracefully** with automatic retries
4. **Provides visual feedback** during all operations

This ensures a smooth, error-free chat experience regardless of which OpenAI-compatible model you're using.