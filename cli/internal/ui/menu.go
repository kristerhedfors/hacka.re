package ui

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/logger"
)

// MenuItem represents a selectable menu item
type MenuItem interface {
	GetID() string           // Unique identifier
	GetNumber() int          // Menu number (0-based)
	GetTitle() string        // Main display text
	GetDescription() string  // Optional description
	GetInfo() string        // Detailed info for side panel
	GetCategory() string    // Optional category/grouping
	IsEnabled() bool        // Whether item can be selected
}

// GenericMenuItem is a basic implementation of MenuItem
type GenericMenuItem struct {
	ID          string
	Number      int
	Title       string
	Description string
	Info        string
	Category    string
	Enabled     bool
}

func (g *GenericMenuItem) GetID() string          { return g.ID }
func (g *GenericMenuItem) GetNumber() int         { return g.Number }
func (g *GenericMenuItem) GetTitle() string       { return g.Title }
func (g *GenericMenuItem) GetDescription() string { return g.Description }
func (g *GenericMenuItem) GetInfo() string        { return g.Info }
func (g *GenericMenuItem) GetCategory() string    { return g.Category }
func (g *GenericMenuItem) IsEnabled() bool        { return g.Enabled }

// FilterableMenu represents a menu with smart filtering capabilities
type FilterableMenu struct {
	screen        tcell.Screen
	items         []MenuItem    // All items
	filteredItems []MenuItem    // Currently visible items
	selectedIdx   int          // Index in filtered list
	filterText    string       // Current filter
	isFiltering   bool         // Whether filtering is active
	isNumberMode  bool         // True if only digits typed

	// Display settings
	title         string
	x, y          int    // Menu position
	width, height int    // Menu dimensions
	showInfo      bool   // Whether to show info panel
	infoWidth     int    // Width of info panel
}

