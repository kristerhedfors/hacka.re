package main

import (
	"fmt"
	"path/filepath"

	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/ui"
)

func main() {
	// Initialize logger
	logDir := filepath.Join(".", "testlogs")
	if err := logger.Initialize(logDir, true); err != nil {
		panic(err)
	}
	defer logger.Get().Close()

	log := logger.Get()
	log.Info("=== Testing Menu Flow ===")
	
	// Create test config
	cfg := &config.Config{
		Provider:       config.ProviderOpenAI,
		BaseURL:        "https://api.openai.com/v1",
		APIKey:         "test-key",
		Model:          "gpt-4",
		MaxTokens:      4096,
		Temperature:    0.7,
		SystemPrompt:   "Test",
		StreamResponse: true,
		YoloMode:       false,
		VoiceControl:   false,
	}
	
	fmt.Println("Testing Menu Flow:")
	fmt.Println("==================")
	fmt.Println("")
	fmt.Println("1. Main menu will appear with options 1-5")
	fmt.Println("2. Press '1' or navigate to 'Open settings' and press Enter")
	fmt.Println("3. Settings modal will open")
	fmt.Println("4. Press ESC - should return to main menu (NOT exit app)")
	fmt.Println("5. From main menu, press ESC or Ctrl+Q to exit")
	fmt.Println("")
	fmt.Println("Starting...")
	fmt.Println("")
	
	// Show main menu
	if err := ui.ShowMainMenu(cfg); err != nil {
		log.Error("Error showing main menu: %v", err)
		fmt.Printf("Error: %v\n", err)
	}
	
	log.Info("Application exited normally")
	fmt.Println("\nTest completed. Check testlogs/ for details.")
}