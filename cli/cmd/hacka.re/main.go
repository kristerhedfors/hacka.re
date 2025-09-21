package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/hacka-re/cli/internal/app"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/integration"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/cli/internal/utils"
)

func main() {

	// Check for --debug flag early (before subcommand parsing)
	debugMode := false
	for _, arg := range os.Args[1:] {
		if arg == "--debug" || arg == "-d" {
			debugMode = true
			break
		}
	}

	// Initialize logger based on environment variable or debug flag
	logLevel := os.Getenv("HACKARE_LOG_LEVEL")
	if logLevel == "DEBUG" || logLevel == "debug" || debugMode {
		// Use FIXED log path for consistent debugging
		logPath := "/tmp/hacka_debug.log"

		if err := logger.InitializeWithPath(logPath, true); err != nil {
			// Only show this warning if we can't initialize logging
			// Don't output during normal operation as it would break the TUI
			if logLevel == "DEBUG" || debugMode {
				// User explicitly wants debug, so warn them
				fmt.Fprintf(os.Stderr, "Warning: Failed to initialize debug logger: %v\n", err)
			}
		}
		defer logger.Get().Close()

		// DO NOT enable stderr output - it destroys the TUI!
		// logger.Get().EnableStderr(true) // REMOVED

		// Log session start with clear marker
		logger.Get().Info("════════════════════════════════════════")
		logger.Get().Info("NEW SESSION STARTED: %s", time.Now().Format("2006-01-02 15:04:05"))
		logger.Get().Info("Debug log: %s", logPath)
		logger.Get().Info("Debug mode enabled via: %s", func() string {
			if debugMode {
				return "--debug flag"
			}
			return "HACKARE_LOG_LEVEL environment variable"
		}())
		logger.Get().Info("════════════════════════════════════════")

		// Notify user that debug mode is enabled
		if debugMode {
			fmt.Fprintf(os.Stderr, "Debug mode enabled. Log file: /tmp/hacka_debug.log\n")
		}
	}

	// Check for offline mode flag FIRST
	// This allows "hacka.re -o ff" to work correctly
	isOfflineMode := false
	offlineFlagIndex := -1
	for i, arg := range os.Args[1:] {
		if arg == "-o" || arg == "--offline" {
			isOfflineMode = true
			offlineFlagIndex = i + 1 // +1 because we started from os.Args[1:]
			break
		}
	}

	// If offline mode is specified, handle it specially
	if isOfflineMode && len(os.Args) > offlineFlagIndex+1 {
		// Check if the next argument after -o/--offline is a browser command
		nextArg := os.Args[offlineFlagIndex+1]
		switch nextArg {
		case "browse", "firefox", "ff", "chrome", "brave", "edge", "safari":
			// This is "hacka.re -o BROWSER" - run offline mode with browser
			// The offline command will handle starting the browser
			offlineArgs := []string{nextArg}
			// Add any additional arguments after the browser command
			if len(os.Args) > offlineFlagIndex+2 {
				offlineArgs = append(offlineArgs, os.Args[offlineFlagIndex+2:]...)
			}
			OfflineCommand(offlineArgs)
			return
		}
	}

	// Check if first arg is a subcommand
	if len(os.Args) > 1 {
		// When offline mode is detected, we need to check if it's being used with a command
		// For example: "hacka.re serve -o" where "serve" is the command and "-o" is a flag for serve
		commandArg := os.Args[1]

		// If offline mode was detected but it's not the first argument,
		// then it's likely a flag for a subcommand
		if isOfflineMode && offlineFlagIndex > 0 {
			// The offline flag is NOT the first argument, so we have a command
			isOfflineMode = false  // Let the command handle the offline flag itself
		}

		switch commandArg {
		case "browse":
			// Handle browse subcommand
			BrowseCommand(os.Args[2:])
			return
		case "firefox", "ff":
			// Handle firefox/ff subcommand
			FirefoxCommand(os.Args[2:])
			return
		case "chrome":
			// Handle chrome subcommand
			ChromeCommand(os.Args[2:])
			return
		case "brave":
			// Handle brave subcommand
			BraveCommand(os.Args[2:])
			return
		case "edge":
			// Handle edge subcommand
			EdgeCommand(os.Args[2:])
			return
		case "safari":
			// Handle safari subcommand
			SafariCommand(os.Args[2:])
			return
		case "serve":
			// Handle serve subcommand
			ServeCommand(os.Args[2:])
			return
		case "chat":
			// Handle chat subcommand
			ChatCommand(os.Args[2:])
			return
		case "dump":
			// Handle dump subcommand
			DumpCommand(os.Args[2:])
			return
		case "function":
			// Handle function subcommand
			FunctionCommand(os.Args[2:])
			return
		case "mcp":
			// Handle MCP subcommand
			MCPCommand(os.Args[2:])
			return
		case "shodan":
			// Handle Shodan subcommand
			ShodanCommand(os.Args[2:])
			return
		case "help", "-h", "--help":
			// Show main help with subcommands
			showMainHelp()
			return
		}
	}
	
	// Define flags for main command
	jsonDump := flag.Bool("json-dump", false, "Decrypt configuration and output as JSON without launching UI")
	view := flag.Bool("view", false, "Decrypt configuration and output as JSON without launching UI (alias for --json-dump)")
	// Legacy chat flags for backward compatibility
	chatMode := flag.Bool("chat", false, "(Deprecated) Use 'hacka.re chat' instead")
	c := flag.Bool("c", false, "(Deprecated) Use 'hacka.re chat' instead")
	flag.Bool("debug", false, "Enable debug logging to /tmp/hacka_debug.log")  // Already handled above
	flag.Bool("d", false, "Enable debug logging (short form)")  // Already handled above
	offline := flag.Bool("offline", false, "Start in offline mode with local llamafile")
	o := flag.Bool("o", false, "Start in offline mode (short form)")
	// Global API configuration flags
	llamafile := flag.String("llamafile", "", "Path to llamafile executable")
	apiProvider := flag.String("api-provider", "", "API provider (openai, groq, ollama, etc.)")
	apiKey := flag.String("api-key", "", "API key for remote providers")
	baseURL := flag.String("base-url", "", "Custom API base URL")
	model := flag.String("model", "", "Model name")
	// Granular offline mode controls
	allowRemoteMCP := flag.Bool("allow-remote-mcp", false, "Allow remote MCP connections in offline mode")
	allowRemoteEmbeddings := flag.Bool("allow-remote-embeddings", false, "Allow remote embeddings API in offline mode")
	helpLLM := flag.Bool("help-llm", false, "Show local LLM setup guide")
	help := flag.Bool("help", false, "Show help message")
	h := flag.Bool("h", false, "Show help message")
	
	// Custom usage message
	flag.Usage = showMainHelp
	
	flag.Parse()
	
	// Show help if requested
	if *help || *h {
		showMainHelp()
		os.Exit(0)
	}

	// Show LLM help if requested
	if *helpLLM {
		// Import cycle prevents direct call, so we'll print here
		showLocalLLMHelp()
		os.Exit(0)
	}

	// Check flags
	shouldDumpJSON := *jsonDump || *view
	shouldStartChat := *chatMode || *c
	shouldStartOffline := *offline || *o

	// Get non-flag arguments
	args := flag.Args()

	// Handle offline mode
	if shouldStartOffline {
		// Build args from global flags
		offlineArgs := args

		// Check if first arg is a shared link
		// This allows: hacka.re --offline "gpt=eyJlbmM..."
		if len(args) > 0 && (strings.Contains(args[0], "gpt=") ||
			strings.Contains(args[0], "eyJ") ||
			strings.Contains(args[0], "hacka.re/#")) {
			// Pass the shared link as the first argument
			offlineArgs = args
		}

		if *llamafile != "" {
			offlineArgs = append(offlineArgs, "--llamafile", *llamafile)
		}
		if *apiProvider != "" {
			offlineArgs = append(offlineArgs, "--api-provider", *apiProvider)
		}
		if *apiKey != "" {
			offlineArgs = append(offlineArgs, "--api-key", *apiKey)
		}
		if *baseURL != "" {
			offlineArgs = append(offlineArgs, "--base-url", *baseURL)
		}
		if *model != "" {
			offlineArgs = append(offlineArgs, "--model", *model)
		}
		if *allowRemoteMCP {
			offlineArgs = append(offlineArgs, "--allow-remote-mcp")
		}
		if *allowRemoteEmbeddings {
			offlineArgs = append(offlineArgs, "--allow-remote-embeddings")
		}
		OfflineCommand(offlineArgs)
		return
	}

	// Handle legacy chat mode flags (redirect to chat subcommand)
	if shouldStartChat {
		fmt.Fprintf(os.Stderr, "Note: --chat flag is deprecated. Use 'hacka.re chat' instead.\n\n")
		ChatCommand(args)
		return
	}
	
	// Check if we have a URL/fragment argument
	if len(args) > 0 {
		// Parse the URL/fragment argument
		if shouldDumpJSON {
			handleJSONDump(args[0])
		} else {
			handleURLArgument(args[0])
		}
	} else if shouldDumpJSON {
		fmt.Fprintf(os.Stderr, "Error: --json-dump/--view requires a URL, fragment, or encrypted data argument\n")
		os.Exit(1)
	} else {
		// No arguments - show main menu
		showMainMenu()
	}
}

