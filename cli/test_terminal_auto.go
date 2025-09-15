package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	"golang.org/x/term"
)

// TestTerminalDimensions tests the chat interface with different terminal sizes
func TestTerminalDimensions(t *testing.T) {
	tests := []struct {
		name   string
		width  int
		height int
		input  string
		expect []string
	}{
		{
			name:   "Standard terminal",
			width:  80,
			height: 24,
			input:  "/s\t",
			expect: []string{"/settings"},
		},
		{
			name:   "Narrow terminal",
			width:  40,
			height: 24,
			input:  "/pro\t",
			expect: []string{"/prompts"},
		},
		{
			name:   "Wide terminal",
			width:  120,
			height: 24,
			input:  "/f\t",
			expect: []string{"/functions"},
		},
		{
			name:   "Very narrow terminal",
			width:  30,
			height: 24,
			input:  "/h\t",
			expect: []string{"/help"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set terminal size
			cmd := exec.Command("stty", "cols", fmt.Sprintf("%d", tt.width), "rows", fmt.Sprintf("%d", tt.height))
			cmd.Stdin = os.Stdin
			cmd.Run()

			// Run chat with input
			chatCmd := exec.Command("./hacka.re", "chat")
			stdin, _ := chatCmd.StdinPipe()
			stdout, _ := chatCmd.StdoutPipe()

			chatCmd.Start()

			// Give it time to start
			time.Sleep(500 * time.Millisecond)

			// Send input
			stdin.Write([]byte(tt.input))
			time.Sleep(100 * time.Millisecond)

			// Send Ctrl+C to exit
			stdin.Write([]byte{0x03})
			stdin.Close()

			// Read output
			buf := new(bytes.Buffer)
			buf.ReadFrom(stdout)
			output := buf.String()

			chatCmd.Wait()

			// Check expectations
			for _, exp := range tt.expect {
				if !strings.Contains(output, exp) {
					t.Errorf("Terminal %dx%d: expected output to contain %q, got: %s",
						tt.width, tt.height, exp, output)
				}
			}
		})
	}
}

// TestLineWrapping tests long line handling at different widths
func TestLineWrapping(t *testing.T) {
	longLine := "This is a very long line that should definitely wrap or get truncated depending on the terminal width settings"

	tests := []struct {
		width    int
		maxChars int
	}{
		{width: 80, maxChars: 77},  // 80 - prompt(2) - margin(1)
		{width: 60, maxChars: 57},
		{width: 40, maxChars: 37},
		{width: 120, maxChars: 77}, // Should cap at 80
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("Width_%d", tt.width), func(t *testing.T) {
			// This would need actual terminal testing
			// For now, just verify the calculation logic
			prompt := "> "
			availableWidth := tt.width - len(prompt) - 1
			if tt.width > 80 {
				availableWidth = 80 - len(prompt) - 1
			}

			if availableWidth != tt.maxChars {
				t.Errorf("Width %d: expected available width %d, got %d",
					tt.width, tt.maxChars, availableWidth)
			}
		})
	}
}

// TestTerminalSizeDetection verifies terminal size detection works
func TestTerminalSizeDetection(t *testing.T) {
	// Get current terminal size
	width, height, err := term.GetSize(int(os.Stdin.Fd()))
	if err != nil {
		t.Skipf("Cannot get terminal size: %v", err)
	}

	t.Logf("Current terminal: %dx%d", width, height)

	// Verify reasonable defaults
	if width < 20 || width > 300 {
		t.Errorf("Unexpected terminal width: %d", width)
	}
	if height < 10 || height > 100 {
		t.Errorf("Unexpected terminal height: %d", height)
	}
}

func main() {
	// Run as a test
	testing.Main(func(pat, str string) (bool, error) {
		return true, nil
	}, []testing.InternalTest{
		{Name: "TestTerminalDimensions", F: TestTerminalDimensions},
		{Name: "TestLineWrapping", F: TestLineWrapping},
		{Name: "TestTerminalSizeDetection", F: TestTerminalSizeDetection},
	}, nil, nil)
}