package share

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/hacka-re/cli/internal/crypto"
)

// SharedConfig represents the configuration data that can be shared
type SharedConfig struct {
	APIKey           string                 `json:"apiKey,omitempty"`
	BaseURL          string                 `json:"baseUrl,omitempty"`
	Model            string                 `json:"model,omitempty"`
	MaxTokens        int                    `json:"maxTokens,omitempty"`
	Temperature      float64                `json:"temperature,omitempty"`
	SystemPrompt     string                 `json:"systemPrompt,omitempty"`
	WelcomeMessage   string                 `json:"welcomeMessage,omitempty"`
	Theme            string                 `json:"theme,omitempty"`
	Functions        []Function             `json:"functions,omitempty"`
	DefaultFunctions map[string]bool        `json:"defaultFunctions,omitempty"`
	Prompts          []Prompt               `json:"prompts,omitempty"`
	RAGEnabled       bool                   `json:"ragEnabled,omitempty"`
	RAGDocuments     []string               `json:"ragEUDocuments,omitempty"`
	CustomData       map[string]interface{} `json:"customData,omitempty"`
}

// Function represents a callable function configuration
type Function struct {
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description,omitempty"`
	Enabled     bool   `json:"enabled"`
}

// Prompt represents a system prompt configuration
type Prompt struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Content  string `json:"content"`
	Enabled  bool   `json:"enabled"`
	Category string `json:"category,omitempty"`
}

// ParseURL parses a hacka.re URL or fragment and extracts configuration
func ParseURL(input string, password string) (*SharedConfig, error) {
	// Normalize input - handle various formats
	normalized := normalizeInput(input)
	
	// Extract encrypted data from URL
	encData, err := crypto.ParseShareableURL(normalized)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	// Decrypt the configuration
	var config SharedConfig
	if err := crypto.DecryptJSON(encData, password, &config); err != nil {
		return nil, fmt.Errorf("failed to decrypt configuration: %w", err)
	}

	return &config, nil
}

// CreateShareableURL creates a shareable URL from configuration
func CreateShareableURL(config *SharedConfig, password string, baseURL string) (string, error) {
	// Encrypt the configuration
	encData, err := crypto.EncryptJSON(config, password)
	if err != nil {
		return "", fmt.Errorf("failed to encrypt configuration: %w", err)
	}

	// Generate the shareable URL
	url, err := crypto.GenerateShareableURL(baseURL, encData)
	if err != nil {
		return "", fmt.Errorf("failed to generate URL: %w", err)
	}

	return url, nil
}

// normalizeInput converts various input formats to a full URL
func normalizeInput(input string) string {
	input = strings.TrimSpace(input)

	// Check if it's a full URL (starts with http:// or https://)
	if strings.HasPrefix(input, "http://") || strings.HasPrefix(input, "https://") {
		return input
	}

	// If it starts with gpt=, add the full URL with hash
	if strings.HasPrefix(input, "gpt=") {
		return "https://hacka.re/#" + input
	}

	// Otherwise, assume it's just the encrypted data part
	// Add the full URL with #gpt= prefix
	return "https://hacka.re/#gpt=" + input
}

// ExtractFragment extracts just the fragment part from a URL
func ExtractFragment(url string) (string, error) {
	parts := strings.Split(url, "#")
	if len(parts) < 2 {
		return "", errors.New("no fragment found in URL")
	}
	return parts[1], nil
}

// ValidateConfig checks if the configuration is valid
func ValidateConfig(config *SharedConfig) error {
	if config == nil {
		return errors.New("configuration is nil")
	}

	// Check for at least some configuration
	hasConfig := config.APIKey != "" ||
		config.BaseURL != "" ||
		config.Model != "" ||
		config.SystemPrompt != "" ||
		len(config.Functions) > 0 ||
		len(config.Prompts) > 0

	if !hasConfig {
		return errors.New("configuration is empty")
	}

	// Validate base URL if present
	if config.BaseURL != "" {
		if !strings.HasPrefix(config.BaseURL, "http://") && !strings.HasPrefix(config.BaseURL, "https://") {
			return errors.New("base URL must start with http:// or https://")
		}
	}

	return nil
}

// MergeConfigs merges two configurations, with source taking precedence
func MergeConfigs(base, source *SharedConfig) *SharedConfig {
	if base == nil {
		return source
	}
	if source == nil {
		return base
	}

	merged := *base

	// Override with source values if they're set
	if source.APIKey != "" {
		merged.APIKey = source.APIKey
	}
	if source.BaseURL != "" {
		merged.BaseURL = source.BaseURL
	}
	if source.Model != "" {
		merged.Model = source.Model
	}
	if source.MaxTokens > 0 {
		merged.MaxTokens = source.MaxTokens
	}
	if source.Temperature > 0 {
		merged.Temperature = source.Temperature
	}
	if source.SystemPrompt != "" {
		merged.SystemPrompt = source.SystemPrompt
	}
	if source.WelcomeMessage != "" {
		merged.WelcomeMessage = source.WelcomeMessage
	}
	if source.Theme != "" {
		merged.Theme = source.Theme
	}
	if len(source.Functions) > 0 {
		merged.Functions = source.Functions
	}
	if len(source.DefaultFunctions) > 0 {
		merged.DefaultFunctions = source.DefaultFunctions
	}
	if len(source.Prompts) > 0 {
		merged.Prompts = source.Prompts
	}
	if source.RAGEnabled {
		merged.RAGEnabled = source.RAGEnabled
	}
	if len(source.RAGDocuments) > 0 {
		merged.RAGDocuments = source.RAGDocuments
	}
	if len(source.CustomData) > 0 {
		merged.CustomData = source.CustomData
	}

	return &merged
}

// ToJSON converts configuration to JSON string
func ToJSON(config *SharedConfig) (string, error) {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// FromJSON parses configuration from JSON string
func FromJSON(jsonStr string) (*SharedConfig, error) {
	var config SharedConfig
	if err := json.Unmarshal([]byte(jsonStr), &config); err != nil {
		return nil, err
	}
	return &config, nil
}