package interfaces

// ExternalConfig defines the interface for external configuration
// This allows the parent application to provide its own config structure
type ExternalConfig interface {
	// GetProvider returns the API provider (openai, groq, ollama, etc.)
	GetProvider() string

	// GetAPIKey returns the API key
	GetAPIKey() string

	// GetBaseURL returns the base URL for the API
	GetBaseURL() string

	// GetModel returns the model name
	GetModel() string

	// GetTemperature returns the temperature setting
	GetTemperature() float64

	// GetMaxTokens returns the max tokens setting
	GetMaxTokens() int

	// GetStreamMode returns whether streaming is enabled
	GetStreamMode() bool

	// GetYoloMode returns whether YOLO mode is enabled
	GetYoloMode() bool

	// GetVoiceControl returns whether voice control is enabled
	GetVoiceControl() bool

	// GetSystemPrompt returns the system prompt
	GetSystemPrompt() string

	// GetNamespace returns the namespace for storage
	GetNamespace() string

	// GetFunctions returns function definitions (if any)
	GetFunctions() []FunctionDef

	// GetPrompts returns prompt definitions (if any)
	GetPrompts() []PromptDef
}

// FunctionDef represents a function definition
type FunctionDef struct {
	Name        string
	Code        string
	Description string
	Enabled     bool
}

// PromptDef represents a prompt definition
type PromptDef struct {
	Name        string
	Content     string
	Description string
	Category    string
	Enabled     bool
}

// CLIConfig interface for CLI config compatibility
type CLIConfig interface {
	GetProvider() string
	GetAPIKey() string
	GetBaseURL() string
	GetModel() string
	GetTemperature() float64
	GetMaxTokens() int
	GetStreamResponse() bool
	GetYoloMode() bool
	GetVoiceControl() bool
	GetSystemPrompt() string
	GetNamespace() string
}