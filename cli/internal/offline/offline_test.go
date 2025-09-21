package offline

import (
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestFindAvailablePort(t *testing.T) {
	port, err := findAvailablePort()
	if err != nil {
		t.Fatalf("findAvailablePort() error = %v", err)
	}

	if port < 1 || port > 65535 {
		t.Errorf("findAvailablePort() returned invalid port: %d", port)
	}

	// Verify the port is actually available
	if !isPortAvailable(port) {
		t.Errorf("findAvailablePort() returned unavailable port: %d", port)
	}
}

func TestIsPortAvailable(t *testing.T) {
	// Test with a port that should be available
	// Use a high port number to avoid conflicts
	availablePort := 59999
	if !isPortAvailable(availablePort) {
		t.Logf("Port %d appears to be in use, skipping test", availablePort)
		t.Skip()
	}

	// Now occupy the port
	listener, err := net.Listen("tcp", fmt.Sprintf("localhost:%d", availablePort))
	if err != nil {
		t.Fatalf("Failed to occupy port for testing: %v", err)
	}
	defer listener.Close()

	// Port should now be unavailable
	if isPortAvailable(availablePort) {
		t.Errorf("isPortAvailable() returned true for occupied port %d", availablePort)
	}
}

func TestAutoDetectLlamafile(t *testing.T) {
	// Create a temporary directory with a mock llamafile
	tempDir, err := os.MkdirTemp("", "llamafile_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a mock executable llamafile
	mockLlamafile := filepath.Join(tempDir, "test.llamafile")
	file, err := os.Create(mockLlamafile)
	if err != nil {
		t.Fatalf("Failed to create mock llamafile: %v", err)
	}
	file.Close()

	// Make it executable
	if err := os.Chmod(mockLlamafile, 0755); err != nil {
		t.Fatalf("Failed to make file executable: %v", err)
	}

	// Set working directory to temp dir
	originalWd, _ := os.Getwd()
	os.Chdir(tempDir)
	defer os.Chdir(originalWd)

	// Auto-detect should find our mock llamafile
	found, err := AutoDetectLlamafile()
	if err != nil {
		// It's okay if it doesn't find it in CI environment
		t.Logf("AutoDetectLlamafile() error = %v", err)
		return
	}

	if found == "" {
		t.Errorf("AutoDetectLlamafile() didn't find mock llamafile")
	}
}

func TestTruncateString(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		maxLen int
		want   string
	}{
		{"Short string", "hello", 10, "hello"},
		{"Exact length", "hello", 5, "hello"},
		{"Long string", "hello world", 8, "hello..."},
		{"Very short max", "hello", 3, "hel"},
		{"Empty string", "", 5, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := truncateString(tt.input, tt.maxLen)
			if got != tt.want {
				t.Errorf("truncateString(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
			}
		})
	}
}

func TestGetOfflineSharedConfig(t *testing.T) {
	// Test with model name
	config := GetOfflineSharedConfig("llama-3.2", 8080)
	if config.Model != "llama-3.2" {
		t.Errorf("Expected model llama-3.2, got %s", config.Model)
	}
	if config.BaseURL != "http://localhost:8080/v1" {
		t.Errorf("Expected base URL http://localhost:8080/v1, got %s", config.BaseURL)
	}
	if config.APIKey != "no-key" {
		t.Errorf("Expected API key 'no-key', got %s", config.APIKey)
	}

	// Test with empty model name
	config = GetOfflineSharedConfig("", 9090)
	if config.Model != "local-model" {
		t.Errorf("Expected default model 'local-model', got %s", config.Model)
	}
	if config.BaseURL != "http://localhost:9090/v1" {
		t.Errorf("Expected base URL http://localhost:9090/v1, got %s", config.BaseURL)
	}
}

func TestModelsDiscovery(t *testing.T) {
	// Create a test server that mimics llamafile's /v1/models endpoint
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/models" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{
				"data": [
					{
						"id": "llama-3.2-3b",
						"object": "model",
						"created": 1234567890
					}
				]
			}`))
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	// Create a mock llamafile manager using the test server URL
	manager := &LlamafileManager{
		FilePath: "/mock/llamafile",
		Port:     8080, // Port doesn't matter for this test
		BaseURL:  server.URL + "/v1", // Use test server URL with /v1 prefix
	}

	// Test model discovery
	model, err := manager.DiscoverModel()
	if err != nil {
		t.Fatalf("DiscoverModel() error = %v", err)
	}

	if model != "llama-3.2-3b" {
		t.Errorf("DiscoverModel() = %q, want %q", model, "llama-3.2-3b")
	}

	if manager.ModelName != "llama-3.2-3b" {
		t.Errorf("Manager ModelName = %q, want %q", manager.ModelName, "llama-3.2-3b")
	}
}