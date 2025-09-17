package types

import "encoding/json"

// Tool represents an MCP tool definition
type Tool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"inputSchema"`  // JSON Schema for parameters
}

// ToolInputSchema represents the JSON Schema for tool parameters
type ToolInputSchema struct {
	Type       string                    `json:"type"`
	Properties map[string]PropertySchema `json:"properties"`
	Required   []string                  `json:"required,omitempty"`
}

// PropertySchema represents a property in a JSON Schema
type PropertySchema struct {
	Type        string      `json:"type"`
	Description string      `json:"description,omitempty"`
	Enum        []string    `json:"enum,omitempty"`
	Default     interface{} `json:"default,omitempty"`
	Minimum     *float64    `json:"minimum,omitempty"`
	Maximum     *float64    `json:"maximum,omitempty"`
	MinLength   *int        `json:"minLength,omitempty"`
	MaxLength   *int        `json:"maxLength,omitempty"`
	Pattern     string      `json:"pattern,omitempty"`
}

// ToolHandler is a function that executes a tool
type ToolHandler func(arguments json.RawMessage) ([]Content, error)

// ToolRegistry manages available tools
type ToolRegistry struct {
	tools    map[string]*Tool
	handlers map[string]ToolHandler
}

// NewToolRegistry creates a new tool registry
func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{
		tools:    make(map[string]*Tool),
		handlers: make(map[string]ToolHandler),
	}
}

// RegisterTool registers a new tool
func (r *ToolRegistry) RegisterTool(tool *Tool, handler ToolHandler) {
	r.tools[tool.Name] = tool
	r.handlers[tool.Name] = handler
}

// GetTool retrieves a tool by name
func (r *ToolRegistry) GetTool(name string) (*Tool, bool) {
	tool, exists := r.tools[name]
	return tool, exists
}

// GetHandler retrieves a tool handler by name
func (r *ToolRegistry) GetHandler(name string) (ToolHandler, bool) {
	handler, exists := r.handlers[name]
	return handler, exists
}

// ListTools returns all registered tools
func (r *ToolRegistry) ListTools() []Tool {
	tools := make([]Tool, 0, len(r.tools))
	for _, tool := range r.tools {
		tools = append(tools, *tool)
	}
	return tools
}

// ExecuteTool executes a tool by name with given arguments
func (r *ToolRegistry) ExecuteTool(name string, arguments json.RawMessage) ([]Content, error) {
	handler, exists := r.handlers[name]
	if !exists {
		return nil, &ToolError{Code: ToolNotFound, Message: "Tool not found: " + name}
	}
	return handler(arguments)
}

// ToolError represents an error during tool execution
type ToolError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (e *ToolError) Error() string {
	return e.Message
}

// Tool error codes
const (
	ToolNotFound     = 404
	ToolInvalidInput = 400
	ToolExecutionError = 500
)