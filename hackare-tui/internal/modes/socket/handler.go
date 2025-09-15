package socket

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"

	"github.com/hacka-re/tui/internal/core"
)

// Handler manages the socket mode interface
type Handler struct {
	config   *core.ConfigManager
	state    *core.AppState
	eventBus *core.EventBus
	commands *CommandRegistry
	context  *Context

	input  io.Reader
	outputWriter io.Writer
	reader *bufio.Reader
	writer *bufio.Writer

	currentLine []rune
	cursorPos   int
	prompt      string

	mu       sync.Mutex
	running  bool
	stopChan chan struct{}
}

// NewHandler creates a new socket mode handler
func NewHandler(config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *Handler {
	return NewHandlerWithCallbacks(config, state, eventBus, nil)
}

// NewHandlerWithCallbacks creates a new socket mode handler with external callbacks
func NewHandlerWithCallbacks(config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus, callbacks interface{}) *Handler {
	h := &Handler{
		config:      config,
		state:       state,
		eventBus:    eventBus,
		commands:    NewCommandRegistry(),
		input:       os.Stdin,
		outputWriter: os.Stdout,
		currentLine: make([]rune, 0),
		prompt:      "> ",
		stopChan:    make(chan struct{}),
	}

	// Store callbacks in state if provided
	if callbacks != nil {
		state.SetCallbacks(callbacks)
	}

	h.reader = bufio.NewReader(h.input)
	h.writer = bufio.NewWriter(h.outputWriter)

	// Create context for command handlers
	h.context = &Context{
		handler:  h,
		config:   config,
		state:    state,
		eventBus: eventBus,
	}

	// Register default commands
	RegisterDefaultCommands(h.commands, h.context)

	// Subscribe to events
	h.subscribeToEvents()

	return h
}

// Start begins the socket mode interface
func (h *Handler) Start() error {
	h.mu.Lock()
	if h.running {
		h.mu.Unlock()
		return fmt.Errorf("already running")
	}
	h.running = true
	h.mu.Unlock()

	// Show welcome message
	h.showWelcome()

	// Main input loop
	for {
		select {
		case <-h.stopChan:
			return nil
		default:
			if err := h.handleInput(); err != nil {
				if err == io.EOF {
					return nil
				}
				h.outputError(err)
			}
		}
	}
}

// Stop halts the socket mode interface
func (h *Handler) Stop() {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.running {
		close(h.stopChan)
		h.running = false
	}
}

// handleInput processes a single line of input
func (h *Handler) handleInput() error {
	// Show prompt
	h.showPrompt()

	// Read line
	line, err := h.reader.ReadString('\n')
	if err != nil {
		return err
	}

	// Trim whitespace
	line = strings.TrimSpace(line)

	// Add to history if not empty
	if line != "" {
		h.state.AddToHistory(line)
	}

	// Process the input
	return h.processInput(line)
}

// processInput handles a line of input
func (h *Handler) processInput(input string) error {
	// Check if it's a command
	if strings.HasPrefix(input, "/") {
		return h.processCommand(input)
	}

	// Otherwise, treat as chat message
	if input != "" {
		return h.context.SendMessage(input)
	}

	return nil
}

// processCommand handles slash commands
func (h *Handler) processCommand(input string) error {
	// Remove leading slash
	input = strings.TrimPrefix(input, "/")

	// Split command and args
	parts := strings.SplitN(input, " ", 2)
	cmdName := parts[0]
	args := ""
	if len(parts) > 2 {
		args = parts[1]
	}

	// Find command
	cmd := h.commands.Get(cmdName)
	if cmd == nil {
		// Try autocomplete
		matches := h.commands.Autocomplete(cmdName)
		if len(matches) == 1 {
			cmd = h.commands.Get(matches[0])
		} else if len(matches) > 1 {
			h.outputf("Did you mean: /%s?\n", strings.Join(matches, ", /"))
			return nil
		} else {
			return fmt.Errorf("unknown command: /%s", cmdName)
		}
	}

	// Execute command
	return cmd.Handler(args, h.context)
}

// showWelcome displays the welcome message
func (h *Handler) showWelcome() {
	h.output("\n")
	h.output("╔════════════════════════════════════════╗\n")
	h.output("║       hacka.re Terminal UI v2.0       ║\n")
	h.output("║         Socket Mode Active             ║\n")
	h.output("╚════════════════════════════════════════╝\n")
	h.output("\n")
	h.output("Type /help for commands, or just start chatting!\n")
	h.output("\n")
}

// showPrompt displays the input prompt
func (h *Handler) showPrompt() {
	h.writer.WriteString(h.prompt)
	h.writer.Flush()
}

// output writes to the output
func (h *Handler) output(text string) {
	h.writer.WriteString(text)
	h.writer.Flush()
}

// outputf writes formatted text to the output
func (h *Handler) outputf(format string, args ...interface{}) {
	h.output(fmt.Sprintf(format, args...))
}

// outputError displays an error message
func (h *Handler) outputError(err error) {
	h.outputf("Error: %v\n", err)
}

// subscribeToEvents sets up event handlers
func (h *Handler) subscribeToEvents() {
	// Handle message events
	h.eventBus.Subscribe(core.EventMessageAdded, func(e core.Event) {
		if msg, ok := e.Data.(core.Message); ok {
			h.displayMessage(msg)
		}
	})

	// Handle stream events
	h.eventBus.Subscribe(core.EventStreamData, func(e core.Event) {
		if data, ok := e.Data.(string); ok {
			h.output(data)
		}
	})

	// Handle config changes
	h.eventBus.Subscribe(core.EventConfigChanged, func(e core.Event) {
		h.output("Configuration updated.\n")
	})
}

// displayMessage shows a chat message
func (h *Handler) displayMessage(msg core.Message) {
	prefix := ""
	switch msg.Role {
	case "user":
		prefix = "You: "
	case "assistant":
		prefix = "Assistant: "
	case "system":
		prefix = "System: "
	case "function":
		prefix = "Function: "
	}

	// Format and display the message
	lines := strings.Split(msg.Content, "\n")
	for i, line := range lines {
		if i == 0 {
			h.outputf("%s%s\n", prefix, line)
		} else {
			h.outputf("%s%s\n", strings.Repeat(" ", len(prefix)), line)
		}
	}
}

// Context provides command handlers access to the application
type Context struct {
	handler  *Handler
	config   *core.ConfigManager
	state    *core.AppState
	eventBus *core.EventBus
}

// Output writes text to the user
func (c *Context) Output(text string) {
	c.handler.output(text)
}

// Outputf writes formatted text to the user
func (c *Context) Outputf(format string, args ...interface{}) {
	c.handler.outputf(format, args...)
}

// SendMessage sends a chat message
func (c *Context) SendMessage(message string) error {
	// Add to state
	c.state.AddMessage("user", message)

	// Publish event
	c.eventBus.PublishAsync(core.EventMessageAdded, core.Message{
		Role:    "user",
		Content: message,
	})

	// Here you would normally send to the API
	// For now, just echo back
	response := fmt.Sprintf("I received: %s", message)
	c.state.AddMessage("assistant", response)

	c.eventBus.PublishAsync(core.EventMessageAdded, core.Message{
		Role:    "assistant",
		Content: response,
	})

	return nil
}

// ShowSettings displays the settings interface
func (c *Context) ShowSettings(args string) error {
	cfg := c.config.Get()

	c.Output("\nCurrent Settings:\n")
	c.Output("═══════════════════════════════════════\n")
	c.Outputf("1. API Provider: %s\n", cfg.Provider)
	c.Outputf("2. Model: %s\n", cfg.Model)
	c.Outputf("3. API Key: %s\n", maskAPIKey(cfg.APIKey))
	c.Outputf("4. Temperature: %.2f\n", cfg.Temperature)
	c.Outputf("5. Max Tokens: %d\n", cfg.MaxTokens)
	c.Outputf("6. Stream Mode: %v\n", cfg.StreamMode)
	c.Outputf("7. YOLO Mode: %v\n", cfg.YoloMode)
	c.Output("\nEnter number to edit, or press Enter to return: ")

	// In a real implementation, you'd read input here
	return nil
}

// Other context methods would be implemented similarly...

func (c *Context) ShowPrompts(args string) error {
	c.Output("Prompts management (coming soon)\n")
	return nil
}

func (c *Context) ShowFunctions(args string) error {
	c.Output("Functions management (coming soon)\n")
	return nil
}

func (c *Context) ShowMCP(args string) error {
	c.Output("MCP connections (coming soon)\n")
	return nil
}

func (c *Context) ShowRAG(args string) error {
	c.Output("RAG configuration (coming soon)\n")
	return nil
}

func (c *Context) GenerateShareLink() error {
	c.Output("Share link generation (coming soon)\n")
	return nil
}

func (c *Context) ClearScreen() error {
	// Send ANSI clear screen sequence
	c.Output("\033[2J\033[H")
	return nil
}

func (c *Context) ShowHistory() error {
	history := c.state.CommandHistory
	if len(history) == 0 {
		c.Output("No command history.\n")
		return nil
	}

	c.Output("\nCommand History:\n")
	for i, cmd := range history {
		c.Outputf("%3d: %s\n", i+1, cmd)
	}
	return nil
}

func (c *Context) SwitchMode(mode string) error {
	if mode == "" {
		c.Outputf("Current mode: %s\n", c.state.GetMode())
		c.Output("Available modes: rich, socket, auto\n")
		return nil
	}

	switch mode {
	case "rich":
		c.state.SetMode(core.ModeRich)
		c.Output("Switching to rich TUI mode...\n")
		// Would trigger mode switch here
	case "socket":
		c.state.SetMode(core.ModeSocket)
		c.Output("Already in socket mode.\n")
	case "auto":
		c.state.SetMode(core.ModeAuto)
		c.Output("Auto-detect mode enabled.\n")
	default:
		return fmt.Errorf("unknown mode: %s", mode)
	}

	return nil
}

func (c *Context) ShowStatus() error {
	c.Output("\nSystem Status:\n")
	c.Output("═══════════════════════════════════════\n")
	c.Outputf("Mode: %s\n", c.state.GetMode())
	c.Outputf("Connected: %v\n", c.state.Connected)
	c.Outputf("Messages: %d\n", len(c.state.Messages))
	c.Outputf("Functions: %d\n", len(c.state.Functions))
	c.Outputf("Prompts: %d\n", len(c.state.Prompts))

	if c.state.LastError != nil {
		c.Outputf("Last Error: %v\n", c.state.LastError)
	}

	return nil
}

func (c *Context) Exit() error {
	c.Output("Goodbye!\n")
	c.handler.Stop()
	os.Exit(0)
	return nil
}

func (c *Context) ResetSession() error {
	c.state.Messages = []core.Message{}
	c.Output("Chat session reset.\n")
	return nil
}

func (c *Context) ExportChat(filename string) error {
	if filename == "" {
		filename = "chat_export.txt"
	}
	c.Outputf("Exporting chat to %s (coming soon)\n", filename)
	return nil
}

// maskAPIKey masks an API key for display
func maskAPIKey(key string) string {
	if len(key) < 8 {
		return "****"
	}
	return key[:4] + "..." + key[len(key)-4:]
}