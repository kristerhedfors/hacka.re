package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/hacka-re/cli/internal/browser"
	"github.com/hacka-re/cli/internal/offline"
	"github.com/hacka-re/cli/internal/share"
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
	offlineMode := browseFlags.Bool("offline", false, "Start in offline mode with local llamafile")
	offlineModeShort := browseFlags.Bool("o", false, "Start in offline mode (short form)")
	help := browseFlags.Bool("help", false, "Show help message")
	helpShort := browseFlags.Bool("h", false, "Show help message (short form)")

	// Custom usage
	browseFlags.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s browse [OPTIONS] [URL|FRAGMENT|DATA]\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Start a local web server and open the default browser\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		fmt.Fprintf(os.Stderr, "  -p, --port PORT       Port to serve on (default: 8080)\n")
		fmt.Fprintf(os.Stderr, "  --host HOST           Host to bind to (default: localhost)\n")
		fmt.Fprintf(os.Stderr, "  -o, --offline         Start in offline mode with local llamafile\n")
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
		fmt.Fprintf(os.Stderr, "\nTo open a specific browser with profile support, use:\n")
		fmt.Fprintf(os.Stderr, "  %s firefox --profile work              # Firefox with 'work' profile\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s chrome --profile-directory=\"Profile 1\"  # Chrome with profile\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s brave --profile Dev                 # Brave with 'Dev' profile\n", os.Args[0])
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

	// Handle offline mode if requested
	var offlineConfig *offline.Config
	if *offlineMode || *offlineModeShort {
		// Start offline mode first
		fmt.Println("Starting offline mode...")
		var err error
		var llamafileManager *offline.LlamafileManager
		offlineConfig, llamafileManager, err = offline.RunOfflineMode(nil, "")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error starting offline mode: %v\n", err)
			os.Exit(1)
		}
		// Ensure llamafile is stopped on exit
		defer func() {
			if llamafileManager != nil {
				fmt.Println("Stopping llamafile server...")
				llamafileManager.Stop()
			}
		}()

		// Print offline mode info
		offline.PrintOfflineModeInfo(offlineConfig)
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

	// Determine session source: offline mode takes precedence, then command line, then environment
	if offlineConfig != nil {
		// Use offline configuration
		sessionLink = offlineConfig.ShareURL
		sessionSource = "offline mode"
	} else if len(remainingArgs) > 0 {
		sessionLink = remainingArgs[0]
		sessionSource = "command line"
	} else if envSession != "" {
		sessionLink = envSession
		envVar, _ := share.GetEnvironmentSessionSource()
		sessionSource = fmt.Sprintf("environment variable %s", envVar)
	}

	// Create browser launcher for default browser
	launcher := browser.NewBrowserLauncher(browser.DefaultBrowser, "")

	// Create server config
	config := &browser.ServerConfig{
		Host:          *host,
		Port:          serverPort,
		Verbose:       0,
		SessionLink:   sessionLink,
		SessionSource: sessionSource,
	}

	// Add offline password if in offline mode
	if offlineConfig != nil {
		config.Password = offlineConfig.Password
	}

	// Start server and open default browser
	if err := browser.StartServerAndBrowser(config, launcher); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

