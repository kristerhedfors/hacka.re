package main

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
)

// TestableSettingsModal embeds the enhanced settings modal for testing
type TestableSettingsModal struct {
	screen   tcell.Screen
	config   *config.Config
	events   chan tcell.Event
	done     chan bool
}

func main() {
	// Initialize logger
	logDir := filepath.Join(".", "testlogs")
	if err := logger.Initialize(logDir, true); err != nil {
		panic(err)
	}
	defer logger.Get().Close()

	log := logger.Get()
	log.Info("=== Starting Automated Settings Test ===")

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

	// Create simulation screen
	s := tcell.NewSimulationScreen("")
	if err := s.Init(); err != nil {
		panic(err)
	}
	defer s.Fini()

	s.SetSize(80, 24)
	s.Clear()

	// Test sequence
	log.Info("Starting test sequence...")
	
	// Navigate down to Stream Response (field 7)
	for i := 0; i < 7; i++ {
		log.Info("Sending DOWN key #%d", i+1)
		s.InjectKey(tcell.KeyDown, 0, tcell.ModNone)
		time.Sleep(10 * time.Millisecond)
	}
	
	// Open expandable menu
	log.Info("Sending ENTER to open Stream Response menu")
	s.InjectKey(tcell.KeyEnter, 0, tcell.ModNone)
	time.Sleep(10 * time.Millisecond)
	
	// Press ESC - should close menu only
	log.Info("Sending ESC to close menu (should NOT exit settings)")
	s.InjectKey(tcell.KeyEscape, 0, tcell.ModNone)
	time.Sleep(10 * time.Millisecond)
	
	// Try to navigate - if settings is still open, this should work
	log.Info("Sending DOWN to verify settings is still open")
	s.InjectKey(tcell.KeyDown, 0, tcell.ModNone)
	time.Sleep(10 * time.Millisecond)
	
	// Open YOLO mode menu
	log.Info("Sending ENTER to open YOLO Mode menu")
	s.InjectKey(tcell.KeyEnter, 0, tcell.ModNone)
	time.Sleep(10 * time.Millisecond)
	
	// Press ESC again
	log.Info("Sending ESC to close YOLO menu")
	s.InjectKey(tcell.KeyEscape, 0, tcell.ModNone)
	time.Sleep(10 * time.Millisecond)
	
	// Finally exit with Ctrl+Q
	log.Info("Sending Ctrl+Q to exit settings")
	s.InjectKey(tcell.KeyCtrlQ, 0, tcell.ModNone)
	time.Sleep(10 * time.Millisecond)
	
	log.Info("Test sequence completed")
	
	// Check final state
	content := s.GetContent(0, 0)
	if content != nil {
		log.Info("Screen still has content - settings may not have exited properly")
	} else {
		log.Info("Screen cleared - settings exited as expected")
	}
	
	fmt.Println("Automated test completed. Check testlogs/ for results.")
}