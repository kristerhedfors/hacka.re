package components

import (
	"strings"

	"github.com/gdamore/tcell/v2"
)

// Editor provides multi-line text editing functionality
type Editor struct {
	screen       tcell.Screen
	lines        []string
	cursorX      int
	cursorY      int
	scrollOffset int
	x, y         int
	width        int
	height       int
	readOnly     bool
	style        tcell.Style
	borderStyle  tcell.Style
}

// NewEditor creates a new text editor
func NewEditor(screen tcell.Screen) *Editor {
	return &Editor{
		screen:      screen,
		lines:       []string{""},
		style:       tcell.StyleDefault.Foreground(tcell.ColorWhite),
		borderStyle: tcell.StyleDefault.Foreground(tcell.ColorBlue),
	}
}

// SetPosition sets the editor position
func (e *Editor) SetPosition(x, y int) {
	e.x = x
	e.y = y
}

// SetDimensions sets the editor dimensions
func (e *Editor) SetDimensions(width, height int) {
	e.width = width
	e.height = height
}

// SetText sets the editor content
func (e *Editor) SetText(text string) {
	e.lines = strings.Split(text, "\n")
	if len(e.lines) == 0 {
		e.lines = []string{""}
	}
	e.cursorX = 0
	e.cursorY = 0
	e.scrollOffset = 0
}

// GetText returns the editor content
func (e *Editor) GetText() string {
	return strings.Join(e.lines, "\n")
}

// SetReadOnly sets whether the editor is read-only
func (e *Editor) SetReadOnly(readOnly bool) {
	e.readOnly = readOnly
}

// Draw renders the editor
func (e *Editor) Draw() {
	// Draw border
	e.drawBorder()

	// Calculate visible area
	visibleHeight := e.height - 2 // Account for borders
	endLine := e.scrollOffset + visibleHeight
	if endLine > len(e.lines) {
		endLine = len(e.lines)
	}

	// Draw visible lines
	for i := e.scrollOffset; i < endLine; i++ {
		lineY := e.y + 1 + (i - e.scrollOffset)
		line := e.lines[i]

		// Truncate line if too long
		if len(line) > e.width-2 {
			line = line[:e.width-2]
		}

		// Clear the line first
		for x := e.x + 1; x < e.x+e.width-1; x++ {
			e.screen.SetContent(x, lineY, ' ', nil, e.style)
		}

		// Draw the text
		for j, r := range line {
			if j < e.width-2 {
				e.screen.SetContent(e.x+1+j, lineY, r, nil, e.style)
			}
		}
	}

	// Draw cursor if not read-only
	if !e.readOnly && e.cursorY >= e.scrollOffset && e.cursorY < endLine {
		cursorScreenY := e.y + 1 + (e.cursorY - e.scrollOffset)
		cursorScreenX := e.x + 1 + e.cursorX
		if cursorScreenX < e.x+e.width-1 {
			e.screen.SetContent(cursorScreenX, cursorScreenY, '_', nil, e.style.Blink(true))
		}
	}

	// Draw scroll indicators
	if e.scrollOffset > 0 {
		e.screen.SetContent(e.x+e.width-2, e.y+1, '↑', nil, e.borderStyle)
	}
	if endLine < len(e.lines) {
		e.screen.SetContent(e.x+e.width-2, e.y+e.height-2, '↓', nil, e.borderStyle)
	}
}

// drawBorder draws the editor border
func (e *Editor) drawBorder() {
	// Top border
	e.screen.SetContent(e.x, e.y, '╔', nil, e.borderStyle)
	for i := 1; i < e.width-1; i++ {
		e.screen.SetContent(e.x+i, e.y, '═', nil, e.borderStyle)
	}
	e.screen.SetContent(e.x+e.width-1, e.y, '╗', nil, e.borderStyle)

	// Side borders and clear interior
	for i := 1; i < e.height-1; i++ {
		e.screen.SetContent(e.x, e.y+i, '║', nil, e.borderStyle)
		e.screen.SetContent(e.x+e.width-1, e.y+i, '║', nil, e.borderStyle)
	}

	// Bottom border
	e.screen.SetContent(e.x, e.y+e.height-1, '╚', nil, e.borderStyle)
	for i := 1; i < e.width-1; i++ {
		e.screen.SetContent(e.x+i, e.y+e.height-1, '═', nil, e.borderStyle)
	}
	e.screen.SetContent(e.x+e.width-1, e.y+e.height-1, '╝', nil, e.borderStyle)
}

