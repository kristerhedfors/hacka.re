package api

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
)

// Client represents an OpenAI-compatible API client
type Client struct {
	config          *config.Config
	httpClient      *http.Client
	modelCompat     *ModelCompatibility
}

// NewClient creates a new API client
func NewClient(cfg *config.Config) *Client {
	logger.Get().Info("Creating new API client")
	logger.Get().Debug("Config - Provider: %s, BaseURL: %s, Model: %s",
		cfg.Provider, cfg.BaseURL, cfg.Model)

	return &Client{
		config: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		modelCompat: NewModelCompatibility(),
	}
}

// Message represents a chat message
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest represents a chat completion request
type ChatRequest struct {
	Model               string    `json:"model"`
	Messages            []Message `json:"messages"`
	MaxTokens           int       `json:"max_tokens,omitempty"`
	MaxCompletionTokens int       `json:"max_completion_tokens,omitempty"`
	Temperature         float64   `json:"temperature,omitempty"`
	Stream              bool      `json:"stream,omitempty"`
}

// ChatResponse represents a chat completion response
type ChatResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int     `json:"index"`
		Message Message `json:"message"`
		Delta   Message `json:"delta,omitempty"` // For streaming
		FinishReason string `json:"finish_reason,omitempty"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage,omitempty"`
	Error *APIError `json:"error,omitempty"`
}

// APIError represents an API error
type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

// StreamCallback is called for each chunk in a streaming response
type StreamCallback func(chunk string) error

// SendChatCompletion sends a chat completion request
func (c *Client) SendChatCompletion(messages []Message, streamCallback StreamCallback) (*ChatResponse, error) {
	logger.Get().Debug("SendChatCompletion called with %d messages", len(messages))

	// Build request with model-appropriate parameters
	request := c.modelCompat.BuildCompatibleRequest(
		c.config.Model,
		messages,
		c.config.MaxTokens,
		c.config.Temperature,
		c.config.StreamResponse && streamCallback != nil,
	)

	logger.Get().Debug("Request parameters: model=%s, maxTokens=%d, temperature=%f, stream=%v",
		request.Model, request.MaxTokens, request.Temperature, request.Stream)

	// First attempt
	response, err := c.sendRequestWithRetry(request, messages, streamCallback)
	if err != nil {
		logger.Get().Error("API request failed: %v", err)
		// Try to fix the request based on the error
		if fixedRequest, canRetry := c.modelCompat.HandleAPIError(err, request); canRetry {
			// Log the retry attempt
			logger.Get().Info("Retrying with adjusted parameters")
			fmt.Fprintf(os.Stderr, "\n[Retrying with adjusted parameters...]\n")
			return c.sendRequestWithRetry(*fixedRequest, messages, streamCallback)
		}
	}

	return response, err
}

// sendRequestWithRetry sends the actual request
func (c *Client) sendRequestWithRetry(request ChatRequest, messages []Message, streamCallback StreamCallback) (*ChatResponse, error) {
	// Marshal request
	body, err := json.Marshal(request)
	if err != nil {
		logger.Get().Error("Failed to marshal request: %v", err)
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	logger.Get().Debug("Request body: %s", string(body))

	// Create HTTP request
	url := strings.TrimSuffix(c.config.BaseURL, "/") + "/chat/completions"
	logger.Get().Info("API URL: %s", url)
	logger.Get().Debug("Base URL from config: %s", c.config.BaseURL)

	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		logger.Get().Error("Failed to create request: %v", err)
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	if c.config.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
		logger.Get().Debug("API Key set (length: %d)", len(c.config.APIKey))
	} else {
		logger.Get().Warn("No API key configured")
	}

	logger.Get().Debug("Request headers: %v", req.Header)

	// Send request
	logger.Get().Info("Sending HTTP request to: %s", url)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		logger.Get().Error("HTTP request failed: %v", err)
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	logger.Get().Info("Response status code: %d", resp.StatusCode)
	logger.Get().Debug("Response headers: %v", resp.Header)

	// Check status code
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		logger.Get().Error("API error (status %d): %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Handle streaming response
	if request.Stream {
		return c.handleStreamingResponse(resp.Body, streamCallback)
	}

	// Handle regular response
	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if chatResp.Error != nil {
		return nil, fmt.Errorf("API error: %s", chatResp.Error.Message)
	}

	return &chatResp, nil
}

// handleStreamingResponse handles a streaming response
func (c *Client) handleStreamingResponse(body io.Reader, callback StreamCallback) (*ChatResponse, error) {
	scanner := bufio.NewScanner(body)
	var fullContent strings.Builder
	var lastResponse *ChatResponse

	for scanner.Scan() {
		line := scanner.Text()
		
		// Skip empty lines
		if line == "" {
			continue
		}

		// Check for data prefix
		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		// Extract JSON data
		data := strings.TrimPrefix(line, "data: ")
		
		// Check for end of stream
		if data == "[DONE]" {
			break
		}

		// Parse chunk
		var chunk ChatResponse
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			// Skip invalid chunks
			continue
		}

		// Extract content from delta
		if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
			content := chunk.Choices[0].Delta.Content
			fullContent.WriteString(content)
			
			// Call callback with chunk
			if callback != nil {
				if err := callback(content); err != nil {
					return nil, err
				}
			}
		}

		lastResponse = &chunk
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading stream: %w", err)
	}

	// Build final response
	if lastResponse != nil && fullContent.Len() > 0 {
		lastResponse.Choices[0].Message.Content = fullContent.String()
		return lastResponse, nil
	}

	return nil, errors.New("no content received from stream")
}

// ListModels lists available models
func (c *Client) ListModels() ([]string, error) {
	url := strings.TrimSuffix(c.config.BaseURL, "/") + "/models"
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if c.config.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Some providers don't support model listing
		return []string{c.config.Model}, nil
	}

	var modelsResp struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&modelsResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	models := make([]string, len(modelsResp.Data))
	for i, model := range modelsResp.Data {
		models[i] = model.ID
	}

	return models, nil
}

// TestConnection tests the API connection
func (c *Client) TestConnection() error {
	// Try a simple completion with minimal tokens
	messages := []Message{
		{Role: "user", Content: "Hi"},
	}

	// Temporarily reduce max tokens for test
	oldMaxTokens := c.config.MaxTokens
	c.config.MaxTokens = 5
	defer func() { c.config.MaxTokens = oldMaxTokens }()

	_, err := c.SendChatCompletion(messages, nil)
	return err
}

// GetModelInfo returns information about the current model's capabilities
func (c *Client) GetModelInfo() string {
	return c.modelCompat.GetModelInfo(c.config.Model)
}