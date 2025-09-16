package chat

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"

	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"golang.org/x/term"
)

// TerminalChat provides an enhanced terminal chat with readline-like features
type TerminalChat struct {
	config         *config.Config
	client         *api.Client
	messages       []api.Message
	history        []string
	historyPos     int
	mu             sync.Mutex
	cancelFunc     context.CancelFunc
	currentContext context.Context
	isStreaming    bool
	commands       *CommandRegistry
	modalHandlers  ModalHandlers

	// Terminal state
	currentLine    []rune
	cursorPos      int
	oldState       *term.State
	termWidth      int
	termHeight     int
}

// NewTerminalChat creates a new terminal chat session
func NewTerminalChat(cfg *config.Config) *TerminalChat {
	logger.Get().Info("=============== NewTerminalChat (ENHANCED) STARTED ===============")
	logger.Get().Info("Config Provider: %s", cfg.Provider)
	logger.Get().Info("Config BaseURL: %s", cfg.BaseURL)
	logger.Get().Info("Config Model: %s", cfg.Model)
	logger.Get().Info("Config API Key length: %d", len(cfg.APIKey))

	client := api.NewClient(cfg)

	chat := &TerminalChat{
		config:      cfg,
		client:      client,
		messages:    []api.Message{},
		history:     []string{},
		historyPos:  -1,
		commands:    NewCommandRegistry(),
		currentLine: []rune{},
		cursorPos:   0,
		termWidth:   80,  // Default width
		termHeight:  24,  // Default height
	}

	// Register all commands
	chat.registerCommands()

	// Add system prompt if configured
	if cfg.SystemPrompt != "" {
		logger.Get().Info("Adding system prompt: %s", cfg.SystemPrompt)
		chat.messages = append(chat.messages, api.Message{
			Role:    "system",
			Content: cfg.SystemPrompt,
		})
	}

	logger.Get().Info("TerminalChat created with %d initial messages", len(chat.messages))
	return chat
}

// registerCommands sets up all available slash commands (simplified)
func (tc *TerminalChat) registerCommands() {
	// Menu command - opens TUI for all configuration
	tc.commands.Register(&Command{
		Name:        "menu",
		Aliases:     []string{"m", "tui"},
		Description: "Open configuration menu",
		Handler: func() error {
			if tc.modalHandlers.OpenTUI != nil {
				return tc.modalHandlers.OpenTUI()
			}
			return fmt.Errorf("TUI handler not configured")
		},
	})

	// Clear command
	tc.commands.Register(&Command{
		Name:        "clear",
		Aliases:     []string{"c", "cls"},
		Description: "Clear chat history",
		Handler: func() error {
			tc.clearChat()
			return nil
		},
	})

	// Help command
	tc.commands.Register(&Command{
		Name:        "help",
		Aliases:     []string{"h", "?"},
		Description: "Show available commands",
		Handler: func() error {
			fmt.Println("\n" + tc.commands.GetHelp())
			return nil
		},
	})

	// Exit command
	tc.commands.Register(&Command{
		Name:        "exit",
		Aliases:     []string{"quit", "q", "e"},
		Description: "Exit the application",
		Handler: func() error {
			fmt.Println("\nGoodbye!")
			os.Exit(0)
			return nil
		},
	})
}

// SetModalHandlers sets the modal handler functions
func (tc *TerminalChat) SetModalHandlers(handlers ModalHandlers) {
	tc.modalHandlers = handlers
}

