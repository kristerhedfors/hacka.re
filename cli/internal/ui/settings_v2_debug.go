package ui

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/models"
)

// ShowSettingsV2Debug shows settings with EXTREME debugging
func ShowSettingsV2Debug(cfg *config.Config) error {
	s, err := tcell.NewScreen()
	if err != nil {
		return err
	}

	if err := s.Init(); err != nil {
		return err
	}
	defer s.Fini()

	s.SetStyle(tcell.StyleDefault.Background(tcell.ColorReset).Foreground(tcell.ColorReset))
	s.Clear()

	// Clear any pending events
	s.Sync()
	for s.HasPendingEvent() {
		s.PollEvent()
	}

	modal := &SettingsModalV2{
		screen:        s,
		config:        cfg,
		apiClient:     api.NewClient(cfg),
		modelRegistry: models.NewModelRegistry(),
		fields:        buildFields(cfg),
	}

	// Create menu items from fields
	var menuItems []MenuItem
	for i, field := range modal.fields {
		fieldCopy := field // Important: capture loop variable
		menuItems = append(menuItems, &SettingsMenuItem{
			field:  &fieldCopy,
			number: i,
			config: cfg,
		})
	}

	// Create the filterable menu
	modal.menu = NewFilterableMenu(s, "Settings Configuration", menuItems)

	// Configure menu display
	w, h := s.Size()
	modal.menu.SetDimensions(50, min(20, h-10))
	modal.menu.SetPosition((w-110)/2, (h-20)/2)
	modal.menu.SetInfoPanel(true, 60)

	// Run with debug
	runDebug(modal)
	return nil
}

// runDebug is the debug event loop
func runDebug(m *SettingsModalV2) {
	log := logger.Get()
	log.Info("[SETTINGS-DEBUG] ============ SETTINGS MODAL STARTED ============")

	// Log initial state
	log.Info("[SETTINGS-DEBUG] Initial menu state:")
	log.Info(m.menu.DebugState())

	// Initial draw
	log.Info("[SETTINGS-DEBUG] Performing initial draw")
	m.drawDebug()
	m.screen.Show()
	log.Info("[SETTINGS-DEBUG] Initial draw complete")

	eventCount := 0

	for {
		log.Info("[SETTINGS-DEBUG] ====== Waiting for event %d ======", eventCount+1)

		// Poll event
		ev := m.screen.PollEvent()
		eventCount++

		log.Info("[SETTINGS-DEBUG] Event %d received: %T", eventCount, ev)

		switch ev := ev.(type) {
		case *tcell.EventKey:
			log.Info("[SETTINGS-DEBUG] KeyEvent details:")
			log.Info("[SETTINGS-DEBUG]   Key: %v (%d)", ev.Key(), ev.Key())
			log.Info("[SETTINGS-DEBUG]   Rune: '%c' (%d)", ev.Rune(), ev.Rune())
			log.Info("[SETTINGS-DEBUG]   Modifiers: %v", ev.Modifiers())

			keyName := getKeyName(ev)
			log.Info("[SETTINGS-DEBUG] Identified as: %s", keyName)

			if m.editMode {
				log.Info("[SETTINGS-DEBUG] In EDIT MODE")
				if m.handleEditMode(ev) {
					log.Info("[SETTINGS-DEBUG] Edit mode handled the event")
				}
			} else {
				log.Info("[SETTINGS-DEBUG] In NORMAL MODE, calling HandleInputDebug")

				// BEFORE processing
				log.Info("[SETTINGS-DEBUG] Menu state BEFORE HandleInputDebug:")
				log.Info(m.menu.DebugState())

				// Process with debug handler
				selected, escaped := m.menu.HandleInputDebug(ev)

				// AFTER processing
				log.Info("[SETTINGS-DEBUG] Menu state AFTER HandleInputDebug:")
				log.Info(m.menu.DebugState())

				log.Info("[SETTINGS-DEBUG] HandleInputDebug returned: selected=%v, escaped=%v",
					selected != nil, escaped)

				if escaped {
					log.Info("[SETTINGS-DEBUG] ESC pressed - exiting settings")
					return
				}

				if selected != nil {
					log.Info("[SETTINGS-DEBUG] Item selected: %s", selected.GetTitle())
					if settingsItem, ok := selected.(*SettingsMenuItem); ok {
						log.Info("[SETTINGS-DEBUG] Starting edit for field %d", settingsItem.number)
						m.startEdit(settingsItem.number)
					}
				}

				// Handle special keys
				switch ev.Key() {
				case tcell.KeyCtrlR:
					log.Info("[SETTINGS-DEBUG] Ctrl+R pressed")
				case tcell.KeyCtrlT:
					log.Info("[SETTINGS-DEBUG] Ctrl+T pressed")
				case tcell.KeyCtrlS:
					log.Info("[SETTINGS-DEBUG] Ctrl+S pressed")
				case tcell.KeyCtrlQ:
					log.Info("[SETTINGS-DEBUG] Ctrl+Q pressed - quitting")
					return
				}
			}

		case *tcell.EventResize:
			log.Info("[SETTINGS-DEBUG] Resize event")
			w, h := m.screen.Size()
			m.menu.SetPosition((w-110)/2, (h-20)/2)

		default:
			log.Info("[SETTINGS-DEBUG] Other event type: %T", ev)
		}

		// Redraw
		log.Info("[SETTINGS-DEBUG] Starting redraw")
		m.drawDebug()
		m.screen.Show()
		log.Info("[SETTINGS-DEBUG] Redraw complete")

		log.Info("[SETTINGS-DEBUG] ====== Event %d processing complete ======", eventCount)
	}
}

// drawDebug draws the settings modal with debugging
func (m *SettingsModalV2) drawDebug() {
	log := logger.Get()
	log.Info("[DRAW-SETTINGS-DEBUG] Starting modal draw")

	m.screen.Clear()
	w, h := m.screen.Size()

	// Draw header
	m.drawHeader(w)

	// Draw the filterable menu WITH DEBUG
	log.Info("[DRAW-SETTINGS-DEBUG] Calling menu.DrawDebug()")
	m.menu.DrawDebug()

	// Draw edit overlay if in edit mode
	if m.editMode {
		log.Info("[DRAW-SETTINGS-DEBUG] Drawing edit overlay")
		m.drawEditOverlay(w, h)
	}

	// Draw footer with help
	m.drawFooter(w, h)

	log.Info("[DRAW-SETTINGS-DEBUG] Modal draw complete")
}

func getKeyName(ev *tcell.EventKey) string {
	switch ev.Key() {
	case tcell.KeyUp:
		return "UP_ARROW"
	case tcell.KeyDown:
		return "DOWN_ARROW"
	case tcell.KeyLeft:
		return "LEFT_ARROW"
	case tcell.KeyRight:
		return "RIGHT_ARROW"
	case tcell.KeyEnter:
		return "ENTER"
	case tcell.KeyEscape:
		return "ESCAPE"
	case tcell.KeyBackspace, tcell.KeyBackspace2:
		return "BACKSPACE"
	case tcell.KeyTab:
		return "TAB"
	case tcell.KeyRune:
		return fmt.Sprintf("RUNE('%c')", ev.Rune())
	default:
		return fmt.Sprintf("KEY(%v)", ev.Key())
	}
}