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

	"github.com/hacka-re/tui/internal/core"
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
	Model            string         `json:"model"`
	Messages         []ChatMessage  `json:"messages"`
	Temperature      float32        `json:"temperature,omitempty"`
	MaxTokens        int           `json:"max_tokens,omitempty"`
	Stream          bool          `json:"stream"`
	TopP            float32       `json:"top_p,omitempty"`
	FrequencyPenalty float32       `json:"frequency_penalty,omitempty"`
	PresencePenalty  float32       `json:"presence_penalty,omitempty"`
}

// ChatMessage represents a message in the chat
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// StreamCompletion sends a streaming chat completion request
func (c *ChatClient) StreamCompletion(messages []ChatMessage, callback StreamingCallback) error {
	config := c.config.Get()

	// Build the request
	reqBody := ChatRequest{
		Model:       config.Model,
		Messages:    messages,
		Temperature: float32(config.Temperature),
		MaxTokens:   config.MaxTokens,
		Stream:      true,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
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

	// Send the request
	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Handle streaming response
	scanner := bufio.NewScanner(resp.Body)
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
				callback("", true)
				break
			}

			// Parse the JSON chunk
			var chunk map[string]interface{}
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				continue // Skip malformed chunks
			}

			// Extract content based on provider format
			content := c.extractContent(chunk, config.Provider)
			if content != "" {
				if err := callback(content, false); err != nil {
					return err
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading stream: %w", err)
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

// getAPIEndpoint returns the appropriate API endpoint based on provider
func (c *ChatClient) getAPIEndpoint(config *core.Config) string {
	switch config.Provider {
	case "openai":
		if config.BaseURL != "" {
			return config.BaseURL + "/v1/chat/completions"
		}
		return "https://api.openai.com/v1/chat/completions"

	case "anthropic":
		if config.BaseURL != "" {
			return config.BaseURL + "/v1/messages"
		}
		return "https://api.anthropic.com/v1/messages"

	case "groq":
		if config.BaseURL != "" {
			return config.BaseURL + "/openai/v1/chat/completions"
		}
		return "https://api.groq.com/openai/v1/chat/completions"

	case "ollama":
		baseURL := config.BaseURL
		if baseURL == "" {
			baseURL = "http://localhost:11434"
		}
		return baseURL + "/api/chat"

	default:
		// Custom provider
		if config.BaseURL != "" {
			// Assume OpenAI-compatible endpoint
			if strings.Contains(config.BaseURL, "/v1/chat/completions") {
				return config.BaseURL
			}
			return config.BaseURL + "/v1/chat/completions"
		}
		return ""
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