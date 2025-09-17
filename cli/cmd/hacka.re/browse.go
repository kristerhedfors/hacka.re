package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/cli/internal/utils"
	"github.com/hacka-re/cli/internal/web"
)

// BrowseCommand handles the browse subcommand
func BrowseCommand(args []string) {
	// Create a new flagset for the browse command
	browseFlags := flag.NewFlagSet("browse", flag.ExitOnError)
	
	// Define flags
	port := browseFlags.Int("port", 0, "Port to serve on (default: 8080 or HACKARE_WEB_PORT)")
	portShort := browseFlags.Int("p", 0, "Port to serve on (short form)")
	host := browseFlags.String("host", "localhost", "Host to bind to")
	// Removed --no-browser flag as we have 'serve' command for that
	help := browseFlags.Bool("help", false, "Show help message")
	helpShort := browseFlags.Bool("h", false, "Show help message (short form)")
	
	// Custom usage
	browseFlags.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s browse [OPTIONS] [URL|FRAGMENT|DATA]\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Start a local web server to browse hacka.re interface\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		fmt.Fprintf(os.Stderr, "  -p, --port PORT       Port to serve on (default: 8080)\n")
		fmt.Fprintf(os.Stderr, "  --host HOST           Host to bind to (default: localhost)\n")
		fmt.Fprintf(os.Stderr, "  -h, --help            Show this help message\n\n")
		fmt.Fprintf(os.Stderr, "Arguments:\n")
		fmt.Fprintf(os.Stderr, "  URL          Full hacka.re URL to load session from\n")
		fmt.Fprintf(os.Stderr, "  FRAGMENT     Fragment with prefix (gpt=...)\n")
		fmt.Fprintf(os.Stderr, "  DATA         Just the encrypted data (eyJlbmM...)\n\n")
		fmt.Fprintf(os.Stderr, "Environment Variables:\n")
		fmt.Fprintf(os.Stderr, "  HACKARE_WEB_PORT      Default port if not specified via flag\n")
		fmt.Fprintf(os.Stderr, "  HACKARE_LINK          Session link (synonymous with HACKARE_SESSION/CONFIG)\n")
		fmt.Fprintf(os.Stderr, "  HACKARE_SESSION       Session link (synonymous with HACKARE_LINK/CONFIG)\n")
		fmt.Fprintf(os.Stderr, "  HACKARE_CONFIG        Session link (synonymous with HACKARE_LINK/SESSION)\n\n")
		fmt.Fprintf(os.Stderr, "Note: HACKARE_LINK, HACKARE_SESSION, and HACKARE_CONFIG are synonymous.\n")
		fmt.Fprintf(os.Stderr, "      They all accept the same formats as command line arguments.\n")
		fmt.Fprintf(os.Stderr, "      Only ONE should be set - setting multiple will cause an error.\n\n")
		fmt.Fprintf(os.Stderr, "Examples:\n")
		fmt.Fprintf(os.Stderr, "  %s browse                              # Start on port 8080\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s browse -p 3000                      # Start on port 3000\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s browse \"gpt=eyJlbmM...\"            # Load session and browse\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  HACKARE_WEB_PORT=9000 %s browse        # Use env var for port\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  HACKARE_SESSION=\"gpt=...\" %s browse    # Load session from env\n", os.Args[0])
	}
	
	// Parse flags
	if err := browseFlags.Parse(args); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing flags: %v\n", err)
		os.Exit(1)
	}
	
	// Show help if requested
	if *help || *helpShort {
		browseFlags.Usage()
		os.Exit(0)
	}
	
	// Determine port
	serverPort := 8080
	if *port != 0 {
		serverPort = *port
	} else if *portShort != 0 {
		serverPort = *portShort
	} else {
		// Check environment variable
		serverPort = web.GetPortFromEnv(8080)
	}
	
	// Validate port
	if serverPort < 1 || serverPort > 65535 {
		fmt.Fprintf(os.Stderr, "Error: Invalid port number %d\n", serverPort)
		os.Exit(1)
	}
	
	// Get non-flag arguments (shared link components)
	remainingArgs := browseFlags.Args()

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
	if len(remainingArgs) > 0 {
		sessionLink = remainingArgs[0]
		sessionSource = "command line"
	} else if envSession != "" {
		sessionLink = envSession
		envVar, _ := share.GetEnvironmentSessionSource()
		sessionSource = fmt.Sprintf("environment variable %s", envVar)
	}

	// Process session if provided
	var sharedConfigFragment string
	if sessionLink != "" {
		// Parse the session link
		fmt.Printf("Processing session from %s...\n", sessionSource)

		// Ask for password
		password, err := utils.GetPassword("Enter password for session: ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading password: %v\n", err)
			os.Exit(1)
		}

		// Parse the URL/fragment
		sharedConfig, err := share.ParseURL(sessionLink, password)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing session: %v\n", err)
			fmt.Println("\nThe password may be incorrect or the link may be corrupted.")
			os.Exit(1)
		}

		// Validate the configuration
		if err := share.ValidateConfig(sharedConfig); err != nil {
			fmt.Fprintf(os.Stderr, "Invalid session configuration: %v\n", err)
			os.Exit(1)
		}

		// Create a new shareable URL fragment for the web interface
		// This will be appended to the URL when opening the browser
		sharedConfigFragment, err = createFragmentFromConfig(sharedConfig, password)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating fragment: %v\n", err)
			os.Exit(1)
		}

		fmt.Println("✓ Session loaded successfully!")
		fmt.Println()
	}
	
	// Print banner
	utils.PrintBannerWithMessage("Starting local web server...")
	fmt.Println()
	
	// Create and start ZIP-based server
	server, err := web.NewZipServer(*host, serverPort, 0) // 0 = no verbose logging for browse
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating server: %v\n", err)
		os.Exit(1)
	}
	
	// Handle interrupt signal for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	
	// Start server in goroutine
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- server.Start()
	}()
	
	// Give server a moment to start
	time.Sleep(100 * time.Millisecond)
	
	// Always open browser (use 'serve' command if you don't want browser)
	browserURL := server.GetURL()
	
	// Append fragment if we have a shared configuration
	if sharedConfigFragment != "" {
		browserURL = browserURL + "/#" + sharedConfigFragment
	}
	
	if err := openBrowser(browserURL); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Could not open browser automatically: %v\n", err)
		fmt.Printf("Please open your browser and navigate to: %s\n", browserURL)
	} else {
		fmt.Printf("Opening browser at: %s\n", browserURL)
	}
	
	// Wait for interrupt or server error
	select {
	case <-sigChan:
		fmt.Println("\nShutting down server...")
		if err := server.Stop(); err != nil {
			fmt.Fprintf(os.Stderr, "Error stopping server: %v\n", err)
		}
		fmt.Println("Server stopped.")
	case err := <-serverErr:
		if err != nil {
			fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
			os.Exit(1)
		}
	}
}

