package api

import (
	"fmt"
	"strings"
)

// ModelConfig contains compatibility settings for a specific model
type ModelConfig struct {
	Name                        string
	RequiresMaxCompletionTokens bool
	SupportsCustomTemperature   bool
	DefaultTemperature          float64
	MinTemperature              float64
	MaxTemperature              float64
	MaxTokensLimit              int
}

// ModelCompatibility manages model-specific configurations
type ModelCompatibility struct {
	models map[string]*ModelConfig
}

// NewModelCompatibility creates a new model compatibility manager
func NewModelCompatibility() *ModelCompatibility {
	mc := &ModelCompatibility{
		models: make(map[string]*ModelConfig),
	}
	
	// Initialize known model configurations
	mc.initializeModels()
	return mc
}

// initializeModels sets up known model configurations
func (mc *ModelCompatibility) initializeModels() {
	// GPT-5 family - requires max_completion_tokens, fixed temperature
	mc.addModelFamily("gpt-5-nano", &ModelConfig{
		RequiresMaxCompletionTokens: true,
		SupportsCustomTemperature:   false,
		DefaultTemperature:          1.0,
		MinTemperature:              1.0,
		MaxTemperature:              1.0,
		MaxTokensLimit:              8192,
	})
	
	mc.addModelFamily("gpt-5-mini", &ModelConfig{
		RequiresMaxCompletionTokens: true,
		SupportsCustomTemperature:   false,
		DefaultTemperature:          1.0,
		MinTemperature:              1.0,
		MaxTemperature:              1.0,
		MaxTokensLimit:              8192,
	})
	
	mc.addModelFamily("gpt-5", &ModelConfig{
		RequiresMaxCompletionTokens: true,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              2.0,
		MaxTokensLimit:              16384,
	})
	
	// GPT-4.1 family
	mc.addModelFamily("gpt-4.1-mini", &ModelConfig{
		RequiresMaxCompletionTokens: true,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              2.0,
		MaxTokensLimit:              8192,
	})
	
	mc.addModelFamily("gpt-4.1-nano", &ModelConfig{
		RequiresMaxCompletionTokens: true,
		SupportsCustomTemperature:   false,
		DefaultTemperature:          1.0,
		MinTemperature:              1.0,
		MaxTemperature:              1.0,
		MaxTokensLimit:              4096,
	})
	
	mc.addModelFamily("gpt-4.1", &ModelConfig{
		RequiresMaxCompletionTokens: true,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              2.0,
		MaxTokensLimit:              131072,
	})
	
	// GPT-4 Turbo and GPT-4 family
	mc.addModelFamily("gpt-4-turbo", &ModelConfig{
		RequiresMaxCompletionTokens: false,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              2.0,
		MaxTokensLimit:              4096,
	})
	
	mc.addModelFamily("gpt-4o", &ModelConfig{
		RequiresMaxCompletionTokens: false,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              2.0,
		MaxTokensLimit:              16384,
	})
	
	mc.addModelFamily("gpt-4o-mini", &ModelConfig{
		RequiresMaxCompletionTokens: false,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              2.0,
		MaxTokensLimit:              16384,
	})
	
	mc.addModelFamily("gpt-4", &ModelConfig{
		RequiresMaxCompletionTokens: false,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              2.0,
		MaxTokensLimit:              8192,
	})
	
	// GPT-3.5 family
	mc.addModelFamily("gpt-3.5-turbo", &ModelConfig{
		RequiresMaxCompletionTokens: false,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              2.0,
		MaxTokensLimit:              4096,
	})
	
	// Claude models (if used with OpenAI-compatible endpoints)
	mc.addModelFamily("claude-3", &ModelConfig{
		RequiresMaxCompletionTokens: false,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              1.0,
		MaxTokensLimit:              4096,
	})
	
	// Default configuration for unknown models
	mc.models["default"] = &ModelConfig{
		RequiresMaxCompletionTokens: false,
		SupportsCustomTemperature:   true,
		DefaultTemperature:          1.0,
		MinTemperature:              0.0,
		MaxTemperature:              2.0,
		MaxTokensLimit:              4096,
	}
}

// addModelFamily adds configurations for a model family with common prefixes
func (mc *ModelCompatibility) addModelFamily(prefix string, config *ModelConfig) {
	// Add the base model
	mc.models[prefix] = config
	
	// Add common variations
	variations := []string{
		prefix,
		prefix + "-latest",
		prefix + "-preview",
		prefix + "-2024",
		prefix + "-2025",
		prefix + "-2025-01",
		prefix + "-2025-02",
		prefix + "-2025-03",
		prefix + "-2025-04",
		prefix + "-2025-05",
		prefix + "-2025-06",
		prefix + "-2025-07",
		prefix + "-2025-08",
		prefix + "-2025-09",
		prefix + "-2025-10",
		prefix + "-2025-11",
		prefix + "-2025-12",
	}
	
	for _, variant := range variations {
		configCopy := *config
		configCopy.Name = variant
		mc.models[variant] = &configCopy
	}
}

