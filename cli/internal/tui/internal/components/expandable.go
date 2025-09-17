package components

import (
	"github.com/gdamore/tcell/v2"
)

// ExpandableGroup represents a collapsible/expandable UI group
type ExpandableGroup struct {
	screen     tcell.Screen
	X, Y       int // Exported for positioning
	width      int
	title      string
	isExpanded bool
	items      []ExpandableItem
	style      tcell.Style
}

// ExpandableItem represents an item within an expandable group
type ExpandableItem struct {
	Text        string
	Indented    bool
	Style       tcell.Style
	IsCheckbox  bool
	IsChecked   bool
}

// NewExpandableGroup creates a new expandable group
func NewExpandableGroup(screen tcell.Screen, x, y, width int, title string) *ExpandableGroup {
	return &ExpandableGroup{
		screen:     screen,
		X:          x,
		Y:          y,
		width:      width,
		title:      title,
		isExpanded: false,
		items:      []ExpandableItem{},
		style:      tcell.StyleDefault,
	}
}

// SetExpanded sets the expanded state
func (eg *ExpandableGroup) SetExpanded(expanded bool) {
	eg.isExpanded = expanded
}

// Toggle toggles the expanded state
func (eg *ExpandableGroup) Toggle() {
	eg.isExpanded = !eg.isExpanded
}

// IsExpanded returns the current expanded state
func (eg *ExpandableGroup) IsExpanded() bool {
	return eg.isExpanded
}

// AddItem adds an item to the group
func (eg *ExpandableGroup) AddItem(item ExpandableItem) {
	eg.items = append(eg.items, item)
}

// ClearItems removes all items
func (eg *ExpandableGroup) ClearItems() {
	eg.items = []ExpandableItem{}
}

// Draw renders the expandable group
func (eg *ExpandableGroup) Draw() int {
	currentY := eg.Y

	// Draw the header with expand/collapse indicator
	indicator := "▶"
	if eg.isExpanded {
		indicator = "▼"
	}

	// Draw indicator and title
	headerStyle := eg.style.Bold(true)
	DrawText(eg.screen, eg.X, currentY, indicator+" "+eg.title, headerStyle)
	currentY++

	// If expanded, draw the items
	if eg.isExpanded {
		for _, item := range eg.items {
			x := eg.X + 2 // Base indentation for items
			if item.Indented {
				x += 2 // Additional indentation
			}

			text := item.Text
			if item.IsCheckbox {
				checkbox := "[ ]"
				if item.IsChecked {
					checkbox = "[x]"
				}
				text = checkbox + " " + text
			}

			// Truncate text if too long
			maxLen := eg.width - (x - eg.X)
			if len(text) > maxLen && maxLen > 3 {
				text = text[:maxLen-3] + "..."
			}

			DrawText(eg.screen, x, currentY, text, item.Style)
			currentY++
		}
	}

	// Return the number of lines drawn
	return currentY - eg.Y
}

// HandleInput processes keyboard input for the expandable group
func (eg *ExpandableGroup) HandleInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEnter, tcell.KeyRune:
		if ev.Key() == tcell.KeyRune && ev.Rune() != ' ' {
			return false
		}
		eg.Toggle()
		return true
	}
	return false
}

// DrawText is a helper function to draw text at a position
func DrawText(screen tcell.Screen, x, y int, text string, style tcell.Style) {
	for i, ch := range text {
		screen.SetContent(x+i, y, ch, nil, style)
	}
}