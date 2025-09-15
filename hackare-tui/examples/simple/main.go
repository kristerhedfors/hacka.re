package main

import (
	"fmt"
	"log"

	"github.com/hacka-re/tui/pkg/interfaces"
	"github.com/hacka-re/tui/pkg/tui"
)

// ExampleConfig implements the ExternalConfig interface
type ExampleConfig struct {
	provider     string
	apiKey       string
	baseURL      string
	model        string
	temperature  float64
	maxTokens    int
	streamMode   bool
	yoloMode     bool
	voiceControl bool
	systemPrompt string
	namespace    string
}

func (c *ExampleConfig) GetProvider() string                       { return c.provider }
func (c *ExampleConfig) GetAPIKey() string                         { return c.apiKey }
func (c *ExampleConfig) GetBaseURL() string                        { return c.baseURL }
func (c *ExampleConfig) GetModel() string                          { return c.model }
func (c *ExampleConfig) GetTemperature() float64                   { return c.temperature }
func (c *ExampleConfig) GetMaxTokens() int                         { return c.maxTokens }
func (c *ExampleConfig) GetStreamMode() bool                       { return c.streamMode }
func (c *ExampleConfig) GetYoloMode() bool                         { return c.yoloMode }
func (c *ExampleConfig) GetVoiceControl() bool                     { return c.voiceControl }
func (c *ExampleConfig) GetSystemPrompt() string                   { return c.systemPrompt }
func (c *ExampleConfig) GetNamespace() string                      { return c.namespace }
func (c *ExampleConfig) GetFunctions() []interfaces.FunctionDef    { return nil }
func (c *ExampleConfig) GetPrompts() []interfaces.PromptDef        { return nil }

func main() {
	fmt.Println("hackare-tui Library Example")
	fmt.Println("===========================")

	// Create example configuration
	config := &ExampleConfig{
		provider:     "openai",
		apiKey:       "your-api-key-here",
		baseURL:      "https://api.openai.com/v1",
		model:        "gpt-3.5-turbo",
		temperature:  0.7,
		maxTokens:    2048,
		streamMode:   true,
		yoloMode:     false,
		voiceControl: false,
		systemPrompt: "You are a helpful assistant.",
		namespace:    "example",
	}

	// Create callbacks for integration
	callbacks := &tui.Callbacks{
		OnStartChat: func(cfg interface{}) error {
			fmt.Println("🚀 Starting chat session...")
			fmt.Printf("   Config: %+v\n", cfg)
			// Here you would start your actual chat implementation
			return nil
		},
		OnBrowse: func(cfg interface{}) error {
			fmt.Println("🌐 Starting web server with browser...")
			return nil
		},
		OnServe: func(cfg interface{}) error {
			fmt.Println("🖥️  Starting web server...")
			return nil
		},
		OnShareLink: func(cfg interface{}) (string, error) {
			fmt.Println("🔗 Generating share link...")
			return "https://hacka.re/#example-share-link", nil
		},
		OnSaveConfig: func(cfg interface{}) error {
			fmt.Println("💾 Saving configuration...")
			return nil
		},
		OnLoadConfig: func() (interface{}, error) {
			fmt.Println("📂 Loading configuration...")
			return config, nil
		},
		OnExit: func() {
			fmt.Println("👋 Goodbye! Thanks for using hackare-tui")
		},
	}

	// Configure launch options
	options := &tui.LaunchOptions{
		Mode:      "auto", // Auto-detect best mode
		Config:    config,
		Callbacks: callbacks,
		Debug:     false,
	}

	fmt.Println("\nLaunching TUI...")
	fmt.Println("Note: This example demonstrates the library interface.")
	fmt.Println("For a real terminal UI, run this in a proper terminal.")

	// Launch the TUI
	if err := tui.LaunchTUI(options); err != nil {
		log.Fatalf("Failed to launch TUI: %v", err)
	}
}