// Run starts the terminal chat interface
func (tc *TerminalChat) Run() error {
	fmt.Fprintf(os.Stderr, "!!!!! TerminalChat.Run() (ENHANCED) CALLED !!!!\n")
	logger.Get().Info("=============== TerminalChat.Run() (ENHANCED) STARTED ===============")

	// Get terminal dimensions
	tc.updateTerminalSize()

	// Setup terminal for raw mode
	var err error
	tc.oldState, err = term.MakeRaw(int(os.Stdin.Fd()))
	if err != nil {
		logger.Get().Warn("Failed to setup raw mode, falling back to simple mode: %v", err)
		// Fall back to simple mode if raw mode fails
		return tc.runSimpleMode()
	}
	defer term.Restore(int(os.Stdin.Fd()), tc.oldState)
	logger.Get().Info("Terminal in raw mode")

	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		// Restore terminal before exit
		term.Restore(int(os.Stdin.Fd()), tc.oldState)
		fmt.Println("\n\nUse /exit to quit the application")
		os.Exit(0)
	}()

	// Show welcome
	tc.showWelcome()

	// Main loop with raw terminal handling
	for {
		// Update terminal size periodically
		tc.updateTerminalSize()

		// Show prompt
		tc.showPrompt()

		// Read input with autocomplete and history
		input, err := tc.readLineWithFeatures()
		if err != nil {
			if err == io.EOF {
				fmt.Println("\nUse /exit to quit")
				continue
			}
			fmt.Printf("\nError: %v\n", err)
			continue
		}

		// Process input
		if input == "" {
			continue
		}

		// Add to history
		tc.addToHistory(input)

		// Check for command
		if IsCommand(input) {
			tc.handleCommand(input)
		} else {
			tc.processMessage(input)
		}
	}
}

// readLineWithFeatures reads a line with autocomplete and history support
func (tc *TerminalChat) readLineWithFeatures() (string, error) {
	tc.currentLine = []rune{}
	tc.cursorPos = 0

	// Buffer for reading input
	buf := make([]byte, 1)

	for {
		// Read one byte
		n, err := os.Stdin.Read(buf)
		if err != nil {
			return "", err
		}
		if n == 0 {
			continue
		}

		b := buf[0]

		// Handle special keys
		switch b {
		case 0x0D, 0x0A: // Enter
			line := string(tc.currentLine)
			fmt.Println() // New line after input

			// Check for autocomplete if it's a partial command
			if IsCommand(line) {
				cmdStr, _ := ParseCommand(line)
				if fullCmd, cmd := tc.commands.Autocomplete(cmdStr); cmd != nil && fullCmd != line {
					// Show autocomplete suggestion
					fmt.Printf("Executing: %s\n", fullCmd)
					return fullCmd, nil
				}
			}

			return line, nil

		case 0x09: // Tab - autocomplete
			line := string(tc.currentLine)
			if IsCommand(line) {
				tc.handleAutocomplete()
			}

		case 0x1B: // Escape sequence (arrow keys, etc.)
			// Read next bytes for escape sequence
			seq := make([]byte, 2)
			os.Stdin.Read(seq)

			if seq[0] == '[' {
				switch seq[1] {
				case 'A': // Up arrow - previous history
					tc.navigateHistory(-1)
				case 'B': // Down arrow - next history
					tc.navigateHistory(1)
				case 'C': // Right arrow
					if tc.cursorPos < len(tc.currentLine) {
						tc.cursorPos++
						tc.redrawLine()
					}
				case 'D': // Left arrow
					if tc.cursorPos > 0 {
						tc.cursorPos--
						tc.redrawLine()
					}
				}
			}

		case 0x7F, 0x08: // Backspace
			if tc.cursorPos > 0 {
				// Remove character before cursor
				tc.currentLine = append(tc.currentLine[:tc.cursorPos-1], tc.currentLine[tc.cursorPos:]...)
				tc.cursorPos--
				tc.redrawLine()
			}

		case 0x03: // Ctrl+C
			return "", io.EOF

		case 0x04: // Ctrl+D
			if len(tc.currentLine) == 0 {
				return "", io.EOF
			}

		case 0x15: // Ctrl+U - clear line
			tc.currentLine = []rune{}
			tc.cursorPos = 0
			tc.redrawLine()

		case 0x17: // Ctrl+W - delete word
			tc.deleteWord()

		default:
			// Regular character
			if b >= 0x20 && b < 0x7F {
				// Insert character at cursor position
				tc.currentLine = append(tc.currentLine[:tc.cursorPos],
					append([]rune{rune(b)}, tc.currentLine[tc.cursorPos:]...)...)
				tc.cursorPos++
				tc.redrawLine()
			}
		}
	}
}

