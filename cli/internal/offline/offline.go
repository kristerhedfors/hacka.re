package offline

import (
	"fmt"
	"os"

	"github.com/hacka-re/cli/internal/crypto"
	"github.com/hacka-re/cli/internal/share"
)

// Config holds the offline mode configuration
type Config struct {
	LlamafilePath string
	ModelName     string
	Port          int
	Password      string
	ShareURL      string
	WebPort       int
}

// RunOfflineMode starts the offline mode with llamafile
// Returns the config and the LlamafileManager (caller must call manager.Stop())
// If originalSharedConfig is provided, it preserves prompts, welcome messages, functions, etc.
func RunOfflineMode(originalSharedConfig *share.SharedConfig) (*Config, *LlamafileManager, error) {
	config := &Config{
		WebPort: 8000, // Default web server port
	}

	// 1. Determine llamafile path
	llamafilePath := os.Getenv("HACKARE_LLAMAFILE")
	if llamafilePath == "" {
		// Try auto-detection
		var err error
		llamafilePath, err = AutoDetectLlamafile()
		if err != nil {
			return nil, nil, fmt.Errorf("llamafile not found: %w\nPlease set HACKARE_LLAMAFILE environment variable to the path of your llamafile", err)
		}
		fmt.Printf("Auto-detected llamafile: %s\n", llamafilePath)
	}
	config.LlamafilePath = llamafilePath

	// 2. Create and start llamafile manager
	manager, err := NewLlamafileManager(llamafilePath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create llamafile manager: %w", err)
	}

	fmt.Println("Starting llamafile server...")
	if err := manager.Start(); err != nil {
		return nil, nil, fmt.Errorf("failed to start llamafile: %w", err)
	}

	// Store port
	config.Port = manager.Port

	// 3. Determine model name
	modelName := os.Getenv("HACKARE_MODEL")
	if modelName == "" {
		// Query llamafile for available models
		fmt.Println("Discovering available models...")
		discoveredModel, err := manager.DiscoverModel()
		if err != nil {
			fmt.Printf("Warning: Could not discover models: %v\n", err)
			modelName = "local-model"
		} else {
			modelName = discoveredModel
			fmt.Printf("Discovered model: %s\n", modelName)
		}
	}
	config.ModelName = modelName

	// 4. Generate secure password
	password, err := crypto.GenerateSecurePassword()
	if err != nil {
		manager.Stop()
		return nil, nil, fmt.Errorf("failed to generate password: %w", err)
	}
	config.Password = password

	// 5. Create shared configuration
	// If we have an original shared config, preserve its prompts, welcome messages, functions, etc.
	var sharedConfig *share.SharedConfig
	if originalSharedConfig != nil {
		// Copy the original config to preserve all fields
		sharedConfig = &share.SharedConfig{
			BaseURL:          manager.BaseURL,
			Model:            modelName,
			APIKey:           "no-key", // Llamafile doesn't require API key
			// Preserve original fields
			MaxTokens:        originalSharedConfig.MaxTokens,
			Temperature:      originalSharedConfig.Temperature,
			SystemPrompt:     originalSharedConfig.SystemPrompt,
			WelcomeMessage:   originalSharedConfig.WelcomeMessage,
			Theme:            originalSharedConfig.Theme,
			Functions:        originalSharedConfig.Functions,
			DefaultFunctions: originalSharedConfig.DefaultFunctions,
			Prompts:          originalSharedConfig.Prompts,
			RAGEnabled:       originalSharedConfig.RAGEnabled,
			RAGDocuments:     originalSharedConfig.RAGDocuments,
			CustomData:       originalSharedConfig.CustomData,
		}
	} else {
		// Create minimal config if no original provided
		sharedConfig = &share.SharedConfig{
			BaseURL:  manager.BaseURL,
			Model:    modelName,
			APIKey:   "no-key", // Llamafile doesn't require API key
		}
	}

	// 6. Create encrypted share link
	shareURL, err := share.CreateShareableURL(sharedConfig, password, "https://hacka.re/")
	if err != nil {
		manager.Stop()
		return nil, nil, fmt.Errorf("failed to create share link: %w", err)
	}
	config.ShareURL = shareURL

	// Return both config and manager so caller can properly cleanup
	return config, manager, nil
}

// PrintOfflineModeInfo displays the offline mode configuration to the user
func PrintOfflineModeInfo(config *Config) {
	fmt.Println("\n╔════════════════════════════════════════════╗")
	fmt.Println("║           Offline Mode Active              ║")
	fmt.Println("╠════════════════════════════════════════════╣")
	fmt.Printf("║ 🤖 Model: %-33s ║\n", truncateString(config.ModelName, 33))
	fmt.Printf("║ 🔐 Llamafile: http://localhost:%-11d ║\n", config.Port)
	fmt.Printf("║ 🌐 Web Server: http://localhost:%-10d ║\n", config.WebPort)
	fmt.Println("╚════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("🔑 Password for encrypted link:")
	fmt.Printf("   %s\n", config.Password)
	fmt.Println()
	fmt.Println("📎 Share link (contains encrypted configuration):")
	fmt.Printf("   %s\n", config.ShareURL)
	fmt.Println()
	fmt.Println("Copy the password above to decrypt the configuration in your browser.")
}

// truncateString truncates a string to the specified length
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}

// GetOfflineSharedConfig creates a SharedConfig for offline mode
func GetOfflineSharedConfig(modelName string, port int) *share.SharedConfig {
	if modelName == "" {
		modelName = "local-model"
	}

	return &share.SharedConfig{
		BaseURL: fmt.Sprintf("http://localhost:%d/v1", port),
		Model:   modelName,
		APIKey:  "no-key",
	}
}