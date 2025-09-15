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
		fmt.Fprintf(os.Stderr, "  URL          Full hacka.re URL to load configuration from\n")
		fmt.Fprintf(os.Stderr, "  FRAGMENT     Fragment with prefix (gpt=...)\n")
		fmt.Fprintf(os.Stderr, "  DATA         Just the encrypted data (eyJlbmM...)\n\n")
		fmt.Fprintf(os.Stderr, "Examples:\n")
		fmt.Fprintf(os.Stderr, "  %s chat                                # Start with saved config\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s chat \"gpt=eyJlbmM...\"              # Load config from fragment\n", os.Args[0])
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
	
	// Check if we have a URL/fragment argument
	if len(args) > 0 {
		// Parse the URL to get configuration
		fmt.Println("Loading configuration from URL...")
		
		// Ask for password
		password, err := getPassword("Enter password for shared configuration: ")
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