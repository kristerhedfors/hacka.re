package core

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Config represents the application configuration
type Config struct {
	// API Configuration
	Provider     string `json:"provider"`      // openai, groq, ollama, custom
	APIKey       string `json:"api_key"`
	BaseURL      string `json:"base_url"`
	Model        string `json:"model"`

	// Model Parameters
	Temperature      float64 `json:"temperature"`
	MaxTokens        int     `json:"max_tokens"`
	TopP             float64 `json:"top_p"`
	FrequencyPenalty float64 `json:"frequency_penalty"`
	PresencePenalty  float64 `json:"presence_penalty"`

	// Features
	StreamMode    bool   `json:"stream_mode"`
	YoloMode      bool   `json:"yolo_mode"`       // Auto-execute functions
	VoiceControl  bool   `json:"voice_control"`
	SystemPrompt  string `json:"system_prompt"`

	// UI Preferences
	Theme        string `json:"theme"`          // dark, light, auto
	PanelLayout  string `json:"panel_layout"`   // horizontal, vertical
	ShowStatus   bool   `json:"show_status"`

	// Session
	Namespace    string `json:"namespace"`      // Storage namespace
}

// DefaultConfig returns a new config with default values
func DefaultConfig() *Config {
	return &Config{
		Provider:         "openai",
		BaseURL:          "https://api.openai.com/v1",
		Model:            "gpt-3.5-turbo",
		Temperature:      0.7,
		MaxTokens:        2048,
		TopP:             1.0,
		FrequencyPenalty: 0.0,
		PresencePenalty:  0.0,
		StreamMode:       true,
		YoloMode:         false,
		VoiceControl:     false,
		Theme:            "dark",
		PanelLayout:      "horizontal",
		ShowStatus:       true,
		Namespace:        "default",
	}
}

// ConfigManager handles configuration persistence
type ConfigManager struct {
	config     *Config
	configPath string
}

// NewConfigManager creates a new configuration manager
func NewConfigManager() (*ConfigManager, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	configDir := filepath.Join(homeDir, ".config", "hackare-tui")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, err
	}

	configPath := filepath.Join(configDir, "config.json")

	cm := &ConfigManager{
		configPath: configPath,
		config:     DefaultConfig(),
	}

	// Load existing config if available
	if err := cm.Load(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}

	return cm, nil
}

// Load reads configuration from disk
func (cm *ConfigManager) Load() error {
	data, err := os.ReadFile(cm.configPath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, cm.config)
}

// Save writes configuration to disk
func (cm *ConfigManager) Save() error {
	data, err := json.MarshalIndent(cm.config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(cm.configPath, data, 0644)
}

// Get returns the current configuration
func (cm *ConfigManager) Get() *Config {
	return cm.config
}

// Update modifies the configuration and saves it
func (cm *ConfigManager) Update(updater func(*Config)) error {
	updater(cm.config)
	return cm.Save()
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.Provider == "" {
		return fmt.Errorf("provider is required")
	}

	if c.Provider != "ollama" && c.APIKey == "" {
		return fmt.Errorf("API key is required for provider %s", c.Provider)
	}

	if c.Model == "" {
		return fmt.Errorf("model is required")
	}

	if c.Temperature < 0 || c.Temperature > 2 {
		return fmt.Errorf("temperature must be between 0 and 2")
	}

	if c.MaxTokens < 1 {
		return fmt.Errorf("max_tokens must be positive")
	}

	return nil
}