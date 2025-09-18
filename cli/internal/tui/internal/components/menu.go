package components

import (
	"fmt"
	"strings"
	"unicode"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// MenuItem represents a selectable menu item interface
type MenuItem interface {
	GetID() string
	GetNumber() int
	GetTitle() string
	GetDescription() string
	GetInfo() string
	GetCategory() string
	IsEnabled() bool
}

// BasicMenuItem is a basic implementation of MenuItem
type BasicMenuItem struct {
	ID          string
	Number      int
	Title       string
	Description string
	Info        string
	Category    string
	Enabled     bool
	Handler     func() error
}

func (m *BasicMenuItem) GetID() string          { return m.ID }
func (m *BasicMenuItem) GetNumber() int         { return m.Number }
func (m *BasicMenuItem) GetTitle() string       { return m.Title }
func (m *BasicMenuItem) GetDescription() string { return m.Description }
func (m *BasicMenuItem) GetInfo() string        { return m.Info }
func (m *BasicMenuItem) GetCategory() string    { return m.Category }
func (m *BasicMenuItem) IsEnabled() bool        { return m.Enabled }

// FilterableMenu provides a searchable menu with arrow navigation and info panel
type FilterableMenu struct {
	screen        tcell.Screen
	items         []MenuItem
	filteredItems []MenuItem
	selectedIndex int
	filterText    string

	// Display settings
	title         string
	x, y          int
	width, height int
	infoWidth     int
	showInfo      bool

	// Colors
	normalStyle    tcell.Style
	selectedStyle  tcell.Style
	disabledStyle  tcell.Style
	borderStyle    tcell.Style
	filterStyle    tcell.Style
	infoStyle      tcell.Style
}

// NewFilterableMenu creates a new filterable menu
func NewFilterableMenu(screen tcell.Screen, title string) *FilterableMenu {
	return &FilterableMenu{
		screen:        screen,
		title:         title,
		items:         make([]MenuItem, 0),
		filteredItems: make([]MenuItem, 0),
		selectedIndex: 0,
		filterText:    "",
		width:         50,
		height:        20,
		infoWidth:     40,
		showInfo:      true,

		// Default styles
		normalStyle:   tcell.StyleDefault.Foreground(tcell.ColorWhite),
		selectedStyle: tcell.StyleDefault.Background(tcell.ColorBlue).Foreground(tcell.ColorWhite),
		disabledStyle: tcell.StyleDefault.Foreground(tcell.ColorGray),
		borderStyle:   tcell.StyleDefault.Foreground(tcell.ColorGreen),
		filterStyle:   tcell.StyleDefault.Foreground(tcell.ColorYellow),
		infoStyle:     tcell.StyleDefault.Foreground(tcell.ColorTeal),
	}
}

// AddItem adds a menu item
func (m *FilterableMenu) AddItem(item MenuItem) {
	m.items = append(m.items, item)
	m.applyFilter()
}

// SetPosition sets the menu position
func (m *FilterableMenu) SetPosition(x, y int) {
	m.x = x
	m.y = y
}

// SetDimensions sets the menu dimensions
func (m *FilterableMenu) SetDimensions(width, height int) {
	m.width = width
	m.height = height
}

// SetInfoPanel controls the info panel
func (m *FilterableMenu) SetInfoPanel(show bool, width int) {
	m.showInfo = show
	m.infoWidth = width
}

// Draw renders the menu
func (m *FilterableMenu) Draw() {
	m.drawBorder()
	m.drawTitle()
	m.drawFilter()
	m.drawItems()
	if m.showInfo {
		m.drawInfoPanel()
	}
	m.drawInstructions()
}

// drawBorder draws the menu border
func (m *FilterableMenu) drawBorder() {
	// Draw main menu border
	m.drawBox(m.x, m.y, m.width, m.height, m.borderStyle)

	// Draw info panel border if enabled
	if m.showInfo {
		infoX := m.x + m.width + 2
		m.drawBox(infoX, m.y, m.infoWidth, m.height, m.borderStyle)
	}
}

// drawBox draws a box with the given dimensions
func (m *FilterableMenu) drawBox(x, y, w, h int, style tcell.Style) {
	// Clear background to make it opaque
	bgStyle := tcell.StyleDefault.Background(tcell.ColorBlack)
	for row := 0; row < h; row++ {
		for col := 0; col < w; col++ {
			m.screen.SetContent(x+col, y+row, ' ', nil, bgStyle)
		}
	}

	// Top border
	m.screen.SetContent(x, y, '╔', nil, style)
	for i := 1; i < w-1; i++ {
		m.screen.SetContent(x+i, y, '═', nil, style)
	}
	m.screen.SetContent(x+w-1, y, '╗', nil, style)

	// Side borders
	for i := 1; i < h-1; i++ {
		m.screen.SetContent(x, y+i, '║', nil, style)
		m.screen.SetContent(x+w-1, y+i, '║', nil, style)
	}

	// Bottom border
	m.screen.SetContent(x, y+h-1, '╚', nil, style)
	for i := 1; i < w-1; i++ {
		m.screen.SetContent(x+i, y+h-1, '═', nil, style)
	}
	m.screen.SetContent(x+w-1, y+h-1, '╝', nil, style)
}

// drawTitle draws the menu title
func (m *FilterableMenu) drawTitle() {
	title := fmt.Sprintf(" %s ", m.title)
	x := m.x + (m.width-len(title))/2
	m.drawText(x, m.y, title, m.borderStyle)
}

// drawFilter draws the filter input area
func (m *FilterableMenu) drawFilter() {
	y := m.y + 2

	// Draw filter label
	label := "Filter: "
	m.drawText(m.x+2, y, label, m.normalStyle)

	// Draw filter text
	filterX := m.x + 2 + len(label)
	if m.filterText != "" {
		m.drawText(filterX, y, m.filterText, m.filterStyle)
		// Draw cursor
		m.screen.SetContent(filterX+len(m.filterText), y, '_', nil, m.filterStyle.Blink(true))
	} else {
		m.drawText(filterX, y, "(type to search)", m.disabledStyle)
	}

	// Draw separator
	for i := 1; i < m.width-1; i++ {
		m.screen.SetContent(m.x+i, y+1, '─', nil, m.borderStyle)
	}
}

// drawItems draws the menu items
func (m *FilterableMenu) drawItems() {
	startY := m.y + 4
	maxItems := m.height - 7 // Account for borders, title, filter, instructions

	// Calculate scroll position
	scrollStart := 0
	if m.selectedIndex >= maxItems {
		scrollStart = m.selectedIndex - maxItems + 1
	}

	// Draw items
	for i := 0; i < maxItems && i+scrollStart < len(m.filteredItems); i++ {
		item := m.filteredItems[i+scrollStart]
		y := startY + i

		// Determine style
		style := m.normalStyle
		if !item.IsEnabled() {
			style = m.disabledStyle
		} else if i+scrollStart == m.selectedIndex {
			style = m.selectedStyle
		}

		// Format item text
		prefix := fmt.Sprintf("%d. ", item.GetNumber())
		text := prefix + item.GetTitle()

		// Truncate if too long
		maxLen := m.width - 4
		if len(text) > maxLen {
			text = text[:maxLen-3] + "..."
		}

		// Clear the line first (for selection highlight)
		if i+scrollStart == m.selectedIndex {
			for j := 1; j < m.width-1; j++ {
				m.screen.SetContent(m.x+j, y, ' ', nil, style)
			}
		}

		// Draw the item
		m.drawText(m.x+2, y, text, style)
	}

	// Draw scroll indicators
	if scrollStart > 0 {
		m.drawText(m.x+m.width-3, startY, "↑", m.borderStyle)
	}
	if scrollStart+maxItems < len(m.filteredItems) {
		m.drawText(m.x+m.width-3, startY+maxItems-1, "↓", m.borderStyle)
	}
}

// drawInfoPanel draws the information panel
func (m *FilterableMenu) drawInfoPanel() {
	if m.selectedIndex >= len(m.filteredItems) {
		return
	}

	item := m.filteredItems[m.selectedIndex]
	infoX := m.x + m.width + 2

	// Draw title
	title := fmt.Sprintf(" Info: %s ", item.GetTitle())
	if len(title) > m.infoWidth-2 {
		title = title[:m.infoWidth-5] + "... "
	}
	x := infoX + (m.infoWidth-len(title))/2
	m.drawText(x, m.y, title, m.borderStyle)

	// Draw separator
	for i := 1; i < m.infoWidth-1; i++ {
		m.screen.SetContent(infoX+i, m.y+2, '─', nil, m.borderStyle)
	}

	// Draw info content
	startY := m.y + 3
	maxLines := m.height - 5

	// Wrap text
	lines := m.wrapText(item.GetInfo(), m.infoWidth-4)

	for i := 0; i < maxLines && i < len(lines); i++ {
		m.drawText(infoX+2, startY+i, lines[i], m.infoStyle)
	}

	// Show current setting if room
	if len(lines) < maxLines-2 && item.GetDescription() != "" {
		m.drawText(infoX+2, startY+len(lines)+1, "Current setting:", m.normalStyle)
		descLines := m.wrapText(item.GetDescription(), m.infoWidth-4)
		for i, line := range descLines {
			if startY+len(lines)+2+i >= m.y+m.height-1 {
				break
			}
			m.drawText(infoX+2, startY+len(lines)+2+i, line, m.disabledStyle)
		}
	}
}

// drawInstructions draws the help text at the bottom
func (m *FilterableMenu) drawInstructions() {
	y := m.y + m.height - 2
	instructions := " ↑↓:Navigate | Enter:Select | ESC:Clear/Exit | Type to filter "

	if len(instructions) > m.width-2 {
		instructions = " ↑↓ Enter ESC Type "
	}

	x := m.x + (m.width-len(instructions))/2
	m.drawText(x, y, instructions, m.disabledStyle)
}

// HandleInput processes keyboard input
func (m *FilterableMenu) HandleInput(ev *tcell.EventKey) (MenuItem, bool) {
	switch ev.Key() {
	case tcell.KeyEscape:
		if m.filterText != "" {
			// Clear filter
			m.filterText = ""
			m.applyFilter()
			return nil, false
		}
		// Exit menu
		return nil, true

	case tcell.KeyEnter:
		if m.selectedIndex < len(m.filteredItems) {
			item := m.filteredItems[m.selectedIndex]
			if item.IsEnabled() {
				return item, false
			}
		}

	case tcell.KeyUp:
		if m.selectedIndex > 0 {
			m.selectedIndex--
		}

	case tcell.KeyDown:
		if m.selectedIndex < len(m.filteredItems)-1 {
			m.selectedIndex++
		}

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if len(m.filterText) > 0 {
			m.filterText = m.filterText[:len(m.filterText)-1]
			m.applyFilter()
		}

	case tcell.KeyRune:
		r := ev.Rune()

		// Check for number shortcut
		if unicode.IsDigit(r) && m.filterText == "" {
			num := int(r - '0')
			for i, item := range m.filteredItems {
				if item.GetNumber() == num && item.IsEnabled() {
					m.selectedIndex = i
					return item, false
				}
			}
		}

		// Add to filter
		m.filterText += string(r)
		m.applyFilter()
	}

	return nil, false
}

// applyFilter filters items based on current filter text
func (m *FilterableMenu) applyFilter() {
	m.filteredItems = make([]MenuItem, 0)

	if m.filterText == "" {
		// No filter, show all items
		m.filteredItems = append(m.filteredItems, m.items...)
	} else {
		// Filter items
		filter := strings.ToLower(m.filterText)
		for _, item := range m.items {
			if strings.Contains(strings.ToLower(item.GetTitle()), filter) ||
			   strings.Contains(strings.ToLower(item.GetDescription()), filter) {
				m.filteredItems = append(m.filteredItems, item)
			}
		}
	}

	// Adjust selected index if needed
	if m.selectedIndex >= len(m.filteredItems) {
		if len(m.filteredItems) > 0 {
			m.selectedIndex = len(m.filteredItems) - 1
		} else {
			m.selectedIndex = 0
		}
	}
}

// drawText draws text at the given position
func (m *FilterableMenu) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		m.screen.SetContent(x+i, y, r, nil, style)
	}
}

