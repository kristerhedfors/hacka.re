package components

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
)

// ProgressBar represents a visual progress/usage bar
type ProgressBar struct {
	screen       tcell.Screen
	x, y         int
	width        int
	value        float64 // 0.0 to 1.0
	label        string
	showPercent  bool
	barStyle     tcell.Style
	fillStyle    tcell.Style
	warningStyle tcell.Style
	dangerStyle  tcell.Style
	warningLevel float64
	dangerLevel  float64
}

// NewProgressBar creates a new progress bar
func NewProgressBar(screen tcell.Screen, x, y, width int) *ProgressBar {
	return &ProgressBar{
		screen:       screen,
		x:            x,
		y:            y,
		width:        width,
		value:        0.0,
		showPercent:  true,
		barStyle:     tcell.StyleDefault.Foreground(tcell.ColorGray),
		fillStyle:    tcell.StyleDefault.Foreground(tcell.ColorGreen),
		warningStyle: tcell.StyleDefault.Foreground(tcell.ColorYellow),
		dangerStyle:  tcell.StyleDefault.Foreground(tcell.ColorRed),
		warningLevel: 0.7,
		dangerLevel:  0.9,
	}
}

// SetValue sets the progress value (0.0 to 1.0)
func (pb *ProgressBar) SetValue(value float64) {
	if value < 0 {
		value = 0
	}
	if value > 1 {
		value = 1
	}
	pb.value = value
}

// SetLabel sets the label text
func (pb *ProgressBar) SetLabel(label string) {
	pb.label = label
}

// SetShowPercent sets whether to show percentage
func (pb *ProgressBar) SetShowPercent(show bool) {
	pb.showPercent = show
}

// SetThresholds sets warning and danger thresholds
func (pb *ProgressBar) SetThresholds(warning, danger float64) {
	pb.warningLevel = warning
	pb.dangerLevel = danger
}

// Draw renders the progress bar
func (pb *ProgressBar) Draw() {
	currentX := pb.x

	// Draw label if provided
	if pb.label != "" {
		for i, ch := range pb.label {
			pb.screen.SetContent(currentX+i, pb.y, ch, nil, tcell.StyleDefault)
		}
		currentX += len(pb.label) + 1
	}

	// Calculate bar dimensions
	barWidth := pb.width - (currentX - pb.x)
	if pb.showPercent {
		barWidth -= 6 // Reserve space for percentage display
	}

	if barWidth < 3 {
		return // Not enough space to draw bar
	}

	// Determine fill style based on value
	fillStyle := pb.fillStyle
	if pb.value >= pb.dangerLevel {
		fillStyle = pb.dangerStyle
	} else if pb.value >= pb.warningLevel {
		fillStyle = pb.warningStyle
	}

	// Draw bar borders
	pb.screen.SetContent(currentX, pb.y, '[', nil, pb.barStyle)
	pb.screen.SetContent(currentX+barWidth-1, pb.y, ']', nil, pb.barStyle)

	// Calculate fill width
	fillWidth := int(float64(barWidth-2) * pb.value)

	// Draw bar content
	for i := 1; i < barWidth-1; i++ {
		if i-1 < fillWidth {
			pb.screen.SetContent(currentX+i, pb.y, '█', nil, fillStyle)
		} else {
			pb.screen.SetContent(currentX+i, pb.y, '░', nil, pb.barStyle)
		}
	}

	// Draw percentage if enabled
	if pb.showPercent {
		percent := fmt.Sprintf("%3.0f%%", pb.value*100)
		percentX := currentX + barWidth + 1
		for i, ch := range percent {
			pb.screen.SetContent(percentX+i, pb.y, ch, nil, fillStyle)
		}
	}
}

// TokenUsageBar represents a specialized progress bar for token usage
type TokenUsageBar struct {
	*ProgressBar
	currentTokens int
	maxTokens     int
	description   string
}

