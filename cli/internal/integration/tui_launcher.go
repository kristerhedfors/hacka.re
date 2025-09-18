package integration

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/hacka-re/cli/internal/chat"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/cli/internal/tui/pkg/tui"
	"github.com/hacka-re/cli/internal/utils"
)

// LaunchTUI launches the hackare-tui interface with CLI integration
func LaunchTUI(cfg *config.Config) error {
	return LaunchTUIWithPanel(cfg, "")
}

// LaunchTUIWithPanel launches the hackare-tui interface with a specific panel pre-selected
func LaunchTUIWithPanel(cfg *config.Config, targetPanel string) error {
	// Wrap config for TUI compatibility
	adaptedConfig := WrapConfig(cfg)

	// Create callbacks for CLI command integration
	callbacks := &tui.Callbacks{
		OnStartChat: func(configInterface interface{}) error {
			// Start CLI chat with enhanced terminal interface
			return startEnhancedChat(cfg)
		},

		OnBrowse: func(configInterface interface{}) error {
			// Launch browse command with current configuration
			fmt.Println("Starting web server and opening browser...")
			// Save config first to ensure it's available for the browse command
			configPath := config.GetConfigPath()
			if err := cfg.SaveToFile(configPath); err != nil {
				return fmt.Errorf("failed to save config: %w", err)
			}
			// Execute browse command in a new process
			cmd := exec.Command(os.Args[0], "browse")
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			return cmd.Start()
		},

		OnServe: func(configInterface interface{}) error {
			// Launch serve command with current configuration
			fmt.Println("Starting web server...")
			// Save config first to ensure it's available for the serve command
			configPath := config.GetConfigPath()
			if err := cfg.SaveToFile(configPath); err != nil {
				return fmt.Errorf("failed to save config: %w", err)
			}
			// Execute serve command in a new process
			cmd := exec.Command(os.Args[0], "serve")
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			return cmd.Start()
		},

		OnShareLink: func(configInterface interface{}) (string, error) {
			// Generate share link using CLI functionality
			sharedConfig := cfg.ToSharedConfig()

			// Get password from user
			password, err := utils.GetPassword("Enter password for share link: ")
			if err != nil {
				return "", fmt.Errorf("failed to read password: %w", err)
			}

			url, err := share.CreateShareableURL(sharedConfig, password, "https://hacka.re/")
			if err != nil {
				return "", fmt.Errorf("failed to generate share link: %w", err)
			}

			return url, nil
		},

		OnSaveConfig: func(configInterface interface{}) error {
			// Save CLI config to file
			configPath := config.GetConfigPath()
			return cfg.SaveToFile(configPath)
		},

		OnLoadConfig: func() (interface{}, error) {
			// Load CLI config from file
			configPath := config.GetConfigPath()
			return config.LoadFromFile(configPath)
		},

		OnPasswordPrompt: func(prompt string) (string, error) {
			return utils.GetPassword(prompt)
		},

		OnGetModels: func(provider string) ([]string, error) {
			// TODO: Implement dynamic model fetching from API
			// For now, return static lists
			return getStaticModels(provider), nil
		},

		OnExit: func() {
			// CLI cleanup if needed
			// Currently no cleanup required
		},
	}

	// Configure launch options
	options := &tui.LaunchOptions{
		Mode:        "auto",        // Auto-detect terminal capabilities
		Config:      adaptedConfig, // Adapted CLI config
		Callbacks:   callbacks,     // CLI integration hooks
		Debug:       isDebugMode(), // Check if debug mode is enabled
		TargetPanel: targetPanel,   // Pre-selected panel
	}

	// Launch the TUI
	return tui.LaunchTUI(options)
}

// LaunchTUIWithMode launches TUI with specific mode (rich/socket)
func LaunchTUIWithMode(cfg *config.Config, mode string) error {
	// Wrap config for TUI compatibility
	adaptedConfig := WrapConfig(cfg)

	// Create callbacks
	callbacks := createCallbacks(cfg)

	// Configure launch options
	options := &tui.LaunchOptions{
		Mode:      mode,
		Config:    adaptedConfig,
		Callbacks: callbacks,
		Debug:     isDebugMode(),
	}

	return tui.LaunchTUI(options)
}

// createCallbacks creates the callback structure for CLI integration
func createCallbacks(cfg *config.Config) *tui.Callbacks {
	return &tui.Callbacks{
		OnStartChat: func(configInterface interface{}) error {
			return startEnhancedChat(cfg)
		},

		OnBrowse: func(configInterface interface{}) error {
			fmt.Println("Browse functionality will be available in future version")
			return nil
		},

		OnServe: func(configInterface interface{}) error {
			fmt.Println("Serve functionality will be available in future version")
			return nil
		},

		OnShareLink: func(configInterface interface{}) (string, error) {
			sharedConfig := cfg.ToSharedConfig()
			// Get password from user
			password, err := utils.GetPassword("Enter password for share link: ")
			if err != nil {
				return "", fmt.Errorf("failed to read password: %w", err)
			}
			url, err := share.CreateShareableURL(sharedConfig, password, "https://hacka.re/")
			if err != nil {
				return "", fmt.Errorf("failed to generate share link: %w", err)
			}
			return url, nil
		},

		OnSaveConfig: func(configInterface interface{}) error {
			configPath := config.GetConfigPath()
			return cfg.SaveToFile(configPath)
		},

		OnLoadConfig: func() (interface{}, error) {
			configPath := config.GetConfigPath()
			return config.LoadFromFile(configPath)
		},

		OnPasswordPrompt: func(prompt string) (string, error) {
			return utils.GetPassword(prompt)
		},

		OnGetModels: func(provider string) ([]string, error) {
			return getStaticModels(provider), nil
		},

		OnExit: func() {
			// CLI cleanup if needed
		},
	}
}

// isDebugMode checks if debug mode is enabled
func isDebugMode() bool {
	logLevel := os.Getenv("HACKARE_LOG_LEVEL")
	return logLevel == "DEBUG" || logLevel == "debug"
}


// getStaticModels returns static model lists for now
// TODO: Replace with dynamic API fetching
func getStaticModels(provider string) []string {
	switch provider {
	case "openai":
		return []string{
			"gpt-4-turbo-preview",
			"gpt-4",
			"gpt-3.5-turbo",
			"gpt-3.5-turbo-16k",
		}
	case "anthropic":
		return []string{
			"claude-3-opus-20240229",
			"claude-3-sonnet-20240229",
			"claude-3-haiku-20240307",
			"claude-2.1",
			"claude-2.0",
		}
	case "groq":
		return []string{
			"llama2-70b-4096",
			"mixtral-8x7b-32768",
			"gemma-7b-it",
		}
	case "ollama":
		return []string{
			"llama2",
			"codellama",
			"mistral",
			"neural-chat",
		}
	default:
		return []string{"custom-model"}
	}
}

// startEnhancedChat starts the enhanced chat interface with slash commands
func startEnhancedChat(cfg *config.Config) error {
	// Create the terminal chat with proper input handling
	terminalChat := chat.NewTerminalChat(cfg)

	// Set up modal handlers for /menu command
	terminalChat.SetModalHandlers(chat.ModalHandlers{
		OpenTUI: func() error {
			// Clear screen for modal
			fmt.Print("\033[2J\033[H")

			// Launch TUI main menu
			if err := LaunchTUI(cfg); err != nil {
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
	})

	// Run the chat interface
	return terminalChat.Run()
}