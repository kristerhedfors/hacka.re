package app

import (
	"fmt"

	"github.com/hacka-re/cli/internal/chat"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/ui"
)

// StartChatInterface starts the enhanced chat interface with all modal handlers configured
func StartChatInterface(cfg *config.Config) error {
	// Create the enhanced chat
	enhancedChat := chat.NewEnhancedChat(cfg)

	// Set up modal handlers
	enhancedChat.SetModalHandlers(chat.ModalHandlers{
		OpenSettings: func(cfg *config.Config) error {
			// Clear screen for modal
			fmt.Print("\033[2J\033[H")

			// Show settings modal - it will return when user presses ESC
			if err := ui.ShowSettingsForChat(cfg); err != nil {
				return err
			}

			// Clear and redraw chat interface
			fmt.Print("\033[2J\033[H")
			fmt.Println("═══════════════════════════════════════════════════════")
			fmt.Println("  hacka.re CLI - Chat Interface")
			fmt.Println("  Settings updated • Type /help for commands")
			fmt.Println("═══════════════════════════════════════════════════════")

			return nil
		},
		OpenPrompts: func(cfg *config.Config) error {
			// Clear screen for modal
			fmt.Print("\033[2J\033[H")

			// Show prompts modal - it will return when user presses ESC
			if err := ui.ShowPromptsManager(cfg); err != nil {
				return err
			}

			// Clear and redraw chat interface
			fmt.Print("\033[2J\033[H")
			fmt.Println("═══════════════════════════════════════════════════════")
			fmt.Println("  hacka.re CLI - Chat Interface")
			fmt.Println("  System prompts updated • Type /help for commands")
			fmt.Println("═══════════════════════════════════════════════════════")

			return nil
		},
		ShowPlaceholder: func(title, message string) {
			// Clear screen for modal
			fmt.Print("\033[2J\033[H")

			// Show placeholder modal
			ui.ShowPlaceholderModal(title, message)

			// Clear and redraw chat interface
			fmt.Print("\033[2J\033[H")
			fmt.Println("═══════════════════════════════════════════════════════")
			fmt.Println("  hacka.re CLI - Chat Interface")
			fmt.Println("  Type /help for commands • /exit to quit")
			fmt.Println("═══════════════════════════════════════════════════════")
		},
	})

	// Run the chat interface
	return enhancedChat.Run()
}