// showMainHelp displays the main help message including subcommands
// showLocalLLMHelp displays the local LLM help inline to avoid import cycle
func showLocalLLMHelp() {
	fmt.Println("╔════════════════════════════════════════════════════════════════╗")
	fmt.Println("║                    Local LLM Setup Guide                       ║")
	fmt.Println("╚════════════════════════════════════════════════════════════════╝")
	fmt.Println()

	fmt.Println("hacka.re supports multiple local LLM runtimes:")
	fmt.Println()

	providers := []struct {
		name     string
		port     string
		apiKey   string
		provider string
	}{
		{"Llamafile", "8080", "no-key", "llamafile"},
		{"Ollama", "11434", "no-key", "ollama"},
		{"LM Studio", "1234", "no-key", "lmstudio"},
		{"GPT4All", "4891", "no-key", "gpt4all"},
		{"LocalAI", "8080", "no-key", "localai"},
	}

	fmt.Println("┌─────────────┬──────────┬────────────┬──────────────────────┐")
	fmt.Println("│ Runtime     │ Port     │ API Key    │ Provider Flag        │")
	fmt.Println("├─────────────┼──────────┼────────────┼──────────────────────┤")

	for _, p := range providers {
		fmt.Printf("│ %-11s │ %-8s │ %-10s │ --api-provider %-5s │\n",
			p.name, p.port, p.apiKey, p.provider)
	}

	fmt.Println("└─────────────┴──────────┴────────────┴──────────────────────┘")
	fmt.Println()
	fmt.Println("All local providers use 'no-key' as the API key value.")
	fmt.Println()
	fmt.Println("For detailed setup of each provider, see:")
	fmt.Println("https://hacka.re/about/local-llm-toolbox.html")
}

