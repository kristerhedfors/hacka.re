package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"syscall"

	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/cli/internal/ui"
	"golang.org/x/term"
)

func main() {
	// Define flags
	dryRun := flag.Bool("dry-run", false, "Decrypt configuration and output as JSON without launching UI")
	help := flag.Bool("help", false, "Show help message")
	h := flag.Bool("h", false, "Show help message")
	
	// Custom usage message
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s [OPTIONS] [URL|FRAGMENT|DATA]\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Options:\n")
		fmt.Fprintf(os.Stderr, "  --dry-run    Decrypt configuration and output as JSON\n")
		fmt.Fprintf(os.Stderr, "  --help, -h   Show this help message\n\n")
		fmt.Fprintf(os.Stderr, "Arguments:\n")
		fmt.Fprintf(os.Stderr, "  URL          Full hacka.re URL (https://hacka.re/#gpt=...)\n")
		fmt.Fprintf(os.Stderr, "  FRAGMENT     Fragment with prefix (gpt=...)\n")
		fmt.Fprintf(os.Stderr, "  DATA         Just the encrypted data (eyJlbmM...)\n\n")
		fmt.Fprintf(os.Stderr, "Examples:\n")
		fmt.Fprintf(os.Stderr, "  %s                                    # Launch settings modal\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s \"gpt=eyJlbmM...\"                   # Load from fragment\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s --dry-run \"eyJlbmM...\"             # Decrypt and output JSON\n", os.Args[0])
	}
	
	flag.Parse()
	
	// Show help if requested
	if *help || *h {
		flag.Usage()
		os.Exit(0)
	}
	
	// Get non-flag arguments
	args := flag.Args()
	
	// Check if we have a URL/fragment argument
	if len(args) > 0 {
		// Parse the URL/fragment argument
		if *dryRun {
			handleDryRun(args[0])
		} else {
			handleURLArgument(args[0])
		}
	} else if *dryRun {
		fmt.Fprintf(os.Stderr, "Error: --dry-run requires a URL, fragment, or encrypted data argument\n")
		os.Exit(1)
	} else {
		// No arguments - show settings modal
		showSettingsModal()
	}
}

// handleDryRun processes a URL/fragment and outputs JSON to stdout
func handleDryRun(arg string) {
	// Ask for password (to stderr so it doesn't interfere with JSON output)
	fmt.Fprint(os.Stderr, "Enter password: ")
	
	password, err := getPasswordSilent()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading password: %v\n", err)
		os.Exit(1)
	}
	
	// Parse the URL
	sharedConfig, err := share.ParseURL(arg, password)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
	
	// Output as pretty JSON to stdout
	output, err := json.MarshalIndent(sharedConfig, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error encoding JSON: %v\n", err)
		os.Exit(1)
	}
	
	fmt.Println(string(output))
}

// handleURLArgument processes a hacka.re URL or fragment
func handleURLArgument(arg string) {
	fmt.Println("╔════════════════════════════════════════════╗")
	fmt.Println("║         hacka.re: serverless agency         ║")
	fmt.Println("╠════════════════════════════════════════════╣")
	fmt.Println("║  Loading shared configuration...            ║")
	fmt.Println("╚════════════════════════════════════════════╝")
	fmt.Println()
	
	// Show what format was detected
	if strings.HasPrefix(arg, "http://") || strings.HasPrefix(arg, "https://") {
		fmt.Println("Format: Full URL")
	} else if strings.HasPrefix(arg, "gpt=") {
		fmt.Println("Format: Fragment with prefix")
	} else {
		fmt.Println("Format: Encrypted data only")
	}
	fmt.Println()

	// Ask for password
	password, err := getPassword("Enter password for shared configuration: ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading password: %v\n", err)
		os.Exit(1)
	}

	// Parse the URL
	sharedConfig, err := share.ParseURL(arg, password)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing shared configuration: %v\n", err)
		fmt.Println("\nThe password may be incorrect or the link may be corrupted.")
		os.Exit(1)
	}

	// Validate the configuration
	if err := share.ValidateConfig(sharedConfig); err != nil {
		fmt.Fprintf(os.Stderr, "Invalid configuration: %v\n", err)
		os.Exit(1)
	}

	// Load into config
	cfg := config.NewConfig()
	cfg.LoadFromSharedConfig(sharedConfig)

	// Display loaded configuration
	fmt.Println("✓ Configuration loaded successfully!")
	fmt.Println()
	displayConfig(cfg)

	// Ask what to do next
	fmt.Println("\nOptions:")
	fmt.Println("  1. Open settings modal")
	fmt.Println("  2. Start chat session")
	fmt.Println("  3. Save configuration to file")
	fmt.Println("  4. Generate QR code")
	fmt.Println("  5. Exit")
	fmt.Print("\nSelect option (1-5): ")

	reader := bufio.NewReader(os.Stdin)
	choice, _ := reader.ReadString('\n')
	choice = strings.TrimSpace(choice)

	switch choice {
	case "1":
		ui.ShowSettings(cfg)
	case "2":
		fmt.Println("\nChat interface coming soon...")
		// TODO: Implement chat interface
	case "3":
		saveConfiguration(cfg)
	case "4":
		generateQRCode(cfg, password)
	case "5":
		fmt.Println("Goodbye!")
	default:
		fmt.Println("Invalid option")
	}
}