// openBrowser opens the default browser to the specified URL
func openBrowser(url string) error {
	var cmd *exec.Cmd
	
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		// Try xdg-open first, then fallback to others
		if _, err := exec.LookPath("xdg-open"); err == nil {
			cmd = exec.Command("xdg-open", url)
		} else if _, err := exec.LookPath("gnome-open"); err == nil {
			cmd = exec.Command("gnome-open", url)
		} else if _, err := exec.LookPath("kde-open"); err == nil {
			cmd = exec.Command("kde-open", url)
		} else {
			return fmt.Errorf("no suitable browser opener found")
		}
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}
	
	return cmd.Start()
}

// createFragmentFromConfig creates a URL fragment from a shared configuration
func createFragmentFromConfig(sharedConfig *share.SharedConfig, password string) (string, error) {
	// Convert shared config to JSON
	configJSON, err := json.Marshal(sharedConfig)
	if err != nil {
		return "", fmt.Errorf("failed to marshal config: %w", err)
	}
	
	// Encrypt the configuration
	encryptedData, err := share.EncryptConfig(configJSON, password)
	if err != nil {
		return "", fmt.Errorf("failed to encrypt config: %w", err)
	}
	
	// Create the fragment (just the gpt=... part, not the full URL)
	fragment := "gpt=" + url.QueryEscape(encryptedData)
	
	return fragment, nil
}

