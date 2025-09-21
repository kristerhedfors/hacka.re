package browser

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/cli/internal/utils"
	"github.com/hacka-re/cli/internal/web"
)

// BrowserType represents different browser types
type BrowserType string

const (
	DefaultBrowser BrowserType = "default"
	Firefox        BrowserType = "firefox"
	Chrome         BrowserType = "chrome"
	Brave          BrowserType = "brave"
	Edge           BrowserType = "edge"
	Safari         BrowserType = "safari"
)

// BrowserLauncher handles browser-specific launching
type BrowserLauncher struct {
	Type    BrowserType
	Profile string
}

// NewBrowserLauncher creates a new browser launcher
func NewBrowserLauncher(browserType BrowserType, profile string) *BrowserLauncher {
	return &BrowserLauncher{
		Type:    browserType,
		Profile: profile,
	}
}

// Launch opens the browser with the specified URL
func (bl *BrowserLauncher) Launch(url string) error {
	switch bl.Type {
	case Firefox:
		return bl.launchFirefox(url)
	case Chrome:
		return bl.launchChrome(url)
	case Brave:
		return bl.launchBrave(url)
	case Edge:
		return bl.launchEdge(url)
	case Safari:
		return bl.launchSafari(url)
	default:
		return OpenDefaultBrowser(url)
	}
}

// launchFirefox launches Firefox with optional profile
func (bl *BrowserLauncher) launchFirefox(url string) error {
	args := []string{}

	// Add profile argument if specified
	if bl.Profile != "" {
		args = append(args, "-P", bl.Profile)
	}

	// Add URL as last argument
	args = append(args, url)

	// Platform-specific Firefox command
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		// On macOS, use open with -a flag
		openArgs := []string{"-a", "Firefox"}
		if bl.Profile != "" {
			// For Firefox on macOS with profile, we need to use the binary directly
			firefoxPath := "/Applications/Firefox.app/Contents/MacOS/firefox"
			if _, err := os.Stat(firefoxPath); err == nil {
				cmd = exec.Command(firefoxPath, args...)
			} else {
				// Fallback to open command without profile
				openArgs = append(openArgs, url)
				cmd = exec.Command("open", openArgs...)
			}
		} else {
			openArgs = append(openArgs, url)
			cmd = exec.Command("open", openArgs...)
		}
	case "linux":
		cmd = exec.Command("firefox", args...)
	case "windows":
		// Try common Firefox paths on Windows
		firefoxPaths := []string{
			"C:\\Program Files\\Mozilla Firefox\\firefox.exe",
			"C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
		}

		firefoxPath := "firefox"
		for _, path := range firefoxPaths {
			if _, err := os.Stat(path); err == nil {
				firefoxPath = path
				break
			}
		}
		cmd = exec.Command(firefoxPath, args...)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	return cmd.Start()
}

// launchChrome launches Chrome with optional profile
func (bl *BrowserLauncher) launchChrome(url string) error {
	args := []string{}

	// Add profile argument if specified
	if bl.Profile != "" {
		args = append(args, fmt.Sprintf("--profile-directory=%s", bl.Profile))
	}

	// Add URL as last argument
	args = append(args, url)

	// Platform-specific Chrome command
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		// On macOS, use open with -a flag
		if bl.Profile != "" {
			// For Chrome on macOS with profile, we need to use the binary directly
			chromePath := "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
			if _, err := os.Stat(chromePath); err == nil {
				cmd = exec.Command(chromePath, args...)
			} else {
				// Fallback to open command without profile
				cmd = exec.Command("open", "-a", "Google Chrome", url)
			}
		} else {
			cmd = exec.Command("open", "-a", "Google Chrome", url)
		}
	case "linux":
		// Try different Chrome/Chromium commands
		chromeCommands := []string{"google-chrome", "google-chrome-stable", "chromium", "chromium-browser"}
		chromeCmd := ""
		for _, cmdName := range chromeCommands {
			if _, err := exec.LookPath(cmdName); err == nil {
				chromeCmd = cmdName
				break
			}
		}
		if chromeCmd == "" {
			return fmt.Errorf("Chrome/Chromium not found")
		}
		cmd = exec.Command(chromeCmd, args...)
	case "windows":
		// Try common Chrome paths on Windows
		chromePaths := []string{
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		}

		chromePath := "chrome"
		for _, path := range chromePaths {
			if _, err := os.Stat(path); err == nil {
				chromePath = path
				break
			}
		}
		cmd = exec.Command(chromePath, args...)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	return cmd.Start()
}

