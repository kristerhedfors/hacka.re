package ui

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
)

// ShowPlaceholderModal displays a placeholder modal for unimplemented features
func ShowPlaceholderModal(title, message string) {
	s, err := tcell.NewScreen()
	if err != nil {
		fmt.Printf("Error creating screen: %v\n", err)
		return
	}

	if err := s.Init(); err != nil {
		fmt.Printf("Error initializing screen: %v\n", err)
		return
	}
	defer s.Fini()

	s.SetStyle(tcell.StyleDefault.Background(tcell.ColorReset).Foreground(tcell.ColorReset))
	s.Clear()

	// Main loop
	for {
		drawPlaceholder(s, title, message)
		s.Show()

		ev := s.PollEvent()
		switch ev := ev.(type) {
		case *tcell.EventKey:
			if ev.Key() == tcell.KeyEscape || ev.Key() == tcell.KeyEnter {
				// Return to chat on ESC or Enter
				return
			}
		case *tcell.EventResize:
			s.Sync()
		}
	}
}

// drawPlaceholder draws the placeholder modal content
func drawPlaceholder(s tcell.Screen, title, message string) {
	s.Clear()
	w, h := s.Size()

	// Calculate modal dimensions
	modalW := 60
	modalH := 12
	modalX := (w - modalW) / 2
	modalY := (h - modalH) / 2

	// Draw border
	drawModalBorder(s, modalX, modalY, modalW, modalH)

	// Draw title
	titleX := modalX + (modalW-len(title))/2
	drawModalText(s, titleX, modalY, title, tcell.StyleDefault.Bold(true))

	// Draw coming soon icon
	icon := "🚧"
	iconX := modalX + (modalW-len(icon))/2
	drawModalText(s, iconX, modalY+3, icon, tcell.StyleDefault)

	// Draw message
	lines := []string{
		"Coming Soon!",
		"",
		message,
		"",
		"This feature is under development",
		"and will be available in a future update.",
	}

	for i, line := range lines {
		if i < modalH-4 {
			lineX := modalX + (modalW-len(line))/2
			style := tcell.StyleDefault
			if i == 0 {
				style = style.Bold(true).Foreground(tcell.ColorYellow)
			}
			drawModalText(s, lineX, modalY+3+i, line, style)
		}
	}

	// Draw help
	help := "Press ESC or Enter to return"
	helpX := modalX + (modalW-len(help))/2
	drawModalText(s, helpX, modalY+modalH-2, help, tcell.StyleDefault.Dim(true))
}

// drawModalBorder draws a border for the modal
func drawModalBorder(s tcell.Screen, x, y, w, h int) {
	style := tcell.StyleDefault

	// Corners
	s.SetContent(x, y, '╔', nil, style)
	s.SetContent(x+w-1, y, '╗', nil, style)
	s.SetContent(x, y+h-1, '╚', nil, style)
	s.SetContent(x+w-1, y+h-1, '╝', nil, style)

	// Horizontal lines
	for i := x + 1; i < x+w-1; i++ {
		s.SetContent(i, y, '═', nil, style)
		s.SetContent(i, y+h-1, '═', nil, style)
	}

	// Vertical lines
	for i := y + 1; i < y+h-1; i++ {
		s.SetContent(x, i, '║', nil, style)
		s.SetContent(x+w-1, i, '║', nil, style)
	}
}

// drawModalText draws text at the specified position
func drawModalText(s tcell.Screen, x, y int, text string, style tcell.Style) {
	for i, r := range text {
		s.SetContent(x+i, y, r, nil, style)
	}
}