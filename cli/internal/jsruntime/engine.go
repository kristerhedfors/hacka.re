package jsruntime

import (
	"context"
	"fmt"
	"time"

	"github.com/dop251/goja"
)

// Engine wraps the Goja JavaScript runtime
type Engine struct {
	vm      *goja.Runtime
	timeout time.Duration
}

// NewEngine creates a new JavaScript engine with default settings
func NewEngine() *Engine {
	return &Engine{
		vm:      goja.New(),
		timeout: 5 * time.Second, // Default 5 second timeout
	}
}

// SetTimeout sets the maximum execution time for JavaScript functions
func (e *Engine) SetTimeout(timeout time.Duration) {
	e.timeout = timeout
}

// Execute runs JavaScript code with timeout protection
func (e *Engine) Execute(code string) (interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), e.timeout)
	defer cancel()

	// Channel to receive the result
	result := make(chan interface{}, 1)
	errChan := make(chan error, 1)

	go func() {
		// Create a new runtime for this execution (isolation)
		vm := goja.New()

		// Setup sandbox environment
		if err := e.setupSandbox(vm); err != nil {
			errChan <- fmt.Errorf("failed to setup sandbox: %w", err)
			return
		}

		// Execute the code
		value, err := vm.RunString(code)
		if err != nil {
			errChan <- fmt.Errorf("execution error: %w", err)
			return
		}

		// Export the result
		result <- value.Export()
	}()

	// Wait for either completion or timeout
	select {
	case res := <-result:
		return res, nil
	case err := <-errChan:
		return nil, err
	case <-ctx.Done():
		return nil, fmt.Errorf("execution timeout after %v", e.timeout)
	}
}

// ExecuteFunction runs a specific JavaScript function with arguments
func (e *Engine) ExecuteFunction(functionCode string, functionName string, args map[string]interface{}) (interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), e.timeout)
	defer cancel()

	result := make(chan interface{}, 1)
	errChan := make(chan error, 1)

	go func() {
		// Create isolated runtime
		vm := goja.New()

		// Setup sandbox
		if err := e.setupSandbox(vm); err != nil {
			errChan <- fmt.Errorf("failed to setup sandbox: %w", err)
			return
		}

		// Load the function code
		_, err := vm.RunString(functionCode)
		if err != nil {
			errChan <- fmt.Errorf("failed to load function: %w", err)
			return
		}

		// Get the function
		fn, ok := goja.AssertFunction(vm.Get(functionName))
		if !ok {
			errChan <- fmt.Errorf("function '%s' not found", functionName)
			return
		}

		// Convert args to goja values
		gojaArgs := make([]goja.Value, 0)
		for _, arg := range args {
			gojaArgs = append(gojaArgs, vm.ToValue(arg))
		}

		// Call the function
		value, err := fn(goja.Undefined(), gojaArgs...)
		if err != nil {
			errChan <- fmt.Errorf("function execution error: %w", err)
			return
		}

		result <- value.Export()
	}()

	select {
	case res := <-result:
		return res, nil
	case err := <-errChan:
		return nil, err
	case <-ctx.Done():
		return nil, fmt.Errorf("function execution timeout after %v", e.timeout)
	}
}

// setupSandbox configures the sandbox environment for safe execution
func (e *Engine) setupSandbox(vm *goja.Runtime) error {
	// Create console object for debugging
	console := vm.NewObject()
	console.Set("log", func(args ...interface{}) {
		fmt.Println(args...)
	})
	console.Set("error", func(args ...interface{}) {
		fmt.Print("ERROR: ")
		fmt.Println(args...)
	})
	vm.Set("console", console)

	// Add safe JSON operations
	vm.Set("JSON", vm.Get("JSON"))

	// Add safe Math operations
	vm.Set("Math", vm.Get("Math"))

	// Add safe String, Number, Boolean constructors
	vm.Set("String", vm.Get("String"))
	vm.Set("Number", vm.Get("Number"))
	vm.Set("Boolean", vm.Get("Boolean"))
	vm.Set("Array", vm.Get("Array"))
	vm.Set("Object", vm.Get("Object"))
	vm.Set("Date", vm.Get("Date"))
	vm.Set("RegExp", vm.Get("RegExp"))

	// Add Promise support (Goja has built-in Promise support)
	vm.Set("Promise", vm.Get("Promise"))

	// Add setTimeout/clearTimeout for async operations
	// Note: These are simplified versions for function compatibility
	vm.Set("setTimeout", func(fn goja.Callable, delay int) int {
		// In a real implementation, you'd want to handle this properly
		// For now, we'll just execute immediately
		go func() {
			time.Sleep(time.Duration(delay) * time.Millisecond)
			fn(goja.Undefined())
		}()
		return 1 // dummy timer ID
	})

	vm.Set("clearTimeout", func(id int) {
		// No-op for now
	})

	// Add Error constructor for proper error handling
	vm.Set("Error", vm.Get("Error"))

	return nil
}