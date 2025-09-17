package jsruntime

import (
	"fmt"
	"testing"
)

// TestEngineEdgeCases tests edge cases for the JS engine
func TestEngineEdgeCases(t *testing.T) {
	engine := NewEngine()

	tests := []struct {
		name    string
		code    string
		wantErr bool
	}{
		{
			name:    "empty code",
			code:    "",
			wantErr: false,
		},
		{
			name:    "whitespace only",
			code:    "   \n\t  ",
			wantErr: false,
		},
		{
			name:    "undefined variable",
			code:    "undefinedVariable",
			wantErr: true,
		},
		{
			name:    "division by zero",
			code:    "1/0",
			wantErr: false, // JavaScript returns Infinity, not an error
		},
		{
			name:    "null operations",
			code:    "null + 5",
			wantErr: false,
		},
		{
			name:    "type coercion",
			code:    "'5' * 2",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := engine.Execute(tt.code)
			if (err != nil) != tt.wantErr {
				t.Errorf("Execute() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestFunctionParameterTypes tests different parameter type handling
func TestFunctionParameterTypes(t *testing.T) {
	tests := []struct {
		name     string
		code     string
		funcName string
		args     map[string]interface{}
		checkResult func(interface{}) bool
	}{
		{
			name: "string parameter",
			code: `function concat(a, b) { return a + b; }`,
			funcName: "concat",
			args: map[string]interface{}{"a": "hello", "b": " world"},
			checkResult: func(r interface{}) bool { return r == "hello world" },
		},
		{
			name: "number parameter",
			code: `function multiply(x, y) { return x * y; }`,
			funcName: "multiply",
			args: map[string]interface{}{"x": 3.5, "y": 2},
			checkResult: func(r interface{}) bool {
				// Goja may return as int64 or float64
				switch v := r.(type) {
				case int64:
					return v == 7
				case float64:
					return v == 7.0
				default:
					return false
				}
			},
		},
		{
			name: "boolean parameter",
			code: `function negate(val) { return !val; }`,
			funcName: "negate",
			args: map[string]interface{}{"val": true},
			checkResult: func(r interface{}) bool { return r == false },
		},
		{
			name: "array parameter",
			code: `function arrayLen(arr) { return arr.length; }`,
			funcName: "arrayLen",
			args: map[string]interface{}{"arr": []int{1, 2, 3, 4, 5}},
			checkResult: func(r interface{}) bool { return r == int64(5) },
		},
		{
			name: "object parameter",
			code: `function getField(obj) { return obj.name; }`,
			funcName: "getField",
			args: map[string]interface{}{"obj": map[string]interface{}{"name": "test"}},
			checkResult: func(r interface{}) bool { return r == "test" },
		},
	}

	engine := NewEngine()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := engine.ExecuteFunction(tt.code, tt.funcName, tt.args)
			if err != nil {
				t.Errorf("ExecuteFunction() error = %v", err)
				return
			}
			if !tt.checkResult(result) {
				t.Errorf("ExecuteFunction() result = %v, check failed", result)
			}
		})
	}
}

// TestFunctionParsing tests comprehensive JSDoc parsing
func TestFunctionParsing(t *testing.T) {
	tests := []struct {
		name    string
		code    string
		want    Function
	}{
		{
			name: "optional parameters",
			code: `/**
 * Test function
 * @param {string} required - Required param
 * @param {string?} optional - Optional param
 * @callable
 */
function test(required, optional) { }`,
			want: Function{
				Name:        "test",
				Description: "Test function",
				Parameters: []Parameter{
					{Name: "required", Type: "string", Description: "Required param", Required: true},
					{Name: "optional", Type: "string", Description: "Optional param", Required: false},
				},
				IsCallable: true,
			},
		},
		{
			name: "tool tag",
			code: `/**
 * Tool function
 * @tool
 */
function toolFunc() { }`,
			want: Function{
				Name:        "toolFunc",
				Description: "Tool function",
				IsTool:      true,
			},
		},
		{
			name: "multiple return statements",
			code: `/**
 * Complex function
 * @returns {number|string} Mixed return type
 * @callable
 */
function complex(x) {
	if (x > 0) return x;
	return "negative";
}`,
			want: Function{
				Name:        "complex",
				Description: "Complex function",
				Returns:     "number|string",
				IsCallable:  true,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseFunction(tt.code)
			if err != nil {
				t.Errorf("ParseFunction() error = %v", err)
				return
			}

			// Check key fields
			if got.Name != tt.want.Name {
				t.Errorf("Name = %v, want %v", got.Name, tt.want.Name)
			}
			if got.Description != tt.want.Description {
				t.Errorf("Description = %v, want %v", got.Description, tt.want.Description)
			}
			if got.IsCallable != tt.want.IsCallable {
				t.Errorf("IsCallable = %v, want %v", got.IsCallable, tt.want.IsCallable)
			}
			if got.IsTool != tt.want.IsTool {
				t.Errorf("IsTool = %v, want %v", got.IsTool, tt.want.IsTool)
			}

			// Check parameters
			if len(got.Parameters) != len(tt.want.Parameters) {
				t.Errorf("Parameters count = %v, want %v", len(got.Parameters), len(tt.want.Parameters))
			} else {
				for i, param := range got.Parameters {
					want := tt.want.Parameters[i]
					if param.Name != want.Name || param.Type != want.Type || param.Required != want.Required {
						t.Errorf("Parameter[%d] = %+v, want %+v", i, param, want)
					}
				}
			}
		})
	}
}

// TestRegistryConcurrency tests thread-safe registry operations
func TestRegistryConcurrency(t *testing.T) {
	registry := NewRegistry()

	// Add some initial functions
	for i := 0; i < 10; i++ {
		fn := &Function{
			Name: fmt.Sprintf("func%d", i),
			Code: fmt.Sprintf("function func%d() { return %d; }", i, i),
			IsCallable: true,
		}
		registry.AddOrReplace(fn)
	}

	// Run concurrent operations
	done := make(chan bool)
	errors := make(chan error, 100)

	// Concurrent reads
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()

			for j := 0; j < 100; j++ {
				name := fmt.Sprintf("func%d", id)
				if _, err := registry.Get(name); err != nil {
					errors <- err
				}
				registry.List()
				registry.GetAll()
			}
		}(i)
	}

	// Concurrent writes
	for i := 10; i < 20; i++ {
		go func(id int) {
			defer func() { done <- true }()

			fn := &Function{
				Name: fmt.Sprintf("func%d", id),
				Code: fmt.Sprintf("function func%d() { return %d; }", id, id),
				IsCallable: true,
			}

			for j := 0; j < 100; j++ {
				if err := registry.AddOrReplace(fn); err != nil {
					errors <- err
				}
			}
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 20; i++ {
		<-done
	}

	close(errors)

	// Check for errors
	for err := range errors {
		t.Errorf("Concurrent operation error: %v", err)
	}

	// Verify final state
	if size := registry.Size(); size != 20 {
		t.Errorf("Final registry size = %d, want 20", size)
	}
}

// TestToolDefinitionGeneration tests OpenAI tool definition output
func TestToolDefinitionGeneration(t *testing.T) {
	fn := &Function{
		Name:        "testFunc",
		Description: "A test function",
		Parameters: []Parameter{
			{Name: "text", Type: "string", Description: "Input text", Required: true},
			{Name: "count", Type: "number", Description: "Repeat count", Required: false},
		},
		IsCallable: true,
	}

	toolDef := fn.ToToolDefinition()

	// Check structure
	if toolDef["type"] != "function" {
		t.Errorf("Tool type = %v, want 'function'", toolDef["type"])
	}

	funcDef, ok := toolDef["function"].(map[string]interface{})
	if !ok {
		t.Fatal("Tool definition missing 'function' field")
	}

	if funcDef["name"] != "testFunc" {
		t.Errorf("Function name = %v, want 'testFunc'", funcDef["name"])
	}

	if funcDef["description"] != "A test function" {
		t.Errorf("Function description = %v, want 'A test function'", funcDef["description"])
	}

	// Check parameters
	params, ok := funcDef["parameters"].(map[string]interface{})
	if !ok {
		t.Fatal("Parameters not found or wrong type")
	}

	if params["type"] != "object" {
		t.Errorf("Parameters type = %v, want 'object'", params["type"])
	}

	props, ok := params["properties"].(map[string]interface{})
	if !ok {
		t.Fatal("Properties not found")
	}

	// Check individual parameter definitions
	if textProp, ok := props["text"].(map[string]interface{}); ok {
		if textProp["type"] != "string" {
			t.Errorf("Text param type = %v, want 'string'", textProp["type"])
		}
	} else {
		t.Error("Text parameter not found in properties")
	}

	required, ok := params["required"].([]string)
	if !ok {
		t.Fatal("Required array not found")
	}

	if len(required) != 1 || required[0] != "text" {
		t.Errorf("Required = %v, want ['text']", required)
	}
}

// TestDefaultFunctionsExecution tests actual execution of default functions
func TestDefaultFunctionsExecution(t *testing.T) {
	registry := NewRegistry()

	// Load defaults
	if err := LoadSimplifiedDefaults(registry); err != nil {
		t.Fatalf("Failed to load defaults: %v", err)
	}

	tests := []struct {
		name     string
		funcName string
		args     map[string]interface{}
		validate func(interface{}) error
	}{
		{
			name:     "RC4 round trip",
			funcName: "rc4_encrypt",
			args:     map[string]interface{}{"plaintext": "test message", "key": "secret"},
			validate: func(encrypted interface{}) error {
				// Get the ciphertext
				result, ok := encrypted.(map[string]interface{})
				if !ok {
					return fmt.Errorf("encrypt result not a map")
				}

				ciphertext, ok := result["ciphertext"].(string)
				if !ok {
					return fmt.Errorf("no ciphertext in result")
				}

				// Now decrypt it
				decrypted, err := registry.Execute("rc4_decrypt", map[string]interface{}{
					"ciphertext": ciphertext,
					"key":        "secret",
				})
				if err != nil {
					return fmt.Errorf("decrypt failed: %v", err)
				}

				decResult, ok := decrypted.(map[string]interface{})
				if !ok {
					return fmt.Errorf("decrypt result not a map")
				}

				plaintext, ok := decResult["plaintext"].(string)
				if !ok {
					return fmt.Errorf("no plaintext in decrypt result")
				}

				if plaintext != "test message" {
					return fmt.Errorf("round trip failed: got %s, want 'test message'", plaintext)
				}

				return nil
			},
		},
		{
			name:     "factorial of 10",
			funcName: "factorial",
			args:     map[string]interface{}{"n": 10},
			validate: func(result interface{}) error {
				res, ok := result.(map[string]interface{})
				if !ok {
					return fmt.Errorf("result not a map")
				}

				if !res["success"].(bool) {
					return fmt.Errorf("factorial failed")
				}

				if res["result"].(int64) != 3628800 {
					return fmt.Errorf("factorial(10) = %v, want 3628800", res["result"])
				}

				return nil
			},
		},
		{
			name:     "prime check for 97",
			funcName: "isPrime",
			args:     map[string]interface{}{"n": 97},
			validate: func(result interface{}) error {
				res, ok := result.(map[string]interface{})
				if !ok {
					return fmt.Errorf("result not a map")
				}

				if !res["success"].(bool) {
					return fmt.Errorf("isPrime failed")
				}

				if !res["isPrime"].(bool) {
					return fmt.Errorf("isPrime(97) = false, want true")
				}

				return nil
			},
		},
		{
			name:     "GCD of 1071 and 462",
			funcName: "gcd",
			args:     map[string]interface{}{"a": 1071, "b": 462},
			validate: func(result interface{}) error {
				res, ok := result.(map[string]interface{})
				if !ok {
					return fmt.Errorf("result not a map")
				}

				if !res["success"].(bool) {
					return fmt.Errorf("gcd failed")
				}

				if res["gcd"].(int64) != 21 {
					return fmt.Errorf("gcd(1071, 462) = %v, want 21", res["gcd"])
				}

				return nil
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := registry.Execute(tt.funcName, tt.args)
			if err != nil {
				t.Errorf("Execute() error = %v", err)
				return
			}

			if err := tt.validate(result); err != nil {
				t.Errorf("Validation failed: %v", err)
			}
		})
	}
}

// TestErrorHandling tests various error conditions
func TestErrorHandling(t *testing.T) {
	registry := NewRegistry()

	// Test executing non-existent function
	_, err := registry.Execute("nonexistent", nil)
	if err == nil {
		t.Error("Expected error for non-existent function")
	}

	// Test adding invalid function
	invalidFn := &Function{
		Name: "",
		Code: "invalid",
	}
	err = registry.Add(invalidFn)
	if err == nil {
		t.Error("Expected error for invalid function")
	}

	// Test removing non-existent function
	err = registry.Remove("nonexistent")
	if err == nil {
		t.Error("Expected error removing non-existent function")
	}

	// Test function with runtime error
	errorFn := &Function{
		Name: "errorFunc",
		Code: `function errorFunc() { throw new Error("intentional error"); }`,
	}
	registry.AddOrReplace(errorFn)

	_, err = registry.Execute("errorFunc", nil)
	if err == nil {
		t.Error("Expected error from function that throws")
	}
}

// TestFunctionGroups tests group management
func TestFunctionGroups(t *testing.T) {
	registry := NewRegistry()

	// Add functions to groups
	for i := 0; i < 3; i++ {
		fn := &Function{
			Name:    fmt.Sprintf("group1_func%d", i),
			Code:    fmt.Sprintf("function group1_func%d() {}", i),
			GroupID: "group1",
			IsCallable: true,
		}
		registry.AddOrReplace(fn)
	}

	for i := 0; i < 2; i++ {
		fn := &Function{
			Name:    fmt.Sprintf("group2_func%d", i),
			Code:    fmt.Sprintf("function group2_func%d() {}", i),
			GroupID: "group2",
			IsCallable: true,
		}
		registry.AddOrReplace(fn)
	}

	// Check group membership
	group1 := registry.ListGroup("group1")
	if len(group1) != 3 {
		t.Errorf("Group1 size = %d, want 3", len(group1))
	}

	group2 := registry.ListGroup("group2")
	if len(group2) != 2 {
		t.Errorf("Group2 size = %d, want 2", len(group2))
	}

	// Test removing a group
	err := registry.RemoveGroup("group1")
	if err != nil {
		t.Errorf("RemoveGroup() error = %v", err)
	}

	// Verify group is removed
	if registry.HasGroup("group1") {
		t.Error("Group1 still exists after removal")
	}

	// Verify functions are removed
	if registry.HasFunction("group1_func0") {
		t.Error("Group1 functions still exist after group removal")
	}

	// Verify other group is intact
	if !registry.HasGroup("group2") {
		t.Error("Group2 was removed incorrectly")
	}
}