// showSettingsModal displays the settings modal when no arguments are provided
func showSettingsModal() {
	// Load existing configuration or create new
	cfg, err := config.LoadFromFile(config.GetConfigPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Could not load configuration: %v\n", err)
		cfg = config.NewConfig()
	}

	// Show the settings UI
	ui.ShowSettings(cfg)
}

// getPassword securely reads a password from stdin
func getPassword(prompt string) (string, error) {
	fmt.Print(prompt)

	// Try to read password without echo
	if term.IsTerminal(int(syscall.Stdin)) {
		bytePassword, err := term.ReadPassword(int(syscall.Stdin))
		fmt.Println() // Print newline after password input
		if err != nil {
			return "", err
		}
		return string(bytePassword), nil
	}

	// Fallback to regular input (for non-terminal environments)
	reader := bufio.NewReader(os.Stdin)
	password, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(password), nil
}

// getPasswordSilent securely reads a password from stdin without printing newline
func getPasswordSilent() (string, error) {
	// Try to read password without echo
	if term.IsTerminal(int(syscall.Stdin)) {
		bytePassword, err := term.ReadPassword(int(syscall.Stdin))
		fmt.Fprintln(os.Stderr) // Print newline to stderr after password input
		if err != nil {
			return "", err
		}
		return string(bytePassword), nil
	}

	// Fallback to regular input (for non-terminal environments)
	reader := bufio.NewReader(os.Stdin)
	password, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(password), nil
}

// displayConfig shows the loaded configuration
func displayConfig(cfg *config.Config) {
	fmt.Println("┌─ Configuration ─────────────────────────────┐")
	
	if cfg.Provider != "" {
		info := config.Providers[cfg.Provider]
		fmt.Printf("│ Provider:     %s %s\n", info.Flag, info.Name)
	}
	
	if cfg.BaseURL != "" {
		fmt.Printf("│ Base URL:     %s\n", truncate(cfg.BaseURL, 30))
	}
	
	if cfg.APIKey != "" {
		masked := maskAPIKey(cfg.APIKey)
		fmt.Printf("│ API Key:      %s\n", masked)
	}
	
	if cfg.Model != "" {
		fmt.Printf("│ Model:        %s\n", cfg.Model)
	}
	
	if cfg.SystemPrompt != "" {
		fmt.Printf("│ System Prompt: %s\n", truncate(cfg.SystemPrompt, 28))
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

// truncate shortens a string to max length with ellipsis
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// maskAPIKey masks an API key for display
func maskAPIKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "..." + key[len(key)-4:]
}

// saveConfiguration saves the configuration to a file
func saveConfiguration(cfg *config.Config) {
	configPath := config.GetConfigPath()
	
	fmt.Printf("\nSaving configuration to: %s\n", configPath)
	
	if err := cfg.SaveToFile(configPath); err != nil {
		fmt.Fprintf(os.Stderr, "Error saving configuration: %v\n", err)
		return
	}
	
	fmt.Println("✓ Configuration saved successfully!")
}

// generateQRCode generates a QR code for sharing the configuration
func generateQRCode(cfg *config.Config, password string) {
	fmt.Println("\nGenerating QR code...")
	
	if password == "" {
		// Ask for a password for the share link
		var err error
		password, err = getPassword("Enter password for share link: ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading password: %v\n", err)
			return
		}
		
		// Confirm password
		confirm, err := getPassword("Confirm password: ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading password: %v\n", err)
			return
		}
		
		if password != confirm {
			fmt.Println("Passwords do not match!")
			return
		}
	}
	
	// Create shareable URL
	sharedConfig := cfg.ToSharedConfig()
	url, err := share.CreateShareableURL(sharedConfig, password, "https://hacka.re/")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating shareable URL: %v\n", err)
		return
	}
	
	// Generate QR code
	if err := ui.ShowQRCode(url); err != nil {
		fmt.Fprintf(os.Stderr, "Error generating QR code: %v\n", err)
		return
	}
	
	fmt.Println("\n✓ QR code generated successfully!")
	fmt.Printf("\nShareable URL:\n%s\n", url)
	fmt.Println("\nShare this QR code or URL to transfer your configuration.")
}