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

	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"golang.org/x/term"
)

// SimpleChat provides a simpler terminal-based chat interface
type SimpleChat struct {
	config         *config.Config
	client         *api.Client
	messages       []api.Message
	history        []string
	historyPos     int
	mu             sync.Mutex
	cancelFunc     context.CancelFunc
	currentContext context.Context
	isStreaming    bool
	lastEscapeTime time.Time
	reader         *bufio.Reader
}

// NewSimpleChat creates a new simple chat session
func NewSimpleChat(cfg *config.Config) *SimpleChat {
	client := api.NewClient(cfg)
	
	chat := &SimpleChat{
		config:     cfg,
		client:     client,
		messages:   []api.Message{},
		history:    []string{},
		historyPos: -1,
		reader:     bufio.NewReader(os.Stdin),
	}
	
	// Add system prompt if configured
	if cfg.SystemPrompt != "" {
		chat.messages = append(chat.messages, api.Message{
			Role:    "system",
			Content: cfg.SystemPrompt,
		})
	}
	
	return chat
}

// Run starts the interactive chat session
func (sc *SimpleChat) Run() error {
	// Setup signal handling for interrupts
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT)
	
	// Handle Ctrl+C gracefully
	go func() {
		<-sigChan
		sc.mu.Lock()
		if sc.isStreaming && sc.cancelFunc != nil {
			// First Ctrl+C interrupts streaming
			fmt.Println("\n\n[Interrupted - press Ctrl+C again to exit]")
			sc.cancelFunc()
			sc.isStreaming = false
			sc.mu.Unlock()
			return
		}
		sc.mu.Unlock()
		// Second Ctrl+C exits
		fmt.Println("\n\nGoodbye!")
		os.Exit(0)
	}()
	
	// Show welcome message
	sc.showWelcome()
	
	// Main chat loop
	for {
		// Show prompt
		fmt.Print("\n> ")
		
		// Read input line
		input, err := sc.readInput()
		if err != nil {
			if err.Error() == "exit" {
				fmt.Println("\nGoodbye!")
				return nil
			}
			fmt.Printf("\nError reading input: %v\n", err)
			continue
		}
		
		// Skip empty input
		if strings.TrimSpace(input) == "" {
			continue
		}
		
		// Handle commands
		if strings.HasPrefix(input, "/") {
			if !sc.handleCommand(input) {
				return nil
			}
			continue
		}
		
		// Add to history
		sc.history = append(sc.history, input)
		sc.historyPos = len(sc.history)
		
		// Send message
		sc.sendMessage(input)
	}
}

// readInput reads a line of input with special key handling
func (sc *SimpleChat) readInput() (string, error) {
	// For now, use simple line reading
	// In a production version, we'd use raw terminal mode for better control
	line, err := sc.reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	
	return strings.TrimSpace(line), nil
}

