package chat

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
)

// Chat represents an interactive chat session
type Chat struct {
	config         *config.Config
	client         *api.Client
	messages       []api.Message
	history        []ChatHistory
	historyIndex   int
	screen         tcell.Screen
	mu             sync.Mutex
	cancelFunc     context.CancelFunc
	currentContext context.Context
	isStreaming    bool
	currentInput   []rune
	cursorPos      int
	commandHistory []string
	historyPos     int
	compactMode    bool
}

// ChatHistory represents a point in chat history
type ChatHistory struct {
	Messages []api.Message
	Input    string
	Time     time.Time
}

// NewChat creates a new chat session
func NewChat(cfg *config.Config) (*Chat, error) {
	fmt.Fprintf(os.Stderr, "!!!!! NewChat() CALLED - THIS SHOULD NEVER HAPPEN !!!!!\n")
	client := api.NewClient(cfg)

	// Initialize tcell screen
	screen, err := tcell.NewScreen()
	if err != nil {
		fmt.Fprintf(os.Stderr, "!!!!! tcell.NewScreen() FAILED: %v !!!!!\n", err)
		return nil, fmt.Errorf("failed to create screen: %w", err)
	}
	
	if err := screen.Init(); err != nil {
		return nil, fmt.Errorf("failed to initialize screen: %w", err)
	}
	
	chat := &Chat{
		config:         cfg,
		client:         client,
		messages:       []api.Message{},
		history:        []ChatHistory{},
		historyIndex:   -1,
		screen:         screen,
		currentInput:   []rune{},
		cursorPos:      0,
		commandHistory: []string{},
		historyPos:     -1,
		compactMode:    false,
	}
	
	// Add system prompt if configured
	if cfg.SystemPrompt != "" {
		chat.messages = append(chat.messages, api.Message{
			Role:    "system",
			Content: cfg.SystemPrompt,
		})
	}
	
	return chat, nil
}

// Run starts the interactive chat session
func (c *Chat) Run() error {
	// AGGRESSIVE DEBUG - THIS SHOULD NEVER BE CALLED
	fmt.Fprintf(os.Stderr, "!!!!! OLD FRAMED Chat.Run() IS BEING CALLED !!!!!\n")
	fmt.Fprintf(os.Stderr, "!!!!! THIS IS THE WRONG IMPLEMENTATION !!!!!\n")
	fmt.Fprintf(os.Stderr, "!!!!! c.screen = %v !!!!!\n", c.screen)

	if c.screen != nil {
		defer c.screen.Fini()
	} else {
		fmt.Fprintf(os.Stderr, "!!!!! c.screen is NIL - Chat not properly initialized !!!!!\n")
		return fmt.Errorf("chat not properly initialized")
	}

	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	
	// Clear screen and show welcome
	c.clearScreen()
	c.showWelcome()
	c.showPrompt()
	
	// Main event loop
	for {
		select {
		case sig := <-sigChan:
			if sig == syscall.SIGINT {
				// Handle Ctrl+C gracefully
				c.clearScreen()
				fmt.Println("\nGoodbye!")
				return nil
			}
		default:
			// Handle keyboard events
			if c.screen.HasPendingEvent() {
				ev := c.screen.PollEvent()
				if !c.handleEvent(ev) {
					return nil
				}
			}
		}
	}
}

// handleEvent processes keyboard events
func (c *Chat) handleEvent(ev tcell.Event) bool {
	switch ev := ev.(type) {
	case *tcell.EventKey:
		return c.handleKeyEvent(ev)
	case *tcell.EventResize:
		c.screen.Sync()
		c.redraw()
	}
	return true
}

