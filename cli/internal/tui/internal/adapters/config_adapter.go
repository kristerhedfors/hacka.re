package adapters

import (
	"github.com/hacka-re/cli/internal/tui/internal/core"
	"github.com/hacka-re/cli/internal/tui/pkg/interfaces"
)

// AdaptExternalConfig adapts external configuration to internal TUI config
func AdaptExternalConfig(cm *core.ConfigManager, externalConfig interface{}) error {
	// Check if the external config implements ExternalConfig interface
	if extCfg, ok := externalConfig.(interfaces.ExternalConfig); ok {
		return adaptFromInterface(cm, extCfg)
	}

	// For backward compatibility, try to adapt common struct patterns
	// This allows CLI to pass its config struct directly
	return adaptFromStruct(cm, externalConfig)
}

// adaptFromInterface adapts config that implements ExternalConfig interface
func adaptFromInterface(cm *core.ConfigManager, extCfg interfaces.ExternalConfig) error {
	return cm.Update(func(cfg *core.Config) {
		cfg.Provider = extCfg.GetProvider()
		cfg.APIKey = extCfg.GetAPIKey()
		cfg.BaseURL = extCfg.GetBaseURL()
		cfg.Model = extCfg.GetModel()
		cfg.Temperature = extCfg.GetTemperature()
		cfg.MaxTokens = extCfg.GetMaxTokens()
		cfg.StreamMode = extCfg.GetStreamMode()
		cfg.YoloMode = extCfg.GetYoloMode()
		cfg.VoiceControl = extCfg.GetVoiceControl()
		cfg.SystemPrompt = extCfg.GetSystemPrompt()
		cfg.Namespace = extCfg.GetNamespace()

		// Note: Functions and Prompts handling would need additional work
		// as they have different structures in CLI vs TUI
	})
}

// adaptFromStruct attempts to adapt config from a struct using reflection
func adaptFromStruct(cm *core.ConfigManager, externalConfig interface{}) error {
	// This function would use reflection to map fields from CLI config
	// to TUI config. For now, we'll implement a basic version that
	// handles the most common case - CLI config struct.

	// Type assertion for CLI config (we'll define this interface)
	if cliCfg, ok := externalConfig.(interfaces.CLIConfig); ok {
		return cm.Update(func(cfg *core.Config) {
			cfg.Provider = cliCfg.GetProvider()
			cfg.APIKey = cliCfg.GetAPIKey()
			cfg.BaseURL = cliCfg.GetBaseURL()
			cfg.Model = cliCfg.GetModel()
			cfg.Temperature = cliCfg.GetTemperature()
			cfg.MaxTokens = cliCfg.GetMaxTokens()
			cfg.StreamMode = cliCfg.GetStreamResponse()
			cfg.YoloMode = cliCfg.GetYoloMode()
			cfg.VoiceControl = cliCfg.GetVoiceControl()
			cfg.SystemPrompt = cliCfg.GetSystemPrompt()
			cfg.Namespace = cliCfg.GetNamespace()
		})
	}

	// If we can't adapt, just continue with existing config
	return nil
}