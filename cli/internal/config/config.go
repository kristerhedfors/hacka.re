package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
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
	}
	if shared.BaseURL != "" {
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