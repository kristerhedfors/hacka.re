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

	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
)

// EnhancedChat provides a chat interface with slash commands and modal support
type EnhancedChat struct {
	config         *config.Config
	client         *api.Client
	messages       []api.Message
	history        []string
	historyPos     int
	mu             sync.Mutex
	cancelFunc     context.CancelFunc
	currentContext context.Context
	isStreaming    bool
	reader         *bufio.Reader
	commands       *CommandRegistry
	inModal        bool // Track if we're in a modal
	modalHandlers  ModalHandlers
}

// NewEnhancedChat creates a new enhanced chat session
func NewEnhancedChat(cfg *config.Config) *EnhancedChat {
	fmt.Fprintf(os.Stderr, "!!!!! NewEnhancedChat() CALLED !!!!\n")
	client := api.NewClient(cfg)

	chat := &EnhancedChat{
		config:     cfg,
		client:     client,
		messages:   []api.Message{},
		history:    []string{},
		historyPos: -1,
		reader:     bufio.NewReader(os.Stdin),
		commands:   NewCommandRegistry(),
		inModal:    false,
	}

	// Register all commands
	chat.registerCommands()

	// Add system prompt if configured
	if cfg.SystemPrompt != "" {
		chat.messages = append(chat.messages, api.Message{
			Role:    "system",
			Content: cfg.SystemPrompt,
		})
	}

	return chat
}

