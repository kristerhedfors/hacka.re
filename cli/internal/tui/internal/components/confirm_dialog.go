package components

import (
	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// ConfirmDialog represents a modal confirmation dialog
type ConfirmDialog struct {
	screen        tcell.Screen
	title         string
	message       string
	x, y          int
	width, height int
	selected      bool // true for Yes, false for No

	// Styles
	borderStyle   tcell.Style
	textStyle     tcell.Style
	buttonStyle   tcell.Style
	selectedStyle tcell.Style
}

// NewConfirmDialog creates a new confirmation dialog
func NewConfirmDialog(screen tcell.Screen, title, message string) *ConfirmDialog {
	return &ConfirmDialog{
		screen:        screen,
		title:         title,
		message:       message,
		width:         50,
		height:        10,
		selected:      false, // Default to No for safety

		borderStyle:   tcell.StyleDefault.Foreground(tcell.ColorRed),
		textStyle:     tcell.StyleDefault.Foreground(tcell.ColorWhite),
		buttonStyle:   tcell.StyleDefault.Foreground(tcell.ColorWhite).Background(tcell.ColorDarkGray),
		selectedStyle: tcell.StyleDefault.Foreground(tcell.ColorWhite).Background(tcell.ColorBlue).Bold(true),
	}
}

// Center centers the dialog on screen
func (d *ConfirmDialog) Center() {
	w, h := d.screen.Size()
	d.x = (w - d.width) / 2
	d.y = (h - d.height) / 2
}

// Draw renders the dialog
func (d *ConfirmDialog) Draw() {
	// Draw border
	d.drawBorder()

	// Draw title
	d.drawTitle()

	// Draw message
	d.drawMessage()

	// Draw buttons
	d.drawButtons()

	// Draw instructions
	d.drawInstructions()
}

// drawBorder draws the dialog border
func (d *ConfirmDialog) drawBorder() {
	// Top border
	d.screen.SetContent(d.x, d.y, '╔', nil, d.borderStyle)
	for i := 1; i < d.width-1; i++ {
		d.screen.SetContent(d.x+i, d.y, '═', nil, d.borderStyle)
	}
	d.screen.SetContent(d.x+d.width-1, d.y, '╗', nil, d.borderStyle)

	// Side borders
	for i := 1; i < d.height-1; i++ {
		d.screen.SetContent(d.x, d.y+i, '║', nil, d.borderStyle)
		d.screen.SetContent(d.x+d.width-1, d.y+i, '║', nil, d.borderStyle)
	}

	// Bottom border
	d.screen.SetContent(d.x, d.y+d.height-1, '╚', nil, d.borderStyle)
	for i := 1; i < d.width-1; i++ {
		d.screen.SetContent(d.x+i, d.y+d.height-1, '═', nil, d.borderStyle)
	}
	d.screen.SetContent(d.x+d.width-1, d.y+d.height-1, '╝', nil, d.borderStyle)
}

// drawTitle draws the dialog title
func (d *ConfirmDialog) drawTitle() {
	title := " " + d.title + " "
	titleX := d.x + (d.width-len(title))/2
	for i, r := range title {
		d.screen.SetContent(titleX+i, d.y, r, nil, d.borderStyle.Bold(true))
	}
}

// drawMessage draws the dialog message
func (d *ConfirmDialog) drawMessage() {
	// Wrap message to fit within dialog width
	lines := d.wrapText(d.message, d.width-4)

	startY := d.y + 2
	for i, line := range lines {
		if i >= d.height-5 { // Leave room for buttons and instructions
			break
		}
		lineX := d.x + (d.width-len(line))/2
		for j, r := range line {
			d.screen.SetContent(lineX+j, startY+i, r, nil, d.textStyle)
		}
	}
}

// drawButtons draws the Yes/No buttons
func (d *ConfirmDialog) drawButtons() {
	buttonY := d.y + d.height - 3

	// Calculate button positions
	buttonWidth := 8
	spacing := 4
	totalWidth := buttonWidth*2 + spacing
	startX := d.x + (d.width-totalWidth)/2

	// Draw No button (left)
	noStyle := d.buttonStyle
	if !d.selected {
		noStyle = d.selectedStyle
	}
	noText := "  No  "
	for i, r := range noText {
		d.screen.SetContent(startX+i, buttonY, r, nil, noStyle)
	}

	// Draw Yes button (right)
	yesStyle := d.buttonStyle
	if d.selected {
		yesStyle = d.selectedStyle
	}
	yesText := "  Yes  "
	yesX := startX + buttonWidth + spacing
	for i, r := range yesText {
		d.screen.SetContent(yesX+i, buttonY, r, nil, yesStyle)
	}
}

// drawInstructions draws the help text
func (d *ConfirmDialog) drawInstructions() {
	instructions := " ←→:Select | Enter:Confirm | ESC:Cancel "
	instrX := d.x + (d.width-len(instructions))/2
	instrY := d.y + d.height - 1

	instrStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	for i, r := range instructions {
		d.screen.SetContent(instrX+i, instrY, r, nil, instrStyle)
	}
}

// HandleInput processes keyboard input
// Returns: confirmed (true if Yes was selected), done (true if dialog should close)
func (d *ConfirmDialog) HandleInput(ev *tcell.EventKey) (confirmed bool, done bool) {
	switch ev.Key() {
	case tcell.KeyEscape:
		// ESC cancels the dialog
		return false, true

	case tcell.KeyEnter:
		// Enter confirms the current selection
		return d.selected, true

	case tcell.KeyLeft:
		// Move to No
		d.selected = false

	case tcell.KeyRight:
		// Move to Yes
		d.selected = true

	case tcell.KeyRune:
		r := ev.Rune()
		if r == 'y' || r == 'Y' {
			// Quick select Yes
			d.selected = true
			return true, true
		} else if r == 'n' || r == 'N' {
			// Quick select No
			d.selected = false
			return false, true
		}
	}

	return false, false
}

// wrapText wraps text to fit within the given width
func (d *ConfirmDialog) wrapText(text string, width int) []string {
	var lines []string
	words := []string{}
	currentWord := ""

	// Split into words
	for _, r := range text {
		if r == ' ' || r == '\n' {
			if currentWord != "" {
				words = append(words, currentWord)
				currentWord = ""
			}
			if r == '\n' {
				words = append(words, "\n")
			}
		} else {
			currentWord += string(r)
		}
	}
	if currentWord != "" {
		words = append(words, currentWord)
	}

	// Build lines
	currentLine := ""
	for _, word := range words {
		if word == "\n" {
			lines = append(lines, currentLine)
			currentLine = ""
			continue
		}

		if len(currentLine)+len(word)+1 > width {
			if currentLine != "" {
				lines = append(lines, currentLine)
				currentLine = word
			} else {
				// Word is too long, truncate it
				lines = append(lines, word[:width-3]+"...")
				currentLine = ""
			}
		} else {
			if currentLine != "" {
				currentLine += " "
			}
			currentLine += word
		}
	}

	if currentLine != "" {
		lines = append(lines, currentLine)
	}

	return lines
}

// HandleMouse processes mouse events for the dialog
func (d *ConfirmDialog) HandleMouse(event *core.MouseEvent) bool {
	// Check if mouse is within dialog bounds
	dialogHitTest := core.NewComponentHitTest(d.x, d.y, d.width, d.height)
	if !dialogHitTest.ContainsEvent(event) {
		// Click outside dialog could be treated as cancel
		if event.Type == core.MouseEventClick {
			// For safety, we don't auto-cancel on outside click
			// User must explicitly click No or press ESC
		}
		return false
	}

	// Calculate button positions
	buttonY := d.y + d.height - 3
	buttonWidth := 8
	spacing := 4
	totalWidth := buttonWidth*2 + spacing
	startX := d.x + (d.width-totalWidth)/2

	// Define hit areas for buttons
	noButtonHitTest := core.NewComponentHitTest(startX, buttonY, buttonWidth, 1)
	yesButtonHitTest := core.NewComponentHitTest(startX+buttonWidth+spacing, buttonY, buttonWidth, 1)

	switch event.Type {
	case core.MouseEventClick:
		// Check if click is on No button
		if noButtonHitTest.ContainsEvent(event) {
			d.selected = false
			// Auto-confirm on button click for better UX
			return true // Signal that No was selected
		}

		// Check if click is on Yes button
		if yesButtonHitTest.ContainsEvent(event) {
			d.selected = true
			// Auto-confirm on button click for better UX
			return true // Signal that Yes was selected
		}

	case core.MouseEventHover:
		// Update selection based on hover
		if noButtonHitTest.ContainsEvent(event) {
			d.selected = false
			return true
		} else if yesButtonHitTest.ContainsEvent(event) {
			d.selected = true
			return true
		}
	}

	// Event was within dialog but not on a button
	return true // Still handled to prevent pass-through
}

// IsConfirmed returns whether Yes is currently selected
func (d *ConfirmDialog) IsConfirmed() bool {
	return d.selected
}