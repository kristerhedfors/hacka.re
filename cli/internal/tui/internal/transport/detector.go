package transport

import (
	"fmt"
	"os"
	"strings"

	"github.com/hacka-re/cli/internal/tui/internal/core"
	"golang.org/x/term"
)

// Capabilities represents terminal capabilities
type Capabilities struct {
	IsTerminal     bool
	HasColors      bool
	HasMouse       bool
	HasUnicode     bool
	Width          int
	Height         int
	TermType       string
	IsSSH          bool
	IsTelnet       bool
	IsSerial       bool
	SupportsANSI   bool
	SupportsTrueColor bool
}

// Detector detects terminal capabilities and recommends UI mode
type Detector struct {
	caps *Capabilities
}

// NewDetector creates a new capability detector
func NewDetector() *Detector {
	return &Detector{
		caps: &Capabilities{},
	}
}

// Detect analyzes the current environment and returns capabilities
func (d *Detector) Detect() (*Capabilities, error) {
	// Check if we're in a terminal
	d.caps.IsTerminal = term.IsTerminal(int(os.Stdin.Fd()))

	// Get terminal dimensions
	if d.caps.IsTerminal {
		width, height, err := term.GetSize(int(os.Stdin.Fd()))
		if err == nil {
			d.caps.Width = width
			d.caps.Height = height
		}
	}

	// Check terminal type
	d.caps.TermType = os.Getenv("TERM")

	// Detect color support
	d.detectColorSupport()

	// Detect connection type
	d.detectConnectionType()

	// Check for Unicode support
	d.detectUnicodeSupport()

	// Check for mouse support
	d.detectMouseSupport()

	// Check ANSI support
	d.caps.SupportsANSI = d.caps.IsTerminal &&
		!strings.Contains(strings.ToLower(d.caps.TermType), "dumb")

	return d.caps, nil
}

// RecommendMode suggests the best UI mode based on capabilities
func (d *Detector) RecommendMode() core.UIMode {
	// ============================================================
	// SOCKET MODE IS CURRENTLY DISABLED - WORKING ON TUI ONLY
	// ============================================================
	// Always use rich TUI mode regardless of terminal capabilities
	// Socket mode is disabled while we focus on TUI development
	// TODO: Re-enable socket mode detection after TUI is complete
	return core.ModeRich

	/* ORIGINAL SOCKET MODE DETECTION - DISABLED FOR NOW
	// If not a terminal at all, use socket mode
	if !d.caps.IsTerminal {
		return core.ModeSocket
	}

	// If terminal is too small, use socket mode
	if d.caps.Width < 80 || d.caps.Height < 24 {
		return core.ModeSocket
	}

	// If no ANSI support, use socket mode
	if !d.caps.SupportsANSI {
		return core.ModeSocket
	}

	// If dumb terminal, use socket mode
	if d.caps.TermType == "dumb" || d.caps.TermType == "" {
		return core.ModeSocket
	}

	// Serial connections should use socket mode
	if d.caps.IsSerial {
		return core.ModeSocket
	}

	// Telnet might work with rich mode if it supports ANSI
	if d.caps.IsTelnet && !d.caps.SupportsANSI {
		return core.ModeSocket
	}

	// Otherwise, rich mode should work
	return core.ModeRich
	*/
}

// detectColorSupport checks for color terminal support
func (d *Detector) detectColorSupport() {
	// Check COLORTERM for truecolor
	colorTerm := os.Getenv("COLORTERM")
	if colorTerm == "truecolor" || colorTerm == "24bit" {
		d.caps.SupportsTrueColor = true
		d.caps.HasColors = true
		return
	}

	// Check TERM for color indicators
	term := strings.ToLower(d.caps.TermType)
	colorTerms := []string{"color", "256", "rgb", "xterm", "screen", "tmux", "alacritty", "kitty"}

	for _, ct := range colorTerms {
		if strings.Contains(term, ct) {
			d.caps.HasColors = true
			break
		}
	}

	// Check if NO_COLOR is set (disables colors)
	if os.Getenv("NO_COLOR") != "" {
		d.caps.HasColors = false
	}
}

// detectConnectionType determines how we're connected
func (d *Detector) detectConnectionType() {
	// Check for SSH
	if os.Getenv("SSH_CLIENT") != "" || os.Getenv("SSH_TTY") != "" {
		d.caps.IsSSH = true
	}

	// Check for telnet (harder to detect, look for specific env vars)
	if os.Getenv("TELNET_ENVIRON") != "" {
		d.caps.IsTelnet = true
	}

	// Check for serial (look for specific terminal types)
	term := strings.ToLower(d.caps.TermType)
	if strings.Contains(term, "serial") || strings.Contains(term, "tty") {
		d.caps.IsSerial = true
	}
}

// detectUnicodeSupport checks if Unicode is supported
func (d *Detector) detectUnicodeSupport() {
	// Check LANG and LC_* variables
	lang := os.Getenv("LANG")
	lcAll := os.Getenv("LC_ALL")
	lcCtype := os.Getenv("LC_CTYPE")

	// Look for UTF-8 in locale settings
	for _, v := range []string{lang, lcAll, lcCtype} {
		if strings.Contains(strings.ToUpper(v), "UTF-8") ||
		   strings.Contains(strings.ToUpper(v), "UTF8") {
			d.caps.HasUnicode = true
			return
		}
	}
}

// detectMouseSupport checks if mouse is supported
func (d *Detector) detectMouseSupport() {
	// Check terminal type for known mouse-supporting terminals
	term := strings.ToLower(d.caps.TermType)
	mouseTerms := []string{"xterm", "screen", "tmux", "alacritty", "kitty", "gnome", "konsole"}

	for _, mt := range mouseTerms {
		if strings.Contains(term, mt) {
			d.caps.HasMouse = true
			return
		}
	}
}

// TestConnection sends test sequences to verify capabilities
func (d *Detector) TestConnection() error {
	if !d.caps.IsTerminal {
		return fmt.Errorf("not a terminal")
	}

	// We could send escape sequences here to test actual support
	// For now, we'll trust our detection
	return nil
}

// GetSummary returns a human-readable summary of capabilities
func (d *Detector) GetSummary() string {
	if d.caps == nil {
		return "No capabilities detected"
	}

	var parts []string

	if d.caps.IsTerminal {
		parts = append(parts, fmt.Sprintf("Terminal (%dx%d)", d.caps.Width, d.caps.Height))
	} else {
		parts = append(parts, "Non-terminal")
	}

	if d.caps.TermType != "" {
		parts = append(parts, fmt.Sprintf("Type: %s", d.caps.TermType))
	}

	if d.caps.HasColors {
		if d.caps.SupportsTrueColor {
			parts = append(parts, "TrueColor")
		} else {
			parts = append(parts, "Colors")
		}
	}

	if d.caps.HasUnicode {
		parts = append(parts, "Unicode")
	}

	if d.caps.HasMouse {
		parts = append(parts, "Mouse")
	}

	if d.caps.IsSSH {
		parts = append(parts, "SSH")
	} else if d.caps.IsTelnet {
		parts = append(parts, "Telnet")
	} else if d.caps.IsSerial {
		parts = append(parts, "Serial")
	}

	return strings.Join(parts, ", ")
}