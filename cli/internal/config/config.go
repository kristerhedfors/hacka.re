package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/hacka-re/cli/internal/share"
)

// Provider represents an API provider
type Provider string

const (
	ProviderOpenAI    Provider = "openai"
	ProviderBerget    Provider = "berget"
	ProviderGroq      Provider = "groq"
	ProviderOllama    Provider = "ollama"
	ProviderLlamafile Provider = "llamafile"
	ProviderGPT4All   Provider = "gpt4all"
	ProviderLMStudio  Provider = "lmstudio"
	ProviderLocalAI   Provider = "localai"
	ProviderCustom    Provider = "custom"
)

// ProviderInfo contains information about an API provider
type ProviderInfo struct {
	Name    string
	BaseURL string
	Flag    string // Country flag emoji for display
}

// Providers maps provider IDs to their info
var Providers = map[Provider]ProviderInfo{
	ProviderOpenAI:    {"OpenAI", "https://api.openai.com/v1", "🇺🇸"},
	ProviderBerget:    {"Berget.AI", "https://api.berget.ai/v1", "🇸🇪"},
	ProviderGroq:      {"Groq Cloud", "https://api.groq.com/openai/v1", "🇸🇦"},
	ProviderOllama:    {"Ollama", "http://localhost:11434/v1", ""},
	ProviderLlamafile: {"Llamafile", "http://localhost:8080/v1", ""},
	ProviderGPT4All:   {"GPT4All", "http://localhost:4891/v1", ""},
	ProviderLMStudio:  {"LM Studio", "http://localhost:1234/v1", ""},
	ProviderLocalAI:   {"LocalAI", "http://localhost:8080/v1", ""},
	ProviderCustom:    {"Custom", "", ""},
}

// Config represents the application configuration
type Config struct {
	// API Configuration
	Provider    Provider `json:"provider"`
	BaseURL     string   `json:"baseUrl"`
	APIKey      string   `json:"apiKey"`
	Model       string   `json:"model"`
	MaxTokens   int      `json:"maxTokens"`
	Temperature float64  `json:"temperature"`

	// UI Configuration
	Theme          string `json:"theme"`
	WelcomeMessage string `json:"welcomeMessage"`

	// System Configuration
	SystemPrompt string `json:"systemPrompt"`
	Namespace    string `json:"namespace,omitempty"`

	// Features
	YoloMode       bool `json:"yoloMode"`       // Auto-execute functions
	VoiceControl   bool `json:"voiceControl"`   // Voice input
	StreamResponse bool `json:"streamResponse"` // Stream API responses

	// Offline mode settings (not serialized)
	IsOfflineMode         bool `json:"-"` // Offline mode flag
	AllowRemoteMCP        bool `json:"-"` // Allow remote MCP in offline mode
	AllowRemoteEmbeddings bool `json:"-"` // Allow remote embeddings in offline mode

	// Function Calling
	Functions        []share.Function        `json:"functions,omitempty"`
	DefaultFunctions map[string]bool         `json:"defaultFunctions,omitempty"`

	// Prompts Library
	Prompts []share.Prompt `json:"prompts,omitempty"`

	// RAG Configuration
	RAGEnabled   bool     `json:"ragEnabled"`
	RAGDocuments []string `json:"ragDocuments,omitempty"`

	// MCP Servers
	MCPServers []MCPServer `json:"mcpServers,omitempty"`

	// API Keys for services
	ShodanAPIKey string `json:"shodanApiKey,omitempty"`

	// File path for persistence
	ConfigFile string `json:"-"`
}

// MCPServer represents a Model Context Protocol server
type MCPServer struct {
	Name    string `json:"name"`
	URL     string `json:"url"`
	Enabled bool   `json:"enabled"`
}

// NewConfig creates a new configuration with defaults
func NewConfig() *Config {
	return &Config{
		Provider:       ProviderOpenAI,
		BaseURL:        Providers[ProviderOpenAI].BaseURL,
		Model:          "gpt-4",
		MaxTokens:      2048,
		Temperature:    0.7,
		Theme:          "modern",
		StreamResponse: true,
		Functions:      []share.Function{},
		Prompts:        []share.Prompt{},
		MCPServers:     []MCPServer{},
	}
}

// LoadFromFile loads configuration from a JSON file
func LoadFromFile(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// Return default config if file doesn't exist
			config := NewConfig()
			config.ConfigFile = path
			return config, nil
		}
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	config.ConfigFile = path
	return &config, nil
}

// SaveToFile saves configuration to a JSON file
func (c *Config) SaveToFile(path string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	c.ConfigFile = path
	return nil
}

