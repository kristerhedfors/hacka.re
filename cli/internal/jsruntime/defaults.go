package jsruntime

import (
	_ "embed"
	"fmt"
	"regexp"
)

// Embedded default functions
// These match the JavaScript default functions from the web app

//go:embed defaults/rc4.js
var defaultRC4Functions string

//go:embed defaults/math.js
var defaultMathFunctions string

// DefaultFunctionGroup represents a group of related functions
type DefaultFunctionGroup struct {
	ID          string
	Name        string
	Description string
	Functions   []string // Function code strings
}

// GetDefaultFunctionGroups returns all available default function groups
func GetDefaultFunctionGroups() []DefaultFunctionGroup {
	return []DefaultFunctionGroup{
		{
			ID:          "rc4-encryption",
			Name:        "RC4 Encryption",
			Description: "RC4 encryption and decryption functions",
			Functions:   parseMultipleFunctions(defaultRC4Functions),
		},
		{
			ID:          "math-utilities",
			Name:        "Math Utilities",
			Description: "Mathematical helper functions",
			Functions:   parseMultipleFunctions(defaultMathFunctions),
		},
	}
}

// LoadDefaultFunctions loads a specific group of default functions into the registry
func LoadDefaultFunctions(registry *Registry, groupID string) error {
	// Use the simplified approach that we know works
	switch groupID {
	case "rc4-encryption", "rc4":
		return LoadRC4Defaults(registry)
	case "math-utilities", "math":
		return LoadMathDefaults(registry)
	default:
		groups := GetDefaultFunctionGroups()
		for _, group := range groups {
			if group.ID == groupID {
				return loadFunctionGroup(registry, group)
			}
		}
	}

	return fmt.Errorf("default function group '%s' not found", groupID)
}

// LoadAllDefaultFunctions loads all default function groups
func LoadAllDefaultFunctions(registry *Registry) error {
	groups := GetDefaultFunctionGroups()

	for _, group := range groups {
		if err := loadFunctionGroup(registry, group); err != nil {
			return fmt.Errorf("failed to load group '%s': %w", group.ID, err)
		}
	}

	return nil
}

// loadFunctionGroup loads a group of functions into the registry
func loadFunctionGroup(registry *Registry, group DefaultFunctionGroup) error {
	// For each code block in the group
	for _, codeBlock := range group.Functions {
		// First, create an engine to load all functions in the block
		engine := NewEngine()
		_, err := engine.Execute(codeBlock)
		if err != nil {
			// If we can't execute the block, try to parse individual functions
			// This is a fallback for when the code contains multiple functions
		}

		// Try to extract individual functions using a better regex
		// Match complete function blocks including JSDoc
		pattern := regexp.MustCompile(`(?s)(/\*\*[^*]*\*+(?:[^/*][^*]*\*+)*/)?\s*function\s+(\w+)\s*\([^)]*\)\s*\{(?:[^{}]|\{[^}]*\})*\}`)
		matches := pattern.FindAllString(codeBlock, -1)

		if len(matches) == 0 {
			return fmt.Errorf("no functions found in code block")
		}

		for _, functionCode := range matches {
			fn, err := ParseFunction(functionCode)
			if err != nil {
				return fmt.Errorf("failed to parse function: %w", err)
			}

			fn.GroupID = group.ID
			if fn.Metadata == nil {
				fn.Metadata = make(map[string]interface{})
			}
			fn.Metadata["groupName"] = group.Name
			fn.Metadata["groupDescription"] = group.Description

			if err := registry.AddOrReplace(fn); err != nil {
				return fmt.Errorf("failed to add function '%s': %w", fn.Name, err)
			}
		}
	}

	return nil
}

// parseMultipleFunctions splits a file containing multiple functions
func parseMultipleFunctions(code string) []string {
	// For embedded defaults, we know each file contains exactly the functions we need
	// Just return the whole code - it will work with multiple function definitions
	return []string{code}
}