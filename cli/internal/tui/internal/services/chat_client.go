package services

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// ChatClient handles API communication for chat
type ChatClient struct {
	config *core.ConfigManager
	client *http.Client
}

// NewChatClient creates a new chat client
func NewChatClient(config *core.ConfigManager) *ChatClient {
	return &ChatClient{
		config: config,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// StreamingCallback is called for each chunk of streaming response
type StreamingCallback func(chunk string, done bool) error

// ChatRequest represents a chat completion request
type ChatRequest struct {
	Model               string         `json:"model"`
	Messages            []ChatMessage  `json:"messages"`
	Temperature         float32        `json:"temperature,omitempty"`
	MaxTokens           int           `json:"max_tokens,omitempty"`
	MaxCompletionTokens int           `json:"max_completion_tokens,omitempty"`
	Stream             bool          `json:"stream"`
	TopP               float32       `json:"top_p,omitempty"`
	FrequencyPenalty   float32       `json:"frequency_penalty,omitempty"`
	PresencePenalty    float32       `json:"presence_penalty,omitempty"`
}

// ChatMessage represents a message in the chat
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// StreamCompletion sends a streaming chat completion request
func (c *ChatClient) StreamCompletion(messages []ChatMessage, callback StreamingCallback) error {
	config := c.config.Get()

	// Log start of streaming
	if log := logger.Get(); log != nil {
		log.Info("[ChatClient] Starting streaming completion")
		log.Debug("[ChatClient] Provider: %s, Model: %s, Messages: %d", config.Provider, config.Model, len(messages))
	}

	// Build the request with model-specific compatibility
	reqBody := c.buildCompatibleRequest(config, messages)

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		if log := logger.Get(); log != nil {
			log.Error("[ChatClient] Failed to marshal request: %v", err)
		}
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	// Determine the API endpoint
	apiURL := c.getAPIEndpoint(config)

	// Create the request
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")

	// Set authentication based on provider
	switch config.Provider {
	case "openai", "groq":
		req.Header.Set("Authorization", "Bearer "+config.APIKey)
	case "anthropic":
		req.Header.Set("x-api-key", config.APIKey)
		req.Header.Set("anthropic-version", "2023-06-01")
	case "ollama":
		// Ollama doesn't require authentication
	default:
		// Custom provider - use Bearer token if API key is provided
		if config.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+config.APIKey)
		}
	}

	// Log request details
	if log := logger.Get(); log != nil {
		log.Debug("[ChatClient] Sending request to: %s", apiURL)
	}

	// Send the request
	resp, err := c.client.Do(req)
	if err != nil {
		if log := logger.Get(); log != nil {
			log.Error("[ChatClient] Failed to send request: %v", err)
		}
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		if log := logger.Get(); log != nil {
			log.Error("[ChatClient] API error (status %d): %s", resp.StatusCode, string(body))
		}
		return fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	if log := logger.Get(); log != nil {
		log.Info("[ChatClient] Streaming response started (status %d)", resp.StatusCode)
	}

	// Handle streaming response
	scanner := bufio.NewScanner(resp.Body)
	chunkCount := 0
	totalContent := 0

	for scanner.Scan() {
		line := scanner.Text()

		// Skip empty lines
		if line == "" {
			continue
		}

		// Parse SSE format
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")

			// Check for end of stream
			if data == "[DONE]" {
				if log := logger.Get(); log != nil {
					log.Info("[ChatClient] Stream complete - chunks: %d, total chars: %d", chunkCount, totalContent)
				}
				callback("", true)
				break
			}

			// Parse the JSON chunk
			var chunk map[string]interface{}
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				if log := logger.Get(); log != nil {
					log.Debug("[ChatClient] Skipping malformed chunk: %v", err)
				}
				continue // Skip malformed chunks
			}

			// Extract content based on provider format
			content := c.extractContent(chunk, config.Provider)
			if content != "" {
				chunkCount++
				totalContent += len(content)
				if err := callback(content, false); err != nil {
					if log := logger.Get(); log != nil {
						log.Error("[ChatClient] Callback error: %v", err)
					}
					return err
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		if log := logger.Get(); log != nil {
			log.Error("[ChatClient] Error reading stream: %v", err)
		}
		return fmt.Errorf("error reading stream: %w", err)
	}

	if log := logger.Get(); log != nil {
		log.Info("[ChatClient] Streaming completed successfully")
	}

	return nil
}

// extractContent extracts content from a streaming chunk based on provider
func (c *ChatClient) extractContent(chunk map[string]interface{}, provider string) string {
	switch provider {
	case "anthropic":
		// Anthropic format: {"delta": {"text": "..."}}
		if delta, ok := chunk["delta"].(map[string]interface{}); ok {
			if text, ok := delta["text"].(string); ok {
				return text
			}
		}

	default:
		// OpenAI format (used by most providers): {"choices": [{"delta": {"content": "..."}}]}
		if choices, ok := chunk["choices"].([]interface{}); ok && len(choices) > 0 {
			if choice, ok := choices[0].(map[string]interface{}); ok {
				if delta, ok := choice["delta"].(map[string]interface{}); ok {
					if content, ok := delta["content"].(string); ok {
						return content
					}
				}
			}
		}
	}

	return ""
}

// buildCompatibleRequest builds a request with model-specific compatibility
func (c *ChatClient) buildCompatibleRequest(config *core.Config, messages []ChatMessage) ChatRequest {
	modelName := strings.ToLower(config.Model)

	// Base request
	req := ChatRequest{
		Model:    config.Model,
		Messages: messages,
		Stream:   true,
	}

	// Handle model-specific quirks
	if strings.Contains(modelName, "gpt-5-nano") || strings.Contains(modelName, "gpt-4.1-nano") {
		// These models require max_completion_tokens instead of max_tokens
		// and only support temperature = 1.0
		if config.MaxTokens > 0 {
			req.MaxCompletionTokens = config.MaxTokens
			if req.MaxCompletionTokens > 8192 {
				req.MaxCompletionTokens = 8192
			}
		} else {
			req.MaxCompletionTokens = 2048 // Default
		}
		// Don't set temperature for these models (they only accept 1.0)

	} else if strings.Contains(modelName, "gpt-5-mini") || strings.Contains(modelName, "gpt-4.1-mini") {
		// These models also require max_completion_tokens
		if config.MaxTokens > 0 {
			req.MaxCompletionTokens = config.MaxTokens
			if req.MaxCompletionTokens > 8192 {
				req.MaxCompletionTokens = 8192
			}
		} else {
			req.MaxCompletionTokens = 2048 // Default
		}
		// gpt-5-mini doesn't support custom temperature, gpt-4.1-mini does
		if strings.Contains(modelName, "gpt-4.1-mini") {
			req.Temperature = float32(config.Temperature)
		}

	} else if strings.HasPrefix(modelName, "gpt-5") {
		// Regular GPT-5 models use max_completion_tokens
		if config.MaxTokens > 0 {
			req.MaxCompletionTokens = config.MaxTokens
			if req.MaxCompletionTokens > 16384 {
				req.MaxCompletionTokens = 16384
			}
		} else {
			req.MaxCompletionTokens = 2048 // Default
		}
		req.Temperature = float32(config.Temperature)

	} else if strings.HasPrefix(modelName, "gpt-4.1") {
		// GPT-4.1 models use max_completion_tokens
		if config.MaxTokens > 0 {
			req.MaxCompletionTokens = config.MaxTokens
			if req.MaxCompletionTokens > 8192 {
				req.MaxCompletionTokens = 8192
			}
		} else {
			req.MaxCompletionTokens = 2048 // Default
		}
		req.Temperature = float32(config.Temperature)

	} else {
		// Other models (GPT-4, GPT-3.5, etc.) use traditional max_tokens
		if config.MaxTokens > 0 {
			req.MaxTokens = config.MaxTokens
		}
		req.Temperature = float32(config.Temperature)
	}

	return req
}

// getAPIEndpoint returns the appropriate API endpoint based on provider
func (c *ChatClient) getAPIEndpoint(config *core.Config) string {
	// Use the same logic as our working API client
	// Just append /chat/completions to the base URL
	baseURL := strings.TrimSuffix(config.BaseURL, "/")

	switch config.Provider {
	case "openai", "groq":
		// For OpenAI and Groq, BaseURL already includes /v1
		return baseURL + "/chat/completions"

	case "anthropic":
		// Anthropic uses /messages endpoint
		return baseURL + "/messages"

	case "ollama":
		if baseURL == "" {
			baseURL = "http://localhost:11434"
		}
		return baseURL + "/api/chat"

	default:
		// Custom provider - assume OpenAI-compatible
		return baseURL + "/chat/completions"
	}
}

// SendMessage sends a non-streaming message and returns the response
func (c *ChatClient) SendMessage(messages []ChatMessage) (string, error) {
	var fullResponse strings.Builder

	err := c.StreamCompletion(messages, func(chunk string, done bool) error {
		if !done {
			fullResponse.WriteString(chunk)
		}
		return nil
	})

	if err != nil {
		return "", err
	}

	return fullResponse.String(), nil
}