// handleAutocomplete handles tab completion
func (tc *TerminalChat) handleAutocomplete() {
	line := string(tc.currentLine)
	cmdStr, _ := ParseCommand(line)

	// Get autocomplete suggestion
	fullCmd, cmd := tc.commands.Autocomplete(cmdStr)
	if cmd != nil && fullCmd != line {
		// Replace current line with autocompleted command
		tc.currentLine = []rune(fullCmd)
		tc.cursorPos = len(tc.currentLine)
		tc.redrawLine()
	} else {
		// Show available completions
		suggestions := tc.commands.GetSuggestions(cmdStr)
		if len(suggestions) > 0 {
			fmt.Println()

			// Update terminal size in case it changed
			tc.updateTerminalSize()

			// Format suggestions to fit terminal width
			for _, s := range suggestions {
				if len(s) > tc.termWidth-4 {
					fmt.Printf("  %s...\n", s[:tc.termWidth-7])
				} else {
					fmt.Printf("  %s\n", s)
				}
			}
			tc.showPrompt()
			tc.redrawLine()
		}
	}
}

// navigateHistory moves through command history
func (tc *TerminalChat) navigateHistory(direction int) {
	newPos := tc.historyPos + direction

	if direction < 0 { // Up - go back in history
		if newPos < len(tc.history) {
			tc.historyPos = newPos
			if tc.historyPos >= 0 && tc.historyPos < len(tc.history) {
				// Get history item from the end
				historyIndex := len(tc.history) - 1 - tc.historyPos
				tc.currentLine = []rune(tc.history[historyIndex])
				tc.cursorPos = len(tc.currentLine)
				tc.redrawLine()
			}
		}
	} else { // Down - go forward in history
		if newPos >= 0 {
			tc.historyPos = newPos
			if tc.historyPos >= len(tc.history) {
				// Past the end of history - clear line
				tc.historyPos = -1
				tc.currentLine = []rune{}
				tc.cursorPos = 0
			} else {
				// Get history item from the end
				historyIndex := len(tc.history) - 1 - tc.historyPos
				tc.currentLine = []rune(tc.history[historyIndex])
				tc.cursorPos = len(tc.currentLine)
			}
			tc.redrawLine()
		}
	}
}

// updateTerminalSize gets the current terminal dimensions
func (tc *TerminalChat) updateTerminalSize() {
	width, height, err := term.GetSize(int(os.Stdin.Fd()))
	if err != nil {
		// Use defaults if we can't get size
		tc.termWidth = 80
		tc.termHeight = 24
	} else {
		tc.termWidth = width
		tc.termHeight = height
	}
}

// redrawLine redraws the current input line
func (tc *TerminalChat) redrawLine() {
	// Clear current line completely
	fmt.Print("\r\033[K")

	// Calculate prompt length
	prompt := "> "
	promptLen := len(prompt)
	fmt.Print(prompt)

	line := string(tc.currentLine)
	availableWidth := tc.termWidth - promptLen - 1 // Leave 1 char margin

	// Handle line wrapping for display
	displayLine := line
	displayCursor := tc.cursorPos

	// If line is too long, show a window around cursor
	if len(line) > availableWidth {
		// Show a sliding window centered on cursor
		start := 0
		if tc.cursorPos > availableWidth/2 {
			start = tc.cursorPos - availableWidth/2
			if start+availableWidth > len(line) {
				start = len(line) - availableWidth
			}
		}
		if start < 0 {
			start = 0
		}

		end := start + availableWidth
		if end > len(line) {
			end = len(line)
		}

		displayLine = line[start:end]
		displayCursor = tc.cursorPos - start

		// Add indicators for more content
		if start > 0 {
			displayLine = "…" + displayLine[1:]
		}
		if end < len(line) {
			displayLine = displayLine[:len(displayLine)-1] + "…"
		}
	}

	// Check for autocomplete hint (only if at end of line)
	if IsCommand(line) && tc.cursorPos == len(tc.currentLine) && len(displayLine) < availableWidth-10 {
		cmdStr, _ := ParseCommand(line)
		if fullCmd, cmd := tc.commands.Autocomplete(cmdStr); cmd != nil && fullCmd != line && strings.HasPrefix(fullCmd, line) {
			// Show the typed part normally
			fmt.Print(displayLine)
			// Show the autocomplete suggestion in dim (truncate if needed)
			hint := fullCmd[len(line):]
			remainingSpace := availableWidth - len(displayLine)
			if len(hint) > remainingSpace {
				hint = hint[:remainingSpace]
			}
			fmt.Printf("\033[2m%s\033[0m", hint)
			// Move cursor back to end of typed part
			if len(hint) > 0 {
				fmt.Printf("\033[%dD", len(hint))
			}
		} else {
			fmt.Print(displayLine)
		}
	} else {
		fmt.Print(displayLine)
	}

	// Position cursor correctly
	if displayCursor < len(displayLine) {
		// Move cursor back to correct position
		moveBack := len(displayLine) - displayCursor
		if moveBack > 0 {
			fmt.Printf("\033[%dD", moveBack)
		}
	}
}

