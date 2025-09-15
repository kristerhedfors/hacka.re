package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/hacka-re/cli/internal/chat"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/cli/internal/ui"
)

// ChatCommand handles the chat subcommand
func ChatCommand(args []string) {
	// Create a new flagset for the chat command
	chatFlags := flag.NewFlagSet("chat", flag.ExitOnError)
	
	// Define flags
	help := chatFlags.Bool("help", false, "Show help message")
	helpShort := chatFlags.Bool("h", false, "Show help message (short form)")
	
	// Custom usage
	chatFlags.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s chat [OPTIONS] [URL|FRAGMENT|DATA]\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Start an interactive chat session with AI models\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		fmt.Fprintf(os.Stderr, "  -h, --help            Show this help message\n\n")
		fmt.Fprintf(os.Stderr, "Arguments:\n")
		fmt.Fprintf(os.Stderr, "  URL          Full hacka.re URL to load session from\n")
		fmt.Fprintf(os.Stderr, "  FRAGMENT     Fragment with prefix (gpt=...)\n")
		fmt.Fprintf(os.Stderr, "  DATA         Just the encrypted data (eyJlbmM...)\n\n")
		fmt.Fprintf(os.Stderr, "Environment Variables:\n")
		fmt.Fprintf(os.Stderr, "  HACKARE_LINK          Session link (synonymous with HACKARE_SESSION/CONFIG)\n")
		fmt.Fprintf(os.Stderr, "  HACKARE_SESSION       Session link (synonymous with HACKARE_LINK/CONFIG)\n")
		fmt.Fprintf(os.Stderr, "  HACKARE_CONFIG        Session link (synonymous with HACKARE_LINK/SESSION)\n\n")
		fmt.Fprintf(os.Stderr, "Note: HACKARE_LINK, HACKARE_SESSION, and HACKARE_CONFIG are synonymous.\n")
		fmt.Fprintf(os.Stderr, "      They all accept the same formats as command line arguments.\n")
		fmt.Fprintf(os.Stderr, "      Only ONE should be set - setting multiple will cause an error.\n\n")
		fmt.Fprintf(os.Stderr, "Examples:\n")
		fmt.Fprintf(os.Stderr, "  %s chat                                # Start with saved config\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s chat \"gpt=eyJlbmM...\"              # Load session from fragment\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  HACKARE_SESSION=\"gpt=...\" %s chat     # Load session from env\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "\nNote: If no configuration exists, you'll be prompted to set it up first.\n")
	}
	
	// Parse flags
	if err := chatFlags.Parse(args); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing flags: %v\n", err)
		os.Exit(1)
	}
	
	// Show help if requested
	if *help || *helpShort {
		chatFlags.Usage()
		os.Exit(0)
	}
	
	// Get non-flag arguments
	remainingArgs := chatFlags.Args()
	
	// Start the chat session
	startChatWithArgs(remainingArgs)
}

// startChatWithArgs starts a chat session, optionally loading config from URL
func startChatWithArgs(args []string) {
	var cfg *config.Config

	// Check for session from environment first, then command line
	var sessionLink string
	var sessionSource string

	// Check environment variables for session
	envSession, err := share.GetSessionFromEnvironment()
	if err != nil {
		// Multiple session env vars defined - this is an error
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	// Determine session source: command line takes precedence over environment
	if len(args) > 0 {
		sessionLink = args[0]
		sessionSource = "command line"
	} else if envSession != "" {
		sessionLink = envSession
		envVar, _ := share.GetEnvironmentSessionSource()
		sessionSource = fmt.Sprintf("environment variable %s", envVar)
	}

	// Check if we have a session link to process
	if sessionLink != "" {
		// Parse the session link
		fmt.Printf("Loading session from %s...\n", sessionSource)

		// Ask for password
		password, err := getPassword("Enter password for session: ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading password: %v\n", err)
			os.Exit(1)
		}

		// Parse the URL
		sharedConfig, err := share.ParseURL(sessionLink, password)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing session: %v\n", err)
			os.Exit(1)
		}

		// Load into config
		cfg = config.NewConfig()
		cfg.LoadFromSharedConfig(sharedConfig)

		fmt.Println("✓ Session loaded successfully!")
	} else {
		// Try to load existing configuration
		var err error
		cfg, err = config.LoadFromFile(config.GetConfigPath())
		if err != nil {
			// No existing config, create new one or show settings
			fmt.Println("No configuration found. Please configure API settings first.")
			cfg = config.NewConfig()
			
			// Show settings UI first
			ui.ShowSettings(cfg)
			
			// Ask if they want to continue to chat
			fmt.Print("\nConfiguration saved. Start chat session? (y/n): ")
			var response string
			fmt.Scanln(&response)
			
			if response != "y" && response != "yes" {
				fmt.Println("Goodbye!")
				return
			}
		}
	}
	
	// Validate configuration before starting chat
	if cfg.APIKey == "" {
		fmt.Println("Error: API key is required for chat session")
		fmt.Println("Please run 'hacka.re' to configure settings")
		os.Exit(1)
	}
	
	if cfg.BaseURL == "" {
		fmt.Println("Error: Base URL is required for chat session")
		fmt.Println("Please run 'hacka.re' to configure settings")
		os.Exit(1)
	}
	
	// Start the chat session
	if err := chat.StartChat(cfg); err != nil {
		fmt.Fprintf(os.Stderr, "Error in chat session: %v\n", err)
		os.Exit(1)
	}
}