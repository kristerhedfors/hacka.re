package offline

import (
	"fmt"
	"os"
	"strings"
)

// Configuration represents the combined configuration from all sources
type Configuration struct {
	// Offline settings
	LlamafilePath string
	LlamafilePort int

	// Remote settings
	APIProvider string
	APIKey      string
	BaseURL     string
	Model       string

	// Mode detection
	IsOfflineMode bool
}

// ValidateOfflineMode validates that offline mode configuration is consistent
func ValidateOfflineMode(config *Configuration) error {
	if !config.IsOfflineMode {
		return nil
	}

	// Check for conflicting remote configuration
	hasRemoteConfig := false
	conflictDetails := []string{}

	if config.APIKey != "" && config.APIKey != "no-key" {
		hasRemoteConfig = true
		// Mask API key for security
		maskedKey := config.APIKey
		if len(maskedKey) > 10 {
			maskedKey = maskedKey[:10] + "..."
		}
		conflictDetails = append(conflictDetails, fmt.Sprintf("API Key: %s", maskedKey))
	}

	if config.APIProvider != "" && !isLocalProvider(config.APIProvider) {
		hasRemoteConfig = true
		conflictDetails = append(conflictDetails, fmt.Sprintf("API Provider: %s", config.APIProvider))
	}

	if config.BaseURL != "" && !isLocalURL(config.BaseURL) {
		hasRemoteConfig = true
		conflictDetails = append(conflictDetails, fmt.Sprintf("Base URL: %s", config.BaseURL))
	}

	if hasRemoteConfig {
		return &ConflictError{
			Details: conflictDetails,
		}
	}

	// Check for local LLM availability
	if config.LlamafilePath == "" && config.APIProvider == "" {
		// Try auto-detection
		llamafilePath, err := AutoDetectLlamafile()
		if err != nil {
			return &NoProviderError{}
		}
		config.LlamafilePath = llamafilePath
	}

	return nil
}

// ConflictError represents a conflict between offline mode and remote configuration
type ConflictError struct {
	Details []string
}

func (e *ConflictError) Error() string {
	return "offline mode cannot be used with remote API configuration"
}

// NoProviderError indicates no LLM provider is configured
type NoProviderError struct{}

func (e *NoProviderError) Error() string {
	return "no LLM provider configured"
}

// isLocalProvider checks if a provider is for local operation
func isLocalProvider(provider string) bool {
	localProviders := []string{
		"ollama",
		"llamafile",
		"gpt4all",
		"lmstudio",
		"localai",
		"local",
	}

	providerLower := strings.ToLower(provider)
	for _, local := range localProviders {
		if providerLower == local {
			return true
		}
	}
	return false
}

// isLocalURL checks if a URL points to localhost
func isLocalURL(url string) bool {
	return strings.Contains(url, "localhost") ||
		strings.Contains(url, "127.0.0.1") ||
		strings.Contains(url, "0.0.0.0") ||
		strings.HasPrefix(url, "http://localhost") ||
		strings.HasPrefix(url, "http://127.0.0.1") ||
		strings.HasPrefix(url, "http://0.0.0.0")
}

// GetConfigFromEnvironment loads configuration from environment variables
func GetConfigFromEnvironment() *Configuration {
	config := &Configuration{}

	// Check environment variables
	config.LlamafilePath = getEnv("HACKARE_LLAMAFILE", "")
	config.APIProvider = getEnv("HACKARE_API_PROVIDER", "")
	config.APIKey = getEnv("HACKARE_API_KEY", "")
	config.BaseURL = getEnv("HACKARE_BASE_URL", "")
	config.Model = getEnv("HACKARE_MODEL", "")

	// Parse llamafile port if set
	if portStr := getEnv("HACKARE_LLAMAFILE_PORT", ""); portStr != "" {
		// Simple conversion, error handling done elsewhere
		var port int
		fmt.Sscanf(portStr, "%d", &port)
		config.LlamafilePort = port
	}

	return config
}

// MergeConfigurations merges configurations with proper precedence
// Priority: CLI flags > Environment > Config file > Defaults
func MergeConfigurations(cli, env, file *Configuration) *Configuration {
	merged := &Configuration{}

	// Start with file config
	if file != nil {
		*merged = *file
	}

	// Override with environment
	if env != nil {
		if env.LlamafilePath != "" {
			merged.LlamafilePath = env.LlamafilePath
		}
		if env.LlamafilePort != 0 {
			merged.LlamafilePort = env.LlamafilePort
		}
		if env.APIProvider != "" {
			merged.APIProvider = env.APIProvider
		}
		if env.APIKey != "" {
			merged.APIKey = env.APIKey
		}
		if env.BaseURL != "" {
			merged.BaseURL = env.BaseURL
		}
		if env.Model != "" {
			merged.Model = env.Model
		}
	}

	// Override with CLI flags (highest priority)
	if cli != nil {
		if cli.LlamafilePath != "" {
			merged.LlamafilePath = cli.LlamafilePath
		}
		if cli.LlamafilePort != 0 {
			merged.LlamafilePort = cli.LlamafilePort
		}
		if cli.APIProvider != "" {
			merged.APIProvider = cli.APIProvider
		}
		if cli.APIKey != "" {
			merged.APIKey = cli.APIKey
		}
		if cli.BaseURL != "" {
			merged.BaseURL = cli.BaseURL
		}
		if cli.Model != "" {
			merged.Model = cli.Model
		}
		// Offline mode flag from CLI is definitive
		merged.IsOfflineMode = cli.IsOfflineMode
	}

	return merged
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}