// registerCommands sets up all available slash commands (simplified)
func (ec *EnhancedChat) registerCommands() {
	// Menu command - opens TUI for all configuration
	ec.commands.Register(&Command{
		Name:        "menu",
		Aliases:     []string{"m", "tui"},
		Description: "Open configuration menu",
		Handler: func() error {
			ec.inModal = true
			defer func() { ec.inModal = false }()
			if ec.modalHandlers.OpenTUI != nil {
				return ec.modalHandlers.OpenTUI()
			}
			return fmt.Errorf("TUI handler not configured")
		},
	})

	// Clear command
	ec.commands.Register(&Command{
		Name:        "clear",
		Aliases:     []string{"c", "cls"},
		Description: "Clear chat history",
		Handler: func() error {
			ec.clearChat()
			return nil
		},
	})

	// Help command
	ec.commands.Register(&Command{
		Name:        "help",
		Aliases:     []string{"h", "?"},
		Description: "Show available commands",
		Handler: func() error {
			fmt.Println("\n" + ec.commands.GetHelp())
			return nil
		},
	})

	// Exit command
	ec.commands.Register(&Command{
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

// Run starts the enhanced chat interface
func (ec *EnhancedChat) Run() error {
	fmt.Fprintf(os.Stderr, "!!!!! EnhancedChat.Run() CALLED !!!!\n")
	// Setup signal handling for interrupts
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT)

	// Handle Ctrl+C gracefully
	go func() {
		for range sigChan {
			ec.mu.Lock()
			if ec.inModal {
				// Don't interrupt if in modal - let modal handle it
				ec.mu.Unlock()
				continue
			}
			if ec.isStreaming && ec.cancelFunc != nil {
				// First Ctrl+C interrupts streaming
				fmt.Println("\n\n[Interrupted - press Ctrl+C again to exit]")
				ec.cancelFunc()
				ec.isStreaming = false
				ec.mu.Unlock()
			} else {
				ec.mu.Unlock()
				// Second Ctrl+C exits
				fmt.Println("\n\nUse /exit to quit the application")
			}
		}
	}()

	// Show welcome message
	ec.showWelcome()

	// Main chat loop
	for {
		// Show prompt
		fmt.Print("\n> ")

		// Read input line
		input, err := ec.readInput()
		if err != nil {
			// Don't exit on error, just continue
			fmt.Printf("\nError reading input: %v\n", err)
			continue
		}

		// Skip empty input
		input = strings.TrimSpace(input)
		if input == "" {
			continue
		}

		// Check for slash command
		if IsCommand(input) {
			ec.handleCommand(input)
			continue
		}

		// Add to history
		ec.history = append(ec.history, input)
		ec.historyPos = len(ec.history)

		// Process as chat message
		ec.processMessage(input)
	}
}

// handleCommand processes slash commands
func (ec *EnhancedChat) handleCommand(input string) {
	cmdStr, _ := ParseCommand(input)

	// Try to autocomplete the command
	fullCmd, cmd := ec.commands.Autocomplete(cmdStr)

	if cmd == nil {
		// No match found
		fmt.Printf("Unknown command: %s\n", input)
		fmt.Println("Type /help for available commands")
		return
	}

	// Show what command is being executed if it was autocompleted
	if fullCmd != input {
		fmt.Printf("Executing: %s\n", fullCmd)
	}

	// Execute the command
	if err := cmd.Handler(); err != nil {
		fmt.Printf("Error executing command: %v\n", err)
	}
}


// clearChat clears the chat history
func (ec *EnhancedChat) clearChat() {
	ec.messages = []api.Message{}

	// Re-add system prompt if configured
	if ec.config.SystemPrompt != "" {
		ec.messages = append(ec.messages, api.Message{
			Role:    "system",
			Content: ec.config.SystemPrompt,
		})
	}

	// Clear screen
	fmt.Print("\033[2J\033[H")
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println("  hacka.re CLI - Chat Interface")
	fmt.Println("  Chat history cleared")
	fmt.Println("═══════════════════════════════════════════════════════")
}

// showWelcome displays the welcome message
func (ec *EnhancedChat) showWelcome() {
	fmt.Print("\033[2J\033[H") // Clear screen
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println("  hacka.re CLI - Chat Interface")
	fmt.Println("═══════════════════════════════════════════════════════")
	fmt.Println()
	fmt.Printf("  Provider: %s\n", ec.config.Provider)
	fmt.Printf("  Model: %s\n", ec.config.Model)
	fmt.Println()
	fmt.Println("  Commands:")
	fmt.Println("    /settings (s)  - Configure API settings")
	fmt.Println("    /prompts (p)   - Manage system prompts")
	fmt.Println("    /help (h)      - Show all commands")
	fmt.Println("    /exit (q)      - Exit application")
	fmt.Println()
	fmt.Println("  Type your message or use / for commands")
	fmt.Println("═══════════════════════════════════════════════════════")
}

// showRecentMessages displays the last N messages
func (ec *EnhancedChat) showRecentMessages(n int) {
	start := len(ec.messages) - n
	if start < 0 {
		start = 0
	}

	for i := start; i < len(ec.messages); i++ {
		msg := ec.messages[i]
		if msg.Role == "system" {
			continue // Skip system messages in display
		}

		prefix := "You: "
		if msg.Role == "assistant" {
			prefix = "AI: "
		}

		// Truncate long messages
		content := msg.Content
		if len(content) > 100 {
			content = content[:97] + "..."
		}

		fmt.Printf("%s%s\n", prefix, content)
	}
}

// readInput reads a line of input from the user
func (ec *EnhancedChat) readInput() (string, error) {
	input, err := ec.reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(input), nil
}

// processMessage sends a message to the AI and displays the response
func (ec *EnhancedChat) processMessage(input string) {
	// Add user message
	ec.messages = append(ec.messages, api.Message{
		Role:    "user",
		Content: input,
	})

	// Create context for this request
	ctx, cancel := context.WithCancel(context.Background())
	ec.mu.Lock()
	ec.cancelFunc = cancel
	ec.currentContext = ctx
	ec.isStreaming = true
	ec.mu.Unlock()

	defer func() {
		ec.mu.Lock()
		ec.isStreaming = false
		ec.cancelFunc = nil
		ec.mu.Unlock()
	}()

	// Show thinking indicator
	fmt.Print("\nAI: ")

	// Send request
	var fullResponse strings.Builder
	streamCallback := func(chunk string) error {
		select {
		case <-ctx.Done():
			// Interrupted
			return context.Canceled
		default:
			fmt.Print(chunk)
			fullResponse.WriteString(chunk)
			return nil
		}
	}

	// Use the client's SendChatCompletion method
	var callback api.StreamCallback
	if ec.config.StreamResponse {
		callback = streamCallback
	}

	response, err := ec.client.SendChatCompletion(ec.messages, callback)
	if err != nil {
		fmt.Printf("\nError: %v\n", err)
		return
	}

	// Add assistant message
	responseText := fullResponse.String()
	if responseText == "" && response != nil && len(response.Choices) > 0 {
		responseText = response.Choices[0].Message.Content
		fmt.Println(responseText)
	}

	ec.messages = append(ec.messages, api.Message{
		Role:    "assistant",
		Content: responseText,
	})
}

// StartEnhancedChat is the main entry point for the enhanced chat interface
func StartEnhancedChat(cfg *config.Config) error {
	chat := NewEnhancedChat(cfg)

	// Set up modal handlers to avoid circular imports
	// These will be implemented in a separate initializer

	return chat.Run()
}