// LoadFromSharedConfig loads configuration from a shared config object
func (c *Config) LoadFromSharedConfig(shared *share.SharedConfig) {
	if shared.APIKey != "" {
		c.APIKey = shared.APIKey

		// Try to detect provider from API key
		provider, detectedBaseURL, defaultModel := detectProviderFromAPIKey(shared.APIKey)

		// If we detected a provider from the API key
		if provider != "" {
			// Check if shared config has a BaseURL that doesn't match the detected provider
			if shared.BaseURL != "" {
				// Check if the BaseURL matches the detected provider
				detectedProvider := detectProvider(shared.BaseURL)
				if detectedProvider != provider {
					// Mismatch! The API key suggests one provider but BaseURL is for another
					// Trust the API key detection over the BaseURL
					c.Provider = provider
					c.BaseURL = detectedBaseURL
					// Use detected model if no model specified
					if shared.Model == "" && defaultModel != "" {
						c.Model = defaultModel
					}
				} else {
					// They match, use the shared config's BaseURL
					c.BaseURL = shared.BaseURL
					c.Provider = provider
				}
			} else {
				// No BaseURL in shared config, use detected values
				c.Provider = provider
				c.BaseURL = detectedBaseURL
				// Use detected model if no model specified
				if shared.Model == "" && defaultModel != "" {
					c.Model = defaultModel
				}
			}
		} else if shared.BaseURL != "" {
			// No detection from API key, use BaseURL from shared config
			c.BaseURL = shared.BaseURL
			c.Provider = detectProvider(shared.BaseURL)
		}
	} else if shared.BaseURL != "" {
		// No API key, just use BaseURL
		c.BaseURL = shared.BaseURL
		c.Provider = detectProvider(shared.BaseURL)
	}
	if shared.Model != "" {
		c.Model = shared.Model
	}
	if shared.MaxTokens > 0 {
		c.MaxTokens = shared.MaxTokens
	}
	if shared.Temperature > 0 {
		c.Temperature = shared.Temperature
	}
	if shared.SystemPrompt != "" {
		c.SystemPrompt = shared.SystemPrompt
	}
	if shared.WelcomeMessage != "" {
		c.WelcomeMessage = shared.WelcomeMessage
	}
	if shared.Theme != "" {
		c.Theme = shared.Theme
	}
	if len(shared.Functions) > 0 {
		c.Functions = shared.Functions
	}
	if len(shared.DefaultFunctions) > 0 {
		c.DefaultFunctions = shared.DefaultFunctions
	}
	if len(shared.Prompts) > 0 {
		c.Prompts = shared.Prompts
	}
	c.RAGEnabled = shared.RAGEnabled
	if len(shared.RAGDocuments) > 0 {
		c.RAGDocuments = shared.RAGDocuments
	}
}

// ToSharedConfig converts configuration to a shared config object
func (c *Config) ToSharedConfig() *share.SharedConfig {
	return &share.SharedConfig{
		APIKey:           c.APIKey,
		BaseURL:          c.BaseURL,
		Model:            c.Model,
		MaxTokens:        c.MaxTokens,
		Temperature:      c.Temperature,
		SystemPrompt:     c.SystemPrompt,
		WelcomeMessage:   c.WelcomeMessage,
		Theme:            c.Theme,
		Functions:        c.Functions,
		DefaultFunctions: c.DefaultFunctions,
		Prompts:          c.Prompts,
		RAGEnabled:       c.RAGEnabled,
		RAGDocuments:     c.RAGDocuments,
	}
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.BaseURL == "" {
		return errors.New("base URL is required")
	}

	if !strings.HasPrefix(c.BaseURL, "http://") && !strings.HasPrefix(c.BaseURL, "https://") {
		return errors.New("base URL must start with http:// or https://")
	}

	if c.Model == "" {
		return errors.New("model is required")
	}

	if c.MaxTokens <= 0 {
		c.MaxTokens = 2048 // Set default
	}

	if c.Temperature < 0 || c.Temperature > 2 {
		return errors.New("temperature must be between 0 and 2")
	}

	return nil
}

// GetConfigPath returns the default configuration file path
func GetConfigPath() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "hacka.re.json"
	}
	return filepath.Join(homeDir, ".config", "hacka.re", "config.json")
}

// detectProviderFromAPIKey detects the provider based on API key patterns
func detectProviderFromAPIKey(apiKey string) (provider Provider, baseURL string, model string) {
	if apiKey == "" {
		return "", "", ""
	}

	trimmedKey := strings.TrimSpace(apiKey)

	// Check for Berget.AI keys
	if matched, _ := regexp.MatchString(`^sk_ber_[A-Za-z0-9\-_]{30,}$`, trimmedKey); matched {
		return ProviderBerget, "https://api.berget.ai/v1", "mistral-small-2503"
	}

	// Check for OpenAI keys
	if matched, _ := regexp.MatchString(`^sk-proj-[A-Za-z0-9\-_]{50,}$`, trimmedKey); matched {
		return ProviderOpenAI, "https://api.openai.com/v1", "gpt-5-nano"
	}

	// Check for Groq keys
	if matched, _ := regexp.MatchString(`^gsk_[A-Za-z0-9]{50,}$`, trimmedKey); matched {
		return ProviderGroq, "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"
	}

	return "", "", ""
}

// detectProvider attempts to detect the provider from the base URL
func detectProvider(baseURL string) Provider {
	baseURL = strings.ToLower(baseURL)
	
	for provider, info := range Providers {
		if provider != ProviderCustom && strings.Contains(baseURL, strings.ToLower(info.BaseURL)) {
			return provider
		}
	}

	// Check for localhost patterns
	if strings.Contains(baseURL, "localhost") || strings.Contains(baseURL, "127.0.0.1") {
		if strings.Contains(baseURL, "11434") {
			return ProviderOllama
		}
		if strings.Contains(baseURL, "8080") {
			// Could be Llamafile or LocalAI
			return ProviderLlamafile
		}
		if strings.Contains(baseURL, "4891") {
			return ProviderGPT4All
		}
		if strings.Contains(baseURL, "1234") {
			return ProviderLMStudio
		}
	}

	return ProviderCustom
}

// GetProviderBaseURL returns the base URL for a provider
func GetProviderBaseURL(provider Provider) string {
	if info, ok := Providers[provider]; ok {
		return info.BaseURL
	}
	return ""
}

// IsLocalProvider checks if the provider is a local one
func IsLocalProvider(provider Provider) bool {
	switch provider {
	case ProviderOllama, ProviderLlamafile, ProviderGPT4All, ProviderLMStudio, ProviderLocalAI:
		return true
	default:
		return false
	}
}