// handleCommand processes slash commands
func (sc *SimpleChat) handleCommand(cmd string) bool {
	cmd = strings.TrimSpace(cmd)
	parts := strings.Fields(cmd)
	
	if len(parts) == 0 {
		return true
	}
	
	switch parts[0] {
	case "/clear":
		// Clear chat history
		sc.messages = []api.Message{}
		if sc.config.SystemPrompt != "" {
			sc.messages = append(sc.messages, api.Message{
				Role:    "system",
				Content: sc.config.SystemPrompt,
			})
		}
		sc.clearScreen()
		fmt.Println("✓ Chat history cleared")
		
	case "/compact":
		// Compact history to save tokens
		sc.compactHistory()
		fmt.Println("✓ History compacted")
		
	case "/help", "/?":
		sc.showHelp()
		
	case "/exit", "/quit", "/q":
		return false
		
	case "/history":
		sc.showHistory()
		
	case "/model":
		if len(parts) > 1 {
			sc.config.Model = strings.Join(parts[1:], " ")
			fmt.Printf("✓ Model changed to: %s\n", sc.config.Model)
			fmt.Printf("  Capabilities: %s\n", sc.client.GetModelInfo())
		} else {
			fmt.Printf("Current model: %s\n", sc.config.Model)
			fmt.Printf("Capabilities: %s\n", sc.client.GetModelInfo())
		}
		
	case "/system":
		if len(parts) > 1 {
			sc.config.SystemPrompt = strings.Join(parts[1:], " ")
			// Update system message
			if len(sc.messages) > 0 && sc.messages[0].Role == "system" {
				sc.messages[0].Content = sc.config.SystemPrompt
			} else {
				sc.messages = append([]api.Message{{
					Role:    "system",
					Content: sc.config.SystemPrompt,
				}}, sc.messages...)
			}
			fmt.Println("✓ System prompt updated")
		} else {
			if sc.config.SystemPrompt != "" {
				fmt.Printf("System prompt: %s\n", sc.config.SystemPrompt)
			} else {
				fmt.Println("No system prompt set")
			}
		}
		
	case "/save":
		if len(parts) > 1 {
			filename := strings.Join(parts[1:], " ")
			sc.saveChat(filename)
		} else {
			fmt.Println("Usage: /save <filename>")
		}
		
	case "/load":
		if len(parts) > 1 {
			filename := strings.Join(parts[1:], " ")
			sc.loadChat(filename)
		} else {
			fmt.Println("Usage: /load <filename>")
		}
		
	case "/tokens":
		sc.showTokenCount()
		
	case "/config":
		sc.showConfig()
		
	default:
		fmt.Printf("Unknown command: %s\n", parts[0])
		fmt.Println("Type /help for available commands")
	}
	
	return true
}

// sendMessage sends a user message and gets AI response
func (sc *SimpleChat) sendMessage(content string) {
	// Add user message
	userMsg := api.Message{
		Role:    "user",
		Content: content,
	}
	sc.messages = append(sc.messages, userMsg)
	
	// Display user message
	fmt.Printf("\n[You]: %s\n", content)
	
	// Create context for this request
	ctx, cancel := context.WithCancel(context.Background())
	sc.mu.Lock()
	sc.currentContext = ctx
	sc.cancelFunc = cancel
	sc.isStreaming = true
	sc.mu.Unlock()
	
	// Start spinner animation
	stopSpinner := sc.startSpinner()
	
	// Prepare for streaming response
	var responseBuilder strings.Builder
	firstChunk := true
	
	// Send request with streaming
	response, err := sc.client.SendChatCompletion(sc.messages, func(chunk string) error {
		// Check if context is cancelled
		select {
		case <-ctx.Done():
			return fmt.Errorf("interrupted by user")
		default:
		}
		
		// Print chunk directly for real-time streaming
		if firstChunk {
			firstChunk = false
			stopSpinner() // Stop spinner on first chunk
			fmt.Print("\n[AI]: ")
		}
		fmt.Print(chunk)
		responseBuilder.WriteString(chunk)
		
		return nil
	})
	
	// Stop spinner if still running (in case of error before first chunk)
	if firstChunk {
		stopSpinner()
	}
	
	sc.mu.Lock()
	sc.isStreaming = false
	sc.cancelFunc = nil
	sc.mu.Unlock()
	
	if err != nil {
		if strings.Contains(err.Error(), "interrupted") {
			fmt.Println("\n[Response interrupted]")
			// Still save partial response if any
			if responseBuilder.Len() > 0 {
				sc.messages = append(sc.messages, api.Message{
					Role:    "assistant",
					Content: responseBuilder.String() + " [interrupted]",
				})
			}
		} else {
			fmt.Printf("\n[Error: %v]\n", err)
		}
		return
	}
	
	// Add assistant message to history
	assistantMsg := api.Message{
		Role:    "assistant",
		Content: responseBuilder.String(),
	}
	
	// If no streaming content but response has content, use it
	if assistantMsg.Content == "" && response != nil && 
	   len(response.Choices) > 0 {
		assistantMsg.Content = response.Choices[0].Message.Content
		fmt.Print(assistantMsg.Content)
	}
	
	sc.messages = append(sc.messages, assistantMsg)
	fmt.Println() // New line after response
}

