package offline

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// LlamafileManager manages a llamafile process
type LlamafileManager struct {
	FilePath  string
	Port      int
	Process   *exec.Cmd
	BaseURL   string
	ModelName string
	Ready     chan bool
	readyOnce sync.Once // Ensures ready signal is sent only once
}

// ModelsResponse represents the response from /v1/models endpoint
type ModelsResponse struct {
	Data []struct {
		ID      string `json:"id"`
		Object  string `json:"object"`
		Created int64  `json:"created"`
	} `json:"data"`
}

// NewLlamafileManager creates a new llamafile manager
func NewLlamafileManager(filePath string) (*LlamafileManager, error) {
	// Validate that the file exists and is executable
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("llamafile not found: %w", err)
	}

	if info.Mode()&0111 == 0 {
		return nil, fmt.Errorf("llamafile is not executable: %s", filePath)
	}

	// Find an available port
	port, err := findAvailablePort()
	if err != nil {
		return nil, fmt.Errorf("failed to find available port: %w", err)
	}

	return &LlamafileManager{
		FilePath: filePath,
		Port:     port,
		BaseURL:  fmt.Sprintf("http://localhost:%d/v1", port),
		Ready:    make(chan bool, 1),
	}, nil
}

// Start starts the llamafile server
func (lm *LlamafileManager) Start() error {
	// Build command with arguments
	// Use sh -c to properly handle the llamafile's special format
	// This allows the shell to handle the executable format correctly
	// Quote the filepath in case it contains spaces
	cmdString := fmt.Sprintf("'%s' --server --port %d --nobrowser", lm.FilePath, lm.Port)

	lm.Process = exec.Command("sh", "-c", cmdString)

	// Set environment to ensure proper execution
	lm.Process.Env = os.Environ()

	// Capture stdout for monitoring
	stdout, err := lm.Process.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	// Also capture stderr for debugging
	stderr, err := lm.Process.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Start the process
	if err := lm.Process.Start(); err != nil {
		return fmt.Errorf("failed to start llamafile: %w", err)
	}

	// Monitor both stdout and stderr for readiness in goroutines
	readySignals := []string{
		"server listening",
		"llama server listening",
		"HTTP server listening",
		"server:", // Common llamafile output pattern
		"http://127.0.0.1", // URL pattern
		"http://localhost", // URL pattern
	}

	checkReady := func(line string) bool {
		for _, signal := range readySignals {
			if strings.Contains(strings.ToLower(line), signal) {
				return true
			}
		}
		return false
	}

	// Signal ready only once using sync.Once
	signalReady := func() {
		lm.readyOnce.Do(func() {
			lm.Ready <- true
			close(lm.Ready)
		})
	}

	// Monitor stdout
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			// Only show debug output if HACKARE_DEBUG is set
			if os.Getenv("HACKARE_DEBUG") != "" {
				fmt.Printf("[llamafile stdout] %s\n", line)
			}
			if checkReady(line) {
				signalReady()
				break
			}
		}
	}()

	// Monitor stderr (llamafile often outputs to stderr)
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			// Only show debug output if HACKARE_DEBUG is set
			if os.Getenv("HACKARE_DEBUG") != "" {
				fmt.Printf("[llamafile stderr] %s\n", line)
			}
			if checkReady(line) {
				signalReady()
				break
			}
		}
	}()

	// Wait for server to be ready or timeout
	select {
	case <-lm.Ready:
		// Server is ready
		time.Sleep(500 * time.Millisecond) // Give it a bit more time to fully initialize
	case <-time.After(30 * time.Second):
		// Timeout - but check if server is actually responding
		if !lm.HealthCheck() {
			lm.Stop()
			return fmt.Errorf("llamafile server failed to start within 30 seconds")
		}
	}

	return nil
}

// Stop stops the llamafile server
func (lm *LlamafileManager) Stop() error {
	if lm.Process == nil || lm.Process.Process == nil {
		return nil
	}

	// Try graceful shutdown first
	if err := lm.Process.Process.Signal(os.Interrupt); err != nil {
		// If interrupt fails, force kill
		return lm.Process.Process.Kill()
	}

	// Wait for process to exit
	done := make(chan error, 1)
	go func() {
		done <- lm.Process.Wait()
	}()

	select {
	case <-done:
		return nil
	case <-time.After(5 * time.Second):
		// Force kill if graceful shutdown takes too long
		return lm.Process.Process.Kill()
	}
}

// HealthCheck checks if the llamafile server is responding
func (lm *LlamafileManager) HealthCheck() bool {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(lm.BaseURL + "/models")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

// DiscoverModel queries the llamafile to discover available models
func (lm *LlamafileManager) DiscoverModel() (string, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(lm.BaseURL + "/models")
	if err != nil {
		return "", fmt.Errorf("failed to query models: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("models endpoint returned status %d", resp.StatusCode)
	}

	var models ModelsResponse
	if err := json.NewDecoder(resp.Body).Decode(&models); err != nil {
		return "", fmt.Errorf("failed to decode models response: %w", err)
	}

	if len(models.Data) > 0 {
		lm.ModelName = models.Data[0].ID
		return models.Data[0].ID, nil
	}

	// Fallback to generic name if no models found
	lm.ModelName = "local-model"
	return "local-model", nil
}

// findAvailablePort finds an available port for the llamafile server
func findAvailablePort() (int, error) {
	// Try preferred ports first
	preferredPorts := []int{8080, 8081, 8082, 11434, 11435, 11436}

	for _, port := range preferredPorts {
		if isPortAvailable(port) {
			return port, nil
		}
	}

	// If preferred ports are taken, let the OS assign one
	listener, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		return 0, err
	}
	defer listener.Close()

	addr := listener.Addr().(*net.TCPAddr)
	return addr.Port, nil
}

// isPortAvailable checks if a port is available
func isPortAvailable(port int) bool {
	listener, err := net.Listen("tcp", fmt.Sprintf("localhost:%d", port))
	if err != nil {
		return false
	}
	listener.Close()
	return true
}

// AutoDetectLlamafile attempts to find a llamafile in common locations
func AutoDetectLlamafile() (string, error) {
	// Common locations to check
	searchPaths := []string{
		"./",                           // Current directory
		"./models/",                    // models subdirectory
		"./llamafiles/",               // llamafiles subdirectory
		os.Getenv("HOME") + "/models/", // User's models directory
		os.Getenv("HOME") + "/Downloads/", // Downloads directory
		"/usr/local/bin/",             // System bin
		"/opt/llamafile/",             // Optional install location
	}

	// Common llamafile patterns
	patterns := []string{
		"*.llamafile",
		"*-llamafile",
		"llama-*",
		"mistral-*",
		"phi-*",
		"qwen-*",
		"gemma-*",
	}

	for _, dir := range searchPaths {
		if _, err := os.Stat(dir); err != nil {
			continue // Skip non-existent directories
		}

		for _, pattern := range patterns {
			matches, err := filepath.Glob(filepath.Join(dir, pattern))
			if err != nil {
				continue
			}

			for _, match := range matches {
				// Check if file is executable
				info, err := os.Stat(match)
				if err != nil {
					continue
				}

				// Check if it's a regular file and executable
				if info.Mode().IsRegular() && info.Mode()&0111 != 0 {
					return match, nil
				}
			}
		}
	}

	return "", fmt.Errorf("no llamafile found in common locations")
}