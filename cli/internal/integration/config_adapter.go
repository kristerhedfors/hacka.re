package integration

import (
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/tui/pkg/interfaces"
)

// CLIConfigAdapter makes CLI config compatible with hackare-tui
type CLIConfigAdapter struct {
	*config.Config
}

// GetProvider returns the API provider as string
func (c *CLIConfigAdapter) GetProvider() string {
	return string(c.Config.Provider)
}

// GetAPIKey returns the API key
func (c *CLIConfigAdapter) GetAPIKey() string {
	return c.Config.APIKey
}

// GetBaseURL returns the base URL for the API
func (c *CLIConfigAdapter) GetBaseURL() string {
	return c.Config.BaseURL
}

// GetModel returns the model name
func (c *CLIConfigAdapter) GetModel() string {
	return c.Config.Model
}

// GetTemperature returns the temperature setting
func (c *CLIConfigAdapter) GetTemperature() float64 {
	return c.Config.Temperature
}

// GetMaxTokens returns the max tokens setting
func (c *CLIConfigAdapter) GetMaxTokens() int {
	return c.Config.MaxTokens
}

// GetStreamResponse returns whether streaming is enabled
func (c *CLIConfigAdapter) GetStreamResponse() bool {
	return c.Config.StreamResponse
}

// GetYoloMode returns whether YOLO mode is enabled
func (c *CLIConfigAdapter) GetYoloMode() bool {
	return c.Config.YoloMode
}

// GetVoiceControl returns whether voice control is enabled
func (c *CLIConfigAdapter) GetVoiceControl() bool {
	return c.Config.VoiceControl
}

// GetSystemPrompt returns the system prompt
func (c *CLIConfigAdapter) GetSystemPrompt() string {
	return c.Config.SystemPrompt
}

// GetNamespace returns the namespace for storage
func (c *CLIConfigAdapter) GetNamespace() string {
	return c.Config.Namespace
}

// WrapConfig wraps CLI config for TUI compatibility
func WrapConfig(cfg *config.Config) interfaces.CLIConfig {
	return &CLIConfigAdapter{Config: cfg}
}