// launchBrave launches Brave with optional profile
func (bl *BrowserLauncher) launchBrave(url string) error {
	args := []string{}

	// Add profile argument if specified
	if bl.Profile != "" {
		args = append(args, fmt.Sprintf("--profile-directory=%s", bl.Profile))
	}

	// Add URL as last argument
	args = append(args, url)

	// Platform-specific Brave command
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		// On macOS, use open with -a flag
		if bl.Profile != "" {
			// For Brave on macOS with profile, we need to use the binary directly
			bravePath := "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
			if _, err := os.Stat(bravePath); err == nil {
				cmd = exec.Command(bravePath, args...)
			} else {
				// Fallback to open command without profile
				cmd = exec.Command("open", "-a", "Brave Browser", url)
			}
		} else {
			cmd = exec.Command("open", "-a", "Brave Browser", url)
		}
	case "linux":
		// Try different Brave commands
		braveCommands := []string{"brave", "brave-browser"}
		braveCmd := ""
		for _, cmdName := range braveCommands {
			if _, err := exec.LookPath(cmdName); err == nil {
				braveCmd = cmdName
				break
			}
		}
		if braveCmd == "" {
			return fmt.Errorf("Brave not found")
		}
		cmd = exec.Command(braveCmd, args...)
	case "windows":
		// Try common Brave paths on Windows
		bravePaths := []string{
			"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
			"C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
		}

		bravePath := "brave"
		for _, path := range bravePaths {
			if _, err := os.Stat(path); err == nil {
				bravePath = path
				break
			}
		}
		cmd = exec.Command(bravePath, args...)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	return cmd.Start()
}

