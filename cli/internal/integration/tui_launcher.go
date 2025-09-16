package integration

import (
	"fmt"
	"os"

	"github.com/hacka-re/cli/internal/chat"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/tui/pkg/tui"
)

// LaunchTUI launches the hackare-tui interface with CLI integration
func LaunchTUI(cfg *config.Config) error {
	// Wrap config for TUI compatibility
	adaptedConfig := WrapConfig(cfg)

	// Create callbacks for CLI command integration
	callbacks := &tui.Callbacks{
		OnStartChat: func(configInterface interface{}) error {
			// Start CLI chat with current config
			return chat.StartChat(cfg)
		},

		OnBrowse: func(configInterface interface{}) error {
			// TODO: Integrate with CLI browse command
			fmt.Println("Browse functionality will be available in future version")
			return nil
		},

		OnServe: func(configInterface interface{}) error {
			// TODO: Integrate with CLI serve command
			fmt.Println("Serve functionality will be available in future version")
			return nil
		},

		OnShareLink: func(configInterface interface{}) (string, error) {
			// Generate share link using CLI functionality
			sharedConfig := cfg.ToSharedConfig()

			// For now, create a simple share link
			// TODO: Add password input and proper share link generation
			url, err := share.CreateShareableURL(sharedConfig, "default-password", "https://hacka.re/")
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

		OnExit: func() {
			// CLI cleanup if needed
			// Currently no cleanup required
		},
	}

	// Configure launch options
	options := &tui.LaunchOptions{
		Mode:      "auto",        // Auto-detect terminal capabilities
		Config:    adaptedConfig, // Adapted CLI config
		Callbacks: callbacks,     // CLI integration hooks
		Debug:     isDebugMode(), // Check if debug mode is enabled
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
			return chat.StartChat(cfg)
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
			url, err := share.CreateShareableURL(sharedConfig, "default-password", "https://hacka.re/")
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