package jsruntime

import (
	"strings"
	"testing"
	"time"
)

func TestEngine_Execute(t *testing.T) {
	engine := NewEngine()

	tests := []struct {
		name    string
		code    string
		want    interface{}
		wantErr bool
	}{
		{
			name: "simple addition",
			code: "1 + 2",
			want: int64(3),
		},
		{
			name: "string concatenation",
			code: "'hello' + ' ' + 'world'",
			want: "hello world",
		},
		{
			name: "function definition and call",
			code: "function add(a, b) { return a + b; } add(5, 3)",
			want: int64(8),
		},
		{
			name:    "syntax error",
			code:    "function {",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := engine.Execute(tt.code)
			if (err != nil) != tt.wantErr {
				t.Errorf("Execute() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("Execute() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestEngine_ExecuteFunction(t *testing.T) {
	engine := NewEngine()

	functionCode := `
		function add(a, b) {
			return a + b;
		}

		function greet(name) {
			return 'Hello, ' + name + '!';
		}
	`

	tests := []struct {
		name         string
		functionName string
		args         map[string]interface{}
		want         interface{}
		wantErr      bool
	}{
		{
			name:         "add two numbers",
			functionName: "add",
			args:         map[string]interface{}{"a": 5, "b": 3},
			want:         int64(8),
		},
		{
			name:         "greet with name",
			functionName: "greet",
			args:         map[string]interface{}{"name": "World"},
			want:         "Hello, World!",
		},
		{
			name:         "non-existent function",
			functionName: "nonExistent",
			args:         map[string]interface{}{},
			wantErr:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := engine.ExecuteFunction(functionCode, tt.functionName, tt.args)
			if (err != nil) != tt.wantErr {
				t.Errorf("ExecuteFunction() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("ExecuteFunction() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestEngine_Timeout(t *testing.T) {
	engine := NewEngine()
	engine.SetTimeout(100 * time.Millisecond)

	// This should timeout
	code := `
		while (true) {
			// Infinite loop
		}
	`

	_, err := engine.Execute(code)
	if err == nil {
		t.Error("Expected timeout error, got nil")
	}
	if !strings.Contains(err.Error(), "timeout") {
		t.Errorf("Expected timeout error, got: %v", err)
	}
}

func TestParseFunction(t *testing.T) {
	tests := []struct {
		name    string
		code    string
		want    Function
		wantErr bool
	}{
		{
			name: "function with JSDoc",
			code: `/**
 * Calculate the sum of two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum
 * @callable
 */
function add(a, b) {
	return a + b;
}`,
			want: Function{
				Name:        "add",
				Description: "Calculate the sum of two numbers",
				Parameters: []Parameter{
					{Name: "a", Type: "number", Description: "First number", Required: true},
					{Name: "b", Type: "number", Description: "Second number", Required: true},
				},
				Returns:    "number",
				IsCallable: true,
			},
		},
		{
			name: "function without JSDoc",
			code: `function multiply(x, y) {
	return x * y;
}`,
			want: Function{
				Name:       "multiply",
				IsCallable: true, // Default
			},
		},
		{
			name:    "invalid code",
			code:    "not a function",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseFunction(tt.code)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseFunction() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if got.Name != tt.want.Name {
					t.Errorf("ParseFunction() Name = %v, want %v", got.Name, tt.want.Name)
				}
				if got.Description != tt.want.Description {
					t.Errorf("ParseFunction() Description = %v, want %v", got.Description, tt.want.Description)
				}
				if len(got.Parameters) != len(tt.want.Parameters) {
					t.Errorf("ParseFunction() Parameters count = %v, want %v", len(got.Parameters), len(tt.want.Parameters))
				}
				if got.IsCallable != tt.want.IsCallable {
					t.Errorf("ParseFunction() IsCallable = %v, want %v", got.IsCallable, tt.want.IsCallable)
				}
			}
		})
	}
}

func TestRegistry(t *testing.T) {
	registry := NewRegistry()

	// Test adding a function
	fn := &Function{
		Name:        "testFunc",
		Code:        "function testFunc() { return 42; }",
		Description: "Test function",
		IsCallable:  true,
	}

	err := registry.Add(fn)
	if err != nil {
		t.Errorf("Add() error = %v", err)
	}

	// Test getting a function
	got, err := registry.Get("testFunc")
	if err != nil {
		t.Errorf("Get() error = %v", err)
	}
	if got.Name != fn.Name {
		t.Errorf("Get() Name = %v, want %v", got.Name, fn.Name)
	}

	// Test listing functions
	list := registry.List()
	if len(list) != 1 {
		t.Errorf("List() count = %v, want 1", len(list))
	}

	// Test removing a function
	err = registry.Remove("testFunc")
	if err != nil {
		t.Errorf("Remove() error = %v", err)
	}

	// Verify it's removed
	_, err = registry.Get("testFunc")
	if err == nil {
		t.Error("Expected error getting removed function, got nil")
	}
}

func TestFunction_Execute(t *testing.T) {
	fn := &Function{
		Name: "multiply",
		Code: `function multiply(a, b) {
			return a * b;
		}`,
		IsCallable: true,
	}

	result, err := fn.Execute(map[string]interface{}{
		"a": 5,
		"b": 7,
	})

	if err != nil {
		t.Errorf("Execute() error = %v", err)
	}

	if result != int64(35) {
		t.Errorf("Execute() = %v, want 35", result)
	}
}

func TestDefaultFunctions(t *testing.T) {
	registry := NewRegistry()

	// Test loading RC4 functions
	err := LoadDefaultFunctions(registry, "rc4-encryption")
	if err != nil {
		t.Errorf("LoadDefaultFunctions(rc4) error = %v", err)
	}

	// Test RC4 encrypt function
	result, err := registry.Execute("rc4_encrypt", map[string]interface{}{
		"plaintext": "Hello World",
		"key":       "secret",
	})
	if err != nil {
		t.Errorf("Execute(rc4_encrypt) error = %v", err)
	}

	// Check result structure
	if resultMap, ok := result.(map[string]interface{}); ok {
		if !resultMap["success"].(bool) {
			t.Error("RC4 encryption failed")
		}
		if resultMap["algorithm"] != "RC4" {
			t.Errorf("Algorithm = %v, want RC4", resultMap["algorithm"])
		}
	} else {
		t.Error("Result is not a map")
	}

	// Clear and test math functions
	registry.Clear()
	err = LoadDefaultFunctions(registry, "math-utilities")
	if err != nil {
		t.Errorf("LoadDefaultFunctions(math) error = %v", err)
	}

	// Test factorial function
	result, err = registry.Execute("factorial", map[string]interface{}{
		"n": 5,
	})
	if err != nil {
		t.Errorf("Execute(factorial) error = %v", err)
	}

	if resultMap, ok := result.(map[string]interface{}); ok {
		if !resultMap["success"].(bool) {
			t.Error("Factorial calculation failed")
		}
		if resultMap["result"].(int64) != 120 {
			t.Errorf("Factorial(5) = %v, want 120", resultMap["result"])
		}
	} else {
		t.Error("Result is not a map")
	}
}