// HandleInput processes keyboard input
func (e *Editor) HandleInput(ev *tcell.EventKey) bool {
	if e.readOnly {
		// Only handle navigation in read-only mode
		switch ev.Key() {
		case tcell.KeyUp:
			e.moveCursor(0, -1)
			return true
		case tcell.KeyDown:
			e.moveCursor(0, 1)
			return true
		case tcell.KeyPgUp:
			e.scrollOffset -= (e.height - 2)
			if e.scrollOffset < 0 {
				e.scrollOffset = 0
			}
			return true
		case tcell.KeyPgDn:
			e.scrollOffset += (e.height - 2)
			maxScroll := len(e.lines) - (e.height - 2)
			if maxScroll < 0 {
				maxScroll = 0
			}
			if e.scrollOffset > maxScroll {
				e.scrollOffset = maxScroll
			}
			return true
		}
		return false
	}

	// Handle editing
	switch ev.Key() {
	case tcell.KeyUp:
		e.moveCursor(0, -1)
		return true

	case tcell.KeyDown:
		e.moveCursor(0, 1)
		return true

	case tcell.KeyLeft:
		e.moveCursor(-1, 0)
		return true

	case tcell.KeyRight:
		e.moveCursor(1, 0)
		return true

	case tcell.KeyHome:
		e.cursorX = 0
		return true

	case tcell.KeyEnd:
		e.cursorX = len(e.lines[e.cursorY])
		return true

	case tcell.KeyEnter:
		e.insertNewLine()
		return true

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		e.deleteChar()
		return true

	case tcell.KeyRune:
		e.insertChar(ev.Rune())
		return true

	case tcell.KeyTab:
		// Insert 4 spaces for tab
		for i := 0; i < 4; i++ {
			e.insertChar(' ')
		}
		return true
	}

	return false
}

// moveCursor moves the cursor by the specified amount
func (e *Editor) moveCursor(dx, dy int) {
	e.cursorY += dy
	if e.cursorY < 0 {
		e.cursorY = 0
	}
	if e.cursorY >= len(e.lines) {
		e.cursorY = len(e.lines) - 1
	}

	e.cursorX += dx
	if e.cursorX < 0 {
		if e.cursorY > 0 {
			e.cursorY--
			e.cursorX = len(e.lines[e.cursorY])
		} else {
			e.cursorX = 0
		}
	}
	if e.cursorX > len(e.lines[e.cursorY]) {
		if e.cursorY < len(e.lines)-1 {
			e.cursorY++
			e.cursorX = 0
		} else {
			e.cursorX = len(e.lines[e.cursorY])
		}
	}

	// Adjust scroll offset if cursor is out of view
	visibleHeight := e.height - 2
	if e.cursorY < e.scrollOffset {
		e.scrollOffset = e.cursorY
	}
	if e.cursorY >= e.scrollOffset+visibleHeight {
		e.scrollOffset = e.cursorY - visibleHeight + 1
	}
}

// insertChar inserts a character at the cursor position
func (e *Editor) insertChar(r rune) {
	line := e.lines[e.cursorY]
	e.lines[e.cursorY] = line[:e.cursorX] + string(r) + line[e.cursorX:]
	e.cursorX++
}

// deleteChar deletes the character before the cursor
func (e *Editor) deleteChar() {
	if e.cursorX > 0 {
		line := e.lines[e.cursorY]
		e.lines[e.cursorY] = line[:e.cursorX-1] + line[e.cursorX:]
		e.cursorX--
	} else if e.cursorY > 0 {
		// Join with previous line
		prevLine := e.lines[e.cursorY-1]
		currentLine := e.lines[e.cursorY]
		e.lines[e.cursorY-1] = prevLine + currentLine
		// Remove current line
		e.lines = append(e.lines[:e.cursorY], e.lines[e.cursorY+1:]...)
		e.cursorY--
		e.cursorX = len(prevLine)
	}
}

// insertNewLine inserts a new line at the cursor position
func (e *Editor) insertNewLine() {
	line := e.lines[e.cursorY]
	beforeCursor := line[:e.cursorX]
	afterCursor := line[e.cursorX:]

	e.lines[e.cursorY] = beforeCursor
	// Insert new line after current
	newLines := make([]string, 0, len(e.lines)+1)
	newLines = append(newLines, e.lines[:e.cursorY+1]...)
	newLines = append(newLines, afterCursor)
	newLines = append(newLines, e.lines[e.cursorY+1:]...)
	e.lines = newLines

	e.cursorY++
	e.cursorX = 0
}