// deleteWord deletes the word before cursor
func (tc *TerminalChat) deleteWord() {
	if tc.cursorPos == 0 {
		return
	}

	// Find start of word
	start := tc.cursorPos - 1
	for start > 0 && tc.currentLine[start] == ' ' {
		start--
	}
	for start > 0 && tc.currentLine[start-1] != ' ' {
		start--
	}

	// Delete from start to cursor
	tc.currentLine = append(tc.currentLine[:start], tc.currentLine[tc.cursorPos:]...)
	tc.cursorPos = start
	tc.redrawLine()
}

// addToHistory adds a line to history
func (tc *TerminalChat) addToHistory(line string) {
	// Don't add empty lines or duplicates
	if line == "" {
		return
	}
	if len(tc.history) > 0 && tc.history[len(tc.history)-1] == line {
		return
	}

	tc.history = append(tc.history, line)
	tc.historyPos = -1 // Reset position

	// Limit history size
	if len(tc.history) > 100 {
		tc.history = tc.history[1:]
	}
}

// showPrompt shows the input prompt
func (tc *TerminalChat) showPrompt() {
	// Show provider/model at the prompt
	prompt := fmt.Sprintf("\n%s/%s >> ", tc.config.Provider, tc.config.Model)
	fmt.Print(prompt)
}

// showWelcome displays the welcome message
func (tc *TerminalChat) showWelcome() {
	fmt.Fprintf(os.Stderr, "!!!!! TerminalChat.showWelcome() CALLED - SIMPLIFIED !!!!\n")
	logger.Get().Info("showWelcome called in terminal_enhanced")

	// Update terminal size before drawing
	tc.updateTerminalSize()

	fmt.Print("\033[2J\033[H") // Clear screen

	// Simplified welcome - no borders, just essential info
	fmt.Println("Chat started. Type /help for commands, /exit to quit.")
	fmt.Println()
}

// createBorder creates a border line that fits the terminal width
func (tc *TerminalChat) createBorder() string {
	width := tc.termWidth
	if width > 80 {
		width = 80 // Cap at 80 for readability
	}
	if width < 20 {
		width = 20 // Minimum width
	}

	border := ""
	for i := 0; i < width; i++ {
		border += "═"
	}
	return border
}

// centerText prints centered text within terminal width
func (tc *TerminalChat) centerText(text string) {
	width := tc.termWidth
	if width > 80 {
		width = 80
	}

	padding := (width - len(text)) / 2
	if padding < 0 {
		padding = 0
	}

	fmt.Printf("%*s%s\n", padding, "", text)
}

// printFormatted prints text with proper wrapping for terminal width
func (tc *TerminalChat) printFormatted(format string, args ...interface{}) {
	text := fmt.Sprintf(format, args...)

	// For now, just print as-is if it fits
	if len(text) <= tc.termWidth {
		fmt.Println(text)
		return
	}

	// Otherwise, truncate with ellipsis
	if tc.termWidth > 3 {
		fmt.Println(text[:tc.termWidth-3] + "...")
	} else {
		fmt.Println(text[:tc.termWidth])
	}
}

