package ui

import (
	"fmt"
	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/logger"
)

// DrawDebug draws the menu with extensive logging to track visual updates
func (m *FilterableMenu) DrawDebug() {
	log := logger.Get()

	log.Info("[DRAW-DEBUG] ========== Draw() CALLED ==========")
	log.Info("[DRAW-DEBUG] selectedIdx: %d", m.selectedIdx)
	log.Info("[DRAW-DEBUG] filteredItems count: %d", len(m.filteredItems))

	if m.selectedIdx < len(m.filteredItems) {
		item := m.filteredItems[m.selectedIdx]
		log.Info("[DRAW-DEBUG] Selected item: #%d - %s", item.GetNumber(), item.GetTitle())
	} else {
		log.Info("[DRAW-DEBUG] selectedIdx OUT OF BOUNDS!")
	}

	// Clear menu area
	log.Debug("[DRAW-DEBUG] Clearing area")
	m.clearArea()

	// Draw menu border
	log.Debug("[DRAW-DEBUG] Drawing border")
	m.drawBorder(m.x, m.y, m.width, m.height)

	// Draw title with filter info
	log.Debug("[DRAW-DEBUG] Drawing title")
	m.drawTitle()

	// Draw items
	log.Debug("[DRAW-DEBUG] Drawing items - about to call drawItemsDebug")
	m.drawItemsDebug()

	// Draw info panel if enabled and item selected
	if m.showInfo && m.selectedIdx < len(m.filteredItems) {
		log.Info("[DRAW-DEBUG] Drawing info panel for item at index %d", m.selectedIdx)
		m.drawInfoPanelDebug()
	} else {
		log.Info("[DRAW-DEBUG] NOT drawing info panel (showInfo=%v, validIdx=%v)",
			m.showInfo, m.selectedIdx < len(m.filteredItems))
	}

	// Draw help text
	log.Debug("[DRAW-DEBUG] Drawing help text")
	m.drawHelp()

	log.Info("[DRAW-DEBUG] ========== Draw() COMPLETE ==========")
}

// drawItemsDebug draws the menu items with logging
func (m *FilterableMenu) drawItemsDebug() {
	log := logger.Get()

	startY := m.y + 2
	visibleHeight := m.height - 4 // Account for borders and title

	// Calculate scroll offset
	scrollOffset := 0
	if m.selectedIdx >= visibleHeight {
		scrollOffset = m.selectedIdx - visibleHeight + 1
	}

	log.Info("[DRAW-ITEMS-DEBUG] Drawing items: selectedIdx=%d, scrollOffset=%d, visibleHeight=%d",
		m.selectedIdx, scrollOffset, visibleHeight)

	// Draw visible items
	for i := 0; i < visibleHeight && i+scrollOffset < len(m.filteredItems); i++ {
		item := m.filteredItems[i+scrollOffset]
		y := startY + i

		isSelected := (i + scrollOffset) == m.selectedIdx

		// Determine style
		style := tcell.StyleDefault
		prefix := "  "

		if isSelected {
			style = style.Reverse(true)
			prefix = "> "
			log.Info("[DRAW-ITEMS-DEBUG] Item %d IS SELECTED (drawing with '>'), title: %s",
				i+scrollOffset, item.GetTitle())
		} else {
			log.Debug("[DRAW-ITEMS-DEBUG] Item %d not selected, title: %s",
				i+scrollOffset, item.GetTitle())
		}

		if !item.IsEnabled() {
			style = style.Dim(true)
		}

		// Format item text
		var itemText string
		if m.isNumberMode || m.filterText == "" {
			itemText = fmt.Sprintf("%s%d. %s", prefix, item.GetNumber(), item.GetTitle())
		} else {
			itemText = fmt.Sprintf("%s%s", prefix, item.GetTitle())
		}

		// Truncate if too long
		maxWidth := m.width - 4
		if len(itemText) > maxWidth {
			itemText = itemText[:maxWidth-3] + "..."
		}

		// Draw the item
		log.Debug("[DRAW-ITEMS-DEBUG] Drawing at y=%d: '%s' (selected=%v)", y, itemText, isSelected)

		for x := 0; x < len(itemText); x++ {
			m.screen.SetContent(m.x+2+x, y, rune(itemText[x]), nil, style)
		}
	}

	// Draw scroll indicators if needed
	if scrollOffset > 0 {
		log.Debug("[DRAW-ITEMS-DEBUG] Drawing up scroll indicator")
		m.screen.SetContent(m.x+m.width-2, startY, '↑', nil, tcell.StyleDefault)
	}
	if scrollOffset+visibleHeight < len(m.filteredItems) {
		log.Debug("[DRAW-ITEMS-DEBUG] Drawing down scroll indicator")
		m.screen.SetContent(m.x+m.width-2, startY+visibleHeight-1, '↓', nil, tcell.StyleDefault)
	}
}

// drawInfoPanelDebug draws the info panel with logging
func (m *FilterableMenu) drawInfoPanelDebug() {
	log := logger.Get()

	if m.selectedIdx >= len(m.filteredItems) {
		log.Error("[INFO-PANEL-DEBUG] selectedIdx %d out of bounds!", m.selectedIdx)
		return
	}

	item := m.filteredItems[m.selectedIdx]
	log.Info("[INFO-PANEL-DEBUG] Drawing info for: %s", item.GetTitle())

	info := item.GetInfo()
	if info == "" {
		info = item.GetDescription()
		if info == "" {
			log.Debug("[INFO-PANEL-DEBUG] No info to display")
			return
		}
	}

	// Position info panel to the right of menu
	infoX := m.x + m.width + 2
	infoY := m.y

	log.Debug("[INFO-PANEL-DEBUG] Panel position: x=%d, y=%d, width=%d", infoX, infoY, m.infoWidth)

	// Draw info panel border
	m.drawBorder(infoX, infoY, m.infoWidth, m.height)

	// Draw info title
	infoTitle := fmt.Sprintf(" %s ", item.GetTitle())
	if len(infoTitle) > m.infoWidth-2 {
		infoTitle = infoTitle[:m.infoWidth-5] + "... "
	}
	titleX := infoX + (m.infoWidth-len(infoTitle))/2

	log.Debug("[INFO-PANEL-DEBUG] Drawing title: '%s' at x=%d", infoTitle, titleX)

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

	log.Debug("[INFO-PANEL-DEBUG] Drawing %d lines of info text", len(lines))

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

	log.Info("[INFO-PANEL-DEBUG] Info panel drawn for item: %s", item.GetTitle())
}