// handleKeyEvent processes specific key events
func (c *Chat) handleKeyEvent(ev *tcell.EventKey) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	// Track escape key timing for double-escape detection
	static := struct {
		lastEscapeTime time.Time
	}{}
	
	switch ev.Key() {
	case tcell.KeyEscape:
		// Check for double escape (within 500ms)
		now := time.Now()
		if now.Sub(static.lastEscapeTime) < 500*time.Millisecond {
			// Double escape - show history navigation
			c.showHistoryNavigation()
			static.lastEscapeTime = time.Time{}
		} else {
			// Single escape - interrupt current operation
			static.lastEscapeTime = now
			if c.isStreaming {
				c.interruptStream()
			}
		}
		
	case tcell.KeyEnter:
		// Process input
		input := string(c.currentInput)
		if input == "" {
			return true
		}
		
		// Check for commands
		if strings.HasPrefix(input, "/") {
			return c.handleCommand(input)
		}
		
		// Add to command history
		c.commandHistory = append(c.commandHistory, input)
		c.historyPos = len(c.commandHistory)
		
		// Send message
		c.sendMessage(input)
		
		// Clear input
		c.currentInput = []rune{}
		c.cursorPos = 0
		c.redraw()
		
	case tcell.KeyUp:
		// Navigate command history up
		if c.historyPos > 0 {
			c.historyPos--
			c.currentInput = []rune(c.commandHistory[c.historyPos])
			c.cursorPos = len(c.currentInput)
			c.redraw()
		}
		
	case tcell.KeyDown:
		// Navigate command history down
		if c.historyPos < len(c.commandHistory)-1 {
			c.historyPos++
			c.currentInput = []rune(c.commandHistory[c.historyPos])
			c.cursorPos = len(c.currentInput)
			c.redraw()
		} else if c.historyPos == len(c.commandHistory)-1 {
			c.historyPos = len(c.commandHistory)
			c.currentInput = []rune{}
			c.cursorPos = 0
			c.redraw()
		}
		
	case tcell.KeyLeft:
		// Move cursor left
		if c.cursorPos > 0 {
			c.cursorPos--
			c.redraw()
		}
		
	case tcell.KeyRight:
		// Move cursor right
		if c.cursorPos < len(c.currentInput) {
			c.cursorPos++
			c.redraw()
		}
		
	case tcell.KeyBackspace, tcell.KeyBackspace2:
		// Delete character before cursor
		if c.cursorPos > 0 {
			c.currentInput = append(c.currentInput[:c.cursorPos-1], c.currentInput[c.cursorPos:]...)
			c.cursorPos--
			c.redraw()
		}
		
	case tcell.KeyDelete:
		// Delete character at cursor
		if c.cursorPos < len(c.currentInput) {
			c.currentInput = append(c.currentInput[:c.cursorPos], c.currentInput[c.cursorPos+1:]...)
			c.redraw()
		}
		
	case tcell.KeyHome:
		// Move cursor to beginning
		c.cursorPos = 0
		c.redraw()
		
	case tcell.KeyEnd:
		// Move cursor to end
		c.cursorPos = len(c.currentInput)
		c.redraw()
		
	case tcell.KeyCtrlC:
		// Exit
		return false
		
	case tcell.KeyCtrlL:
		// Clear screen
		c.clearScreen()
		c.redraw()
		
	case tcell.KeyCtrlA:
		// Move to beginning of line
		c.cursorPos = 0
		c.redraw()
		
	case tcell.KeyCtrlE:
		// Move to end of line
		c.cursorPos = len(c.currentInput)
		c.redraw()
		
	case tcell.KeyCtrlU:
		// Clear line
		c.currentInput = []rune{}
		c.cursorPos = 0
		c.redraw()
		
	case tcell.KeyCtrlK:
		// Kill to end of line
		c.currentInput = c.currentInput[:c.cursorPos]
		c.redraw()
		
	case tcell.KeyRune:
		// Insert character at cursor
		r := ev.Rune()
		c.currentInput = append(c.currentInput[:c.cursorPos], 
			append([]rune{r}, c.currentInput[c.cursorPos:]...)...)
		c.cursorPos++
		c.redraw()
	}
	
	return true
}

