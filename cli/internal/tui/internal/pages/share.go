package pages

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// SharePage displays share link configuration (read-only)
type SharePage struct {
	*BasePage
	checkboxGroup    *components.CheckboxGroup
	linkLengthBar    *components.LinkLengthBar
	infoIcon         *components.InfoIcon
	shareOptions     map[string]bool
	encryptedLink    string
	linkBytes        int
	qrCodePlaceholder []string
}

// NewSharePage creates a new share configuration page
func NewSharePage(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *SharePage {
	page := &SharePage{
		BasePage: NewBasePage(screen, config, state, eventBus, "Share Configuration", PageTypeShare),
		shareOptions: map[string]bool{
			"Base URL":        false,
			"API Key":         true,
			"Model":           false,
			"System Prompts":  false,
			"Functions":       false,
			"Chat History":    false,
			"RAG Settings":    false,
			"MCP Servers":     false,
		},
	}

	w, _ := screen.Size()

	// Initialize components
	page.checkboxGroup = components.NewCheckboxGroup(screen, 5, 9, "What to share:")

	// Link length bar
	page.linkLengthBar = components.NewLinkLengthBar(screen, 5, 7, w-10)

	// Info icon with tooltip
	page.infoIcon = components.NewInfoIcon(screen, w-30, 3, 60, 25)
	page.infoIcon.SetTooltipContent(
		"Share Link",
		"Share Link Limits: Practical limits for shared links vary by platform and usage.\n\n"+
			"Browser Limits: Browser URL limit ~2000 bytes (may vary by browser). QR code limit ~1500 bytes for reliable scanning.\n\n"+
			"Platform Recommendations:\n"+
			"• Mobile devices: Keep under 1000 bytes for best compatibility\n"+
			"• Email sharing: Under 2000 bytes to avoid truncation\n"+
			"• SMS/messaging: Under 500 bytes recommended\n\n"+
			"The link length bar shows the estimated size relative to browser limits.",
	)

	// QR code placeholder
	page.qrCodePlaceholder = []string{
		"╔═══════════════╗",
		"║ ▄▄▄▄▄ █▀█ ▄▄▄▄▄ ║",
		"║ █   █ ███ █   █ ║",
		"║ █▄▄▄█ █▄█ █▄▄▄█ ║",
		"║ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄ ║",
		"║ █▄█▄▄▄▄▄▄▄▄█▄█ ║",
		"║ ▄▄▄█▄▄█▄▄█▄▄▄▄▄ ║",
		"║ ▄▄▄▄▄ █▄█▄ ▄   ║",
		"║ █   █ ▄▄▄█▄▄▄▄▄ ║",
		"║ █▄▄▄█ ▄█▄▄█▄▄▄▄ ║",
		"╚═══════════════╝",
		"  QR Code Preview  ",
	}

	// Load share configuration
	page.loadShareConfig()

	return page
}

// loadShareConfig loads current share configuration
func (sp *SharePage) loadShareConfig() {
	// Clear existing checkboxes
	sp.checkboxGroup.Clear()

	// Add checkboxes for each share option
	for option, checked := range sp.shareOptions {
		sp.checkboxGroup.AddCheckbox(option, checked)
	}

	// Simulate an encrypted link
	sp.encryptedLink = "eyJlbmMiOiJVMmFsdGVkX18rK0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFB..."

	// Calculate link size based on selected options
	sp.calculateLinkSize()
}

// calculateLinkSize calculates the estimated link size
func (sp *SharePage) calculateLinkSize() {
	baseSize := 100 // Base encrypted wrapper size

	// Add sizes for each selected option
	for option, checked := range sp.shareOptions {
		if checked {
			switch option {
			case "API Key":
				baseSize += 150
			case "Base URL":
				baseSize += 50
			case "Model":
				baseSize += 30
			case "System Prompts":
				baseSize += 500
			case "Functions":
				baseSize += 800
			case "Chat History":
				baseSize += 1200
			case "RAG Settings":
				baseSize += 200
			case "MCP Servers":
				baseSize += 300
			}
		}
	}

	sp.linkBytes = baseSize
	sp.linkLengthBar.SetBytes(sp.linkBytes)
}

// Draw renders the share page
func (sp *SharePage) Draw() {
	w, h := sp.screen.Size()

	// Clear screen
	sp.ClearContent()

	// Draw header
	sp.DrawHeader()

	// Draw info icon
	sp.infoIcon.Draw()

	// Draw main content area border
	sp.drawContentBorder(2, 5, w-4, h-8)

	// Draw link length bar
	sp.linkLengthBar.Draw()

	// Draw checkbox group
	sp.checkboxGroup.Draw()

	// Draw encrypted link preview
	sp.drawLinkPreview()

	// Draw QR code placeholder
	sp.drawQRCode()

	// Draw platform recommendations
	sp.drawRecommendations()

	// Draw instructions
	instructions := " I:Info | ↑↓:Scroll | ESC:Back "
	instructionStyle := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	sp.DrawCenteredText(h-2, instructions, instructionStyle)
}

// drawContentBorder draws a border around the content area
func (sp *SharePage) drawContentBorder(x, y, width, height int) {
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)

	// Top border
	sp.screen.SetContent(x, y, '╭', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		sp.screen.SetContent(x+i, y, '─', nil, borderStyle)
	}
	sp.screen.SetContent(x+width-1, y, '╮', nil, borderStyle)

	// Side borders
	for i := 1; i < height-1; i++ {
		sp.screen.SetContent(x, y+i, '│', nil, borderStyle)
		sp.screen.SetContent(x+width-1, y+i, '│', nil, borderStyle)
	}

	// Bottom border
	sp.screen.SetContent(x, y+height-1, '╰', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		sp.screen.SetContent(x+i, y+height-1, '─', nil, borderStyle)
	}
	sp.screen.SetContent(x+width-1, y+height-1, '╯', nil, borderStyle)
}

