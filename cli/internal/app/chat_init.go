package app

import (
	"fmt"

	"github.com/hacka-re/cli/internal/chat"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/integration"
	"github.com/hacka-re/cli/internal/logger"
)

// StartChatInterface starts the enhanced chat interface with all modal handlers configured
func StartChatInterface(cfg *config.Config) error {
	logger.Get().Info("StartChatInterface called with Provider=%s, BaseURL=%s, Model=%s", cfg.Provider, cfg.BaseURL, cfg.Model)

	// Create the terminal chat with proper input handling
	terminalChat := chat.NewTerminalChat(cfg)

	// Set up modal handlers
	terminalChat.SetModalHandlers(chat.ModalHandlers{
		OpenTUI: func() error {
			// Clear screen for modal
			fmt.Print("\033[2J\033[H")

			// Launch TUI main menu
			if err := integration.LaunchTUI(cfg); err != nil {
				return err
			}

			// Always save configuration when exiting TUI
			configPath := config.GetConfigPath()
			cfg.SaveToFile(configPath)

			// Clear and redraw chat interface
			fmt.Print("\033[2J\033[H")
			fmt.Println("═══════════════════════════════════════════════════════")
			fmt.Println("  hacka.re CLI - Chat Interface")
			fmt.Println("  Configuration updated • Type /help for commands")
			fmt.Println("═══════════════════════════════════════════════════════")

			return nil
		},
		OpenTUIWithPanel: func(panel string) error {
			// Clear screen for modal
			fmt.Print("\033[2J\033[H")

			// Launch TUI with specific panel
			if err := integration.LaunchTUIWithPanel(cfg, panel); err != nil {
				return err
			}

			// Always save configuration when exiting TUI
			configPath := config.GetConfigPath()
			cfg.SaveToFile(configPath)

			// Clear and redraw chat interface
			fmt.Print("\033[2J\033[H")
			fmt.Println("═══════════════════════════════════════════════════════")
			fmt.Println("  hacka.re CLI - Chat Interface")
			fmt.Printf("  %s configuration updated • Type /help for commands\n", panel)
			fmt.Println("═══════════════════════════════════════════════════════")

			return nil
		},
		OpenSettings: func(cfg *config.Config) error {
			// Deprecated - redirect to OpenTUI
			// Clear screen for modal
			fmt.Print("\033[2J\033[H")

			// Launch TUI for settings
			if err := integration.LaunchTUI(cfg); err != nil {
				return err
			}

			// Always save configuration when exiting settings
			configPath := config.GetConfigPath()
			cfg.SaveToFile(configPath)

			// Clear and redraw chat interface
			fmt.Print("\033[2J\033[H")
			fmt.Println("═══════════════════════════════════════════════════════")
			fmt.Println("  hacka.re CLI - Chat Interface")
			fmt.Println("  Settings updated • Type /help for commands")
			fmt.Println("═══════════════════════════════════════════════════════")

			return nil
		},
		OpenPrompts: func(cfg *config.Config) error {
			// Deprecated - redirect to OpenTUI
			// Clear screen for modal
			fmt.Print("\033[2J\033[H")

			// Launch TUI for prompts management
			if err := integration.LaunchTUI(cfg); err != nil {
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

			// Show placeholder message
			fmt.Printf("══ %s ══\n\n", title)
			fmt.Println(message)
			fmt.Println("\nPress Enter to continue...")
			fmt.Scanln()

			// Clear and redraw chat interface
			fmt.Print("\033[2J\033[H")
			fmt.Println("═══════════════════════════════════════════════════════")
			fmt.Println("  hacka.re CLI - Chat Interface")
			fmt.Println("  Type /help for commands • /exit to quit")
			fmt.Println("═══════════════════════════════════════════════════════")
		},
	})

	// Run the chat interface
	return terminalChat.Run()
}