// launchEdge launches Edge with optional profile
func (bl *BrowserLauncher) launchEdge(url string) error {
	args := []string{}

	// Add profile argument if specified
	if bl.Profile != "" {
		args = append(args, fmt.Sprintf("--profile-directory=%s", bl.Profile))
	}

	// Add URL as last argument
	args = append(args, url)

	// Platform-specific Edge command
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		// On macOS, use open with -a flag
		if bl.Profile != "" {
			// For Edge on macOS with profile, we need to use the binary directly
			edgePath := "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
			if _, err := os.Stat(edgePath); err == nil {
				cmd = exec.Command(edgePath, args...)
			} else {
				// Fallback to open command without profile
				cmd = exec.Command("open", "-a", "Microsoft Edge", url)
			}
		} else {
			cmd = exec.Command("open", "-a", "Microsoft Edge", url)
		}
	case "linux":
		// Try different Edge commands
		edgeCommands := []string{"microsoft-edge", "microsoft-edge-stable", "microsoft-edge-dev"}
		edgeCmd := ""
		for _, cmdName := range edgeCommands {
			if _, err := exec.LookPath(cmdName); err == nil {
				edgeCmd = cmdName
				break
			}
		}
		if edgeCmd == "" {
			return fmt.Errorf("Microsoft Edge not found")
		}
		cmd = exec.Command(edgeCmd, args...)
	case "windows":
		// Try common Edge paths on Windows
		edgePaths := []string{
			"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
			"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		}

		edgePath := "msedge"
		for _, path := range edgePaths {
			if _, err := os.Stat(path); err == nil {
				edgePath = path
				break
			}
		}
		cmd = exec.Command(edgePath, args...)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	return cmd.Start()
}

// launchSafari launches Safari (macOS only, no profile support)
func (bl *BrowserLauncher) launchSafari(url string) error {
	if runtime.GOOS != "darwin" {
		return fmt.Errorf("Safari is only available on macOS")
	}

	if bl.Profile != "" {
		fmt.Fprintf(os.Stderr, "Warning: Safari does not support profile selection via command line\n")
	}

	cmd := exec.Command("open", "-a", "Safari", url)
	return cmd.Start()
}

// OpenDefaultBrowser opens the default system browser
func OpenDefaultBrowser(url string) error {
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

// ServerConfig contains configuration for the web server
type ServerConfig struct {
	Host         string
	Port         int
	Verbose      int
	SessionLink  string
	SessionSource string
	Password     string
}

// StartServerAndBrowser starts the web server and optionally opens a browser
func StartServerAndBrowser(config *ServerConfig, launcher *BrowserLauncher) error {
	// Process session if provided
	var sharedConfigFragment string
	if config.SessionLink != "" {
		// Check if SessionLink is already a fragment or full URL
		// If it starts with "gpt=" or contains "#gpt=", extract the fragment directly
		if strings.HasPrefix(config.SessionLink, "gpt=") {
			// It's already a fragment, use it directly
			sharedConfigFragment = config.SessionLink
			fmt.Printf("Processing session from %s...\n", config.SessionSource)
			fmt.Println("✓ Session loaded successfully!")
			fmt.Println()
		} else if strings.Contains(config.SessionLink, "#gpt=") {
			// It's a full URL, extract the fragment part
			parts := strings.Split(config.SessionLink, "#")
			if len(parts) > 1 {
				sharedConfigFragment = parts[1]
				fmt.Printf("Processing session from %s...\n", config.SessionSource)
				fmt.Println("✓ Session loaded successfully!")
				fmt.Println()
			}
		} else {
			// Parse the session link (for backwards compatibility with other formats)
			fmt.Printf("Processing session from %s...\n", config.SessionSource)

			// Ask for password if not provided
			password := config.Password
			if password == "" {
				var err error
				password, err = utils.GetPassword("Enter password for session: ")
				if err != nil {
					return fmt.Errorf("error reading password: %w", err)
				}
			}

			// Parse the URL/fragment
			sharedConfig, err := share.ParseURL(config.SessionLink, password)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error parsing session: %v\n", err)
				fmt.Println("\nThe password may be incorrect or the link may be corrupted.")
				return err
			}

			// Validate the configuration
			if err := share.ValidateConfig(sharedConfig); err != nil {
				return fmt.Errorf("invalid session configuration: %w", err)
			}

			// Create a new shareable URL fragment for the web interface
			sharedConfigFragment, err = CreateFragmentFromConfig(sharedConfig, password)
			if err != nil {
				return fmt.Errorf("error creating fragment: %w", err)
			}

			fmt.Println("✓ Session loaded successfully!")
			fmt.Println()
		}
	}

	// Print banner
	utils.PrintBannerWithMessage("Starting local web server...")
	fmt.Println()

	// Create and start ZIP-based server
	server, err := web.NewZipServer(config.Host, config.Port, config.Verbose)
	if err != nil {
		return fmt.Errorf("error creating server: %w", err)
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

	// Open browser if launcher is provided
	if launcher != nil {
		browserURL := server.GetURL()

		// Append fragment if we have a shared configuration
		if sharedConfigFragment != "" {
			browserURL = browserURL + "/#" + sharedConfigFragment
		}

		if err := launcher.Launch(browserURL); err != nil {
			fmt.Fprintf(os.Stderr, "Warning: Could not open browser automatically: %v\n", err)
			fmt.Printf("Please open your browser and navigate to: %s\n", browserURL)
		} else {
			browserName := string(launcher.Type)
			if launcher.Type == DefaultBrowser {
				browserName = "default browser"
			}
			if launcher.Profile != "" {
				fmt.Printf("Opening %s (profile: %s) at: %s\n", browserName, launcher.Profile, browserURL)
			} else {
				fmt.Printf("Opening %s at: %s\n", browserName, browserURL)
			}
		}
	} else {
		fmt.Printf("Server running at: %s\n", server.GetURL())
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
			return fmt.Errorf("server error: %w", err)
		}
	}

	return nil
}

// CreateFragmentFromConfig creates a URL fragment from a shared configuration
func CreateFragmentFromConfig(sharedConfig *share.SharedConfig, password string) (string, error) {
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