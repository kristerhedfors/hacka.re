package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hacka-re/cli/internal/offline"
	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/cli/internal/utils"
	"github.com/hacka-re/cli/internal/web"
)

// ServeCommand handles the serve subcommand
func ServeCommand(args []string) {
	// Check if first arg is a sub-subcommand
	if len(args) > 0 && args[0] == "api" {
		fmt.Println("API server: To be implemented")
		return
	}
	
	// If first arg is "web", consume it and continue
	if len(args) > 0 && args[0] == "web" {
		args = args[1:]
	}
	// Otherwise, default to web server (no args or other args)
	
	// Create a new flagset for the serve command
	serveFlags := flag.NewFlagSet("serve", flag.ExitOnError)
	
	// Define flags (same as browse but no --no-browser flag)
	port := serveFlags.Int("port", 0, "Port to serve on (default: 8080 or HACKARE_WEB_PORT)")
	portShort := serveFlags.Int("p", 0, "Port to serve on (short form)")
	host := serveFlags.String("host", "localhost", "Host to bind to")
	verbose := serveFlags.Bool("verbose", false, "Verbose mode - log each request")
	verboseShort := serveFlags.Bool("v", false, "Verbose mode - log each request (short form)")
	veryVerbose := serveFlags.Bool("vv", false, "Very verbose mode - log requests with headers")
	offlineMode := serveFlags.Bool("offline", false, "Start in offline mode with local llamafile")
	offlineModeShort := serveFlags.Bool("o", false, "Start in offline mode (short form)")
	help := serveFlags.Bool("help", false, "Show help message")
	helpShort := serveFlags.Bool("h", false, "Show help message (short form)")
	
	// Custom usage
	serveFlags.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s serve [web|api] [OPTIONS] [URL|FRAGMENT|DATA]\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Start a server without opening browser\n\n")
		fmt.Fprintf(os.Stderr, "Subcommands:\n")
		fmt.Fprintf(os.Stderr, "  web          Serve web interface (default)\n")
		fmt.Fprintf(os.Stderr, "  api          Serve API endpoint (not yet implemented)\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		fmt.Fprintf(os.Stderr, "  -p, --port PORT       Port to serve on (default: 8080)\n")
		fmt.Fprintf(os.Stderr, "  --host HOST           Host to bind to (default: localhost)\n")
		fmt.Fprintf(os.Stderr, "  -o, --offline         Start in offline mode with local llamafile\n")
		fmt.Fprintf(os.Stderr, "  -v, --verbose         Log each request (method, path, time)\n")
		fmt.Fprintf(os.Stderr, "  -vv                   Very verbose - log requests with headers\n")
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
		fmt.Fprintf(os.Stderr, "  %s serve                               # Serve web on port 8080\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s serve web                           # Explicitly serve web\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s serve -p 3000                       # Serve on port 3000\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s serve \"gpt=eyJlbmM...\"             # Serve with session\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  HACKARE_SESSION=\"gpt=...\" %s serve    # Load session from env\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s serve api                           # (Future) API server\n", os.Args[0])
	}
	
	// Parse flags
	if err := serveFlags.Parse(args); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing flags: %v\n", err)
		os.Exit(1)
	}
	
	// Show help if requested
	if *help || *helpShort {
		serveFlags.Usage()
		os.Exit(0)
	}

	// Handle offline mode if requested
	if *offlineMode || *offlineModeShort {
		// Start offline mode first
		fmt.Println("Starting offline mode...")
		offlineConfig, err := offline.RunOfflineMode()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error starting offline mode: %v\n", err)
			os.Exit(1)
		}

		// Print offline mode info
		offline.PrintOfflineModeInfo(offlineConfig)

		// Override session with offline configuration
		// The offline config already has the encrypted share URL and password
		remainingArgs := serveFlags.Args()
		if len(remainingArgs) == 0 {
			// Use the offline share URL as the session
			remainingArgs = []string{offlineConfig.ShareURL}
		}

		// Continue with regular serve flow using offline configuration
		// Note: sessionLink and password will be handled below
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
	
	// Determine verbosity level
	verbosityLevel := 0
	if *veryVerbose {
		verbosityLevel = 2
	} else if *verbose || *verboseShort {
		verbosityLevel = 1
	}
	
	// Get non-flag arguments (shared link components)
	remainingArgs := serveFlags.Args()

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
		sharedConfigFragment, err = createFragmentFromConfigServe(sharedConfig, password)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating fragment: %v\n", err)
			os.Exit(1)
		}

		fmt.Println("✓ Session loaded successfully!")
		fmt.Println()
	}
	
	// Print banner
	fmt.Println("╔════════════════════════════════════════════╗")
	fmt.Println("║        hacka.re: serverless agency         ║")
	fmt.Println("╠════════════════════════════════════════════╣")
	fmt.Println("║  Starting web server (no browser)...       ║")
	fmt.Println("╚════════════════════════════════════════════╝")
	fmt.Println()
	
	// Show verbose mode if enabled
	if verbosityLevel == 1 {
		fmt.Println("Verbose mode: Logging requests")
	} else if verbosityLevel == 2 {
		fmt.Println("Very verbose mode: Logging requests with headers")
	}
	
	// Create and start ZIP-based server with verbosity
	server, err := web.NewZipServer(*host, serverPort, verbosityLevel)
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
	
	// Show the URL (with fragment if applicable)
	serverURL := server.GetURL()
	if sharedConfigFragment != "" {
		fmt.Printf("Web server started at: %s/#%s\n", serverURL, sharedConfigFragment)
	} else {
		fmt.Printf("Web server started at: %s\n", serverURL)
	}
	fmt.Println("Open this URL in your browser to access hacka.re")
	
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

// createFragmentFromConfigServe creates a URL fragment from a shared configuration
func createFragmentFromConfigServe(sharedConfig *share.SharedConfig, password string) (string, error) {
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