// handleCommand processes slash commands
func (c *Chat) handleCommand(cmd string) bool {
	fmt.Fprintf(os.Stderr, "!!!!! OLD Chat.handleCommand(%s) CALLED !!!!\n", cmd)
	cmd = strings.TrimSpace(cmd)
	parts := strings.Fields(cmd)
	
	if len(parts) == 0 {
		return true
	}
	
	switch parts[0] {
	case "/clear":
		// Clear chat history
		c.messages = []api.Message{}
		if c.config.SystemPrompt != "" {
			c.messages = append(c.messages, api.Message{
				Role:    "system",
				Content: c.config.SystemPrompt,
			})
		}
		c.clearScreen()
		c.showStatus("Chat history cleared")
		c.showPrompt()
		
	case "/compact":
		// Toggle compact mode
		c.compactMode = !c.compactMode
		if c.compactMode {
			c.compactHistory()
			c.showStatus("Compact mode enabled - history compacted")
		} else {
			c.showStatus("Compact mode disabled")
		}
		
	case "/help":
		c.showHelp()
		
	case "/exit", "/quit":
		return false
		
	case "/history":
		c.showFullHistory()
		
	case "/save":
		if len(parts) > 1 {
			filename := strings.Join(parts[1:], " ")
			c.saveHistory(filename)
		} else {
			c.showStatus("Usage: /save <filename>")
		}
		
	case "/model":
		if len(parts) > 1 {
			c.config.Model = strings.Join(parts[1:], " ")
			c.showStatus(fmt.Sprintf("Model changed to: %s", c.config.Model))
		} else {
			c.showStatus(fmt.Sprintf("Current model: %s", c.config.Model))
		}
		
	case "/system":
		if len(parts) > 1 {
			c.config.SystemPrompt = strings.Join(parts[1:], " ")
			// Update system message
			if len(c.messages) > 0 && c.messages[0].Role == "system" {
				c.messages[0].Content = c.config.SystemPrompt
			} else {
				c.messages = append([]api.Message{{
					Role:    "system",
					Content: c.config.SystemPrompt,
				}}, c.messages...)
			}
			c.showStatus("System prompt updated")
		} else {
			c.showStatus(fmt.Sprintf("System prompt: %s", c.config.SystemPrompt))
		}
		
	default:
		c.showStatus(fmt.Sprintf("Unknown command: %s", parts[0]))
	}
	
	return true
}

// sendMessage sends a user message and gets AI response
func (c *Chat) sendMessage(content string) {
	// Save current state to history
	c.saveToHistory(content)
	
	// Add user message
	userMsg := api.Message{
		Role:    "user",
		Content: content,
	}
	c.messages = append(c.messages, userMsg)
	
	// Display user message
	c.displayMessage(userMsg)
	
	// Create context for this request
	ctx, cancel := context.WithCancel(context.Background())
	c.currentContext = ctx
	c.cancelFunc = cancel
	c.isStreaming = true
	
	// Show thinking indicator
	c.showStatus("AI is thinking...")
	
	// Prepare for streaming response
	var responseBuilder strings.Builder
	streamStarted := false
	
	// Send request with streaming
	go func() {
		defer func() {
			c.mu.Lock()
			c.isStreaming = false
			c.cancelFunc = nil
			c.mu.Unlock()
		}()
		
		response, err := c.client.SendChatCompletion(c.messages, func(chunk string) error {
			// Check if context is cancelled
			select {
			case <-ctx.Done():
				return fmt.Errorf("interrupted by user")
			default:
			}
			
			// First chunk - clear status and prepare display
			if !streamStarted {
				streamStarted = true
				c.clearStatus()
				c.startStreamingDisplay()
			}
			
			// Append chunk to response
			responseBuilder.WriteString(chunk)
			
			// Update display with new chunk
			c.updateStreamingDisplay(chunk)
			
			return nil
		})
		
		if err != nil {
			if strings.Contains(err.Error(), "interrupted") {
				c.showStatus("Response interrupted")
			} else {
				c.showError(fmt.Sprintf("Error: %v", err))
			}
			return
		}
		
		// Add assistant message to history
		assistantMsg := api.Message{
			Role:    "assistant",
			Content: responseBuilder.String(),
		}
		
		if assistantMsg.Content == "" && response != nil && 
		   len(response.Choices) > 0 {
			assistantMsg.Content = response.Choices[0].Message.Content
		}
		
		c.mu.Lock()
		c.messages = append(c.messages, assistantMsg)
		c.mu.Unlock()
		
		// Finalize display
		c.finalizeStreamingDisplay()
		c.showPrompt()
	}()
}

// interruptStream cancels the current streaming operation
func (c *Chat) interruptStream() {
	if c.cancelFunc != nil {
		c.cancelFunc()
		c.isStreaming = false
	}
}

