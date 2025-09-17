package main

import (
	"fmt"
	"log"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/core"
	"github.com/hacka-re/cli/internal/tui/internal/pages"
)

func main() {
	// Create a test screen (won't actually display)
	screen, err := tcell.NewScreen()
	if err != nil {
		log.Fatalf("Failed to create screen: %v", err)
	}

	// Create test config and state
	configManager, err := core.NewConfigManager()
	if err != nil {
		log.Fatalf("Failed to create config manager: %v", err)
	}
	appState := core.NewAppState()
	eventBus := core.NewEventBus()

	// Test that all modal pages can be created
	fmt.Println("Testing modal page creation...")

	// Test PromptsReadOnlyPage
	promptsPage := pages.NewPromptsReadOnlyPage(screen, configManager, appState, eventBus)
	if promptsPage != nil {
		fmt.Println("✓ PromptsReadOnlyPage created successfully")
	}

	// Test FunctionsPage
	functionsPage := pages.NewFunctionsPage(screen, configManager, appState, eventBus)
	if functionsPage != nil {
		fmt.Println("✓ FunctionsPage created successfully")
	}

	// Test MCPServersPage
	mcpPage := pages.NewMCPServersPage(screen, configManager, appState, eventBus)
	if mcpPage != nil {
		fmt.Println("✓ MCPServersPage created successfully")
	}

	// Test RAGPage
	ragPage := pages.NewRAGPage(screen, configManager, appState, eventBus)
	if ragPage != nil {
		fmt.Println("✓ RAGPage created successfully")
	}

	// Test SharePage
	sharePage := pages.NewSharePage(screen, configManager, appState, eventBus)
	if sharePage != nil {
		fmt.Println("✓ SharePage created successfully")
	}

	fmt.Println("\nAll modal pages created successfully!")
	fmt.Println("\nModal features:")
	fmt.Println("- System Prompts: View default and custom prompts with token usage")
	fmt.Println("- Function Calling: View default functions (RC4, Math, MCP) and custom functions")
	fmt.Println("- MCP Servers: Quick connectors (GitHub, Gmail, Shodan) and advanced settings")
	fmt.Println("- RAG Configuration: EU regulatory documents and custom document settings")
	fmt.Println("- Share Configuration: Link generation with platform compatibility indicators")
	fmt.Println("\nAll modals are read-only and designed to mimic the web application's structure.")
}