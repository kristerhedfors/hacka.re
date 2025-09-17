package types

import "encoding/json"

// MCP Protocol Message Types

// InitializeRequest is sent by the client to initialize the connection
type InitializeRequest struct {
	ProtocolVersion string     `json:"protocolVersion"`
	ClientInfo      ClientInfo `json:"clientInfo"`
	Capabilities    Capabilities `json:"capabilities"`
}

// InitializeResponse is sent by the server in response to initialization
type InitializeResponse struct {
	ProtocolVersion string       `json:"protocolVersion"`
	ServerInfo      ServerInfo   `json:"serverInfo"`
	Capabilities    Capabilities `json:"capabilities"`
}

// ClientInfo contains information about the client
type ClientInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// ServerInfo contains information about the server
type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// Capabilities describes what features are supported
type Capabilities struct {
	Tools     *ToolsCapability     `json:"tools,omitempty"`
	Resources *ResourcesCapability `json:"resources,omitempty"`
	Prompts   *PromptsCapability   `json:"prompts,omitempty"`
}

// ToolsCapability indicates tool support
type ToolsCapability struct {
	Supported bool `json:"supported"`
}

// ResourcesCapability indicates resource support
type ResourcesCapability struct {
	Supported bool `json:"supported"`
}

// PromptsCapability indicates prompt support
type PromptsCapability struct {
	Supported bool `json:"supported"`
}

// ListToolsRequest requests the list of available tools
type ListToolsRequest struct{}

// ListToolsResponse contains the list of available tools
type ListToolsResponse struct {
	Tools []Tool `json:"tools"`
}

// CallToolRequest requests execution of a tool
type CallToolRequest struct {
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments,omitempty"`
}

// CallToolResponse contains the result of tool execution
type CallToolResponse struct {
	Content []Content `json:"content"`
}

// Content represents a piece of content (text, image, etc.)
type Content struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
	Data string `json:"data,omitempty"`  // Base64 encoded for binary
	MIME string `json:"mime,omitempty"`  // MIME type for binary content
}

// ListResourcesRequest requests the list of available resources
type ListResourcesRequest struct{}

// ListResourcesResponse contains the list of available resources
type ListResourcesResponse struct {
	Resources []Resource `json:"resources"`
}

// ReadResourceRequest requests reading a resource
type ReadResourceRequest struct {
	URI string `json:"uri"`
}

// ReadResourceResponse contains the resource content
type ReadResourceResponse struct {
	Content []Content `json:"content"`
}

// ListPromptsRequest requests the list of available prompts
type ListPromptsRequest struct{}

// ListPromptsResponse contains the list of available prompts
type ListPromptsResponse struct {
	Prompts []Prompt `json:"prompts"`
}

// GetPromptRequest requests a specific prompt
type GetPromptRequest struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments,omitempty"`
}

// GetPromptResponse contains the prompt result
type GetPromptResponse struct {
	Description string   `json:"description,omitempty"`
	Content     []Content `json:"content"`
}

// ProgressNotification is sent to report progress
type ProgressNotification struct {
	RequestID string  `json:"requestId"`
	Progress  float64 `json:"progress"`  // 0.0 to 1.0
	Message   string  `json:"message,omitempty"`
}

// LogNotification is sent for logging
type LogNotification struct {
	Level   string `json:"level"`   // "debug", "info", "warn", "error"
	Message string `json:"message"`
	Data    json.RawMessage `json:"data,omitempty"`
}