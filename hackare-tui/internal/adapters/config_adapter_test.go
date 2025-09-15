package adapters

import (
	"path/filepath"
	"testing"

	"github.com/hacka-re/tui/internal/core"
	"github.com/hacka-re/tui/pkg/interfaces"
)

// MockExternalConfig implements ExternalConfig for testing
type MockExternalConfig struct {
	provider      string
	apiKey        string
	baseURL       string
	model         string
	temperature   float64
	maxTokens     int
	streamMode    bool
	yoloMode      bool
	voiceControl  bool
	systemPrompt  string
	namespace     string
}

func (m *MockExternalConfig) GetProvider() string      { return m.provider }
func (m *MockExternalConfig) GetAPIKey() string        { return m.apiKey }
func (m *MockExternalConfig) GetBaseURL() string       { return m.baseURL }
func (m *MockExternalConfig) GetModel() string         { return m.model }
func (m *MockExternalConfig) GetTemperature() float64  { return m.temperature }
func (m *MockExternalConfig) GetMaxTokens() int        { return m.maxTokens }
func (m *MockExternalConfig) GetStreamMode() bool      { return m.streamMode }
func (m *MockExternalConfig) GetYoloMode() bool        { return m.yoloMode }
func (m *MockExternalConfig) GetVoiceControl() bool    { return m.voiceControl }
func (m *MockExternalConfig) GetSystemPrompt() string  { return m.systemPrompt }
func (m *MockExternalConfig) GetNamespace() string     { return m.namespace }
func (m *MockExternalConfig) GetFunctions() []interfaces.FunctionDef { return nil }
func (m *MockExternalConfig) GetPrompts() []interfaces.PromptDef  { return nil }

// MockCLIConfig implements CLIConfig for testing
type MockCLIConfig struct {
	provider       string
	apiKey         string
	baseURL        string
	model          string
	temperature    float64
	maxTokens      int
	streamResponse bool
	yoloMode       bool
	voiceControl   bool
	systemPrompt   string
	namespace      string
}

func (m *MockCLIConfig) GetProvider() string       { return m.provider }
func (m *MockCLIConfig) GetAPIKey() string         { return m.apiKey }
func (m *MockCLIConfig) GetBaseURL() string        { return m.baseURL }
func (m *MockCLIConfig) GetModel() string          { return m.model }
func (m *MockCLIConfig) GetTemperature() float64   { return m.temperature }
func (m *MockCLIConfig) GetMaxTokens() int         { return m.maxTokens }
func (m *MockCLIConfig) GetStreamResponse() bool   { return m.streamResponse }
func (m *MockCLIConfig) GetYoloMode() bool         { return m.yoloMode }
func (m *MockCLIConfig) GetVoiceControl() bool     { return m.voiceControl }
func (m *MockCLIConfig) GetSystemPrompt() string   { return m.systemPrompt }
func (m *MockCLIConfig) GetNamespace() string      { return m.namespace }

// createTestConfigManager creates a ConfigManager for testing
func createTestConfigManager(t *testing.T) *core.ConfigManager {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.json")

	cm, err := core.NewConfigManagerWithPath(configPath)
	if err != nil {
		t.Fatalf("Failed to create test config manager: %v", err)
	}

	return cm
}

// TestAdaptFromInterface tests adaptation from ExternalConfig interface
func TestAdaptFromInterface(t *testing.T) {
	cm := createTestConfigManager(t)

	mockConfig := &MockExternalConfig{
		provider:     "groq",
		apiKey:       "test-groq-key",
		baseURL:      "https://api.groq.com/openai/v1",
		model:        "llama-3.1-8b-instant",
		temperature:  0.8,
		maxTokens:    1024,
		streamMode:   false,
		yoloMode:     true,
		voiceControl: false,
		systemPrompt: "You are a test assistant",
		namespace:    "test-namespace",
	}

	err := AdaptExternalConfig(cm, mockConfig)
	if err != nil {
		t.Fatalf("Failed to adapt external config: %v", err)
	}

	// Verify the configuration was adapted correctly
	config := cm.Get()

	if config.Provider != "groq" {
		t.Errorf("Expected provider 'groq', got '%s'", config.Provider)
	}

	if config.APIKey != "test-groq-key" {
		t.Errorf("Expected API key 'test-groq-key', got '%s'", config.APIKey)
	}

	if config.BaseURL != "https://api.groq.com/openai/v1" {
		t.Errorf("Expected base URL 'https://api.groq.com/openai/v1', got '%s'", config.BaseURL)
	}

	if config.Model != "llama-3.1-8b-instant" {
		t.Errorf("Expected model 'llama-3.1-8b-instant', got '%s'", config.Model)
	}

	if config.Temperature != 0.8 {
		t.Errorf("Expected temperature 0.8, got %f", config.Temperature)
	}

	if config.MaxTokens != 1024 {
		t.Errorf("Expected max tokens 1024, got %d", config.MaxTokens)
	}

	if config.StreamMode {
		t.Error("Expected stream mode to be false")
	}

	if !config.YoloMode {
		t.Error("Expected YOLO mode to be true")
	}

	if config.VoiceControl {
		t.Error("Expected voice control to be false")
	}

	if config.SystemPrompt != "You are a test assistant" {
		t.Errorf("Expected system prompt 'You are a test assistant', got '%s'", config.SystemPrompt)
	}

	if config.Namespace != "test-namespace" {
		t.Errorf("Expected namespace 'test-namespace', got '%s'", config.Namespace)
	}
}

