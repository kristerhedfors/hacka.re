# Terminal Chat Features

## Overview
The hacka.re CLI now provides a full-featured terminal chat interface with readline-like capabilities, including command autocomplete, history navigation, and inline hints.

## Key Features

### 1. **Command Autocomplete**

#### Tab Completion
- Press `Tab` to autocomplete commands
- Shows suggestions if multiple matches
- Works with shortest unique prefix

```
/s + Tab     → /settings
/p + Tab     → /prompts
/f + Tab     → /functions
/se + Tab    → /settings
/sh + Tab    → /share (disambiguates from /settings)
```

#### Enter Completion
- Press `Enter` on partial command to auto-execute
- Shows what command is being executed

```
/s + Enter   → "Executing: /settings" → opens settings
/pro + Enter → "Executing: /prompts" → opens prompts
```

#### Inline Hints
- Shows dim autocomplete suggestion as you type
- Visual feedback for available completions

```
Type: /se    → displays: /se[ttings]  (dim text)
Type: /pr    → displays: /pr[ompts]   (dim text)
```

### 2. **Command History**

#### Navigation
- `↑` arrow - Previous command in history
- `↓` arrow - Next command in history
- History persists for entire session
- Stores last 100 commands

#### Smart History
- No duplicate consecutive entries
- Both commands and messages saved
- Reset position on new input

### 3. **Line Editing**

#### Cursor Movement
- `←` arrow - Move cursor left
- `→` arrow - Move cursor right
- `Home` - Jump to beginning (if supported)
- `End` - Jump to end (if supported)

#### Text Editing
- `Backspace` - Delete character before cursor
- `Ctrl+U` - Clear entire line
- `Ctrl+W` - Delete word before cursor
- Insert text at cursor position

### 4. **Terminal Modes**

#### Raw Mode (Default)
- Full readline features
- Character-by-character input
- Immediate key response
- No echo until complete

#### Simple Mode (Fallback)
- Line-buffered input
- Basic autocomplete on Enter
- Works in limited terminals

## Implementation Details

### Architecture

```
TerminalChat
├── Raw terminal handling
├── Command registry
├── History management
├── Autocomplete engine
└── Modal handlers
```

### Key Components

1. **readLineWithFeatures()**
   - Handles raw terminal input
   - Processes escape sequences
   - Manages cursor and display

2. **handleAutocomplete()**
   - Tab key processing
   - Suggestion display
   - Inline hint rendering

3. **navigateHistory()**
   - Arrow key handling
   - History buffer management
   - Position tracking

4. **redrawLine()**
   - Screen refresh logic
   - Autocomplete hint display
   - Cursor positioning

### Terminal Control Sequences

```
\033[2J\033[H    - Clear screen and home
\r\033[K         - Clear current line
\033[2m...\033[0m - Dim text for hints
\033[ND          - Move cursor N positions left
```

## Usage Examples

### Basic Autocomplete
```bash
> /s[Tab]
> /settings    # Autocompleted

> /pr[Tab]
> /prompts     # Autocompleted
```

### Multiple Suggestions
```bash
> /s[Tab]
  /settings (s, set)
  /share (sh)
> /se[Tab]
> /settings    # Unique match
```

### History Navigation
```bash
> Hello AI
> /settings
> /prompts
> [↑]           # Shows: /prompts
> [↑]           # Shows: /settings
> [↑]           # Shows: Hello AI
> [↓]           # Shows: /settings
```

### Line Editing
```bash
> Hello wrld    # Typo
> [←←←←]        # Move cursor
> Hello w|rld   # Cursor position
> [Backspace]o  # Fix typo
> Hello world
```

## Command Reference

### Slash Commands
| Command | Aliases | Tab/Enter Autocomplete |
|---------|---------|------------------------|
| `/settings` | `s`, `set` | Yes |
| `/prompts` | `p`, `prompt` | Yes |
| `/functions` | `f`, `func` | Yes |
| `/mcp` | `m` | Yes |
| `/rag` | `r` | Yes |
| `/share` | `sh` | Yes |
| `/clear` | `c`, `cls` | Yes |
| `/help` | `h`, `?` | Yes |
| `/exit` | `quit`, `q`, `e` | Yes |

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Tab` | Autocomplete command |
| `Enter` | Execute (with autocomplete) |
| `↑` | Previous history item |
| `↓` | Next history item |
| `←` | Move cursor left |
| `→` | Move cursor right |
| `Ctrl+U` | Clear line |
| `Ctrl+W` | Delete word |
| `Ctrl+C` | Interrupt/Cancel |
| `Backspace` | Delete character |

## Testing

### Manual Test Procedure

1. **Start the chat interface:**
   ```bash
   ./hacka.re chat
   ```

2. **Test autocomplete:**
   - Type `/s` and press Tab
   - Type `/pr` and press Tab
   - Type `/f` and press Enter

3. **Test history:**
   - Enter several commands
   - Use ↑/↓ to navigate

4. **Test line editing:**
   - Type text and use arrows to move
   - Use Ctrl+U to clear
   - Use Ctrl+W to delete words

### Automated Test Script
```bash
./test_autocomplete.sh
```

## Troubleshooting

### Autocomplete Not Working
- Ensure terminal supports raw mode
- Check if running in compatible terminal
- Falls back to simple mode automatically

### History Not Saving
- History is session-only (not persistent)
- Limited to 100 entries
- Clears on application restart

### Display Issues
- Try different terminal emulator
- Check TERM environment variable
- Ensure UTF-8 encoding

## Future Enhancements

- [ ] Persistent history across sessions
- [ ] Fuzzy command matching
- [ ] Multi-line input support
- [ ] Custom key bindings
- [ ] Command aliases configuration
- [ ] Syntax highlighting
- [ ] Context-aware autocomplete