// runSimpleMode runs in simple mode if raw mode is not available
func (tc *TerminalChat) runSimpleMode() error {
	fmt.Fprintf(os.Stderr, "!!!!! TerminalChat.runSimpleMode() FALLBACK !!!!\n")
	logger.Get().Info("!!!!! runSimpleMode CALLED - FALLBACK MODE !!!!!")
	reader := bufio.NewReader(os.Stdin)

	// Show welcome
	tc.showWelcome()

	for {
		fmt.Print("\n> ")
		input, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				fmt.Println("\nUse /exit to quit")
				continue
			}
			return err
		}

		input = strings.TrimSpace(input)
		if input == "" {
			continue
		}

		// Add to history
		tc.addToHistory(input)

		// Check for command with autocomplete
		if IsCommand(input) {
			cmdStr, _ := ParseCommand(input)
			if fullCmd, cmd := tc.commands.Autocomplete(cmdStr); cmd != nil && fullCmd != input {
				fmt.Printf("Executing: %s\n", fullCmd)
				input = fullCmd
			}
			tc.handleCommand(input)
		} else {
			tc.processMessage(input)
		}
	}
}

// handleCommand processes slash commands
func (tc *TerminalChat) handleCommand(input string) {
	cmdStr, _ := ParseCommand(input)

	cmd := tc.commands.GetCommand(cmdStr)
	if cmd == nil {
		fmt.Printf("Unknown command: %s\n", input)
		fmt.Println("Type /help for available commands")
		return
	}

	// Execute the command
	if err := cmd.Handler(); err != nil {
		fmt.Printf("Error executing command: %v\n", err)
	}
}

// clearChat clears the chat history
func (tc *TerminalChat) clearChat() {
	logger.Get().Info("Clearing chat history")
	oldCount := len(tc.messages)
	tc.messages = []api.Message{}

	// Re-add system prompt if configured
	if tc.config.SystemPrompt != "" {
		tc.messages = append(tc.messages, api.Message{
			Role:    "system",
			Content: tc.config.SystemPrompt,
		})
	}
	logger.Get().Info("Cleared %d messages, kept system prompt: %v", oldCount, tc.config.SystemPrompt != "")

	// Clear screen - simplified display
	fmt.Print("\033[2J\033[H")
	fmt.Println("Chat history cleared.")
	fmt.Println()
}

// processMessage sends a message to the AI and displays the response
func (tc *TerminalChat) processMessage(input string) {
	logger.Get().Info("================== processMessage START (ENHANCED) ==================")
	logger.Get().Info("User input: '%s'", input)

	// Log current messages before adding new
	logger.Get().Info("Current messages count: %d", len(tc.messages))
	for i, msg := range tc.messages {
		logger.Get().Debug("  Message[%d] Role=%s, Content='%s'", i, msg.Role, msg.Content)
	}

	// Add user message
	tc.messages = append(tc.messages, api.Message{
		Role:    "user",
		Content: input,
	})
	logger.Get().Info("Added user message, total now: %d", len(tc.messages))

	// Create context for this request
	ctx, cancel := context.WithCancel(context.Background())
	tc.mu.Lock()
	tc.cancelFunc = cancel
	tc.currentContext = ctx
	tc.isStreaming = true
	tc.mu.Unlock()

	defer func() {
		tc.mu.Lock()
		tc.isStreaming = false
		tc.cancelFunc = nil
		tc.mu.Unlock()
	}()

	// Show thinking indicator (just a newline, no "AI:" prefix)
	fmt.Print("\n")

	// Send request
	var fullResponse strings.Builder
	streamCallback := func(chunk string) error {
		select {
		case <-ctx.Done():
			return context.Canceled
		default:
			fmt.Print(chunk)
			fullResponse.WriteString(chunk)
			return nil
		}
	}

	// Use the client's SendChatCompletion method
	var callback api.StreamCallback
	if tc.config.StreamResponse {
		callback = streamCallback
	}

	logger.Get().Info("Calling SendChatCompletion with %d messages", len(tc.messages))
	logger.Get().Info("Stream mode: %v", tc.config.StreamResponse)

	response, err := tc.client.SendChatCompletion(tc.messages, callback)
	if err != nil {
		logger.Get().Error("API call failed: %v", err)
		fmt.Printf("\nError: %v\n", err)
		return
	}

	logger.Get().Info("API call successful")

	// Add assistant message
	responseText := fullResponse.String()
	if responseText == "" && response != nil && len(response.Choices) > 0 {
		responseText = response.Choices[0].Message.Content
		fmt.Println(responseText)
	}

	tc.messages = append(tc.messages, api.Message{
		Role:    "assistant",
		Content: responseText,
	})
}