// TestAdaptFromCLIConfig tests adaptation from CLI config struct
func TestAdaptFromCLIConfig(t *testing.T) {
	cm := createTestConfigManager(t)

	mockCLIConfig := &MockCLIConfig{
		provider:       "openai",
		apiKey:         "test-openai-key",
		baseURL:        "https://api.openai.com/v1",
		model:          "gpt-4",
		temperature:    0.7,
		maxTokens:      2048,
		streamResponse: true,
		yoloMode:       false,
		voiceControl:   true,
		systemPrompt:   "You are a CLI assistant",
		namespace:      "cli-namespace",
	}

	err := AdaptExternalConfig(cm, mockCLIConfig)
	if err != nil {
		t.Fatalf("Failed to adapt CLI config: %v", err)
	}

	// Verify the configuration was adapted correctly
	config := cm.Get()

	if config.Provider != "openai" {
		t.Errorf("Expected provider 'openai', got '%s'", config.Provider)
	}

	if config.APIKey != "test-openai-key" {
		t.Errorf("Expected API key 'test-openai-key', got '%s'", config.APIKey)
	}

	if config.Model != "gpt-4" {
		t.Errorf("Expected model 'gpt-4', got '%s'", config.Model)
	}

	if config.Temperature != 0.7 {
		t.Errorf("Expected temperature 0.7, got %f", config.Temperature)
	}

	if config.MaxTokens != 2048 {
		t.Errorf("Expected max tokens 2048, got %d", config.MaxTokens)
	}

	if !config.StreamMode {
		t.Error("Expected stream mode to be true")
	}

	if config.YoloMode {
		t.Error("Expected YOLO mode to be false")
	}

	if !config.VoiceControl {
		t.Error("Expected voice control to be true")
	}

	if config.SystemPrompt != "You are a CLI assistant" {
		t.Errorf("Expected system prompt 'You are a CLI assistant', got '%s'", config.SystemPrompt)
	}

	if config.Namespace != "cli-namespace" {
		t.Errorf("Expected namespace 'cli-namespace', got '%s'", config.Namespace)
	}
}

// TestAdaptFromUnsupportedType tests adaptation from unsupported type
func TestAdaptFromUnsupportedType(t *testing.T) {
	cm := createTestConfigManager(t)

	// Get original config values
	originalConfig := cm.Get()
	originalProvider := originalConfig.Provider

	// Try to adapt from an unsupported type
	unsupportedConfig := map[string]interface{}{
		"provider": "custom",
		"api_key":  "some-key",
	}

	err := AdaptExternalConfig(cm, unsupportedConfig)
	if err != nil {
		t.Fatalf("AdaptExternalConfig should not return error for unsupported types: %v", err)
	}

	// Verify the configuration was not changed
	config := cm.Get()
	if config.Provider != originalProvider {
		t.Errorf("Configuration should not have changed for unsupported type")
	}
}

// TestConfigPersistence tests that adapted config can be saved and loaded
func TestConfigPersistence(t *testing.T) {
	cm := createTestConfigManager(t)

	mockConfig := &MockExternalConfig{
		provider:    "ollama",
		apiKey:      "",
		baseURL:     "http://localhost:11434/v1",
		model:       "llama2",
		temperature: 0.9,
		maxTokens:   512,
		streamMode:  true,
		yoloMode:    false,
		namespace:   "ollama-test",
	}

	// Adapt the configuration
	err := AdaptExternalConfig(cm, mockConfig)
	if err != nil {
		t.Fatalf("Failed to adapt external config: %v", err)
	}

	// Save the configuration
	err = cm.Save()
	if err != nil {
		t.Fatalf("Failed to save configuration: %v", err)
	}

	// Create a new config manager and load the configuration
	cm2, err := core.NewConfigManagerWithPath(cm.GetConfigPath())
	if err != nil {
		t.Fatalf("Failed to create second config manager: %v", err)
	}

	// Verify the loaded configuration
	config := cm2.Get()

	if config.Provider != "ollama" {
		t.Errorf("Expected provider 'ollama' after reload, got '%s'", config.Provider)
	}

	if config.Model != "llama2" {
		t.Errorf("Expected model 'llama2' after reload, got '%s'", config.Model)
	}

	if config.Temperature != 0.9 {
		t.Errorf("Expected temperature 0.9 after reload, got %f", config.Temperature)
	}

	if config.Namespace != "ollama-test" {
		t.Errorf("Expected namespace 'ollama-test' after reload, got '%s'", config.Namespace)
	}
}

