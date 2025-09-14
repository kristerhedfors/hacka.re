package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/ui"
)

func main() {
	// Create test log directory
	logDir := filepath.Join(".", "testlogs")
	
	// Initialize logger with debugging enabled
	if err := logger.Initialize(logDir, true); err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Get().Close()
	
	logger.Get().Info("=== Starting Settings UI Test ===")
	
	// Create test config
	cfg := &config.Config{
		Provider:       config.ProviderOpenAI,
		BaseURL:        "https://api.openai.com/v1",
		APIKey:         "test-key-12345",
		Model:          "gpt-4",
		MaxTokens:      4096,
		Temperature:    0.7,
		SystemPrompt:   "You are a helpful assistant.",
		StreamResponse: true,
		YoloMode:       false,
		VoiceControl:   false,
	}
	
	logger.Get().Info("Test config created:")
	logger.Get().Info("  StreamResponse: %v", cfg.StreamResponse)
	logger.Get().Info("  YoloMode: %v", cfg.YoloMode)
	logger.Get().Info("  VoiceControl: %v", cfg.VoiceControl)
	
	// Launch enhanced settings UI
	fmt.Println("Launching settings UI...")
	fmt.Println("Check testlogs/ for debug output")
	fmt.Println("")
	fmt.Println("Test Instructions:")
	fmt.Println("1. Navigate to Stream Response, YOLO Mode, or Voice Control")
	fmt.Println("2. Press Enter to open the expandable menu")
	fmt.Println("3. Press ESC - it should close only the menu, not the settings")
	fmt.Println("4. Press Ctrl+Q to exit settings when done")
	fmt.Println("")
	
	if err := ui.ShowSettings(cfg); err != nil {
		logger.Get().Error("Failed to show settings: %v", err)
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}
	
	logger.Get().Info("Settings UI closed normally")
	
	// Print final config state
	logger.Get().Info("Final config state:")
	logger.Get().Info("  StreamResponse: %v", cfg.StreamResponse)
	logger.Get().Info("  YoloMode: %v", cfg.YoloMode)
	logger.Get().Info("  VoiceControl: %v", cfg.VoiceControl)
	
	fmt.Println("\nSettings closed. Check testlogs/ for the full debug log.")
}