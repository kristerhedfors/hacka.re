package models

import (
	"sort"
	"strings"
	"time"
)

// ModelProvider represents an API provider
type ModelProvider string

const (
	ProviderOpenAI    ModelProvider = "openai"
	ProviderGroq      ModelProvider = "groq"
	ProviderBerget    ModelProvider = "berget"
	ProviderOllama    ModelProvider = "ollama"
	ProviderLlamafile ModelProvider = "llamafile"
	ProviderGPT4All   ModelProvider = "gpt4all"
	ProviderLMStudio  ModelProvider = "lmstudio"
	ProviderLocalAI   ModelProvider = "localai"
	ProviderCustom    ModelProvider = "custom"
)

// ModelMetadata contains information about a model
type ModelMetadata struct {
	ID              string         `json:"id"`
	Name            string         `json:"name"`
	Provider        ModelProvider  `json:"provider"`
	Created         int64          `json:"created"`
	OwnedBy         string         `json:"owned_by"`
	ContextWindow   int            `json:"context_window"`
	MaxTokens       int            `json:"max_tokens"`
	Description     string         `json:"description"`
	Category        string         `json:"category"` // "production", "preview", "legacy", "system"
	Capabilities    []string       `json:"capabilities"`
	PricingInput    float64        `json:"pricing_input"`  // per 1M tokens
	PricingOutput   float64        `json:"pricing_output"` // per 1M tokens
	IsDefault       bool           `json:"is_default"`
}

// ModelRegistry manages model metadata
type ModelRegistry struct {
	models        map[string]*ModelMetadata
	providerLists map[ModelProvider][]*ModelMetadata
	lastUpdated   time.Time
}

// NewModelRegistry creates a new model registry with default data
func NewModelRegistry() *ModelRegistry {
	r := &ModelRegistry{
		models:        make(map[string]*ModelMetadata),
		providerLists: make(map[ModelProvider][]*ModelMetadata),
		lastUpdated:   time.Now(),
	}
	r.loadDefaultModels()
	return r
}

