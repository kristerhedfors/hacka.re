package config

import (
	"testing"

	"github.com/hacka-re/cli/internal/share"
)

func TestDetectProviderFromAPIKey(t *testing.T) {
	tests := []struct {
		name         string
		apiKey       string
		wantProvider Provider
		wantBaseURL  string
		wantModel    string
	}{
		{
			name:         "Berget.AI key",
			apiKey:       "sk_ber_1234567890abcdefghij1234567890",
			wantProvider: ProviderBerget,
			wantBaseURL:  "https://api.berget.ai/v1",
			wantModel:    "mistral-small-2503",
		},
		{
			name:         "OpenAI key",
			apiKey:       "sk-proj-12345678901234567890123456789012345678901234567890",
			wantProvider: ProviderOpenAI,
			wantBaseURL:  "https://api.openai.com/v1",
			wantModel:    "gpt-5-nano",
		},
		{
			name:         "Groq key",
			apiKey:       "gsk_12345678901234567890123456789012345678901234567890",
			wantProvider: ProviderGroq,
			wantBaseURL:  "https://api.groq.com/openai/v1",
			wantModel:    "llama-3.3-70b-versatile",
		},
		{
			name:         "Unknown key format",
			apiKey:       "random_key_12345",
			wantProvider: "",
			wantBaseURL:  "",
			wantModel:    "",
		},
		{
			name:         "Empty key",
			apiKey:       "",
			wantProvider: "",
			wantBaseURL:  "",
			wantModel:    "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider, baseURL, model := detectProviderFromAPIKey(tt.apiKey)
			if provider != tt.wantProvider {
				t.Errorf("detectProviderFromAPIKey() provider = %v, want %v", provider, tt.wantProvider)
			}
			if baseURL != tt.wantBaseURL {
				t.Errorf("detectProviderFromAPIKey() baseURL = %v, want %v", baseURL, tt.wantBaseURL)
			}
			if model != tt.wantModel {
				t.Errorf("detectProviderFromAPIKey() model = %v, want %v", model, tt.wantModel)
			}
		})
	}
}

func TestLoadFromSharedConfigWithAutoDetection(t *testing.T) {
	tests := []struct {
		name         string
		apiKey       string
		baseURL      string // in shared config
		wantProvider Provider
		wantBaseURL  string // expected after detection
	}{
		{
			name:         "Auto-detect Berget from API key",
			apiKey:       "sk_ber_1234567890abcdefghij1234567890",
			baseURL:      "", // No BaseURL provided
			wantProvider: ProviderBerget,
			wantBaseURL:  "https://api.berget.ai/v1",
		},
		{
			name:         "API key detection overrides mismatched BaseURL",
			apiKey:       "sk_ber_1234567890abcdefghij1234567890",
			baseURL:      "https://api.openai.com/v1", // Wrong BaseURL for Berget key
			wantProvider: ProviderBerget,              // Should detect Berget from key
			wantBaseURL:  "https://api.berget.ai/v1",  // Should use Berget URL
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := NewConfig()
			shared := &share.SharedConfig{
				APIKey:  tt.apiKey,
				BaseURL: tt.baseURL,
			}

			config.LoadFromSharedConfig(shared)

			if config.Provider != tt.wantProvider {
				t.Errorf("LoadFromSharedConfig() provider = %v, want %v", config.Provider, tt.wantProvider)
			}
			if config.BaseURL != tt.wantBaseURL {
				t.Errorf("LoadFromSharedConfig() baseURL = %v, want %v", config.BaseURL, tt.wantBaseURL)
			}
		})
	}
}