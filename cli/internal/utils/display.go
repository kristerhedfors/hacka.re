package utils

import (
	"fmt"
	"strings"

	"github.com/hacka-re/cli/internal/config"
)

// DisplayConfig shows the loaded configuration in a formatted box
func DisplayConfig(cfg *config.Config) {
	fmt.Println("┌─ Configuration ─────────────────────────────┐")

	if cfg.Provider != "" {
		info := config.Providers[cfg.Provider]
		fmt.Printf("│ Provider:     %s %s\n", info.Flag, info.Name)
	}

	if cfg.BaseURL != "" {
		fmt.Printf("│ Base URL:     %s\n", Truncate(cfg.BaseURL, 30))
	}

	if cfg.APIKey != "" {
		masked := MaskAPIKey(cfg.APIKey)
		fmt.Printf("│ API Key:      %s\n", masked)
	}

	if cfg.Model != "" {
		fmt.Printf("│ Model:        %s\n", cfg.Model)
	}

	if cfg.SystemPrompt != "" {
		fmt.Printf("│ System Prompt: %s\n", Truncate(cfg.SystemPrompt, 28))
	}

	if len(cfg.Functions) > 0 {
		fmt.Printf("│ Functions:    %d loaded\n", len(cfg.Functions))
	}

	if len(cfg.Prompts) > 0 {
		fmt.Printf("│ Prompts:      %d loaded\n", len(cfg.Prompts))
	}

	if cfg.RAGEnabled {
		fmt.Printf("│ RAG:          Enabled (%d docs)\n", len(cfg.RAGDocuments))
	}

	fmt.Println("└─────────────────────────────────────────────┘")
}

// Truncate shortens a string to max length with ellipsis
func Truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen < 3 {
		return "..."
	}
	return s[:maxLen-3] + "..."
}

// MaskAPIKey masks an API key for display, showing only first and last 4 characters
func MaskAPIKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "..." + key[len(key)-4:]
}

// PrintBanner prints the hacka.re ASCII banner
func PrintBanner() {
	fmt.Println("╔════════════════════════════════════════════╗")
	fmt.Println("║        hacka.re: serverless agency         ║")
	fmt.Println("╠════════════════════════════════════════════╣")
}

// PrintBannerWithMessage prints the banner with a custom message
func PrintBannerWithMessage(message string) {
	fmt.Println("╔════════════════════════════════════════════╗")
	fmt.Println("║        hacka.re: serverless agency         ║")
	fmt.Println("╠════════════════════════════════════════════╣")

	// Center the message within the box (44 chars wide)
	padding := (44 - len(message)) / 2
	if padding < 1 {
		padding = 1
	}
	fmt.Printf("║%s%s%s║\n", strings.Repeat(" ", padding), message, strings.Repeat(" ", 44-len(message)-padding))
	fmt.Println("╚════════════════════════════════════════════╝")
}

// FormatSessionSource formats the source of a session for display
func FormatSessionSource(source string, isCommandLine bool) string {
	if isCommandLine {
		return "command line"
	}
	return fmt.Sprintf("environment variable %s", source)
}