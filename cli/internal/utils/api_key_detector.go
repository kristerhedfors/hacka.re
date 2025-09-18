package utils

import (
	"log"
	"regexp"
	"strings"
)

// ProviderDetection represents the detected provider from an API key
type ProviderDetection struct {
	Provider     string
	ProviderName string
	DefaultModel string
	BaseURL      string
	Detected     bool
}

// APIKeyPattern represents a pattern for detecting API key providers
type APIKeyPattern struct {
	Pattern      *regexp.Regexp
	Provider     string
	ProviderName string
	DefaultModel string
	BaseURL      string
}

var apiKeyPatterns = []APIKeyPattern{
	{
		Pattern:      regexp.MustCompile(`^sk-proj-[A-Za-z0-9\-_]{50,}$`),
		Provider:     "openai",
		ProviderName: "OpenAI",
		DefaultModel: "gpt-5-nano",
		BaseURL:      "https://api.openai.com/v1",
	},
	{
		// Groq keys are like: gsk_WaBbcc1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
		Pattern:      regexp.MustCompile(`^gsk_[A-Za-z0-9]{50,}$`),
		Provider:     "groq",
		ProviderName: "GroqCloud",
		DefaultModel: "llama-3.3-70b-versatile",
		BaseURL:      "https://api.groq.com/openai/v1",
	},
	{
		Pattern:      regexp.MustCompile(`^sk_ber_[A-Za-z0-9\-_]{30,}$`),
		Provider:     "berget",
		ProviderName: "Berget.AI",
		DefaultModel: "mistral-small-2503",
		BaseURL:      "https://api.berget.ai/v1",
	},
	{
		Pattern:      regexp.MustCompile(`^sk-ant-[A-Za-z0-9\-_]{50,}$`),
		Provider:     "anthropic",
		ProviderName: "Anthropic",
		DefaultModel: "claude-3-5-sonnet-20241022",
		BaseURL:      "https://api.anthropic.com/v1",
	},
}

// DetectProvider detects the provider type from an API key
func DetectProvider(apiKey string) *ProviderDetection {
	if apiKey == "" {
		log.Printf("[DEBUG] DetectProvider: Empty API key")
		return nil
	}

	// Trim whitespace
	trimmedKey := strings.TrimSpace(apiKey)
	log.Printf("[DEBUG] DetectProvider: Checking key starting with: %s... (length: %d)",
		trimmedKey[:min(10, len(trimmedKey))], len(trimmedKey))

	// Check each provider pattern
	for _, pattern := range apiKeyPatterns {
		if pattern.Pattern.MatchString(trimmedKey) {
			log.Printf("[DEBUG] DetectProvider: Matched provider %s", pattern.ProviderName)
			return &ProviderDetection{
				Provider:     pattern.Provider,
				ProviderName: pattern.ProviderName,
				DefaultModel: pattern.DefaultModel,
				BaseURL:      pattern.BaseURL,
				Detected:     true,
			}
		}
	}

	log.Printf("[DEBUG] DetectProvider: No provider matched for key prefix")
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// IsProviderKey checks if an API key matches a specific provider
func IsProviderKey(apiKey, provider string) bool {
	detection := DetectProvider(apiKey)
	return detection != nil && detection.Provider == provider
}

// GetDefaultModelForProvider returns the default model for a provider
func GetDefaultModelForProvider(provider string) string {
	switch provider {
	case "openai":
		return "gpt-5-nano"
	case "groq":
		return "llama-3.3-70b-versatile"
	case "anthropic":
		return "claude-3-5-sonnet-20241022"
	case "berget":
		return "mistral-small-2503"
	case "mistral":
		return "mistral-large-latest"
	case "deepseek":
		return "deepseek-r1"
	default:
		return ""
	}
}