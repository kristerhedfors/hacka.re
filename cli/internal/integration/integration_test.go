package integration

import (
	"testing"

	"github.com/hacka-re/cli/internal/config"
)

// TestWrapConfig tests the config wrapper functionality
func TestWrapConfig(t *testing.T) {
	cfg := config.NewConfig()
	cfg.Provider = config.ProviderOpenAI
	cfg.APIKey = "test-key"
	cfg.BaseURL = "https://api.openai.com/v1"
	cfg.Model = "gpt-3.5-turbo"
	cfg.Temperature = 0.7
	cfg.MaxTokens = 2048
	cfg.StreamResponse = true
	cfg.YoloMode = false
	cfg.VoiceControl = true
	cfg.SystemPrompt = "You are a helpful assistant"
	cfg.Namespace = "test-namespace"

	wrapped := WrapConfig(cfg)

	// Test all interface methods
	if wrapped.GetProvider() != "openai" {
		t.Errorf("Expected provider 'openai', got '%s'", wrapped.GetProvider())
	}

	if wrapped.GetAPIKey() != "test-key" {
		t.Errorf("Expected API key 'test-key', got '%s'", wrapped.GetAPIKey())
	}

	if wrapped.GetBaseURL() != "https://api.openai.com/v1" {
		t.Errorf("Expected base URL 'https://api.openai.com/v1', got '%s'", wrapped.GetBaseURL())
	}

	if wrapped.GetModel() != "gpt-3.5-turbo" {
		t.Errorf("Expected model 'gpt-3.5-turbo', got '%s'", wrapped.GetModel())
	}

	if wrapped.GetTemperature() != 0.7 {
		t.Errorf("Expected temperature 0.7, got %f", wrapped.GetTemperature())
	}

	if wrapped.GetMaxTokens() != 2048 {
		t.Errorf("Expected max tokens 2048, got %d", wrapped.GetMaxTokens())
	}

	if !wrapped.GetStreamResponse() {
		t.Error("Expected stream response to be true")
	}

	if wrapped.GetYoloMode() {
		t.Error("Expected YOLO mode to be false")
	}

	if !wrapped.GetVoiceControl() {
		t.Error("Expected voice control to be true")
	}

	if wrapped.GetSystemPrompt() != "You are a helpful assistant" {
		t.Errorf("Expected system prompt 'You are a helpful assistant', got '%s'", wrapped.GetSystemPrompt())
	}

	if wrapped.GetNamespace() != "test-namespace" {
		t.Errorf("Expected namespace 'test-namespace', got '%s'", wrapped.GetNamespace())
	}
}

// TestLaunchTUIConfiguration tests that the TUI launcher can be configured
func TestLaunchTUIConfiguration(t *testing.T) {
	cfg := config.NewConfig()
	cfg.Provider = config.ProviderGroq
	cfg.APIKey = "groq-test-key"
	cfg.BaseURL = "https://api.groq.com/openai/v1"
	cfg.Model = "llama-3.1-8b-instant"

	// Test that we can wrap the config without errors
	wrapped := WrapConfig(cfg)
	if wrapped == nil {
		t.Error("WrapConfig returned nil")
	}

	// Test that the wrapped config has the correct values
	if wrapped.GetProvider() != "groq" {
		t.Errorf("Expected provider 'groq', got '%s'", wrapped.GetProvider())
	}

	if wrapped.GetAPIKey() != "groq-test-key" {
		t.Errorf("Expected API key 'groq-test-key', got '%s'", wrapped.GetAPIKey())
	}

	if wrapped.GetModel() != "llama-3.1-8b-instant" {
		t.Errorf("Expected model 'llama-3.1-8b-instant', got '%s'", wrapped.GetModel())
	}
}

// TestCreateCallbacks tests callback creation
func TestCreateCallbacks(t *testing.T) {
	cfg := config.NewConfig()
	callbacks := createCallbacks(cfg)

	if callbacks == nil {
		t.Error("createCallbacks returned nil")
	}

	if callbacks.OnStartChat == nil {
		t.Error("OnStartChat callback is nil")
	}

	if callbacks.OnBrowse == nil {
		t.Error("OnBrowse callback is nil")
	}

	if callbacks.OnServe == nil {
		t.Error("OnServe callback is nil")
	}

	if callbacks.OnShareLink == nil {
		t.Error("OnShareLink callback is nil")
	}

	if callbacks.OnSaveConfig == nil {
		t.Error("OnSaveConfig callback is nil")
	}

	if callbacks.OnLoadConfig == nil {
		t.Error("OnLoadConfig callback is nil")
	}

	if callbacks.OnExit == nil {
		t.Error("OnExit callback is nil")
	}
}

// TestDebugMode tests debug mode detection
func TestDebugMode(t *testing.T) {
	// Test with no environment variable
	if isDebugMode() {
		t.Error("Debug mode should be false when no env var is set")
	}

	// Note: We can't easily test with env vars set without affecting other tests
	// In a real test suite, you might use a test framework that allows env manipulation
}