// loadDefaultModels populates the registry with default model data
func (r *ModelRegistry) loadDefaultModels() {
	// OpenAI Models
	openAIModels := []*ModelMetadata{
		// GPT-5 Family
		{
			ID: "gpt-5-nano", Provider: ProviderOpenAI, Name: "GPT-5 Nano",
			ContextWindow: 128000, MaxTokens: 8192, Category: "production",
			Capabilities: []string{"chat", "functions", "vision"},
			Description: "Smallest GPT-5 model, optimized for speed",
			OwnedBy: "openai", IsDefault: true,
		},
		{
			ID: "gpt-5-mini", Provider: ProviderOpenAI, Name: "GPT-5 Mini",
			ContextWindow: 128000, MaxTokens: 8192, Category: "production",
			Capabilities: []string{"chat", "functions", "vision"},
			Description: "Small GPT-5 model with good balance",
			OwnedBy: "openai",
		},
		{
			ID: "gpt-5", Provider: ProviderOpenAI, Name: "GPT-5",
			ContextWindow: 128000, MaxTokens: 16384, Category: "production",
			Capabilities: []string{"chat", "functions", "vision", "analysis"},
			Description: "Most capable GPT-5 model",
			OwnedBy: "openai",
		},
		
		// GPT-4.1 Family
		{
			ID: "gpt-4.1-nano", Provider: ProviderOpenAI, Name: "GPT-4.1 Nano",
			ContextWindow: 1048576, MaxTokens: 4096, Category: "production",
			Capabilities: []string{"chat", "functions"},
			Description: "Ultra-long context nano model",
			OwnedBy: "openai",
		},
		{
			ID: "gpt-4.1-mini", Provider: ProviderOpenAI, Name: "GPT-4.1 Mini",
			ContextWindow: 1048576, MaxTokens: 8192, Category: "production",
			Capabilities: []string{"chat", "functions", "vision"},
			Description: "Ultra-long context mini model",
			OwnedBy: "openai",
		},
		{
			ID: "gpt-4.1", Provider: ProviderOpenAI, Name: "GPT-4.1",
			ContextWindow: 1048576, MaxTokens: 131072, Category: "production",
			Capabilities: []string{"chat", "functions", "vision", "analysis"},
			Description: "1M token context window model",
			OwnedBy: "openai",
		},
		
		// GPT-4o Family
		{
			ID: "gpt-4o", Provider: ProviderOpenAI, Name: "GPT-4o",
			ContextWindow: 128000, MaxTokens: 16384, Category: "production",
			Capabilities: []string{"chat", "functions", "vision", "audio"},
			Description: "Multimodal GPT-4 optimized model",
			OwnedBy: "openai", PricingInput: 2.50, PricingOutput: 10.00,
		},
		{
			ID: "gpt-4o-mini", Provider: ProviderOpenAI, Name: "GPT-4o Mini",
			ContextWindow: 128000, MaxTokens: 16384, Category: "production",
			Capabilities: []string{"chat", "functions", "vision"},
			Description: "Smaller, faster GPT-4o variant",
			OwnedBy: "openai", PricingInput: 0.15, PricingOutput: 0.60,
		},
		{
			ID: "gpt-4o-2024-08-06", Provider: ProviderOpenAI, Name: "GPT-4o (Aug 2024)",
			ContextWindow: 128000, MaxTokens: 16384, Category: "production",
			Capabilities: []string{"chat", "functions", "vision", "structured_outputs"},
			Description: "Latest GPT-4o with structured outputs",
			OwnedBy: "openai",
		},
		
		// GPT-4 Turbo
		{
			ID: "gpt-4-turbo", Provider: ProviderOpenAI, Name: "GPT-4 Turbo",
			ContextWindow: 128000, MaxTokens: 4096, Category: "production",
			Capabilities: []string{"chat", "functions", "vision"},
			Description: "GPT-4 with 128k context, faster responses",
			OwnedBy: "openai", PricingInput: 10.00, PricingOutput: 30.00,
		},
		{
			ID: "gpt-4-turbo-preview", Provider: ProviderOpenAI, Name: "GPT-4 Turbo Preview",
			ContextWindow: 128000, MaxTokens: 4096, Category: "preview",
			Capabilities: []string{"chat", "functions", "vision"},
			Description: "Preview of GPT-4 Turbo improvements",
			OwnedBy: "openai",
		},
		
		// GPT-4 Base
		{
			ID: "gpt-4", Provider: ProviderOpenAI, Name: "GPT-4",
			ContextWindow: 8192, MaxTokens: 8192, Category: "production",
			Capabilities: []string{"chat", "functions"},
			Description: "Original GPT-4 model",
			OwnedBy: "openai", PricingInput: 30.00, PricingOutput: 60.00,
		},
		{
			ID: "gpt-4-32k", Provider: ProviderOpenAI, Name: "GPT-4 32K",
			ContextWindow: 32768, MaxTokens: 8192, Category: "production",
			Capabilities: []string{"chat", "functions"},
			Description: "GPT-4 with extended context",
			OwnedBy: "openai", PricingInput: 60.00, PricingOutput: 120.00,
		},
		
		// GPT-3.5 Family
		{
			ID: "gpt-3.5-turbo", Provider: ProviderOpenAI, Name: "GPT-3.5 Turbo",
			ContextWindow: 16385, MaxTokens: 4096, Category: "production",
			Capabilities: []string{"chat", "functions"},
			Description: "Fast, efficient model for most tasks",
			OwnedBy: "openai", PricingInput: 0.50, PricingOutput: 1.50,
		},
		{
			ID: "gpt-3.5-turbo-0125", Provider: ProviderOpenAI, Name: "GPT-3.5 Turbo (Jan 2025)",
			ContextWindow: 16385, MaxTokens: 4096, Category: "production",
			Capabilities: []string{"chat", "functions"},
			Description: "Latest GPT-3.5 Turbo update",
			OwnedBy: "openai",
		},
		{
			ID: "gpt-3.5-turbo-instruct", Provider: ProviderOpenAI, Name: "GPT-3.5 Turbo Instruct",
			ContextWindow: 4096, MaxTokens: 4096, Category: "production",
			Capabilities: []string{"completion"},
			Description: "Completion model, not chat",
			OwnedBy: "openai",
		},
		
		// O1 Reasoning Models
		{
			ID: "o1", Provider: ProviderOpenAI, Name: "O1",
			ContextWindow: 200000, MaxTokens: 100000, Category: "preview",
			Capabilities: []string{"reasoning", "analysis", "math", "coding"},
			Description: "Advanced reasoning model",
			OwnedBy: "openai", PricingInput: 15.00, PricingOutput: 60.00,
		},
		{
			ID: "o1-mini", Provider: ProviderOpenAI, Name: "O1 Mini",
			ContextWindow: 128000, MaxTokens: 65536, Category: "preview",
			Capabilities: []string{"reasoning", "analysis", "math", "coding"},
			Description: "Faster reasoning model",
			OwnedBy: "openai", PricingInput: 3.00, PricingOutput: 12.00,
		},
		{
			ID: "o1-preview", Provider: ProviderOpenAI, Name: "O1 Preview",
			ContextWindow: 128000, MaxTokens: 32768, Category: "preview",
			Capabilities: []string{"reasoning", "analysis"},
			Description: "Preview of O1 reasoning capabilities",
			OwnedBy: "openai",
		},
		
		// Embedding Models
		{
			ID: "text-embedding-3-large", Provider: ProviderOpenAI, Name: "Embedding 3 Large",
			ContextWindow: 8192, Category: "system",
			Capabilities: []string{"embeddings"},
			Description: "Large embedding model with 3072 dimensions",
			OwnedBy: "openai", PricingInput: 0.13,
		},
		{
			ID: "text-embedding-3-small", Provider: ProviderOpenAI, Name: "Embedding 3 Small",
			ContextWindow: 8192, Category: "system",
			Capabilities: []string{"embeddings"},
			Description: "Small embedding model with 1536 dimensions",
			OwnedBy: "openai", PricingInput: 0.02,
		},
		{
			ID: "text-embedding-ada-002", Provider: ProviderOpenAI, Name: "Embedding Ada v2",
			ContextWindow: 8191, Category: "legacy",
			Capabilities: []string{"embeddings"},
			Description: "Legacy embedding model",
			OwnedBy: "openai", PricingInput: 0.10,
		},
		
		// Audio Models
		{
			ID: "whisper-1", Provider: ProviderOpenAI, Name: "Whisper v1",
			Category: "system",
			Capabilities: []string{"transcription", "translation"},
			Description: "Speech to text model",
			OwnedBy: "openai", PricingInput: 0.006, // per minute
		},
		{
			ID: "tts-1", Provider: ProviderOpenAI, Name: "TTS 1",
			Category: "system",
			Capabilities: []string{"text-to-speech"},
			Description: "Standard text to speech",
			OwnedBy: "openai", PricingInput: 15.00, // per 1M chars
		},
		{
			ID: "tts-1-hd", Provider: ProviderOpenAI, Name: "TTS 1 HD",
			Category: "system",
			Capabilities: []string{"text-to-speech"},
			Description: "High quality text to speech",
			OwnedBy: "openai", PricingInput: 30.00, // per 1M chars
		},
		
		// Image Models
		{
			ID: "dall-e-3", Provider: ProviderOpenAI, Name: "DALL-E 3",
			Category: "system",
			Capabilities: []string{"image-generation"},
			Description: "Latest image generation model",
			OwnedBy: "openai",
		},
		{
			ID: "dall-e-2", Provider: ProviderOpenAI, Name: "DALL-E 2",
			Category: "system",
			Capabilities: []string{"image-generation"},
			Description: "Previous generation image model",
			OwnedBy: "openai",
		},
	}
	
	// Groq Models
	groqModels := []*ModelMetadata{
		// Moonshot Kimi
		{
			ID: "moonshotai/kimi-k2-instruct", Provider: ProviderGroq,
			Name: "Kimi K2 Instruct", ContextWindow: 200000, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"chat", "analysis"},
			Description: "200K context Chinese-English model",
			OwnedBy: "Moonshot AI", IsDefault: true,
		},
		
		// Meta Llama Models
		{
			ID: "llama-3.3-70b-versatile", Provider: ProviderGroq,
			Name: "Llama 3.3 70B", ContextWindow: 128000, MaxTokens: 32768,
			Category: "production", Capabilities: []string{"chat", "coding"},
			Description: "Latest Llama 3.3 model",
			OwnedBy: "Meta",
		},
		{
			ID: "llama-3.1-70b-versatile", Provider: ProviderGroq,
			Name: "Llama 3.1 70B", ContextWindow: 128000, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"chat", "coding"},
			Description: "Llama 3.1 large model",
			OwnedBy: "Meta",
		},
		{
			ID: "llama-3.1-8b-instant", Provider: ProviderGroq,
			Name: "Llama 3.1 8B", ContextWindow: 128000, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"chat"},
			Description: "Fast Llama 3.1 model",
			OwnedBy: "Meta",
		},
		{
			ID: "llama3-70b-8192", Provider: ProviderGroq,
			Name: "Llama 3 70B", ContextWindow: 8192, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"chat"},
			Description: "Llama 3 large model",
			OwnedBy: "Meta",
		},
		{
			ID: "llama3-8b-8192", Provider: ProviderGroq,
			Name: "Llama 3 8B", ContextWindow: 8192, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"chat"},
			Description: "Llama 3 small model",
			OwnedBy: "Meta",
		},
		{
			ID: "llama-guard-3-8b", Provider: ProviderGroq,
			Name: "Llama Guard 3 8B", ContextWindow: 8192, MaxTokens: 8192,
			Category: "system", Capabilities: []string{"moderation"},
			Description: "Content moderation model",
			OwnedBy: "Meta",
		},
		
		// Mixtral Models
		{
			ID: "mixtral-8x7b-32768", Provider: ProviderGroq,
			Name: "Mixtral 8x7B", ContextWindow: 32768, MaxTokens: 32768,
			Category: "production", Capabilities: []string{"chat", "coding"},
			Description: "Mixture of experts model",
			OwnedBy: "Mistral AI",
		},
		
		// Google Gemma
		{
			ID: "gemma2-9b-it", Provider: ProviderGroq,
			Name: "Gemma 2 9B", ContextWindow: 8192, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"chat"},
			Description: "Google's Gemma 2 model",
			OwnedBy: "Google",
		},
		{
			ID: "gemma-7b-it", Provider: ProviderGroq,
			Name: "Gemma 7B", ContextWindow: 8192, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"chat"},
			Description: "Google's Gemma model",
			OwnedBy: "Google",
		},
		
		// DeepSeek Models
		{
			ID: "deepseek-r1-distill-llama-70b", Provider: ProviderGroq,
			Name: "DeepSeek R1 Distill 70B", ContextWindow: 128000, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"chat", "reasoning"},
			Description: "DeepSeek R1 distilled model",
			OwnedBy: "DeepSeek",
		},
		
		// Whisper (Audio)
		{
			ID: "whisper-large-v3-turbo", Provider: ProviderGroq,
			Name: "Whisper Large v3 Turbo", Category: "system",
			Capabilities: []string{"transcription"},
			Description: "Fast speech recognition",
			OwnedBy: "OpenAI",
		},
		{
			ID: "whisper-large-v3", Provider: ProviderGroq,
			Name: "Whisper Large v3", Category: "system",
			Capabilities: []string{"transcription"},
			Description: "High quality speech recognition",
			OwnedBy: "OpenAI",
		},
	}
	
	// Berget Models
	bergetModels := []*ModelMetadata{
		// Mistral Magistral
		{
			ID: "mistralai/Magistral-Small-2506", Provider: ProviderBerget,
			Name: "Magistral Small", ContextWindow: 128000, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"chat", "functions"},
			Description: "Mistral's Magistral Small model",
			OwnedBy: "Mistral AI", IsDefault: true,
		},
		{
			ID: "mistralai/Magistral-Medium-2506", Provider: ProviderBerget,
			Name: "Magistral Medium", ContextWindow: 128000, MaxTokens: 16384,
			Category: "production", Capabilities: []string{"chat", "functions", "analysis"},
			Description: "Mistral's Magistral Medium model",
			OwnedBy: "Mistral AI",
		},
		
		// Mistral Devstral
		{
			ID: "mistralai/Devstral-Small-2507", Provider: ProviderBerget,
			Name: "Devstral Small", ContextWindow: 131072, MaxTokens: 8192,
			Category: "production", Capabilities: []string{"coding", "chat"},
			Description: "Code-focused Mistral model",
			OwnedBy: "Mistral AI",
		},
		{
			ID: "mistralai/Devstral-Medium-2507", Provider: ProviderBerget,
			Name: "Devstral Medium", ContextWindow: 131072, MaxTokens: 16384,
			Category: "production", Capabilities: []string{"coding", "chat", "analysis"},
			Description: "Larger code-focused model",
			OwnedBy: "Mistral AI",
		},
		
		// Embeddings
		{
			ID: "intfloat/multilingual-e5-large-instruct", Provider: ProviderBerget,
			Name: "E5 Large Multilingual", ContextWindow: 8192,
			Category: "system", Capabilities: []string{"embeddings"},
			Description: "Multilingual embedding model",
			OwnedBy: "Intfloat",
		},
	}
	
	// Add all models to registry
	for _, model := range openAIModels {
		r.AddModel(model)
	}
	for _, model := range groqModels {
		r.AddModel(model)
	}
	for _, model := range bergetModels {
		r.AddModel(model)
	}
}

