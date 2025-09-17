package tui

import (
	"fmt"

	"github.com/hacka-re/cli/internal/tui/internal"
	"github.com/hacka-re/cli/internal/tui/internal/adapters"
	"github.com/hacka-re/cli/internal/tui/internal/core"
	"github.com/hacka-re/cli/internal/tui/internal/modes/socket"
	"github.com/hacka-re/cli/internal/tui/internal/transport"
)

// LaunchOptions contains options for launching the TUI
type LaunchOptions struct {
	// Mode forces a specific UI mode (auto, rich, socket)
	Mode string

	// Config provides external configuration
	Config interface{}

	// Callbacks for integration with parent application
	Callbacks *Callbacks

	// Debug enables debug logging
	Debug bool

	// ConfigPath overrides default config path
	ConfigPath string
}

// Callbacks defines callback functions for parent application integration
type Callbacks struct {
	// OnStartChat is called when user selects "Start Chat"
	OnStartChat func(config interface{}) error

	// OnBrowse is called when user wants to start web server with browser
	OnBrowse func(config interface{}) error

	// OnServe is called when user wants to start web server without browser
	OnServe func(config interface{}) error

	// OnShareLink is called when user wants to generate a share link
	OnShareLink func(config interface{}) (string, error)

	// OnSaveConfig is called when configuration needs to be saved
	OnSaveConfig func(config interface{}) error

	// OnLoadConfig is called when configuration needs to be loaded
	OnLoadConfig func() (interface{}, error)

	// OnPasswordPrompt is called when a password is needed (e.g., for share links)
	// Returns the password entered by the user, or error if cancelled
	OnPasswordPrompt func(prompt string) (string, error)

	// OnGetModels is called when dynamic model list is needed for a provider
	// Returns list of available models for the given provider
	OnGetModels func(provider string) ([]string, error)

	// OnExit is called when TUI is about to exit
	OnExit func()
}

// LaunchTUI launches the terminal UI with the given options
func LaunchTUI(options *LaunchOptions) error {
	if options == nil {
		options = &LaunchOptions{}
	}

	// Initialize configuration manager
	var configManager *core.ConfigManager
	var err error

	if options.ConfigPath != "" {
		// Use custom config path if provided
		configManager, err = core.NewConfigManagerWithPath(options.ConfigPath)
	} else {
		configManager, err = core.NewConfigManager()
	}
	if err != nil {
		return fmt.Errorf("failed to initialize config: %w", err)
	}

	// Load external config if provided
	if options.Config != nil {
		if err := adaptExternalConfig(configManager, options.Config); err != nil {
			return fmt.Errorf("failed to adapt external config: %w", err)
		}
	}

	// Initialize application state
	appState := core.NewAppState()

	// Store callbacks in state for later use
	if options.Callbacks != nil {
		appState.SetCallbacks(options.Callbacks)
	}

	// Initialize event bus
	eventBus := core.NewEventBus()
	defer eventBus.Stop()

	// Enable debug logging if requested
	if options.Debug {
		logger := core.NewEventLogger(true)
		eventBus.SubscribeAll(func(e core.Event) {
			logger.LogEvent(e)
		})
	}

	// Detect terminal capabilities
	detector := transport.NewDetector()
	caps, err := detector.Detect()
	if err != nil && options.Mode == "auto" {
		// If detection fails and mode is auto, fall back to socket
		options.Mode = "socket"
	}

	// Determine UI mode
	var uiMode core.UIMode
	switch options.Mode {
	case "rich":
		uiMode = core.ModeRich
	case "socket":
		uiMode = core.ModeSocket
	case "auto", "":
		if caps != nil {
			uiMode = detector.RecommendMode()
		} else {
			uiMode = core.ModeSocket // Safe default
		}
	default:
		return fmt.Errorf("unknown mode: %s", options.Mode)
	}

	// Update state with selected mode
	appState.SetMode(uiMode)

	// Start the appropriate UI mode
	switch uiMode {
	case core.ModeRich:
		app, err := internal.NewAppWithCallbacks(configManager, appState, eventBus, options.Callbacks)
		if err != nil {
			// Fall back to socket mode if rich mode fails
			goto socketMode
		}
		if err := app.Run(); err != nil {
			return fmt.Errorf("rich mode error: %w", err)
		}

		// Check if user intentionally switched to socket mode
		if appState.GetMode() == core.ModeSocket {
			// User explicitly selected socket mode, continue to it
			goto socketMode
		}

		// Otherwise, user exited normally - don't fall through to socket mode
		goto exitNormally

	socketMode:
		fallthrough
	case core.ModeSocket:
		handler := socket.NewHandlerWithCallbacks(configManager, appState, eventBus, options.Callbacks)
		if err := handler.Start(); err != nil {
			return fmt.Errorf("socket mode error: %w", err)
		}

	default:
		return fmt.Errorf("unsupported mode: %s", uiMode)
	}

exitNormally:
	// Call exit callback if provided
	if options.Callbacks != nil && options.Callbacks.OnExit != nil {
		options.Callbacks.OnExit()
	}

	return nil
}

// adaptExternalConfig adapts external configuration to internal format
func adaptExternalConfig(cm *core.ConfigManager, externalConfig interface{}) error {
	return adapters.AdaptExternalConfig(cm, externalConfig)
}