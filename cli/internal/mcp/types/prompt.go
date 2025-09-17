package types

import "encoding/json"

// Prompt represents an MCP prompt template
type Prompt struct {
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	Arguments   json.RawMessage `json:"arguments,omitempty"`  // JSON Schema for arguments
}