// showHistoryNavigation displays history navigation interface
func (c *Chat) showHistoryNavigation() {
	c.clearScreen()
	fmt.Println("╔════════════════════════════════════════════╗")
	fmt.Println("║           CHAT HISTORY NAVIGATION          ║")
	fmt.Println("╚════════════════════════════════════════════╝")
	fmt.Println()
	
	if len(c.history) == 0 {
		fmt.Println("No history available")
		fmt.Println("\nPress any key to continue...")
		c.screen.PollEvent()
		c.redraw()
		return
	}
	
	// Show history entries
	for i, entry := range c.history {
		marker := "  "
		if i == c.historyIndex {
			marker = "▶ "
		}
		fmt.Printf("%s[%d] %s - %s\n", marker, i+1, 
			entry.Time.Format("15:04:05"), 
			truncate(entry.Input, 50))
	}
	
	fmt.Println("\nUse arrow keys to navigate, Enter to select, Escape to cancel")
	
	// Handle navigation
	for {
		ev := c.screen.PollEvent()
		switch ev := ev.(type) {
		case *tcell.EventKey:
			switch ev.Key() {
			case tcell.KeyUp:
				if c.historyIndex > 0 {
					c.historyIndex--
					c.showHistoryNavigation()
					return
				}
			case tcell.KeyDown:
				if c.historyIndex < len(c.history)-1 {
					c.historyIndex++
					c.showHistoryNavigation()
					return
				}
			case tcell.KeyEnter:
				// Restore selected history point
				if c.historyIndex >= 0 && c.historyIndex < len(c.history) {
					c.messages = make([]api.Message, len(c.history[c.historyIndex].Messages))
					copy(c.messages, c.history[c.historyIndex].Messages)
					c.currentInput = []rune(c.history[c.historyIndex].Input)
					c.cursorPos = len(c.currentInput)
				}
				c.redraw()
				return
			case tcell.KeyEscape:
				c.redraw()
				return
			}
		}
	}
}

// compactHistory compacts the message history to save tokens
func (c *Chat) compactHistory() {
	if len(c.messages) <= 10 {
		return // Don't compact if history is small
	}
	
	// Keep system prompt
	compacted := []api.Message{}
	if len(c.messages) > 0 && c.messages[0].Role == "system" {
		compacted = append(compacted, c.messages[0])
	}
	
	// Create a summary of older messages
	summaryContent := "Previous conversation summary:\n"
	messageCount := 0
	
	// Summarize older messages (keep last 5 exchanges)
	cutoff := len(c.messages) - 10
	if cutoff < 1 {
		cutoff = 1
	}
	
	for i := 1; i < cutoff; i++ {
		msg := c.messages[i]
		if msg.Role == "user" {
			summaryContent += fmt.Sprintf("- User asked about: %s\n", 
				truncate(msg.Content, 50))
			messageCount++
		}
	}
	
	if messageCount > 0 {
		compacted = append(compacted, api.Message{
			Role:    "system",
			Content: summaryContent,
		})
	}
	
	// Keep recent messages
	for i := cutoff; i < len(c.messages); i++ {
		compacted = append(compacted, c.messages[i])
	}
	
	c.messages = compacted
}

// saveToHistory saves current state to history
func (c *Chat) saveToHistory(input string) {
	messagesCopy := make([]api.Message, len(c.messages))
	copy(messagesCopy, c.messages)
	
	c.history = append(c.history, ChatHistory{
		Messages: messagesCopy,
		Input:    input,
		Time:     time.Now(),
	})
	c.historyIndex = len(c.history) - 1
}

// Helper display functions

func (c *Chat) clearScreen() {
	fmt.Fprintf(os.Stderr, "!!!!! OLD Chat.clearScreen() CALLED !!!!\n")
	c.screen.Clear()
	c.screen.Sync()
	// Also clear terminal
	fmt.Print("\033[H\033[2J")
}