// AddModel adds a model to the registry
func (r *ModelRegistry) AddModel(model *ModelMetadata) {
	r.models[model.ID] = model
	
	if r.providerLists[model.Provider] == nil {
		r.providerLists[model.Provider] = []*ModelMetadata{}
	}
	r.providerLists[model.Provider] = append(r.providerLists[model.Provider], model)
}

// GetModel returns a model by ID
func (r *ModelRegistry) GetModel(id string) (*ModelMetadata, bool) {
	model, exists := r.models[id]
	return model, exists
}

// GetProviderModels returns all models for a provider
func (r *ModelRegistry) GetProviderModels(provider ModelProvider) []*ModelMetadata {
	models := r.providerLists[provider]
	
	// Sort models by category and name
	sort.Slice(models, func(i, j int) bool {
		// Category order: production > preview > legacy > system
		categoryOrder := map[string]int{
			"production": 0,
			"preview":    1,
			"legacy":     2,
			"system":     3,
		}
		
		orderI := categoryOrder[models[i].Category]
		orderJ := categoryOrder[models[j].Category]
		
		if orderI != orderJ {
			return orderI < orderJ
		}
		
		// Within same category, sort by name
		return models[i].Name < models[j].Name
	})
	
	return models
}

// GetDefaultModel returns the default model for a provider
func (r *ModelRegistry) GetDefaultModel(provider ModelProvider) *ModelMetadata {
	models := r.providerLists[provider]
	
	for _, model := range models {
		if model.IsDefault {
			return model
		}
	}
	
	// Return first production model if no default set
	for _, model := range models {
		if model.Category == "production" {
			return model
		}
	}
	
	// Return first model if no production models
	if len(models) > 0 {
		return models[0]
	}
	
	return nil
}

