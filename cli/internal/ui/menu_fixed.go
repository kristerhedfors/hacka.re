package ui

import (
	"strconv"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/logger"
)

// HandleInputBatched processes all pending keyboard input at once
// This prevents event queue buildup when drawing is slow
func (m *FilterableMenu) HandleInputBatched(screen tcell.Screen) (MenuItem, bool) {
	log := logger.Get()
	log.Debug("[BATCH] HandleInputBatched called")

	// Process ALL pending events before returning
	eventsProcessed := 0
	var lastSelected MenuItem
	var shouldExit bool

	// First, check if there are any pending events
	if !screen.HasPendingEvent() {
		log.Debug("[BATCH] No pending events to process")
		return nil, false
	}

	// Keep processing while events are available
	for screen.HasPendingEvent() {
		ev := screen.PollEvent()
		log.Debug("[BATCH] Polling event %d", eventsProcessed+1)

		// Only process key events
		keyEv, ok := ev.(*tcell.EventKey)
		if !ok {
			continue
		}

		eventsProcessed++
		log.Debug("[MENU-BATCH] Processing event %d - Key: %v, Rune: %c", eventsProcessed, keyEv.Key(), keyEv.Rune())

		switch keyEv.Key() {
		case tcell.KeyEscape:
			if m.isFiltering {
				// Clear filter and exit filtering mode
				m.clearFilter()
			} else {
				// Exit menu
				shouldExit = true
			}

		case tcell.KeyUp:
			// Process all Up keys at once
			if m.selectedIdx > 0 {
				m.selectedIdx--
				log.Debug("Menu selection up: %d", m.selectedIdx)
			}

		case tcell.KeyDown:
			// Process all Down keys at once
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
					lastSelected = selected
				}
			}

		case tcell.KeyBackspace, tcell.KeyBackspace2:
			if len(m.filterText) > 0 {
				m.filterText = m.filterText[:len(m.filterText)-1]
				m.applyFilter()
				log.Debug("Filter text: '%s'", m.filterText)
			}

		case tcell.KeyRune:
			r := keyEv.Rune()

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
	}

	if eventsProcessed > 1 {
		log.Debug("[MENU-BATCH] Processed %d events in batch", eventsProcessed)
	}

	return lastSelected, shouldExit
}

// HandleInputSingle processes a single keyboard input event
// This is the original non-batched version for comparison
func (m *FilterableMenu) HandleInputSingle(ev *tcell.EventKey) (MenuItem, bool) {
	log := logger.Get()
	log.Debug("[MENU-SINGLE] HandleInput - Key: %v, Rune: %c", ev.Key(), ev.Rune())

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