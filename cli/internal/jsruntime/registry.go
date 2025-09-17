package jsruntime

import (
	"fmt"
	"sync"
)

// Registry manages a collection of JavaScript functions
type Registry struct {
	mu        sync.RWMutex
	functions map[string]*Function
	groups    map[string][]string // groupID -> function names
}

// NewRegistry creates a new function registry
func NewRegistry() *Registry {
	return &Registry{
		functions: make(map[string]*Function),
		groups:    make(map[string][]string),
	}
}

// Add registers a new function
func (r *Registry) Add(fn *Function) error {
	if fn == nil {
		return fmt.Errorf("function cannot be nil")
	}

	if err := fn.Validate(); err != nil {
		return fmt.Errorf("invalid function: %w", err)
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if function already exists
	if _, exists := r.functions[fn.Name]; exists {
		return fmt.Errorf("function '%s' already exists", fn.Name)
	}

	// Add to registry
	r.functions[fn.Name] = fn

	// Add to group if specified
	if fn.GroupID != "" {
		r.groups[fn.GroupID] = append(r.groups[fn.GroupID], fn.Name)
	}

	return nil
}

// AddOrReplace registers a function, replacing if it already exists
func (r *Registry) AddOrReplace(fn *Function) error {
	if fn == nil {
		return fmt.Errorf("function cannot be nil")
	}

	if err := fn.Validate(); err != nil {
		return fmt.Errorf("invalid function: %w", err)
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	// Remove from old group if replacing
	if oldFn, exists := r.functions[fn.Name]; exists && oldFn.GroupID != "" {
		r.removeFromGroup(oldFn.GroupID, fn.Name)
	}

	// Add to registry
	r.functions[fn.Name] = fn

	// Add to group if specified
	if fn.GroupID != "" {
		r.groups[fn.GroupID] = append(r.groups[fn.GroupID], fn.Name)
	}

	return nil
}

// Get retrieves a function by name
func (r *Registry) Get(name string) (*Function, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	fn, exists := r.functions[name]
	if !exists {
		return nil, fmt.Errorf("function '%s' not found", name)
	}

	return fn, nil
}

// Remove deletes a function from the registry
func (r *Registry) Remove(name string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	fn, exists := r.functions[name]
	if !exists {
		return fmt.Errorf("function '%s' not found", name)
	}

	// Remove from group
	if fn.GroupID != "" {
		r.removeFromGroup(fn.GroupID, name)
	}

	delete(r.functions, name)
	return nil
}

// RemoveGroup removes all functions in a group
func (r *Registry) RemoveGroup(groupID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	functionNames, exists := r.groups[groupID]
	if !exists {
		return fmt.Errorf("group '%s' not found", groupID)
	}

	// Remove all functions in the group
	for _, name := range functionNames {
		delete(r.functions, name)
	}

	// Remove the group
	delete(r.groups, groupID)
	return nil
}

// List returns all function names
func (r *Registry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	names := make([]string, 0, len(r.functions))
	for name := range r.functions {
		names = append(names, name)
	}

	return names
}

// ListGroup returns all function names in a group
func (r *Registry) ListGroup(groupID string) []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if names, exists := r.groups[groupID]; exists {
		return append([]string{}, names...) // Return a copy
	}

	return []string{}
}

// GetAll returns all functions
func (r *Registry) GetAll() map[string]*Function {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Return a copy to prevent external modification
	result := make(map[string]*Function)
	for name, fn := range r.functions {
		result[name] = fn
	}

	return result
}

// GetToolDefinitions returns OpenAI-compatible tool definitions for all callable functions
func (r *Registry) GetToolDefinitions() []map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tools := make([]map[string]interface{}, 0)

	for _, fn := range r.functions {
		if fn.IsCallable || fn.IsTool {
			tools = append(tools, fn.ToToolDefinition())
		}
	}

	return tools
}

// Execute runs a function by name with the given arguments
func (r *Registry) Execute(name string, args map[string]interface{}) (interface{}, error) {
	fn, err := r.Get(name)
	if err != nil {
		return nil, err
	}

	return fn.Execute(args)
}

// Clear removes all functions from the registry
func (r *Registry) Clear() {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.functions = make(map[string]*Function)
	r.groups = make(map[string][]string)
}

// Size returns the number of functions in the registry
func (r *Registry) Size() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return len(r.functions)
}

// HasFunction checks if a function exists
func (r *Registry) HasFunction(name string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	_, exists := r.functions[name]
	return exists
}

// HasGroup checks if a group exists
func (r *Registry) HasGroup(groupID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	_, exists := r.groups[groupID]
	return exists
}

// removeFromGroup is a helper to remove a function from a group (must be called with lock held)
func (r *Registry) removeFromGroup(groupID, functionName string) {
	if names, exists := r.groups[groupID]; exists {
		newNames := make([]string, 0, len(names)-1)
		for _, name := range names {
			if name != functionName {
				newNames = append(newNames, name)
			}
		}
		if len(newNames) > 0 {
			r.groups[groupID] = newNames
		} else {
			delete(r.groups, groupID)
		}
	}
}