// GetModelConfig returns the configuration for a specific model
func (mc *ModelCompatibility) GetModelConfig(modelName string) *ModelConfig {
	// Check exact match first
	if config, exists := mc.models[modelName]; exists {
		return config
	}
	
	// Check prefix matches for model families
	modelLower := strings.ToLower(modelName)
	
	// Check GPT-5 family
	if strings.HasPrefix(modelLower, "gpt-5") {
		// Determine specific variant
		if strings.Contains(modelLower, "nano") {
			if config, exists := mc.models["gpt-5-nano"]; exists {
				return config
			}
		} else if strings.Contains(modelLower, "mini") {
			if config, exists := mc.models["gpt-5-mini"]; exists {
				return config
			}
		}
		// Default GPT-5
		if config, exists := mc.models["gpt-5"]; exists {
			return config
		}
	}
	
	// Check GPT-4.1 family
	if strings.HasPrefix(modelLower, "gpt-4.1") {
		if strings.Contains(modelLower, "nano") {
			if config, exists := mc.models["gpt-4.1-nano"]; exists {
				return config
			}
		} else if strings.Contains(modelLower, "mini") {
			if config, exists := mc.models["gpt-4.1-mini"]; exists {
				return config
			}
		}
		// Default GPT-4.1
		if config, exists := mc.models["gpt-4.1"]; exists {
			return config
		}
	}
	
	// Check GPT-4 family
	if strings.HasPrefix(modelLower, "gpt-4") {
		if strings.Contains(modelLower, "turbo") {
			if config, exists := mc.models["gpt-4-turbo"]; exists {
				return config
			}
		} else if strings.Contains(modelLower, "gpt-4o-mini") {
			if config, exists := mc.models["gpt-4o-mini"]; exists {
				return config
			}
		} else if strings.Contains(modelLower, "gpt-4o") {
			if config, exists := mc.models["gpt-4o"]; exists {
				return config
			}
		}
		// Default GPT-4
		if config, exists := mc.models["gpt-4"]; exists {
			return config
		}
	}
	
	// Check GPT-3.5 family
	if strings.HasPrefix(modelLower, "gpt-3.5") {
		if config, exists := mc.models["gpt-3.5-turbo"]; exists {
			return config
		}
	}
	
	// Check Claude family
	if strings.HasPrefix(modelLower, "claude") {
		if config, exists := mc.models["claude-3"]; exists {
			return config
		}
	}
	
	// Return default configuration for unknown models
	return mc.models["default"]
}

// BuildCompatibleRequest builds a request with model-appropriate parameters
func (mc *ModelCompatibility) BuildCompatibleRequest(
	modelName string,
	messages []Message,
	maxTokens int,
	temperature float64,
	stream bool,
) ChatRequest {
	config := mc.GetModelConfig(modelName)
	
	request := ChatRequest{
		Model:    modelName,
		Messages: messages,
		Stream:   stream,
	}
	
	// Handle max tokens parameter
	if maxTokens > 0 {
		// Cap at model's limit if specified
		if config.MaxTokensLimit > 0 && maxTokens > config.MaxTokensLimit {
			maxTokens = config.MaxTokensLimit
		}
		
		if config.RequiresMaxCompletionTokens {
			request.MaxCompletionTokens = maxTokens
		} else {
			request.MaxTokens = maxTokens
		}
	}
	
	// Handle temperature parameter
	if config.SupportsCustomTemperature && temperature >= 0 {
		// Clamp temperature to model's supported range
		if temperature < config.MinTemperature {
			temperature = config.MinTemperature
		} else if temperature > config.MaxTemperature {
			temperature = config.MaxTemperature
		}
		request.Temperature = temperature
	}
	// If model doesn't support custom temperature, don't include it
	// (API will use the model's default)
	
	return request
}

// HandleAPIError attempts to fix request based on API error
func (mc *ModelCompatibility) HandleAPIError(
	err error,
	originalRequest ChatRequest,
) (*ChatRequest, bool) {
	errStr := err.Error()
	
	// Check for max_tokens error
	if strings.Contains(errStr, "max_tokens") && 
	   strings.Contains(errStr, "max_completion_tokens") {
		// Switch to max_completion_tokens
		fixedRequest := originalRequest
		fixedRequest.MaxCompletionTokens = originalRequest.MaxTokens
		fixedRequest.MaxTokens = 0
		return &fixedRequest, true
	}
	
	// Check for temperature error
	if strings.Contains(errStr, "temperature") && 
	   (strings.Contains(errStr, "does not support") || 
	    strings.Contains(errStr, "Only the default")) {
		// Remove temperature parameter
		fixedRequest := originalRequest
		fixedRequest.Temperature = 0 // Will be omitted in JSON with omitempty
		return &fixedRequest, true
	}
	
	// Check for reverse max_tokens error (less common)
	if strings.Contains(errStr, "max_completion_tokens") && 
	   strings.Contains(errStr, "max_tokens") &&
	   strings.Contains(errStr, "instead") {
		// Switch from max_completion_tokens to max_tokens
		fixedRequest := originalRequest
		fixedRequest.MaxTokens = originalRequest.MaxCompletionTokens
		fixedRequest.MaxCompletionTokens = 0
		return &fixedRequest, true
	}
	
	return nil, false
}

// GetModelInfo returns human-readable information about model capabilities
func (mc *ModelCompatibility) GetModelInfo(modelName string) string {
	config := mc.GetModelConfig(modelName)
	
	var info []string
	
	if config.RequiresMaxCompletionTokens {
		info = append(info, "Uses max_completion_tokens")
	} else {
		info = append(info, "Uses max_tokens")
	}
	
	if config.SupportsCustomTemperature {
		info = append(info, "Supports custom temperature")
	} else {
		info = append(info, "Fixed temperature (1.0)")
	}
	
	if config.MaxTokensLimit > 0 {
		info = append(info, fmt.Sprintf("Max tokens: %d", config.MaxTokensLimit))
	}
	
	return strings.Join(info, ", ")
}