// SearchModels searches for models by query
func (r *ModelRegistry) SearchModels(query string) []*ModelMetadata {
	query = strings.ToLower(query)
	var results []*ModelMetadata
	
	for _, model := range r.models {
		if strings.Contains(strings.ToLower(model.ID), query) ||
		   strings.Contains(strings.ToLower(model.Name), query) ||
		   strings.Contains(strings.ToLower(model.Description), query) {
			results = append(results, model)
		}
	}
	
	return results
}

// GetAllModels returns all models in the registry
func (r *ModelRegistry) GetAllModels() []*ModelMetadata {
	var models []*ModelMetadata
	for _, model := range r.models {
		models = append(models, model)
	}
	
	// Sort by provider and category
	sort.Slice(models, func(i, j int) bool {
		if models[i].Provider != models[j].Provider {
			return models[i].Provider < models[j].Provider
		}
		
		categoryOrder := map[string]int{
			"production": 0,
			"preview":    1,
			"legacy":     2,
			"system":     3,
		}
		
		orderI := categoryOrder[models[i].Category]
		orderJ := categoryOrder[models[j].Category]
		
		if orderI != orderJ {
			return orderI < orderJ
		}
		
		return models[i].Name < models[j].Name
	})
	
	return models
}

// GetProductionModels returns only production-ready models
func (r *ModelRegistry) GetProductionModels() []*ModelMetadata {
	var models []*ModelMetadata
	for _, model := range r.models {
		if model.Category == "production" {
			models = append(models, model)
		}
	}
	return models
}

// GetChatModels returns only models with chat capability
func (r *ModelRegistry) GetChatModels() []*ModelMetadata {
	var models []*ModelMetadata
	for _, model := range r.models {
		for _, cap := range model.Capabilities {
			if cap == "chat" {
				models = append(models, model)
				break
			}
		}
	}
	return models
}