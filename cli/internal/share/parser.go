package share

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/hacka-re/cli/internal/compression"
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
	RAGDocuments     []string               `json:"ragDocuments,omitempty"`
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
	
	// Try new format first (direct base64 encrypted data)
	encryptedData, err := crypto.ParseShareLinkURL(normalized)
	if err == nil {
		// Decrypt using new format
		plainData, err := crypto.DecryptShareLink(encryptedData, password)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt configuration: %w", err)
		}
		
		// The decrypted data might be compressed or a direct JSON string
		plainStr := string(plainData)
		
		// Check if it's a JSON string (starts with ") - this means it's compressed
		if len(plainStr) > 0 && plainStr[0] == '"' {
			// It's a JSON string containing compressed data, unmarshal to get the actual string
			var compressedStr string
			if err := json.Unmarshal(plainData, &compressedStr); err != nil {
				return nil, fmt.Errorf("failed to unmarshal compressed data: %w", err)
			}
			
			// Decompress the payload
			decompressed, err := compression.DecompressPayload(compressedStr)
			if err != nil {
				return nil, fmt.Errorf("failed to decompress payload: %w", err)
			}
			
			// Convert map to SharedConfig
			jsonBytes, err := json.Marshal(decompressed)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal decompressed data: %w", err)
			}
			
			var config SharedConfig
			if err := json.Unmarshal(jsonBytes, &config); err != nil {
				return nil, fmt.Errorf("failed to parse configuration: %w", err)
			}
			
			return &config, nil
		}
		
		// Otherwise try to parse as direct JSON (uncompressed)
		var config SharedConfig
		if err := json.Unmarshal(plainData, &config); err != nil {
			// Maybe it's a string that needs decompression
			if decompressed, err := compression.DecompressPayload(plainStr); err == nil {
				// Convert map to SharedConfig
				jsonBytes, err := json.Marshal(decompressed)
				if err != nil {
					return nil, fmt.Errorf("failed to marshal decompressed data: %w", err)
				}
				
				if err := json.Unmarshal(jsonBytes, &config); err != nil {
					return nil, fmt.Errorf("failed to parse configuration: %w", err)
				}
				return &config, nil
			}
			return nil, fmt.Errorf("failed to parse configuration: %w", err)
		}
		
		return &config, nil
	}
	
	// Fall back to old format (JSON structure with enc, salt, nonce)
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

// EncryptConfig encrypts configuration JSON and returns the encrypted data string
func EncryptConfig(configJSON []byte, password string) (string, error) {
	// Encrypt using new format
	encryptedData, err := crypto.EncryptShareLink(configJSON, password)
	if err != nil {
		return "", fmt.Errorf("failed to encrypt configuration: %w", err)
	}
	
	return encryptedData, nil
}

// CreateShareableURL creates a shareable URL from configuration (new format)
func CreateShareableURL(config *SharedConfig, password string, baseURL string) (string, error) {
	// Convert configuration to JSON
	jsonData, err := json.Marshal(config)
	if err != nil {
		return "", fmt.Errorf("failed to marshal configuration: %w", err)
	}
	
	// Use the EncryptConfig function
	encryptedData, err := EncryptConfig(jsonData, password)
	if err != nil {
		return "", err
	}

	// Create the URL with fragment
	return fmt.Sprintf("%s#gpt=%s", baseURL, encryptedData), nil
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

// DeriveNamespaceFromURL derives the namespace hash from a share link URL
func DeriveNamespaceFromURL(url string, password string) (string, string, error) {
	// Normalize input
	normalized := normalizeInput(url)
	
	// Extract encrypted data
	encryptedData, err := crypto.ParseShareLinkURL(normalized)
	if err != nil {
		return "", "", fmt.Errorf("failed to parse URL: %w", err)
	}
	
	// Extract salt and nonce
	salt, nonce, err := crypto.ExtractSaltAndNonce(encryptedData)
	if err != nil {
		return "", "", fmt.Errorf("failed to extract salt and nonce: %w", err)
	}
	
	// Derive the decryption key and master key
	decryptionKey := crypto.DeriveKey(password, salt)
	masterKey := crypto.DeriveMasterKey(password, salt, nonce)
	
	// Derive the namespace hash
	namespaceHash := crypto.DeriveNamespaceHash(decryptionKey, masterKey, nonce)
	
	// Return the first 8 characters as the namespace and the master key
	namespace := namespaceHash
	if len(namespaceHash) > 8 {
		namespace = namespaceHash[:8]
	}
	
	return namespace, masterKey, nil
}