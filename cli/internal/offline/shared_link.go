package offline

import (
	"fmt"
	"strings"

	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/cli/internal/utils"
)

// ParseSharedLinkForOffline parses a shared link and returns configuration, full shared config, and password for offline mode
func ParseSharedLinkForOffline(input string) (*Configuration, *share.SharedConfig, string, error) {
	// First try without password to see if one is needed
	var password string
	sharedConfig, err := share.ParseURL(input, "")
	if err != nil {
		// If decryption failed, prompt for password
		if strings.Contains(err.Error(), "decrypt") || strings.Contains(err.Error(), "password") {
			password, err = utils.GetPassword("Enter password for shared configuration: ")
			if err != nil {
				return nil, nil, "", fmt.Errorf("failed to get password: %w", err)
			}

			// Try again with password
			sharedConfig, err = share.ParseURL(input, password)
			if err != nil {
				return nil, nil, "", fmt.Errorf("failed to parse shared link: %w", err)
			}
		} else {
			return nil, nil, "", fmt.Errorf("failed to parse shared link: %w", err)
		}
	}

	// Convert SharedConfig to Configuration
	config := &Configuration{
		APIKey:  sharedConfig.APIKey,
		BaseURL: sharedConfig.BaseURL,
		Model:   sharedConfig.Model,
	}

	// Detect provider from base URL if not set
	if config.APIProvider == "" && config.BaseURL != "" {
		config.APIProvider = detectProviderFromURL(config.BaseURL)
	}

	return config, sharedConfig, password, nil
}

// OverrideForOfflineMode overrides configuration to ensure offline/localhost only
func OverrideForOfflineMode(config *Configuration) *Configuration {
	if config == nil {
		config = &Configuration{}
	}

	// Create a copy to avoid modifying the original
	result := *config

	// Detect what kind of local provider we're dealing with
	// First check if user explicitly set a local provider via CLI
	provider := detectLocalProvider(&result)

	switch provider {
	case "ollama":
		result.BaseURL = "http://localhost:11434/v1"
		// Ollama typically doesn't require an API key, but can work with any value
		if result.APIKey == "" {
			result.APIKey = "ollama" // Set a placeholder
		}
		result.APIProvider = "ollama"

	case "llamafile":
		result.BaseURL = "http://localhost:8080/v1"
		result.APIKey = "no-key" // llamafile specifically uses "no-key"
		result.APIProvider = "llamafile"

	case "lmstudio":
		result.BaseURL = "http://localhost:1234/v1"
		// LM Studio doesn't require an API key, but can work with any value
		if result.APIKey == "" {
			result.APIKey = "lmstudio" // Set a placeholder
		}
		result.APIProvider = "lmstudio"

	case "gpt4all":
		result.BaseURL = "http://localhost:4891/v1"
		// GPT4All doesn't require an API key, but can work with any value
		if result.APIKey == "" {
			result.APIKey = "gpt4all" // Set a placeholder
		}
		result.APIProvider = "gpt4all"

	case "localai":
		result.BaseURL = "http://localhost:8080/v1"
		// LocalAI doesn't require an API key, but can work with any value
		if result.APIKey == "" {
			result.APIKey = "localai" // Set a placeholder
		}
		result.APIProvider = "localai"

	default:
		// If no specific provider detected, try to determine from existing config
		if result.BaseURL != "" && isLocalURL(result.BaseURL) {
			// Already a local URL, keep it
			if result.APIKey == "" {
				result.APIKey = "local" // Generic placeholder
			}
			if result.APIProvider == "" {
				result.APIProvider = "custom"
			}
		} else if result.LlamafilePath != "" {
			// Llamafile path specified
			result.BaseURL = "http://localhost:8080/v1"
			result.APIKey = "no-key"
			result.APIProvider = "llamafile"
		} else {
			// Default to Ollama as it's the most common local LLM
			result.BaseURL = "http://localhost:11434/v1"
			result.APIKey = "ollama"
			result.APIProvider = "ollama"
		}
	}

	// Clear the model field to let the local server's model be auto-detected
	// This prevents confusion when the original shared link had a remote model
	// that doesn't exist on the local server
	result.Model = ""

	// Ensure offline mode flag is set
	result.IsOfflineMode = true

	return &result
}

// detectLocalProvider tries to detect which local LLM provider to use
func detectLocalProvider(config *Configuration) string {
	// Check explicit provider setting
	if config.APIProvider != "" {
		providerLower := strings.ToLower(config.APIProvider)
		if isLocalProvider(providerLower) {
			return providerLower
		}
	}

	// Check base URL for provider hints
	if config.BaseURL != "" {
		urlLower := strings.ToLower(config.BaseURL)

		if strings.Contains(urlLower, "11434") {
			return "ollama"
		}
		if strings.Contains(urlLower, "1234") {
			return "lmstudio"
		}
		if strings.Contains(urlLower, "4891") {
			return "gpt4all"
		}
		if strings.Contains(urlLower, "8080") {
			// Could be llamafile or localai, check for llamafile path
			if config.LlamafilePath != "" {
				return "llamafile"
			}
			// Default to llamafile for port 8080
			return "llamafile"
		}
	}

	// Check if llamafile path is set
	if config.LlamafilePath != "" {
		return "llamafile"
	}

	// Default to empty (will be handled by OverrideForOfflineMode)
	return ""
}

// detectProviderFromURL detects the provider from a base URL
func detectProviderFromURL(baseURL string) string {
	urlLower := strings.ToLower(baseURL)

	// Check for local providers
	if strings.Contains(urlLower, "localhost") || strings.Contains(urlLower, "127.0.0.1") || strings.Contains(urlLower, "0.0.0.0") {
		if strings.Contains(urlLower, "11434") {
			return "ollama"
		}
		if strings.Contains(urlLower, "1234") {
			return "lmstudio"
		}
		if strings.Contains(urlLower, "4891") {
			return "gpt4all"
		}
		if strings.Contains(urlLower, "8080") {
			return "llamafile"
		}
		return "custom"
	}

	// Check for known remote providers (will be overridden in offline mode)
	if strings.Contains(urlLower, "openai.com") {
		return "openai"
	}
	if strings.Contains(urlLower, "anthropic.com") {
		return "anthropic"
	}
	if strings.Contains(urlLower, "groq.com") {
		return "groq"
	}

	return "custom"
}