// NewTokenUsageBar creates a new token usage bar
func NewTokenUsageBar(screen tcell.Screen, x, y, width int) *TokenUsageBar {
	return &TokenUsageBar{
		ProgressBar: NewProgressBar(screen, x, y, width),
		maxTokens:   4096, // Default max tokens
	}
}

// SetTokens sets the current and max token count
func (tub *TokenUsageBar) SetTokens(current, max int) {
	tub.currentTokens = current
	tub.maxTokens = max
	if max > 0 {
		tub.SetValue(float64(current) / float64(max))
	} else {
		tub.SetValue(0)
	}
}

// SetDescription sets the description text
func (tub *TokenUsageBar) SetDescription(desc string) {
	tub.description = desc
}

// Draw renders the token usage bar with additional info
func (tub *TokenUsageBar) Draw() {
	// Draw description if provided
	if tub.description != "" {
		descStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
		for i, ch := range tub.description {
			tub.screen.SetContent(tub.x+i, tub.y-1, ch, nil, descStyle)
		}
	}

	// Set label with token count
	label := fmt.Sprintf("Tokens: %d/%d", tub.currentTokens, tub.maxTokens)
	tub.SetLabel(label)

	// Draw the progress bar
	tub.ProgressBar.Draw()

	// Draw usage hint below the bar
	if tub.value > tub.dangerLevel {
		hint := "⚠ Near token limit"
		hintStyle := tub.dangerStyle
		for i, ch := range hint {
			tub.screen.SetContent(tub.x+i, tub.y+1, ch, nil, hintStyle)
		}
	}
}

// LinkLengthBar represents a specialized progress bar for link length
type LinkLengthBar struct {
	*ProgressBar
	currentBytes int
	maxBytes     int
	platforms    map[string]int // Platform name -> max bytes
}

// NewLinkLengthBar creates a new link length bar
func NewLinkLengthBar(screen tcell.Screen, x, y, width int) *LinkLengthBar {
	llb := &LinkLengthBar{
		ProgressBar: NewProgressBar(screen, x, y, width),
		maxBytes:    2000, // Browser URL limit
		platforms: map[string]int{
			"Browser": 2000,
			"QR Code": 1500,
			"Mobile":  1000,
			"SMS":     500,
		},
	}
	llb.SetThresholds(0.5, 0.8) // Warn at 50%, danger at 80%
	return llb
}

// SetBytes sets the current byte count
func (llb *LinkLengthBar) SetBytes(current int) {
	llb.currentBytes = current
	if llb.maxBytes > 0 {
		llb.SetValue(float64(current) / float64(llb.maxBytes))
	} else {
		llb.SetValue(0)
	}
}

// Draw renders the link length bar with platform warnings
func (llb *LinkLengthBar) Draw() {
	// Set label
	label := fmt.Sprintf("Link: %d bytes", llb.currentBytes)
	llb.SetLabel(label)

	// Draw the progress bar
	llb.ProgressBar.Draw()

	// Show platform compatibility below
	y := llb.y + 1
	compatStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)

	var warnings []string
	for platform, maxBytes := range llb.platforms {
		if llb.currentBytes > maxBytes {
			warnings = append(warnings, platform)
		}
	}

	if len(warnings) > 0 {
		warning := fmt.Sprintf("⚠ Exceeds: %s", warnings[0])
		if len(warnings) > 1 {
			warning = fmt.Sprintf("⚠ Exceeds: %s +%d more", warnings[0], len(warnings)-1)
		}
		warnStyle := tcell.StyleDefault.Foreground(tcell.ColorYellow)
		for i, ch := range warning {
			llb.screen.SetContent(llb.x+i, y, ch, nil, warnStyle)
		}
	} else {
		compat := "✓ Compatible with all platforms"
		for i, ch := range compat {
			llb.screen.SetContent(llb.x+i, y, ch, nil, compatStyle)
		}
	}
}