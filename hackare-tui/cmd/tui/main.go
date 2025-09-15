package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/hacka-re/tui/internal/core"
	"github.com/hacka-re/tui/internal/modes/rich"
	"github.com/hacka-re/tui/internal/modes/socket"
	"github.com/hacka-re/tui/internal/transport"
)

func main() {
	// Parse command line flags
	var (
		mode       = flag.String("mode", "auto", "UI mode: rich, socket, or auto")
		configPath = flag.String("config", "", "Path to config file")
		debug      = flag.Bool("debug", false, "Enable debug logging")
		version    = flag.Bool("version", false, "Show version")
	)
	flag.Parse()

	if *version {
		fmt.Println("hacka.re TUI v2.0.0")
		os.Exit(0)
	}

	// Initialize configuration
	configManager, err := core.NewConfigManager()
	if err != nil {
		log.Fatalf("Failed to initialize config: %v", err)
	}

	// Load config from file if specified
	if *configPath != "" {
		// Would implement config file loading here
	}

	// Initialize application state
	appState := core.NewAppState()

	// Initialize event bus
	eventBus := core.NewEventBus()
	defer eventBus.Stop()

	// Enable debug logging if requested
	if *debug {
		logger := core.NewEventLogger(true)
		eventBus.SubscribeAll(func(e core.Event) {
			logger.LogEvent(e)
		})
	}

	// Detect terminal capabilities
	detector := transport.NewDetector()
	caps, err := detector.Detect()
	if err != nil {
		log.Printf("Warning: Could not detect terminal capabilities: %v", err)
	}

	// Determine UI mode
	var uiMode core.UIMode
	switch *mode {
	case "rich":
		uiMode = core.ModeRich
	case "socket":
		uiMode = core.ModeSocket
	case "auto":
		if caps != nil {
			uiMode = detector.RecommendMode()
		} else {
			uiMode = core.ModeSocket // Safe default
		}
	default:
		log.Fatalf("Unknown mode: %s", *mode)
	}

	// Show capabilities if in debug mode
	if *debug && caps != nil {
		fmt.Printf("Terminal Capabilities: %s\n", detector.GetSummary())
		fmt.Printf("Recommended Mode: %s\n", detector.RecommendMode())
		fmt.Printf("Selected Mode: %s\n", uiMode)
		fmt.Println()
	}

	// Update state with selected mode
	appState.SetMode(uiMode)

	// Start the appropriate UI mode
	switch uiMode {
	case core.ModeRich:
		app, err := rich.NewApp(configManager, appState, eventBus)
		if err != nil {
			fmt.Printf("Failed to initialize rich mode: %v\n", err)
			fmt.Println("Falling back to socket mode...")
			goto socketMode
		}
		if err := app.Run(); err != nil {
			log.Fatalf("Rich mode error: %v", err)
		}
		return

	socketMode:
		fallthrough
	case core.ModeSocket:
		handler := socket.NewHandler(configManager, appState, eventBus)
		if err := handler.Start(); err != nil {
			log.Fatalf("Socket mode error: %v", err)
		}

	default:
		log.Fatalf("Unsupported mode: %s", uiMode)
	}
}