func (c *Chat) showWelcome() {
	fmt.Fprintf(os.Stderr, "!!!!! OLD Chat.showWelcome() CALLED - SHOWING FRAME !!!!\n")
	fmt.Println("╔════════════════════════════════════════════╗")
	fmt.Println("║       hacka.re CLI - Streaming Chat        ║")
	fmt.Println("╚════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  /help     - Show help")
	fmt.Println("  /clear    - Clear chat history")
	fmt.Println("  /compact  - Toggle compact mode")
	fmt.Println("  /exit     - Exit chat")
	fmt.Println()
	fmt.Println("Controls:")
	fmt.Println("  ESC       - Interrupt streaming")
	fmt.Println("  ESC ESC   - Navigate history")
	fmt.Println("  ↑/↓       - Command history")
	fmt.Println("  Ctrl+C    - Exit")
	fmt.Println()
	fmt.Println("─" + strings.Repeat("─", 44))
	fmt.Println()
}

func (c *Chat) showPrompt() {
	fmt.Print("\n> ")
	if len(c.currentInput) > 0 {
		fmt.Print(string(c.currentInput))
	}
}

func (c *Chat) redraw() {
	// This would be more sophisticated in a full implementation
	c.clearScreen()
	
	// Redraw messages
	for _, msg := range c.messages {
		if msg.Role != "system" || !c.compactMode {
			c.displayMessage(msg)
		}
	}
	
	c.showPrompt()
}

func (c *Chat) displayMessage(msg api.Message) {
	switch msg.Role {
	case "user":
		fmt.Printf("\n[You]: %s\n", msg.Content)
	case "assistant":
		fmt.Printf("\n[AI]: %s\n", msg.Content)
	case "system":
		if !c.compactMode {
			fmt.Printf("\n[System]: %s\n", msg.Content)
		}
	}
}

func (c *Chat) startStreamingDisplay() {
	fmt.Print("\n[AI]: ")
}

func (c *Chat) updateStreamingDisplay(chunk string) {
	fmt.Print(chunk)
}

func (c *Chat) finalizeStreamingDisplay() {
	fmt.Println()
}

func (c *Chat) showStatus(status string) {
	fmt.Printf("\n[%s]\n", status)
}

func (c *Chat) clearStatus() {
	// Implementation depends on terminal capabilities
}

func (c *Chat) showError(err string) {
	fmt.Printf("\n[ERROR]: %s\n", err)
}

func (c *Chat) showHelp() {
	help := `
╔════════════════════════════════════════════╗
║                  HELP                      ║
╚════════════════════════════════════════════╝

Commands:
  /clear        Clear chat history
  /compact      Toggle compact mode (reduces token usage)
  /help         Show this help
  /exit         Exit chat
  /history      Show full history
  /save <file>  Save chat to file
  /model <name> Change model
  /system <msg> Update system prompt

Keyboard Controls:
  ESC           Interrupt current streaming response
  ESC ESC       Navigate to previous messages
  ↑/↓           Navigate command history
  ←/→           Move cursor in input
  Ctrl+C        Exit application
  Ctrl+L        Clear screen
  Ctrl+U        Clear current line
  Ctrl+K        Kill to end of line
  Ctrl+A        Move to beginning of line
  Ctrl+E        Move to end of line

Press any key to continue...
`
	fmt.Print(help)
	c.screen.PollEvent()
	c.redraw()
}

func (c *Chat) showFullHistory() {
	fmt.Println("\n" + strings.Repeat("─", 50))
	fmt.Println("CHAT HISTORY")
	fmt.Println(strings.Repeat("─", 50))
	
	for _, msg := range c.messages {
		c.displayMessage(msg)
	}
	
	fmt.Println("\n" + strings.Repeat("─", 50))
	fmt.Println("Press any key to continue...")
	c.screen.PollEvent()
	c.redraw()
}

func (c *Chat) saveHistory(filename string) {
	file, err := os.Create(filename)
	if err != nil {
		c.showError(fmt.Sprintf("Failed to create file: %v", err))
		return
	}
	defer file.Close()
	
	writer := bufio.NewWriter(file)
	for _, msg := range c.messages {
		fmt.Fprintf(writer, "[%s]: %s\n\n", msg.Role, msg.Content)
	}
	writer.Flush()
	
	c.showStatus(fmt.Sprintf("History saved to %s", filename))
}

// Helper functions

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// Close cleans up resources
func (c *Chat) Close() {
	if c.screen != nil {
		c.screen.Fini()
	}
}