package tui

import (
	"testing"
	"github.com/hacka-re/cli/internal/tui/pkg/interfaces"
)

// MockConfig implements the ExternalConfig interface for testing
type MockConfig struct {
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

func (m *MockConfig) GetProvider() string      { return m.provider }
func (m *MockConfig) GetAPIKey() string        { return m.apiKey }
func (m *MockConfig) GetBaseURL() string       { return m.baseURL }
func (m *MockConfig) GetModel() string         { return m.model }
func (m *MockConfig) GetTemperature() float64  { return m.temperature }
func (m *MockConfig) GetMaxTokens() int        { return m.maxTokens }
func (m *MockConfig) GetStreamMode() bool      { return m.streamMode }
func (m *MockConfig) GetYoloMode() bool        { return m.yoloMode }
func (m *MockConfig) GetVoiceControl() bool    { return m.voiceControl }
func (m *MockConfig) GetSystemPrompt() string  { return m.systemPrompt }
func (m *MockConfig) GetNamespace() string     { return m.namespace }
func (m *MockConfig) GetFunctions() []interfaces.FunctionDef { return nil }
func (m *MockConfig) GetPrompts() []interfaces.PromptDef  { return nil }

// TestLaunchOptionsCreation tests basic LaunchOptions creation
func TestLaunchOptionsCreation(t *testing.T) {
	mockConfig := &MockConfig{
		provider:    "openai",
		apiKey:      "test-key",
		baseURL:     "https://api.openai.com/v1",
		model:       "gpt-3.5-turbo",
		temperature: 0.7,
		maxTokens:   2048,
		streamMode:  true,
	}

	callbacks := &Callbacks{
		OnStartChat: func(config interface{}) error {
			return nil
		},
		OnSaveConfig: func(config interface{}) error {
			return nil
		},
	}

	options := &LaunchOptions{
		Mode:      "socket",
		Config:    mockConfig,
		Callbacks: callbacks,
		Debug:     true,
	}

	// Test that options are created properly
	if options.Mode != "socket" {
		t.Errorf("Expected mode 'socket', got '%s'", options.Mode)
	}

	if options.Config == nil {
		t.Error("Expected config to be set")
	}

	if options.Callbacks == nil {
		t.Error("Expected callbacks to be set")
	}

	if !options.Debug {
		t.Error("Expected debug to be true")
	}
}

// TestCallbacksInterface tests the Callbacks structure
func TestCallbacksInterface(t *testing.T) {
	callbacksCalled := make(map[string]bool)

	callbacks := &Callbacks{
		OnStartChat: func(config interface{}) error {
			callbacksCalled["chat"] = true
			return nil
		},
		OnBrowse: func(config interface{}) error {
			callbacksCalled["browse"] = true
			return nil
		},
		OnServe: func(config interface{}) error {
			callbacksCalled["serve"] = true
			return nil
		},
		OnShareLink: func(config interface{}) (string, error) {
			callbacksCalled["share"] = true
			return "https://example.com/share", nil
		},
		OnSaveConfig: func(config interface{}) error {
			callbacksCalled["save"] = true
			return nil
		},
		OnLoadConfig: func() (interface{}, error) {
			callbacksCalled["load"] = true
			return nil, nil
		},
		OnExit: func() {
			callbacksCalled["exit"] = true
		},
	}

	// Test all callbacks
	if err := callbacks.OnStartChat(nil); err != nil {
		t.Errorf("OnStartChat failed: %v", err)
	}

	if err := callbacks.OnBrowse(nil); err != nil {
		t.Errorf("OnBrowse failed: %v", err)
	}

	if err := callbacks.OnServe(nil); err != nil {
		t.Errorf("OnServe failed: %v", err)
	}

	if url, err := callbacks.OnShareLink(nil); err != nil {
		t.Errorf("OnShareLink failed: %v", err)
	} else if url != "https://example.com/share" {
		t.Errorf("Expected share URL 'https://example.com/share', got '%s'", url)
	}

	if err := callbacks.OnSaveConfig(nil); err != nil {
		t.Errorf("OnSaveConfig failed: %v", err)
	}

	if _, err := callbacks.OnLoadConfig(); err != nil {
		t.Errorf("OnLoadConfig failed: %v", err)
	}

	callbacks.OnExit()

	// Verify all callbacks were called
	expectedCallbacks := []string{"chat", "browse", "serve", "share", "save", "load", "exit"}
	for _, callback := range expectedCallbacks {
		if !callbacksCalled[callback] {
			t.Errorf("Callback '%s' was not called", callback)
		}
	}
}

// TestConfigInterface tests the ExternalConfig interface
func TestConfigInterface(t *testing.T) {
	mockConfig := &MockConfig{
		provider:     "groq",
		apiKey:       "groq-api-key",
		baseURL:      "https://api.groq.com/openai/v1",
		model:        "llama-3.1-8b-instant",
		temperature:  0.5,
		maxTokens:    1024,
		streamMode:   false,
		yoloMode:     true,
		voiceControl: false,
		systemPrompt: "You are a helpful assistant",
		namespace:    "test-namespace",
	}

	// Test all interface methods
	if mockConfig.GetProvider() != "groq" {
		t.Errorf("Expected provider 'groq', got '%s'", mockConfig.GetProvider())
	}

	if mockConfig.GetAPIKey() != "groq-api-key" {
		t.Errorf("Expected API key 'groq-api-key', got '%s'", mockConfig.GetAPIKey())
	}

	if mockConfig.GetModel() != "llama-3.1-8b-instant" {
		t.Errorf("Expected model 'llama-3.1-8b-instant', got '%s'", mockConfig.GetModel())
	}

	if mockConfig.GetTemperature() != 0.5 {
		t.Errorf("Expected temperature 0.5, got %f", mockConfig.GetTemperature())
	}

	if mockConfig.GetMaxTokens() != 1024 {
		t.Errorf("Expected max tokens 1024, got %d", mockConfig.GetMaxTokens())
	}

	if mockConfig.GetStreamMode() {
		t.Error("Expected stream mode to be false")
	}

	if !mockConfig.GetYoloMode() {
		t.Error("Expected YOLO mode to be true")
	}

	if mockConfig.GetVoiceControl() {
		t.Error("Expected voice control to be false")
	}

	if mockConfig.GetSystemPrompt() != "You are a helpful assistant" {
		t.Errorf("Expected system prompt 'You are a helpful assistant', got '%s'", mockConfig.GetSystemPrompt())
	}

	if mockConfig.GetNamespace() != "test-namespace" {
		t.Errorf("Expected namespace 'test-namespace', got '%s'", mockConfig.GetNamespace())
	}
}

// TestLaunchTUIWithMockConfig tests launching TUI with mock configuration
// This is a non-interactive test that just validates the setup process
func TestLaunchTUISetup(t *testing.T) {
	// Create a temporary config path for testing
	tempConfigPath := "/tmp/hackare-tui-test-config.json"

	mockConfig := &MockConfig{
		provider:    "openai",
		apiKey:      "test-key",
		baseURL:     "https://api.openai.com/v1",
		model:       "gpt-3.5-turbo",
		temperature: 0.7,
		maxTokens:   2048,
		streamMode:  true,
	}

	callbacksCalled := false
	callbacks := &Callbacks{
		OnExit: func() {
			callbacksCalled = true
		},
	}

	options := &LaunchOptions{
		Mode:       "socket", // Use socket mode for testing
		Config:     mockConfig,
		Callbacks:  callbacks,
		Debug:      false,
		ConfigPath: tempConfigPath,
	}

	// This test validates that LaunchTUI can be set up properly
	// We don't actually run it as it would require user interaction
	if options == nil {
		t.Error("Failed to create launch options")
	}

	// Validate options were set correctly
	if options.Mode != "socket" {
		t.Errorf("Expected mode 'socket', got '%s'", options.Mode)
	}

	if options.ConfigPath != tempConfigPath {
		t.Errorf("Expected config path '%s', got '%s'", tempConfigPath, options.ConfigPath)
	}

	// Test callback exists
	if options.Callbacks.OnExit == nil {
		t.Error("OnExit callback should be set")
	}

	// Test callback can be called
	options.Callbacks.OnExit()
	if !callbacksCalled {
		t.Error("OnExit callback was not called")
	}
}

// BenchmarkLaunchOptionsCreation benchmarks the creation of LaunchOptions
func BenchmarkLaunchOptionsCreation(b *testing.B) {
	mockConfig := &MockConfig{
		provider:    "openai",
		apiKey:      "test-key",
		baseURL:     "https://api.openai.com/v1",
		model:       "gpt-3.5-turbo",
		temperature: 0.7,
		maxTokens:   2048,
		streamMode:  true,
	}

	callbacks := &Callbacks{
		OnStartChat: func(config interface{}) error { return nil },
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		options := &LaunchOptions{
			Mode:      "socket",
			Config:    mockConfig,
			Callbacks: callbacks,
			Debug:     false,
		}
		_ = options
	}
}