// compactHistory reduces the message history to save tokens
func (sc *SimpleChat) compactHistory() {
	if len(sc.messages) <= 10 {
		return // Don't compact if history is small
	}
	
	// Keep system prompt
	compacted := []api.Message{}
	systemIdx := -1
	
	for i, msg := range sc.messages {
		if msg.Role == "system" {
			compacted = append(compacted, msg)
			systemIdx = i
			break
		}
	}
	
	// Start after system message
	startIdx := 0
	if systemIdx >= 0 {
		startIdx = systemIdx + 1
	}
	
	// Calculate how many messages to summarize
	totalMessages := len(sc.messages) - startIdx
	if totalMessages <= 10 {
		return // Not enough to compact
	}
	
	// Keep last 8 messages, summarize the rest
	keepCount := 8
	summarizeCount := totalMessages - keepCount
	
	// Create summary
	summaryParts := []string{"Previous conversation summary:"}
	for i := startIdx; i < startIdx+summarizeCount; i++ {
		msg := sc.messages[i]
		if msg.Role == "user" {
			summaryParts = append(summaryParts, 
				fmt.Sprintf("- User: %s", truncateString(msg.Content, 50)))
		} else if msg.Role == "assistant" {
			summaryParts = append(summaryParts,
				fmt.Sprintf("- Assistant: %s", truncateString(msg.Content, 50)))
		}
	}
	
	// Add summary as system message
	if len(summaryParts) > 1 {
		compacted = append(compacted, api.Message{
			Role:    "system",
			Content: strings.Join(summaryParts, "\n"),
		})
	}
	
	// Keep recent messages
	for i := startIdx + summarizeCount; i < len(sc.messages); i++ {
		compacted = append(compacted, sc.messages[i])
	}
	
	sc.messages = compacted
}