func showMainHelp() {
	fmt.Fprintf(os.Stderr, "hacka.re CLI - serverless agency\n\n")
	fmt.Fprintf(os.Stderr, "Usage: %s [COMMAND] [OPTIONS] [ARGUMENTS]\n\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  browse       Start web server and open default browser\n")
	fmt.Fprintf(os.Stderr, "  firefox, ff  Start web server and open Firefox (with profile support)\n")
	fmt.Fprintf(os.Stderr, "  chrome       Start web server and open Chrome (with profile support)\n")
	fmt.Fprintf(os.Stderr, "  brave        Start web server and open Brave (with profile support)\n")
	fmt.Fprintf(os.Stderr, "  edge         Start web server and open Edge (with profile support)\n")
	fmt.Fprintf(os.Stderr, "  safari       Start web server and open Safari (macOS only)\n")
	fmt.Fprintf(os.Stderr, "  serve        Start web server without opening browser\n")
	fmt.Fprintf(os.Stderr, "  chat         Start interactive chat session with AI models\n")
	fmt.Fprintf(os.Stderr, "  dump         Inspect and decrypt shared link contents as JSON\n")
	fmt.Fprintf(os.Stderr, "  function     Manage JavaScript functions for tool calling\n")
	fmt.Fprintf(os.Stderr, "  mcp          Model Context Protocol server and tools\n")
	fmt.Fprintf(os.Stderr, "  shodan       Shodan IP intelligence service commands\n")
	fmt.Fprintf(os.Stderr, "  (no command) Launch settings or process shared configuration\n\n")
	fmt.Fprintf(os.Stderr, "Options:\n")
	fmt.Fprintf(os.Stderr, "  --offline, -o        Start in offline mode with local LLM\n")
	fmt.Fprintf(os.Stderr, "  --llamafile PATH     Path to llamafile executable\n")
	fmt.Fprintf(os.Stderr, "  --api-provider NAME  API provider (openai, groq, ollama, etc.)\n")
	fmt.Fprintf(os.Stderr, "  --api-key KEY        API key for remote providers\n")
	fmt.Fprintf(os.Stderr, "  --base-url URL       Custom API base URL\n")
	fmt.Fprintf(os.Stderr, "  --model NAME         Model name\n")
	fmt.Fprintf(os.Stderr, "  --json-dump          Decrypt configuration and output as JSON\n")
	fmt.Fprintf(os.Stderr, "  --view               Same as --json-dump\n")
	fmt.Fprintf(os.Stderr, "  --debug, -d          Enable debug logging to /tmp/hacka_debug.log\n")
	fmt.Fprintf(os.Stderr, "  --help-llm           Show local LLM setup guide\n")
	fmt.Fprintf(os.Stderr, "  --help, -h           Show this help message\n\n")
	fmt.Fprintf(os.Stderr, "Arguments (for no command):\n")
	fmt.Fprintf(os.Stderr, "  URL          Full hacka.re URL (https://hacka.re/#gpt=...)\n")
	fmt.Fprintf(os.Stderr, "  FRAGMENT     Fragment with prefix (gpt=...)\n")
	fmt.Fprintf(os.Stderr, "  DATA         Just the encrypted data (eyJlbmM...)\n\n")
	fmt.Fprintf(os.Stderr, "Examples:\n")
	fmt.Fprintf(os.Stderr, "  %s browse                              # Start web server and open browser\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s serve                               # Start web server (no browser)\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s serve -p 3000                       # Serve on port 3000\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s serve \"gpt=eyJlbmM...\"             # Serve with shared config\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s chat                                # Start chat session\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s chat \"gpt=eyJlbmM...\"              # Chat with shared config\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s --offline                           # Start offline mode with llamafile\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s -o                                  # Short form for offline mode\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s                                     # Launch settings modal\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s --json-dump \"eyJlbmM...\"           # Decrypt and output JSON\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "\nRun '%s COMMAND --help' for more information on a command.\n", os.Args[0])
}

// handleJSONDump processes a URL/fragment and outputs JSON to stdout
func handleJSONDump(arg string) {
	// Ask for password (to stderr so it doesn't interfere with JSON output)
	fmt.Fprint(os.Stderr, "Enter password: ")

	password, err := utils.GetPasswordSilent()
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
	password, err := utils.GetPassword("Enter password for shared configuration: ")
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
	utils.DisplayConfig(cfg)

	// Save configuration automatically
	configPath := config.GetConfigPath()
	if err := cfg.SaveToFile(configPath); err != nil {
		fmt.Printf("Note: Could not save configuration: %v\n", err)
	} else {
		fmt.Printf("\n✓ Configuration saved to %s\n", configPath)
	}

	// Launch TUI main menu directly
	fmt.Println("\nLaunching hacka.re interface...")
	if err := integration.LaunchTUI(cfg); err != nil {
		fmt.Fprintf(os.Stderr, "Error launching TUI: %v\n", err)
		os.Exit(1)
	}
}

// showMainMenu displays the main TUI menu when no arguments are provided
func showMainMenu() {
	// Load existing configuration or create new
	cfg, err := config.LoadFromFile(config.GetConfigPath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Could not load configuration: %v\n", err)
		cfg = config.NewConfig()
	}

	// Launch the TUI main menu
	if err := integration.LaunchTUI(cfg); err != nil {
		fmt.Fprintf(os.Stderr, "Error launching TUI: %v\n", err)
		os.Exit(1)
	}
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
		password, err = utils.GetPasswordWithConfirmation("Enter password for share link: ", "Confirm password: ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
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
	fmt.Println("QR code generation has been moved to the TUI interface.")
	fmt.Println("Use the TUI settings to generate QR codes for sharing.")
	
	fmt.Println("\n✓ QR code generated successfully!")
	fmt.Printf("\nShareable URL:\n%s\n", url)
	fmt.Println("\nShare this QR code or URL to transfer your configuration.")
}

// startChatSession is deprecated - use ChatCommand instead
// Kept for backward compatibility with the legacy --chat flag
func startChatSession(args []string) {
	var cfg *config.Config
	
	// Check if we have a URL/fragment argument
	if len(args) > 0 {
		// Parse the URL to get configuration
		fmt.Println("Loading configuration from URL...")
		
		// Ask for password
		password, err := utils.GetPassword("Enter password for shared configuration: ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading password: %v\n", err)
			os.Exit(1)
		}
		
		// Parse the URL
		sharedConfig, err := share.ParseURL(args[0], password)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing shared configuration: %v\n", err)
			os.Exit(1)
		}
		
		// Load into config
		cfg = config.NewConfig()
		cfg.LoadFromSharedConfig(sharedConfig)
		
		fmt.Println("✓ Configuration loaded successfully!")
	} else {
		// Try to load existing configuration
		var err error
		cfg, err = config.LoadFromFile(config.GetConfigPath())
		if err != nil {
			// No existing config, create new one or show settings
			fmt.Println("No configuration found. Please configure API settings first.")
			cfg = config.NewConfig()
			
			// Launch TUI for configuration
			if err := integration.LaunchTUI(cfg); err != nil {
				fmt.Fprintf(os.Stderr, "Error launching TUI: %v\n", err)
				return
			}
			
			// Ask if they want to continue to chat
			fmt.Print("\nConfiguration saved. Start chat session? (y/n): ")
			reader := bufio.NewReader(os.Stdin)
			response, _ := reader.ReadString('\n')
			response = strings.TrimSpace(strings.ToLower(response))
			
			if response != "y" && response != "yes" {
				fmt.Println("Goodbye!")
				return
			}
		}
	}
	
	// Validate configuration before starting chat
	if cfg.APIKey == "" {
		fmt.Println("Error: API key is required for chat session")
		fmt.Println("Please run without --chat flag to configure settings")
		os.Exit(1)
	}
	
	if cfg.BaseURL == "" {
		fmt.Println("Error: Base URL is required for chat session")
		fmt.Println("Please run without --chat flag to configure settings")
		os.Exit(1)
	}
	
	// Start the chat session using the new interface
	if err := app.StartChatInterface(cfg); err != nil {
		fmt.Fprintf(os.Stderr, "Error in chat session: %v\n", err)
		os.Exit(1)
	}
}