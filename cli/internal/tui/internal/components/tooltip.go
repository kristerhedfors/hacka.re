package components

import (
	"strings"

	"github.com/gdamore/tcell/v2"
)

// Tooltip represents an info tooltip with expandable help text
type Tooltip struct {
	screen       tcell.Screen
	x, y         int
	width        int
	maxHeight    int
	title        string
	content      []string
	isVisible    bool
	borderStyle  tcell.Style
	contentStyle tcell.Style
}

// NewTooltip creates a new tooltip component
func NewTooltip(screen tcell.Screen, x, y, width, maxHeight int) *Tooltip {
	return &Tooltip{
		screen:       screen,
		x:            x,
		y:            y,
		width:        width,
		maxHeight:    maxHeight,
		content:      []string{},
		isVisible:    false,
		borderStyle:  tcell.StyleDefault.Foreground(tcell.ColorYellow),
		contentStyle: tcell.StyleDefault,
	}
}

// SetContent sets the tooltip content
func (t *Tooltip) SetContent(title string, content []string) {
	t.title = title
	t.content = content
}

// SetContentFromText sets content from a multi-line string
func (t *Tooltip) SetContentFromText(title string, text string) {
	t.title = title
	lines := strings.Split(text, "\n")
	t.content = []string{}

	// Word wrap long lines
	for _, line := range lines {
		wrapped := t.wrapText(line, t.width-4) // -4 for borders and padding
		t.content = append(t.content, wrapped...)
	}
}

// Toggle toggles the visibility
func (t *Tooltip) Toggle() {
	t.isVisible = !t.isVisible
}

// Show shows the tooltip
func (t *Tooltip) Show() {
	t.isVisible = true
}

// Hide hides the tooltip
func (t *Tooltip) Hide() {
	t.isVisible = false
}

// IsVisible returns the visibility state
func (t *Tooltip) IsVisible() bool {
	return t.isVisible
}

// Draw renders the tooltip
func (t *Tooltip) Draw() {
	if !t.isVisible {
		return
	}

	// Calculate actual height
	contentHeight := len(t.content)
	if t.title != "" {
		contentHeight += 2 // Title + separator
	}
	height := contentHeight + 2 // +2 for borders
	if height > t.maxHeight {
		height = t.maxHeight
	}

	// Draw border
	t.drawBorder(t.x, t.y, t.width, height)

	// Draw title if provided
	currentY := t.y + 1
	if t.title != "" {
		titleStyle := t.contentStyle.Bold(true)
		title := t.truncateText(t.title, t.width-4)
		for i, ch := range title {
			t.screen.SetContent(t.x+2+i, currentY, ch, nil, titleStyle)
		}
		currentY++

		// Draw separator
		for i := 1; i < t.width-1; i++ {
			t.screen.SetContent(t.x+i, currentY, '─', nil, t.borderStyle)
		}
		currentY++
	}

	// Draw content
	maxLines := height - 2 - (currentY - t.y - 1)
	for i := 0; i < len(t.content) && i < maxLines; i++ {
		line := t.truncateText(t.content[i], t.width-4)
		for j, ch := range line {
			t.screen.SetContent(t.x+2+j, currentY+i, ch, nil, t.contentStyle)
		}
	}

	// Show scroll indicator if content is truncated
	if len(t.content) > maxLines {
		indicator := "..."
		indicatorY := t.y + height - 2
		for i, ch := range indicator {
			t.screen.SetContent(t.x+t.width-4-i, indicatorY, ch, nil, t.contentStyle)
		}
	}
}

// drawBorder draws the tooltip border
func (t *Tooltip) drawBorder(x, y, width, height int) {
	// Top border
	t.screen.SetContent(x, y, '╭', nil, t.borderStyle)
	for i := 1; i < width-1; i++ {
		t.screen.SetContent(x+i, y, '─', nil, t.borderStyle)
	}
	t.screen.SetContent(x+width-1, y, '╮', nil, t.borderStyle)

	// Side borders
	for i := 1; i < height-1; i++ {
		t.screen.SetContent(x, y+i, '│', nil, t.borderStyle)
		t.screen.SetContent(x+width-1, y+i, '│', nil, t.borderStyle)

		// Clear content area
		for j := 1; j < width-1; j++ {
			t.screen.SetContent(x+j, y+i, ' ', nil, tcell.StyleDefault)
		}
	}

	// Bottom border
	t.screen.SetContent(x, y+height-1, '╰', nil, t.borderStyle)
	for i := 1; i < width-1; i++ {
		t.screen.SetContent(x+i, y+height-1, '─', nil, t.borderStyle)
	}
	t.screen.SetContent(x+width-1, y+height-1, '╯', nil, t.borderStyle)
}

// wrapText wraps text to fit within the specified width
func (t *Tooltip) wrapText(text string, width int) []string {
	if len(text) <= width {
		return []string{text}
	}

	var lines []string
	words := strings.Fields(text)
	if len(words) == 0 {
		return []string{}
	}

	currentLine := words[0]
	for i := 1; i < len(words); i++ {
		word := words[i]
		if len(currentLine)+1+len(word) <= width {
			currentLine += " " + word
		} else {
			lines = append(lines, currentLine)
			currentLine = word
		}
	}
	if currentLine != "" {
		lines = append(lines, currentLine)
	}

	return lines
}

// truncateText truncates text to fit within the specified width
func (t *Tooltip) truncateText(text string, width int) string {
	if len(text) <= width {
		return text
	}
	if width <= 3 {
		return text[:width]
	}
	return text[:width-3] + "..."
}

// InfoIcon represents an info icon with associated tooltip
type InfoIcon struct {
	screen  tcell.Screen
	x, y    int
	Tooltip *Tooltip // Exported for access
	style   tcell.Style
}

// NewInfoIcon creates a new info icon with tooltip
func NewInfoIcon(screen tcell.Screen, x, y int, tooltipWidth, tooltipHeight int) *InfoIcon {
	return &InfoIcon{
		screen:  screen,
		x:       x,
		y:       y,
		Tooltip: NewTooltip(screen, x+2, y, tooltipWidth, tooltipHeight),
		style:   tcell.StyleDefault.Foreground(tcell.ColorBlue),
	}
}

// SetTooltipContent sets the tooltip content
func (ii *InfoIcon) SetTooltipContent(title, content string) {
	ii.Tooltip.SetContentFromText(title, content)
}

// Draw renders the info icon
func (ii *InfoIcon) Draw() {
	// Draw info icon
	ii.screen.SetContent(ii.x, ii.y, 'ⓘ', nil, ii.style)

	// Draw tooltip if visible
	ii.Tooltip.Draw()
}

// HandleInput processes input for the info icon
func (ii *InfoIcon) HandleInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEnter, tcell.KeyRune:
		if ev.Key() == tcell.KeyRune && ev.Rune() != ' ' && ev.Rune() != 'i' && ev.Rune() != 'I' {
			return false
		}
		ii.Tooltip.Toggle()
		return true
	case tcell.KeyEscape:
		if ii.Tooltip.IsVisible() {
			ii.Tooltip.Hide()
			return true
		}
	}
	return false
}