// NewFilterableMenu creates a new filterable menu
func NewFilterableMenu(screen tcell.Screen, title string, items []MenuItem) *FilterableMenu {
	menu := &FilterableMenu{
		screen:        screen,
		title:         title,
		items:         items,
		filteredItems: make([]MenuItem, len(items)),
		showInfo:      true,
		infoWidth:     40,
		width:         60,
		height:        20,
	}
	copy(menu.filteredItems, items)
	return menu
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

// SetInfoPanel controls the info panel display
func (m *FilterableMenu) SetInfoPanel(show bool, width int) {
	m.showInfo = show
	m.infoWidth = width
}

// HandleInput processes keyboard input
// Returns: selected MenuItem (if Enter pressed), nil otherwise
// Second return value indicates if ESC was pressed
func (m *FilterableMenu) HandleInput(ev *tcell.EventKey) (MenuItem, bool) {
	log := logger.Get()

	switch ev.Key() {
	case tcell.KeyEscape:
		if m.isFiltering {
			// Clear filter and exit filtering mode
			m.clearFilter()
			return nil, false
		}
		// Exit menu
		return nil, true

	case tcell.KeyUp:
		if m.selectedIdx > 0 {
			m.selectedIdx--
			log.Debug("Menu selection up: %d", m.selectedIdx)
		}

	case tcell.KeyDown:
		if m.selectedIdx < len(m.filteredItems)-1 {
			m.selectedIdx++
			log.Debug("Menu selection down: %d", m.selectedIdx)
		}

	case tcell.KeyEnter:
		if m.selectedIdx < len(m.filteredItems) {
			selected := m.filteredItems[m.selectedIdx]
			if selected.IsEnabled() {
				log.Info("Menu item selected: %s", selected.GetTitle())
				// If in number mode and exact match, clear filter
				if m.isNumberMode {
					m.clearFilter()
				}
				return selected, false
			}
		}

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if len(m.filterText) > 0 {
			m.filterText = m.filterText[:len(m.filterText)-1]
			m.applyFilter()
			log.Debug("Filter text: '%s'", m.filterText)
		}

	case tcell.KeyRune:
		r := ev.Rune()

		// Add character to filter
		m.filterText += string(r)
		m.isFiltering = true

		// Check if we're in number-only mode
		m.checkNumberMode()

		// Apply filter
		m.applyFilter()

		// In number mode, check for exact match and auto-select
		if m.isNumberMode {
			if num, err := strconv.Atoi(m.filterText); err == nil {
				for i, item := range m.filteredItems {
					if item.GetNumber() == num {
						m.selectedIdx = i
						// Don't auto-execute, just select
						break
					}
				}
			}
		}

		log.Debug("Filter text: '%s' (number mode: %v)", m.filterText, m.isNumberMode)
	}

	return nil, false
}

// checkNumberMode determines if we're in number-only selection mode
func (m *FilterableMenu) checkNumberMode() {
	if m.filterText == "" {
		m.isNumberMode = false
		return
	}

	// Check if filter contains only digits
	for _, r := range m.filterText {
		if r < '0' || r > '9' {
			m.isNumberMode = false
			return
		}
	}
	m.isNumberMode = true
}

// applyFilter filters the items based on current filter text
func (m *FilterableMenu) applyFilter() {
	if m.filterText == "" {
		// No filter, show all items
		m.filteredItems = make([]MenuItem, len(m.items))
		copy(m.filteredItems, m.items)
		m.selectedIdx = 0
		return
	}

	m.filteredItems = []MenuItem{}

	if m.isNumberMode {
		// Number mode: match by item number
		targetNum, err := strconv.Atoi(m.filterText)
		if err == nil {
			for _, item := range m.items {
				numStr := fmt.Sprintf("%d", item.GetNumber())
				// Match if number starts with the typed digits
				if strings.HasPrefix(numStr, m.filterText) || item.GetNumber() == targetNum {
					m.filteredItems = append(m.filteredItems, item)
				}
			}
		}
	} else {
		// Text mode: fuzzy match on title and description
		filter := strings.ToLower(m.filterText)
		for _, item := range m.items {
			title := strings.ToLower(item.GetTitle())
			desc := strings.ToLower(item.GetDescription())

			// Check if filter matches title or description
			if strings.Contains(title, filter) || strings.Contains(desc, filter) {
				m.filteredItems = append(m.filteredItems, item)
			}
		}
	}

	// Reset selection if out of bounds
	if m.selectedIdx >= len(m.filteredItems) {
		m.selectedIdx = 0
	}
}

// clearFilter resets the filter
func (m *FilterableMenu) clearFilter() {
	m.filterText = ""
	m.isFiltering = false
	m.isNumberMode = false
	m.applyFilter()
}

// Draw renders the menu
func (m *FilterableMenu) Draw() {
	// Clear menu area
	m.clearArea()

	// Draw menu border
	m.drawBorder(m.x, m.y, m.width, m.height)

	// Draw title with filter info
	m.drawTitle()

	// Draw items
	m.drawItems()

	// Draw info panel if enabled and item selected
	if m.showInfo && m.selectedIdx < len(m.filteredItems) {
		m.drawInfoPanel()
	}

	// Draw help text
	m.drawHelp()
}

// clearArea clears the menu display area
func (m *FilterableMenu) clearArea() {
	totalWidth := m.width
	if m.showInfo {
		totalWidth += m.infoWidth + 2
	}

	for y := m.y; y < m.y+m.height; y++ {
		for x := m.x; x < m.x+totalWidth; x++ {
			m.screen.SetContent(x, y, ' ', nil, tcell.StyleDefault)
		}
	}
}

// drawBorder draws the menu border
func (m *FilterableMenu) drawBorder(x, y, w, h int) {
	style := tcell.StyleDefault

	// Corners
	m.screen.SetContent(x, y, '╔', nil, style)
	m.screen.SetContent(x+w-1, y, '╗', nil, style)
	m.screen.SetContent(x, y+h-1, '╚', nil, style)
	m.screen.SetContent(x+w-1, y+h-1, '╝', nil, style)

	// Horizontal lines
	for i := x + 1; i < x+w-1; i++ {
		m.screen.SetContent(i, y, '═', nil, style)
		m.screen.SetContent(i, y+h-1, '═', nil, style)
	}

	// Vertical lines
	for i := y + 1; i < y+h-1; i++ {
		m.screen.SetContent(x, i, '║', nil, style)
		m.screen.SetContent(x+w-1, i, '║', nil, style)
	}
}

// drawTitle draws the menu title with filter indicator
func (m *FilterableMenu) drawTitle() {
	style := tcell.StyleDefault.Bold(true)

	title := m.title
	if m.isFiltering {
		if m.isNumberMode {
			title = fmt.Sprintf("%s [#%s]", m.title, m.filterText)
			style = style.Foreground(tcell.ColorYellow)
		} else {
			title = fmt.Sprintf("%s [Filter: %s]", m.title, m.filterText)
			style = style.Foreground(tcell.ColorGreen)
		}
	}

	// Center the title
	titleX := m.x + (m.width-len(title))/2
	for i, r := range title {
		m.screen.SetContent(titleX+i, m.y, r, nil, style)
	}

	// Show result count
	if m.isFiltering {
		count := fmt.Sprintf("(%d/%d)", len(m.filteredItems), len(m.items))
		countX := m.x + m.width - len(count) - 2
		for i, r := range count {
			m.screen.SetContent(countX+i, m.y, r, nil, tcell.StyleDefault.Dim(true))
		}
	}
}

// drawItems draws the menu items
func (m *FilterableMenu) drawItems() {
	startY := m.y + 2
	visibleHeight := m.height - 4 // Account for borders and title

	// Calculate scroll offset
	scrollOffset := 0
	if m.selectedIdx >= visibleHeight {
		scrollOffset = m.selectedIdx - visibleHeight + 1
	}

	// Draw visible items
	for i := 0; i < visibleHeight && scrollOffset+i < len(m.filteredItems); i++ {
		item := m.filteredItems[scrollOffset+i]
		y := startY + i
		x := m.x + 2

		// Determine style
		style := tcell.StyleDefault
		if scrollOffset+i == m.selectedIdx {
			style = style.Background(tcell.ColorDarkBlue)
		}
		if !item.IsEnabled() {
			style = style.Dim(true)
		}

		// Format item text
		var itemText string
		if m.isNumberMode {
			// In number mode, emphasize the number
			itemText = fmt.Sprintf("%2d. %s", item.GetNumber(), item.GetTitle())
		} else {
			// In text mode, show normal format
			itemText = fmt.Sprintf("%2d. %s", item.GetNumber(), item.GetTitle())
		}

		// Truncate if too long
		maxLen := m.width - 6
		if len(itemText) > maxLen {
			itemText = itemText[:maxLen-3] + "..."
		}

		// Draw item with potential highlighting
		if m.isFiltering && !m.isNumberMode && m.filterText != "" {
			m.drawTextWithHighlight(x, y, itemText, m.filterText, style)
		} else {
			for j, r := range itemText {
				m.screen.SetContent(x+j, y, r, nil, style)
			}
		}

		// Draw category badge if present
		if cat := item.GetCategory(); cat != "" && cat != "default" {
			badge := fmt.Sprintf("[%s]", cat)
			badgeX := m.x + m.width - len(badge) - 2
			badgeStyle := tcell.StyleDefault.Dim(true)
			if cat == "preview" {
				badgeStyle = badgeStyle.Foreground(tcell.ColorYellow)
			} else if cat == "legacy" || cat == "deprecated" {
				badgeStyle = badgeStyle.Foreground(tcell.ColorRed)
			}
			for j, r := range badge {
				m.screen.SetContent(badgeX+j, y, r, nil, badgeStyle)
			}
		}
	}

	// Draw scrollbar if needed
	if len(m.filteredItems) > visibleHeight {
		m.drawScrollbar(scrollOffset, visibleHeight)
	}
}

// drawScrollbar draws a vertical scrollbar
func (m *FilterableMenu) drawScrollbar(offset, visibleHeight int) {
	barX := m.x + m.width - 2
	barStartY := m.y + 2
	barHeight := visibleHeight

	// Calculate thumb position and size
	totalItems := len(m.filteredItems)
	thumbSize := max(1, (barHeight*visibleHeight)/totalItems)
	thumbPos := (offset * barHeight) / totalItems

	// Draw scrollbar track
	for i := 0; i < barHeight; i++ {
		y := barStartY + i
		if i >= thumbPos && i < thumbPos+thumbSize {
			m.screen.SetContent(barX, y, '█', nil, tcell.StyleDefault)
		} else {
			m.screen.SetContent(barX, y, '│', nil, tcell.StyleDefault.Dim(true))
		}
	}
}

// drawInfoPanel draws the information panel for the selected item
func (m *FilterableMenu) drawInfoPanel() {
	if m.selectedIdx >= len(m.filteredItems) {
		return
	}

	item := m.filteredItems[m.selectedIdx]
	info := item.GetInfo()
	if info == "" {
		info = item.GetDescription()
		if info == "" {
			return // No info to display
		}
	}

	// Position info panel to the right of menu
	infoX := m.x + m.width + 2
	infoY := m.y

	// Draw info panel border
	m.drawBorder(infoX, infoY, m.infoWidth, m.height)

	// Draw info title
	infoTitle := fmt.Sprintf(" %s ", item.GetTitle())
	if len(infoTitle) > m.infoWidth-2 {
		infoTitle = infoTitle[:m.infoWidth-5] + "... "
	}
	titleX := infoX + (m.infoWidth-len(infoTitle))/2
	for i, r := range infoTitle {
		m.screen.SetContent(titleX+i, infoY, r, nil, tcell.StyleDefault.Bold(true))
	}

	// Draw separator
	for x := infoX + 1; x < infoX+m.infoWidth-1; x++ {
		m.screen.SetContent(x, infoY+2, '─', nil, tcell.StyleDefault.Dim(true))
	}

	// Wrap and draw info text
	lines := wordWrap(info, m.infoWidth-4)
	textY := infoY + 3
	maxLines := m.height - 6

	for i, line := range lines {
		if i >= maxLines {
			// Show ellipsis if text is truncated
			for j, r := range "..." {
				m.screen.SetContent(infoX+2+j, textY+maxLines-1, r, nil, tcell.StyleDefault.Dim(true))
			}
			break
		}
		for j, r := range line {
			m.screen.SetContent(infoX+2+j, textY+i, r, nil, tcell.StyleDefault)
		}
	}

	// Show item metadata if available
	if item.GetCategory() != "" || !item.IsEnabled() {
		metaY := infoY + m.height - 3

		// Draw separator
		for x := infoX + 1; x < infoX+m.infoWidth-1; x++ {
			m.screen.SetContent(x, metaY-1, '─', nil, tcell.StyleDefault.Dim(true))
		}

		// Show category
		if cat := item.GetCategory(); cat != "" {
			catText := fmt.Sprintf("Category: %s", cat)
			for i, r := range catText {
				m.screen.SetContent(infoX+2+i, metaY, r, nil, tcell.StyleDefault.Dim(true))
			}
		}

		// Show if disabled
		if !item.IsEnabled() {
			disText := "Status: Disabled"
			style := tcell.StyleDefault.Foreground(tcell.ColorRed)
			for i, r := range disText {
				m.screen.SetContent(infoX+2+i, metaY+1, r, nil, style)
			}
		}
	}
}

// drawTextWithHighlight draws text with search term highlighting
func (m *FilterableMenu) drawTextWithHighlight(x, y int, text, filter string, baseStyle tcell.Style) {
	if filter == "" {
		for i, r := range text {
			m.screen.SetContent(x+i, y, r, nil, baseStyle)
		}
		return
	}

	lowerText := strings.ToLower(text)
	lowerFilter := strings.ToLower(filter)
	highlightStyle := baseStyle.Background(tcell.ColorYellow).Foreground(tcell.ColorBlack)

	pos := 0
	for pos < len(text) {
		idx := strings.Index(lowerText[pos:], lowerFilter)
		if idx == -1 {
			// Draw rest of text normally
			for i, r := range text[pos:] {
				m.screen.SetContent(x+pos+i, y, r, nil, baseStyle)
			}
			break
		}

		// Draw text before match
		for i, r := range text[pos : pos+idx] {
			m.screen.SetContent(x+pos+i, y, r, nil, baseStyle)
		}

		// Draw matched text with highlight
		for i, r := range text[pos+idx : pos+idx+len(filter)] {
			m.screen.SetContent(x+pos+idx+i, y, r, nil, highlightStyle)
		}

		pos += idx + len(filter)
	}
}

// drawHelp draws help text at the bottom
func (m *FilterableMenu) drawHelp() {
	var helpText string
	if m.isFiltering {
		if m.isNumberMode {
			helpText = "Type number to select | ↵ Confirm | ESC Clear filter | Backspace Delete"
		} else {
			helpText = "Type to filter | ↵ Select | ESC Clear | Numbers for direct selection"
		}
	} else {
		helpText = "↑↓ Navigate | ↵ Select | Type to filter | Numbers for quick select | ESC Exit"
	}

	helpX := m.x + (m.width-len(helpText))/2
	helpY := m.y + m.height - 2

	for i, r := range helpText {
		m.screen.SetContent(helpX+i, helpY, r, nil, tcell.StyleDefault.Dim(true))
	}
}

// GetSelectedItem returns the currently selected item
func (m *FilterableMenu) GetSelectedItem() MenuItem {
	if m.selectedIdx < len(m.filteredItems) {
		return m.filteredItems[m.selectedIdx]
	}
	return nil
}

// SetSelectedIndex sets the selected item by index
func (m *FilterableMenu) SetSelectedIndex(idx int) {
	if idx >= 0 && idx < len(m.filteredItems) {
		m.selectedIdx = idx
	}
}

// Reset clears all filters and resets selection
func (m *FilterableMenu) Reset() {
	m.clearFilter()
	m.selectedIdx = 0
}

// Helper function for word wrapping
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}