// showWelcome displays the welcome message
func (sc *SimpleChat) showWelcome() {
	sc.clearScreen()
	fmt.Println("╔════════════════════════════════════════════╗")
	fmt.Println("║       hacka.re CLI - Streaming Chat        ║")
	fmt.Println("╚════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Printf("Model: %s\n", sc.config.Model)
	fmt.Printf("Provider: %s\n", sc.config.Provider)
	fmt.Printf("Capabilities: %s\n", sc.client.GetModelInfo())
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  /help     - Show all commands")
	fmt.Println("  /clear    - Clear chat history")
	fmt.Println("  /compact  - Compact history (save tokens)")
	fmt.Println("  /exit     - Exit chat")
	fmt.Println()
	fmt.Println("Press Ctrl+C to interrupt streaming responses")
	fmt.Println("─" + strings.Repeat("─", 44))
}

// showHelp displays help information
func (sc *SimpleChat) showHelp() {
	fmt.Println("\n╔════════════════════════════════════════════╗")
	fmt.Println("║                  HELP                      ║")
	fmt.Println("╚════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  /help           Show this help")
	fmt.Println("  /clear          Clear chat history")
	fmt.Println("  /compact        Compact history to save tokens")
	fmt.Println("  /exit, /quit    Exit chat")
	fmt.Println("  /history        Show chat history")
	fmt.Println("  /save <file>    Save chat to file")
	fmt.Println("  /load <file>    Load chat from file")
	fmt.Println("  /model <name>   Change model")
	fmt.Println("  /system <text>  Set system prompt")
	fmt.Println("  /tokens         Show token count estimate")
	fmt.Println("  /config         Show current configuration")
	fmt.Println()
	fmt.Println("Controls:")
	fmt.Println("  Ctrl+C          Interrupt streaming / Exit")
	fmt.Println()
}

// showHistory displays the chat history
func (sc *SimpleChat) showHistory() {
	fmt.Println("\n" + strings.Repeat("─", 50))
	fmt.Println("CHAT HISTORY")
	fmt.Println(strings.Repeat("─", 50))
	
	for _, msg := range sc.messages {
		switch msg.Role {
		case "system":
			fmt.Printf("\n[System]: %s\n", msg.Content)
		case "user":
			fmt.Printf("\n[You]: %s\n", msg.Content)
		case "assistant":
			fmt.Printf("\n[AI]: %s\n", msg.Content)
		}
	}
	
	fmt.Println("\n" + strings.Repeat("─", 50))
}

// showTokenCount estimates and displays token count
func (sc *SimpleChat) showTokenCount() {
	// Simple estimation: ~4 characters per token
	totalChars := 0
	for _, msg := range sc.messages {
		totalChars += len(msg.Content)
	}
	
	estimatedTokens := totalChars / 4
	fmt.Printf("\nEstimated tokens in context: ~%d\n", estimatedTokens)
	fmt.Printf("Messages in history: %d\n", len(sc.messages))
}

// showConfig displays current configuration
func (sc *SimpleChat) showConfig() {
	fmt.Println("\n" + strings.Repeat("─", 50))
	fmt.Println("CURRENT CONFIGURATION")
	fmt.Println(strings.Repeat("─", 50))
	fmt.Printf("Provider:     %s\n", sc.config.Provider)
	fmt.Printf("Base URL:     %s\n", sc.config.BaseURL)
	fmt.Printf("Model:        %s\n", sc.config.Model)
	fmt.Printf("Max Tokens:   %d\n", sc.config.MaxTokens)
	fmt.Printf("Temperature:  %.2f\n", sc.config.Temperature)
	fmt.Printf("Stream:       %v\n", sc.config.StreamResponse)
	if sc.config.SystemPrompt != "" {
		fmt.Printf("System:       %s\n", truncateString(sc.config.SystemPrompt, 50))
	}
	fmt.Println(strings.Repeat("─", 50))
}

// saveChat saves the chat history to a file
func (sc *SimpleChat) saveChat(filename string) {
	file, err := os.Create(filename)
	if err != nil {
		fmt.Printf("Error creating file: %v\n", err)
		return
	}
	defer file.Close()
	
	writer := bufio.NewWriter(file)
	for _, msg := range sc.messages {
		fmt.Fprintf(writer, "[%s]:\n%s\n\n", msg.Role, msg.Content)
	}
	writer.Flush()
	
	fmt.Printf("✓ Chat saved to %s\n", filename)
}

// loadChat loads chat history from a file
func (sc *SimpleChat) loadChat(filename string) {
	// This would parse the saved format and restore messages
	fmt.Printf("Loading from %s not yet implemented\n", filename)
}

// clearScreen clears the terminal screen
func (sc *SimpleChat) clearScreen() {
	// ANSI escape codes for clearing screen
	fmt.Print("\033[H\033[2J")
}

// truncateString truncates a string to max length
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// startSpinner starts a spinner animation and returns a function to stop it
func (sc *SimpleChat) startSpinner() func() {
	done := make(chan bool)
	stopped := false
	
	// Spinner characters for animation
	spinnerChars := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
	// Alternative ASCII spinner if Unicode doesn't work
	// spinnerChars := []string{"|", "/", "-", "\\"}
	
	go func() {
		fmt.Print("\n[AI]: ")
		i := 0
		for {
			select {
			case <-done:
				// Clear spinner
				fmt.Print("\r[AI]:     \r") // Clear the line
				return
			default:
				fmt.Printf("\r[AI]: %s Thinking...", spinnerChars[i])
				i = (i + 1) % len(spinnerChars)
				time.Sleep(100 * time.Millisecond)
			}
		}
	}()
	
	// Return stop function
	return func() {
		if !stopped {
			stopped = true
			close(done)
			time.Sleep(150 * time.Millisecond) // Give time to clear
		}
	}
}

// StartChat is the main entry point for the chat interface
func StartChat(cfg *config.Config) error {
	// Check if terminal supports raw mode for advanced features
	if term.IsTerminal(int(syscall.Stdin)) {
		// Could use advanced terminal handling here
		// For now, use simple mode
	}
	
	chat := NewSimpleChat(cfg)
	return chat.Run()
}