// wrapText wraps text to fit within the given width, preserving line breaks
func (m *FilterableMenu) wrapText(text string, width int) []string {
	var result []string

	// First split by explicit line breaks
	paragraphs := strings.Split(text, "\n")

	for _, paragraph := range paragraphs {
		if paragraph == "" {
			// Preserve empty lines
			result = append(result, "")
			continue
		}

		// Check for bullet points or list items
		if strings.HasPrefix(paragraph, "•") || strings.HasPrefix(paragraph, "-") || strings.HasPrefix(paragraph, "*") {
			// Preserve list formatting with indent for wrapped lines
			lines := m.wrapLine(paragraph, width)
			for i, line := range lines {
				if i > 0 {
					// Indent continuation lines
					line = "  " + line
				}
				result = append(result, line)
			}
		} else {
			// Regular paragraph
			lines := m.wrapLine(paragraph, width)
			result = append(result, lines...)
		}
	}

	return result
}

// wrapLine wraps a single line of text to fit within the given width
func (m *FilterableMenu) wrapLine(text string, width int) []string {
	var lines []string
	words := strings.Fields(text)

	if len(words) == 0 {
		return []string{""}
	}

	currentLine := ""
	for _, word := range words {
		if len(currentLine)+len(word)+1 > width {
			if currentLine != "" {
				lines = append(lines, currentLine)
				currentLine = word
			} else {
				// Word is too long, break it
				for len(word) > width {
					lines = append(lines, word[:width])
					word = word[width:]
				}
				if word != "" {
					currentLine = word
				}
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

// Clear removes all items from the menu
func (m *FilterableMenu) Clear() {
	m.items = make([]MenuItem, 0)
	m.filteredItems = make([]MenuItem, 0)
	m.selectedIndex = 0
}

// GetY returns the Y position of the menu
func (m *FilterableMenu) GetY() int {
	return m.y
}

// GetHeight returns the height of the menu
func (m *FilterableMenu) GetHeight() int {
	return m.height
}

// GetSelectedItem returns the currently selected item
func (m *FilterableMenu) GetSelectedItem() MenuItem {
	if m.selectedIndex >= 0 && m.selectedIndex < len(m.filteredItems) {
		return m.filteredItems[m.selectedIndex]
	}
	return nil
}

// GetX returns the X position of the menu
func (m *FilterableMenu) GetX() int {
	return m.x
}

// GetWidth returns the width of the menu
func (m *FilterableMenu) GetWidth() int {
	return m.width
}

// HandleMouse processes mouse events for the menu
func (m *FilterableMenu) HandleMouse(event *core.MouseEvent) bool {
	// Check if mouse is within menu bounds
	hitTest := core.NewComponentHitTest(m.x, m.y, m.width, m.height)
	if !hitTest.ContainsEvent(event) {
		return false
	}

	// Calculate relative position within menu
	relX := event.X - m.x
	relY := event.Y - m.y

	// Handle different mouse event types
	switch event.Type {
	case core.MouseEventClick:
		return m.handleMouseClick(relX, relY)
	case core.MouseEventDoubleClick:
		return m.handleMouseDoubleClick(relX, relY)
	case core.MouseEventScroll:
		return m.handleMouseScroll(event.Button)
	case core.MouseEventHover:
		return m.handleMouseHover(relX, relY)
	}

	return false
}

// handleMouseClick processes mouse click events
func (m *FilterableMenu) handleMouseClick(relX, relY int) bool {
	// Check if click is on filter area
	filterY := 2
	if relY == filterY {
		// Click on filter area - could implement focus here
		return true
	}

	// Check if click is on a menu item
	startY := 4 // Items start at y+4
	maxItems := m.height - 7

	if relY >= startY && relY < startY+maxItems {
		// Calculate which item was clicked
		itemIndex := relY - startY
		scrollStart := 0
		if m.selectedIndex >= maxItems {
			scrollStart = m.selectedIndex - maxItems + 1
		}

		actualIndex := itemIndex + scrollStart
		if actualIndex < len(m.filteredItems) {
			// Select the item
			m.selectedIndex = actualIndex

			// If it's enabled, trigger selection
			item := m.filteredItems[actualIndex]
			if item.IsEnabled() {
				// Trigger the item handler if it's a BasicMenuItem
				if basicItem, ok := item.(*BasicMenuItem); ok && basicItem.Handler != nil {
					basicItem.Handler()
				}
				return true
			}
		}
	}

	// Check if click is on scroll arrows
	if relX == m.width-3 {
		scrollBarY := 4
		maxItems := m.height - 7

		// Up arrow
		if relY == scrollBarY {
			if m.selectedIndex > 0 {
				m.selectedIndex--
				return true
			}
		}

		// Down arrow
		if relY == scrollBarY+maxItems-1 {
			if m.selectedIndex < len(m.filteredItems)-1 {
				m.selectedIndex++
				return true
			}
		}
	}

	return true // Event was handled (click was within menu)
}

// handleMouseDoubleClick processes double-click events
func (m *FilterableMenu) handleMouseDoubleClick(relX, relY int) bool {
	// Treat double-click same as single click for menu items
	return m.handleMouseClick(relX, relY)
}

// handleMouseScroll processes scroll wheel events
func (m *FilterableMenu) handleMouseScroll(button core.MouseButton) bool {
	switch button {
	case core.MouseWheelUp:
		if m.selectedIndex > 0 {
			m.selectedIndex--
			return true
		}
	case core.MouseWheelDown:
		if m.selectedIndex < len(m.filteredItems)-1 {
			m.selectedIndex++
			return true
		}
	}
	return false
}

// handleMouseHover processes hover events
func (m *FilterableMenu) handleMouseHover(relX, relY int) bool {
	// Check if hovering over a menu item
	startY := 4
	maxItems := m.height - 7

	if relY >= startY && relY < startY+maxItems {
		// Calculate which item is being hovered
		itemIndex := relY - startY
		scrollStart := 0
		if m.selectedIndex >= maxItems {
			scrollStart = m.selectedIndex - maxItems + 1
		}

		actualIndex := itemIndex + scrollStart
		if actualIndex < len(m.filteredItems) {
			// Update selection to hovered item (provides visual feedback)
			m.selectedIndex = actualIndex
			return true
		}
	}

	return false
}