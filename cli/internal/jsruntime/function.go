package jsruntime

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// Function represents a JavaScript function with metadata
type Function struct {
	Name        string                 `json:"name"`
	Code        string                 `json:"code"`
	Description string                 `json:"description"`
	Parameters  []Parameter            `json:"parameters,omitempty"`
	Returns     string                 `json:"returns,omitempty"`
	IsCallable  bool                   `json:"callable"`
	IsTool      bool                   `json:"tool"`
	GroupID     string                 `json:"groupId,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// Parameter represents a function parameter
type Parameter struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Required    bool   `json:"required"`
}

// ParseFunction extracts function metadata from JavaScript code with JSDoc comments
func ParseFunction(code string) (*Function, error) {
	fn := &Function{
		Code:     code,
		Metadata: make(map[string]interface{}),
	}

	// Extract function name
	nameRegex := regexp.MustCompile(`(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(`)
	if matches := nameRegex.FindStringSubmatch(code); len(matches) > 1 {
		fn.Name = matches[1]
	} else {
		// Try arrow function or other patterns
		arrowRegex := regexp.MustCompile(`(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(`)
		if matches := arrowRegex.FindStringSubmatch(code); len(matches) > 1 {
			fn.Name = matches[1]
		}
	}

	if fn.Name == "" {
		return nil, fmt.Errorf("could not extract function name from code")
	}

	// Parse JSDoc comments - use DOTALL flag to match across lines
	jsdocRegex := regexp.MustCompile(`(?s)/\*\*(.*?)\*/`)
	if matches := jsdocRegex.FindStringSubmatch(code); len(matches) > 1 {
		jsdoc := matches[1]

		// Parse description
		descRegex := regexp.MustCompile(`\*\s*@description\s+(.+)`)
		if matches := descRegex.FindStringSubmatch(jsdoc); len(matches) > 1 {
			fn.Description = strings.TrimSpace(matches[1])
		} else {
			// Try to get description from first non-tag line
			lines := strings.Split(jsdoc, "\n")
			for _, line := range lines {
				line = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), "*"))
				if line != "" && !strings.HasPrefix(line, "@") {
					fn.Description = line
					break
				}
			}
		}

		// Parse parameters
		paramRegex := regexp.MustCompile(`\*\s*@param\s+\{([^}]+)\}\s+(\w+)\s*-?\s*(.*)`)
		paramMatches := paramRegex.FindAllStringSubmatch(jsdoc, -1)
		for _, match := range paramMatches {
			if len(match) > 3 {
				param := Parameter{
					Type:        strings.TrimSpace(match[1]),
					Name:        strings.TrimSpace(match[2]),
					Description: strings.TrimSpace(match[3]),
					Required:    true, // Default to required
				}

				// Check if optional (has ? in type)
				if strings.Contains(param.Type, "?") {
					param.Required = false
					param.Type = strings.ReplaceAll(param.Type, "?", "")
				}

				fn.Parameters = append(fn.Parameters, param)
			}
		}

		// Parse return type
		returnRegex := regexp.MustCompile(`\*\s*@returns?\s+\{([^}]+)\}\s*(.*)`)
		if matches := returnRegex.FindStringSubmatch(jsdoc); len(matches) > 1 {
			fn.Returns = strings.TrimSpace(matches[1])
		}

		// Check for @callable tag
		if strings.Contains(jsdoc, "@callable") {
			fn.IsCallable = true
		}

		// Check for @tool tag
		if strings.Contains(jsdoc, "@tool") {
			fn.IsTool = true
		}
	}

	// Default to callable if no explicit tags
	if !fn.IsCallable && !fn.IsTool {
		fn.IsCallable = true
	}

	return fn, nil
}

// ToToolDefinition converts the function to an OpenAI-compatible tool definition
func (f *Function) ToToolDefinition() map[string]interface{} {
	// Build parameters schema
	properties := make(map[string]interface{})
	required := []string{}

	for _, param := range f.Parameters {
		paramSchema := map[string]interface{}{
			"type":        convertJSTypeToJSONSchema(param.Type),
			"description": param.Description,
		}
		properties[param.Name] = paramSchema

		if param.Required {
			required = append(required, param.Name)
		}
	}

	// Build tool definition
	toolDef := map[string]interface{}{
		"type": "function",
		"function": map[string]interface{}{
			"name":        f.Name,
			"description": f.Description,
			"parameters": map[string]interface{}{
				"type":       "object",
				"properties": properties,
				"required":   required,
			},
		},
	}

	return toolDef
}

// convertJSTypeToJSONSchema converts JavaScript types to JSON Schema types
func convertJSTypeToJSONSchema(jsType string) string {
	jsType = strings.ToLower(strings.TrimSpace(jsType))

	switch jsType {
	case "string":
		return "string"
	case "number", "int", "integer", "float", "double":
		return "number"
	case "boolean", "bool":
		return "boolean"
	case "array":
		return "array"
	case "object":
		return "object"
	default:
		// Default to string for unknown types
		return "string"
	}
}

// Validate checks if the function is valid and can be executed
func (f *Function) Validate() error {
	if f.Name == "" {
		return fmt.Errorf("function name is required")
	}

	if f.Code == "" {
		return fmt.Errorf("function code is required")
	}

	// Try to parse the function to check syntax
	engine := NewEngine()
	_, err := engine.Execute(f.Code)
	if err != nil {
		return fmt.Errorf("invalid JavaScript syntax: %w", err)
	}

	return nil
}

// Execute runs the function with the given arguments
func (f *Function) Execute(args map[string]interface{}) (interface{}, error) {
	engine := NewEngine()
	return engine.ExecuteFunction(f.Code, f.Name, args)
}

// ToJSON serializes the function to JSON
func (f *Function) ToJSON() ([]byte, error) {
	return json.MarshalIndent(f, "", "  ")
}

// FromJSON deserializes a function from JSON
func FromJSON(data []byte) (*Function, error) {
	var fn Function
	if err := json.Unmarshal(data, &fn); err != nil {
		return nil, err
	}
	return &fn, nil
}