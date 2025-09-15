package ui

import (
	"fmt"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/models"
)

// ShowSettingsV2Working - Fixed version that properly handles all events
func ShowSettingsV2Working(cfg *config.Config) error {
	s, err := tcell.NewScreen()
	if err != nil {
		return err
	}

	if err := s.Init(); err != nil {
		return err
	}
	defer s.Fini()

	// Enable mouse support if available
	s.EnableMouse()

	s.SetStyle(tcell.StyleDefault.Background(tcell.ColorReset).Foreground(tcell.ColorReset))
	s.Clear()

	// Clear any pending events from initialization
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

	// Run with working event loop
	runWorking(modal)
	return nil
}

// runWorking - Event loop that properly handles all events without dropping them
func runWorking(m *SettingsModalV2) {
	log := logger.Get()
	log.Info("Settings modal V2 WORKING opened")

	// Initial draw
	m.draw()
	m.screen.Show()

	// Track redraw timing to avoid excessive redraws
	lastRedraw := time.Now()
	needsRedraw := false

	// Track last event time for debugging
	lastEventTime := time.Now()
	eventCount := 0

	for {
		// Poll for event - this blocks until an event arrives
		ev := m.screen.PollEvent()
		eventCount++

		// Log event timing for debugging
		eventGap := time.Since(lastEventTime)
		lastEventTime = time.Now()

		WriteTrace(fmt.Sprintf("EVENT #%d: Type=%T, Gap=%v", eventCount, ev, eventGap))

		// Handle the event
		switch ev := ev.(type) {
		case *tcell.EventKey:
			WriteTrace(fmt.Sprintf("KEY: %v (rune='%c', mod=%v)", ev.Key(), ev.Rune(), ev.Modifiers()))

			if m.editMode {
				if m.handleEditMode(ev) {
					needsRedraw = true
				}
			} else {
				// Let menu handle the key event
				beforeIdx := m.menu.selectedIdx
				selected, escaped := m.menu.HandleInput(ev)
				afterIdx := m.menu.selectedIdx

				WriteTrace(fmt.Sprintf("MENU: Before=%d, After=%d, Selected=%v, Escaped=%v",
					beforeIdx, afterIdx, selected != nil, escaped))

				// Always redraw after key event
				needsRedraw = true

				if escaped {
					log.Info("ESC pressed - exiting settings")
					return
				}

				if selected != nil {
					if settingsItem, ok := selected.(*SettingsMenuItem); ok {
						m.startEdit(settingsItem.number)
					}
				}

				// Handle special keys
				switch ev.Key() {
				case tcell.KeyCtrlR:
					if item := m.menu.GetSelectedItem(); item != nil {
						if settingsItem, ok := item.(*SettingsMenuItem); ok {
							if settingsItem.field.Refreshable {
								m.refreshField(settingsItem.number)
							}
						}
					}

				case tcell.KeyCtrlT:
					m.testConnection()

				case tcell.KeyCtrlS:
					m.saveConfig()

				case tcell.KeyCtrlQ:
					log.Info("Ctrl+Q pressed - quit")
					return
				}
			}

		case *tcell.EventResize:
			w, h := m.screen.Size()
			m.menu.SetPosition((w-110)/2, (h-20)/2)
			m.screen.Sync() // Sync after resize
			needsRedraw = true
			WriteTrace("RESIZE event")

		case *tcell.EventMouse:
			// Could handle mouse events here if needed
			x, y := ev.Position()
			WriteTrace(fmt.Sprintf("MOUSE: Buttons=%v, Pos=(%d,%d)", ev.Buttons(), x, y))

		default:
			WriteTrace(fmt.Sprintf("OTHER EVENT: %T", ev))
		}

		// Redraw if needed, with rate limiting
		if needsRedraw {
			now := time.Now()
			timeSinceLastRedraw := now.Sub(lastRedraw)

			// Redraw immediately if it's been more than 16ms (60fps)
			// This ensures responsive UI while preventing excessive redraws
			if timeSinceLastRedraw >= 16*time.Millisecond {
				WriteTrace(fmt.Sprintf("REDRAW: Gap=%v", timeSinceLastRedraw))
				m.draw()
				m.screen.Show()
				lastRedraw = now
				needsRedraw = false
			}
		}
	}
}