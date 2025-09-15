package ui

import (
	"fmt"
	"runtime"
	"strconv"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/logger"
)

// HandleInputDebug is the EXTREMELY VERBOSE version to find the problem
func (m *FilterableMenu) HandleInputDebug(ev *tcell.EventKey) (MenuItem, bool) {
	log := logger.Get()

	// Get calling function for context
	pc, _, _, _ := runtime.Caller(1)
	caller := runtime.FuncForPC(pc).Name()

	log.Info("[MENU-DEBUG] ========== HandleInputDebug CALLED ==========")
	log.Info("[MENU-DEBUG] Called from: %s", caller)
	log.Info("[MENU-DEBUG] Event Key: %v (%d)", ev.Key(), ev.Key())
	log.Info("[MENU-DEBUG] Event Rune: %c (%d)", ev.Rune(), ev.Rune())
	log.Info("[MENU-DEBUG] Current selectedIdx: %d", m.selectedIdx)
	log.Info("[MENU-DEBUG] filteredItems length: %d", len(m.filteredItems))
	log.Info("[MENU-DEBUG] items length: %d", len(m.items))
	log.Info("[MENU-DEBUG] isFiltering: %v", m.isFiltering)
	log.Info("[MENU-DEBUG] filterText: '%s'", m.filterText)

	// Check what key this is
	keyName := "UNKNOWN"
	switch ev.Key() {
	case tcell.KeyUp:
		keyName = "UP_ARROW"
	case tcell.KeyDown:
		keyName = "DOWN_ARROW"
	case tcell.KeyEnter:
		keyName = "ENTER"
	case tcell.KeyEscape:
		keyName = "ESCAPE"
	case tcell.KeyBackspace, tcell.KeyBackspace2:
		keyName = "BACKSPACE"
	case tcell.KeyRune:
		keyName = fmt.Sprintf("RUNE('%c')", ev.Rune())
	default:
		keyName = fmt.Sprintf("OTHER(%v)", ev.Key())
	}

	log.Info("[MENU-DEBUG] Key identified as: %s", keyName)

	// Now process the key
	switch ev.Key() {
	case tcell.KeyEscape:
		log.Info("[MENU-DEBUG] Processing ESCAPE key")
		if m.isFiltering {
			log.Info("[MENU-DEBUG] In filtering mode, clearing filter")
			m.clearFilter()
			log.Info("[MENU-DEBUG] Filter cleared, returning nil, false")
			return nil, false
		}
		log.Info("[MENU-DEBUG] Not filtering, exiting menu with nil, true")
		return nil, true

	case tcell.KeyUp:
		log.Info("[MENU-DEBUG] Processing UP arrow")
		log.Info("[MENU-DEBUG] Current position: %d, can go up: %v", m.selectedIdx, m.selectedIdx > 0)

		if m.selectedIdx > 0 {
			oldIdx := m.selectedIdx
			m.selectedIdx--
			log.Info("[MENU-DEBUG] UP SUCCESS: Moved from %d to %d", oldIdx, m.selectedIdx)
		} else {
			log.Info("[MENU-DEBUG] UP BLOCKED: Already at top (idx=0)")
		}
		log.Info("[MENU-DEBUG] Returning nil, false")
		return nil, false

	case tcell.KeyDown:
		log.Info("[MENU-DEBUG] Processing DOWN arrow")
		maxIdx := len(m.filteredItems) - 1
		log.Info("[MENU-DEBUG] Current position: %d, max position: %d, can go down: %v",
			m.selectedIdx, maxIdx, m.selectedIdx < maxIdx)

		if m.selectedIdx < maxIdx {
			oldIdx := m.selectedIdx
			m.selectedIdx++
			log.Info("[MENU-DEBUG] DOWN SUCCESS: Moved from %d to %d", oldIdx, m.selectedIdx)
		} else {
			log.Info("[MENU-DEBUG] DOWN BLOCKED: Already at bottom (idx=%d, max=%d)", m.selectedIdx, maxIdx)
		}
		log.Info("[MENU-DEBUG] Returning nil, false")
		return nil, false

	case tcell.KeyEnter:
		log.Info("[MENU-DEBUG] Processing ENTER key")
		if m.selectedIdx < len(m.filteredItems) {
			selected := m.filteredItems[m.selectedIdx]
			log.Info("[MENU-DEBUG] Selected item: %s (enabled: %v)", selected.GetTitle(), selected.IsEnabled())

			if selected.IsEnabled() {
				log.Info("[MENU-DEBUG] Item is enabled, returning it")
				if m.isNumberMode {
					m.clearFilter()
				}
				return selected, false
			}
			log.Info("[MENU-DEBUG] Item is disabled, ignoring")
		} else {
			log.Info("[MENU-DEBUG] selectedIdx %d out of bounds (len=%d)", m.selectedIdx, len(m.filteredItems))
		}
		return nil, false

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		log.Info("[MENU-DEBUG] Processing BACKSPACE")
		if len(m.filterText) > 0 {
			oldText := m.filterText
			m.filterText = m.filterText[:len(m.filterText)-1]
			log.Info("[MENU-DEBUG] Filter changed from '%s' to '%s'", oldText, m.filterText)
			m.applyFilter()
		} else {
			log.Info("[MENU-DEBUG] Filter is empty, nothing to delete")
		}
		return nil, false

	case tcell.KeyRune:
		r := ev.Rune()
		log.Info("[MENU-DEBUG] Processing RUNE: '%c' (%d)", r, r)

		oldText := m.filterText
		m.filterText += string(r)
		m.isFiltering = true

		log.Info("[MENU-DEBUG] Filter changed from '%s' to '%s'", oldText, m.filterText)

		m.checkNumberMode()
		log.Info("[MENU-DEBUG] Number mode: %v", m.isNumberMode)

		m.applyFilter()
		log.Info("[MENU-DEBUG] Filter applied, filteredItems count: %d", len(m.filteredItems))

		if m.isNumberMode {
			// Try to select exact number match
			if num, err := strconv.Atoi(m.filterText); err == nil {
				for i, item := range m.filteredItems {
					if item.GetNumber() == num {
						log.Info("[MENU-DEBUG] Found exact number match at index %d", i)
						m.selectedIdx = i
						break
					}
				}
			}
		}
		return nil, false

	default:
		log.Info("[MENU-DEBUG] Unhandled key: %v", ev.Key())
		return nil, false
	}
}

func (m *FilterableMenu) DebugState() string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Menu State:\n"))
	sb.WriteString(fmt.Sprintf("  selectedIdx: %d\n", m.selectedIdx))
	sb.WriteString(fmt.Sprintf("  items: %d\n", len(m.items)))
	sb.WriteString(fmt.Sprintf("  filteredItems: %d\n", len(m.filteredItems)))
	sb.WriteString(fmt.Sprintf("  isFiltering: %v\n", m.isFiltering))
	sb.WriteString(fmt.Sprintf("  filterText: '%s'\n", m.filterText))
	sb.WriteString(fmt.Sprintf("  isNumberMode: %v\n", m.isNumberMode))

	if len(m.filteredItems) > 0 && m.selectedIdx < len(m.filteredItems) {
		item := m.filteredItems[m.selectedIdx]
		sb.WriteString(fmt.Sprintf("  Current item: %s\n", item.GetTitle()))
	}

	return sb.String()
}