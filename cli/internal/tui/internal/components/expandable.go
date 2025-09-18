package components

import (
	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/core"
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

// GetItems returns the items in the group
func (eg *ExpandableGroup) GetItems() []ExpandableItem {
	return eg.items
}

// UpdateItem updates an item at the specified index
func (eg *ExpandableGroup) UpdateItem(index int, item ExpandableItem) {
	if index >= 0 && index < len(eg.items) {
		eg.items[index] = item
	}
}

// Draw renders the expandable group
func (eg *ExpandableGroup) Draw() int {
	currentY := eg.Y
	_, h := eg.screen.Size()

	// Define content area bounds (leaving space for header/footer)
	minY := 6  // Start of content area
	maxY := h - 4 // End of content area

	// Draw the header with expand/collapse indicator
	indicator := "▶"
	if eg.isExpanded {
		indicator = "▼"
	}

	// Only draw if within visible bounds
	if currentY >= minY && currentY < maxY {
		// Draw indicator and title
		headerStyle := eg.style.Bold(true)
		DrawText(eg.screen, eg.X, currentY, indicator+" "+eg.title, headerStyle)
	}
	currentY++

	// If expanded, draw the items
	if eg.isExpanded {
		for _, item := range eg.items {
			// Skip items outside visible bounds
			if currentY >= maxY {
				break // Stop drawing if we've gone below visible area
			}

			if currentY >= minY {
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
			}
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

// HandleMouse processes mouse events for the expandable group
func (eg *ExpandableGroup) HandleMouse(event *core.MouseEvent) bool {
	// Check if click is on the header
	headerHitTest := core.NewComponentHitTest(eg.X, eg.Y, eg.width, 1)

	switch event.Type {
	case core.MouseEventClick:
		if headerHitTest.ContainsEvent(event) {
			eg.Toggle()
			return true
		}

		// If expanded, check if click is on an item with checkbox
		if eg.isExpanded {
			currentY := eg.Y + 1
			for i, item := range eg.items {
				if item.IsCheckbox {
					itemX := eg.X + 2
					if item.Indented {
						itemX += 2
					}

					// Check if click is on this checkbox item
					checkboxWidth := 3 + 1 + len(item.Text) // checkbox + space + text
					itemHitTest := core.NewComponentHitTest(itemX, currentY, checkboxWidth, 1)

					if itemHitTest.ContainsEvent(event) {
						// Toggle checkbox state
						item.IsChecked = !item.IsChecked
						eg.items[i] = item
						return true
					}
				}
				currentY++
			}
		}

	case core.MouseEventDoubleClick:
		// Treat double-click same as single click on header
		if headerHitTest.ContainsEvent(event) {
			eg.Toggle()
			return true
		}
	}

	return false
}