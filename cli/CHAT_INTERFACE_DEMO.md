# Chat-Centric Interface Demo

## Overview
The hacka.re CLI now features a chat-first interface where all functionality is accessed through slash commands. The chat interface is the main view and you can only exit via `/exit` or `/quit`.

## Key Features

### 1. **Slash Commands with Autocomplete**
Commands autocomplete on the shortest unique prefix:
- `/s` → `/settings`
- `/p` → `/prompts`
- `/f` → `/functions`
- `/m` → `/mcp`
- `/r` → `/rag`
- `/sh` → `/share` (note: `/s` goes to settings)
- `/c` → `/clear`
- `/h` → `/help`
- `/e` or `/q` → `/exit` or `/quit`

### 2. **Modal Navigation**
All modals return to chat on ESC:
```
Chat Interface → /settings → Settings Modal → ESC → Chat Interface
Chat Interface → /prompts → Prompts Manager → ESC → Chat Interface
```

### 3. **No Accidental Exit**
- Can't exit from any modal (ESC returns to chat)
- Only `/exit` or `/quit` commands exit the application
- Ctrl+C interrupts streaming, second Ctrl+C shows reminder to use `/exit`

## Testing Instructions

### Start the Chat Interface
```bash
./hacka.re chat
```

### Test Commands

1. **Settings Modal**
   - Type `/s` and press Enter (autocompletes to `/settings`)
   - Navigate with arrow keys
   - Press ESC to return to chat (not exit!)

2. **Prompts Manager**
   - Type `/p` and press Enter (autocompletes to `/prompts`)
   - Use arrow keys to navigate categories
   - Press Enter to expand categories
   - Press Space to toggle prompt selection
   - Press ESC to return to chat

3. **Placeholder Modals**
   - `/f` → Functions (coming soon)
   - `/m` → MCP Servers (coming soon)
   - `/r` → RAG (coming soon)
   - `/sh` → Share Link (coming soon)

4. **Chat Operations**
   - `/clear` or `/c` → Clear chat history
   - `/help` or `/h` → Show all commands
   - Type any message → Send to AI

5. **Exit Application**
   - `/exit`, `/quit`, `/e`, or `/q` → Exit application
   - This is the ONLY way to exit!

## Command Reference

| Command | Aliases | Description |
|---------|---------|-------------|
| `/settings` | `s`, `set` | Open settings configuration |
| `/prompts` | `p`, `prompt` | Manage system prompts |
| `/functions` | `f`, `func` | Manage functions (coming soon) |
| `/mcp` | `m` | MCP server connections (coming soon) |
| `/rag` | `r` | RAG configuration (coming soon) |
| `/share` | `sh` | Share configuration link (coming soon) |
| `/clear` | `c`, `cls` | Clear chat history |
| `/help` | `h`, `?` | Show available commands |
| `/exit` | `quit`, `q`, `e` | Exit the application |

## Implementation Details

### File Structure
```
internal/
├── chat/
│   ├── enhanced_chat.go    # Main chat interface
│   ├── commands.go          # Command registry & autocomplete
│   └── modals.go           # Modal handler interfaces
├── ui/
│   ├── settings_chat.go    # Settings modal (chat-aware)
│   ├── prompts.go          # Prompts manager
│   └── placeholders.go     # Placeholder modals
├── prompts/
│   └── embedded.go         # Default prompts data
└── app/
    └── chat_init.go        # Wires everything together
```

### Key Components

1. **CommandRegistry** (`commands.go`)
   - Manages all slash commands
   - Implements autocomplete logic
   - Maps aliases to full commands

2. **EnhancedChat** (`enhanced_chat.go`)
   - Main chat loop
   - Command detection and routing
   - Modal state management
   - Never allows direct exit

3. **PromptsManager** (`prompts.go`)
   - Categories: Agents, Security, Integration, Functions
   - Token counting
   - Custom system prompt editor
   - Checkbox selection interface

4. **ModalHandlers** (`modals.go`)
   - Decouples UI from chat logic
   - Prevents circular imports
   - Allows flexible modal implementations

## Benefits

1. **Consistent UX**: All commands work the same way
2. **No Accidental Exits**: Can only exit via explicit command
3. **Efficient Navigation**: Quick slash commands with autocomplete
4. **Feature Parity**: Matches web app functionality
5. **Extensible**: Easy to add new commands and modals

## Future Enhancements

- Function calling implementation
- MCP server connections
- RAG configuration
- Share link generation
- Command history with up/down arrows
- Tab completion for partial commands
- Persistent chat history across sessions