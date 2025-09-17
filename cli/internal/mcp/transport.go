package mcp

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"sync"

	"github.com/hacka-re/cli/internal/logger"
)

// Transport defines the interface for MCP transports
type Transport interface {
	Start() error
	Stop() error
	Send(data []byte) error
	Receive() ([]byte, error)
	IsConnected() bool
}

// StdioTransport handles stdio-based MCP communication
type StdioTransport struct {
	mu       sync.RWMutex
	cmd      *exec.Cmd
	stdin    io.WriteCloser
	stdout   io.ReadCloser
	stderr   io.ReadCloser
	reader   *bufio.Reader
	writer   *bufio.Writer
	connected bool
	command  string
	args     []string
	env      []string
}

// NewStdioTransport creates a new stdio transport
func NewStdioTransport(command string, args []string, env []string) *StdioTransport {
	return &StdioTransport{
		command: command,
		args:    args,
		env:     env,
	}
}

// Start starts the transport
func (t *StdioTransport) Start() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	
	if t.connected {
		return fmt.Errorf("transport already started")
	}
	
	logger.Get().Info("[StdioTransport] Starting command: %s %v", t.command, t.args)
	
	// Create the command
	t.cmd = exec.Command(t.command, t.args...)
	
	// Set environment if provided
	if len(t.env) > 0 {
		t.cmd.Env = append(os.Environ(), t.env...)
	}
	
	// Get pipes
	var err error
	t.stdin, err = t.cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdin pipe: %w", err)
	}
	
	t.stdout, err = t.cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %w", err)
	}
	
	t.stderr, err = t.cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %w", err)
	}
	
	// Start the command
	if err = t.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start command: %w", err)
	}
	
	// Create buffered readers/writers
	t.reader = bufio.NewReader(t.stdout)
	t.writer = bufio.NewWriter(t.stdin)
	
	// Start stderr reader in background
	go t.readStderr()
	
	t.connected = true
	logger.Get().Info("[StdioTransport] Started successfully")
	
	return nil
}

// Stop stops the transport
func (t *StdioTransport) Stop() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	
	if !t.connected {
		return nil
	}
	
	logger.Get().Info("[StdioTransport] Stopping")
	
	// Close pipes
	if t.stdin != nil {
		t.stdin.Close()
	}
	if t.stdout != nil {
		t.stdout.Close()
	}
	if t.stderr != nil {
		t.stderr.Close()
	}
	
	// Kill the process if it's still running
	if t.cmd != nil && t.cmd.Process != nil {
		t.cmd.Process.Kill()
		t.cmd.Wait()
	}
	
	t.connected = false
	logger.Get().Info("[StdioTransport] Stopped")
	
	return nil
}

// Send sends data through the transport
func (t *StdioTransport) Send(data []byte) error {
	t.mu.RLock()
	if !t.connected {
		t.mu.RUnlock()
		return fmt.Errorf("transport not connected")
	}
	writer := t.writer
	t.mu.RUnlock()
	
	logger.Get().Debug("[StdioTransport] Sending: %s", string(data))
	
	// Write data
	if _, err := writer.Write(data); err != nil {
		return fmt.Errorf("failed to write: %w", err)
	}
	
	// Add newline if not present
	if len(data) == 0 || data[len(data)-1] != '\n' {
		if _, err := writer.Write([]byte("\n")); err != nil {
			return fmt.Errorf("failed to write newline: %w", err)
		}
	}
	
	// Flush
	if err := writer.Flush(); err != nil {
		return fmt.Errorf("failed to flush: %w", err)
	}
	
	return nil
}

// Receive receives data from the transport
func (t *StdioTransport) Receive() ([]byte, error) {
	t.mu.RLock()
	if !t.connected {
		t.mu.RUnlock()
		return nil, fmt.Errorf("transport not connected")
	}
	reader := t.reader
	t.mu.RUnlock()
	
	// Read line
	line, err := reader.ReadBytes('\n')
	if err != nil {
		if err == io.EOF {
			t.mu.Lock()
			t.connected = false
			t.mu.Unlock()
		}
		return nil, err
	}
	
	logger.Get().Debug("[StdioTransport] Received: %s", string(line))
	
	return line, nil
}

// IsConnected returns whether the transport is connected
func (t *StdioTransport) IsConnected() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.connected
}

// readStderr reads stderr in the background
func (t *StdioTransport) readStderr() {
	reader := bufio.NewReader(t.stderr)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err != io.EOF {
				logger.Get().Error("[StdioTransport] stderr read error: %v", err)
			}
			break
		}
		if line != "" {
			logger.Get().Debug("[StdioTransport] stderr: %s", line)
		}
	}
}

// HTTPTransport handles HTTP/SSE-based MCP communication
type HTTPTransport struct {
	mu        sync.RWMutex
	url       string
	client    *http.Client
	connected bool
	recvChan  chan []byte
	stopChan  chan struct{}
}

// NewHTTPTransport creates a new HTTP transport
func NewHTTPTransport(url string) *HTTPTransport {
	return &HTTPTransport{
		url:      url,
		client:   &http.Client{},
		recvChan: make(chan []byte, 100),
		stopChan: make(chan struct{}),
	}
}

// Start starts the HTTP transport
func (t *HTTPTransport) Start() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	
	if t.connected {
		return fmt.Errorf("transport already started")
	}
	
	logger.Get().Info("[HTTPTransport] Connecting to %s", t.url)
	
	// For now, just mark as connected
	// In a real implementation, this would establish SSE connection
	t.connected = true
	
	return nil
}

// Stop stops the HTTP transport
func (t *HTTPTransport) Stop() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	
	if !t.connected {
		return nil
	}
	
	logger.Get().Info("[HTTPTransport] Stopping")
	
	close(t.stopChan)
	t.connected = false
	
	return nil
}

// Send sends data through HTTP transport
func (t *HTTPTransport) Send(data []byte) error {
	t.mu.RLock()
	if !t.connected {
		t.mu.RUnlock()
		return fmt.Errorf("transport not connected")
	}
	url := t.url
	client := t.client
	t.mu.RUnlock()
	
	logger.Get().Debug("[HTTPTransport] Sending: %s", string(data))
	
	// Send as POST request
	resp, err := client.Post(url, "application/json", nil)
	if err != nil {
		return fmt.Errorf("failed to send: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status %d", resp.StatusCode)
	}
	
	return nil
}

// Receive receives data from HTTP transport
func (t *HTTPTransport) Receive() ([]byte, error) {
	t.mu.RLock()
	if !t.connected {
		t.mu.RUnlock()
		return nil, fmt.Errorf("transport not connected")
	}
	t.mu.RUnlock()
	
	select {
	case data := <-t.recvChan:
		return data, nil
	case <-t.stopChan:
		return nil, io.EOF
	}
}

// IsConnected returns whether the transport is connected
func (t *HTTPTransport) IsConnected() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.connected
}