// drawLinkPreview draws the encrypted link preview
func (sp *SharePage) drawLinkPreview() {
	w, h := sp.screen.Size()
	previewY := h/2 + 2

	// Draw label
	label := "Encrypted Link Preview:"
	labelStyle := tcell.StyleDefault.Bold(true)
	for i, ch := range label {
		sp.screen.SetContent(5+i, previewY, ch, nil, labelStyle)
	}

	// Draw link preview (truncated)
	linkPreview := sp.encryptedLink
	maxLen := w - 10
	if len(linkPreview) > maxLen {
		linkPreview = linkPreview[:maxLen-10] + "..."
	}

	linkStyle := tcell.StyleDefault.Foreground(tcell.ColorBlue)
	for i, ch := range linkPreview {
		sp.screen.SetContent(5+i, previewY+1, ch, nil, linkStyle)
	}

	// Draw full URL example
	fullURL := "https://hacka.re/#gpt=" + linkPreview
	if len(fullURL) > maxLen {
		fullURL = fullURL[:maxLen-10] + "..."
	}

	urlLabel := "Full URL:"
	for i, ch := range urlLabel {
		sp.screen.SetContent(5+i, previewY+3, ch, nil, labelStyle)
	}

	for i, ch := range fullURL {
		sp.screen.SetContent(5+i, previewY+4, ch, nil, linkStyle)
	}
}

// drawQRCode draws the QR code placeholder
func (sp *SharePage) drawQRCode() {
	w, _ := sp.screen.Size()
	qrX := w - 25
	qrY := 10

	qrStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)

	for i, line := range sp.qrCodePlaceholder {
		for j, ch := range line {
			sp.screen.SetContent(qrX+j, qrY+i, ch, nil, qrStyle)
		}
	}
}

// drawRecommendations draws platform-specific recommendations
func (sp *SharePage) drawRecommendations() {
	_, h := sp.screen.Size()
	recY := h - 12

	// Draw recommendations based on link size
	var recommendations []string
	recStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen)

	if sp.linkBytes < 500 {
		recommendations = []string{
			"✓ Compatible with all platforms",
			"✓ Safe for SMS and messaging apps",
			"✓ QR code will scan reliably",
		}
		recStyle = tcell.StyleDefault.Foreground(tcell.ColorGreen)
	} else if sp.linkBytes < 1000 {
		recommendations = []string{
			"✓ Compatible with most platforms",
			"⚠ May be truncated in SMS",
			"✓ QR code should work",
		}
		recStyle = tcell.StyleDefault.Foreground(tcell.ColorYellow)
	} else if sp.linkBytes < 1500 {
		recommendations = []string{
			"⚠ Link is getting long",
			"✗ Too long for SMS/messaging",
			"⚠ QR code may have issues",
		}
		recStyle = tcell.StyleDefault.Foreground(tcell.ColorYellow)
	} else {
		recommendations = []string{
			"✗ Link exceeds recommended limits",
			"✗ May not work on mobile devices",
			"✗ QR code likely won't scan",
		}
		recStyle = tcell.StyleDefault.Foreground(tcell.ColorRed)
	}

	// Draw recommendations title
	title := "Platform Compatibility:"
	titleStyle := tcell.StyleDefault.Bold(true)
	for i, ch := range title {
		sp.screen.SetContent(5+i, recY, ch, nil, titleStyle)
	}

	// Draw recommendation items
	for i, rec := range recommendations {
		for j, ch := range rec {
			sp.screen.SetContent(7+j, recY+i+1, ch, nil, recStyle)
		}
	}

	// Draw size breakdown
	breakdown := fmt.Sprintf("Total size: %d bytes", sp.linkBytes)
	breakdownStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	for i, ch := range breakdown {
		sp.screen.SetContent(5+i, recY+len(recommendations)+2, ch, nil, breakdownStyle)
	}
}

// HandleInput processes keyboard input
func (sp *SharePage) HandleInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEscape:
		// Hide info tooltip if visible, otherwise exit
		if sp.infoIcon.Tooltip.IsVisible() {
			sp.infoIcon.Tooltip.Hide()
			return false
		}
		return true // Exit the page

	case tcell.KeyUp, tcell.KeyDown:
		// Scroll through content
		return false

	case tcell.KeyRune:
		switch ev.Rune() {
		case 'i', 'I':
			// Toggle info tooltip
			sp.infoIcon.HandleInput(ev)
			return false

		case '1', '2', '3', '4', '5', '6', '7', '8':
			// Simulate toggling checkboxes (read-only, so just for show)
			idx := int(ev.Rune() - '1')
			options := []string{"Base URL", "API Key", "Model", "System Prompts",
							  "Functions", "Chat History", "RAG Settings", "MCP Servers"}
			if idx < len(options) {
				option := options[idx]
				sp.shareOptions[option] = !sp.shareOptions[option]
				sp.loadShareConfig()
				sp.calculateLinkSize()
			}
			return false
		}
	}

	return false
}

// OnActivate is called when the page becomes active
func (sp *SharePage) OnActivate() {
	sp.loadShareConfig()
}

// Save saves any changes (no-op for read-only page)
func (sp *SharePage) Save() error {
	// Read-only page, nothing to save
	return nil
}

// Helper function to truncate text
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return strings.Repeat(".", maxLen)
	}
	return s[:maxLen-3] + "..."
}
// HandleMouse processes mouse events for the page
func (p *SharePage) HandleMouse(event *core.MouseEvent) bool {
	// TODO: Implement mouse support for interactive elements
	// For now, just return false to indicate event not handled
	return false
}
