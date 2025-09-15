package ui

import (
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/models"
)

// ShowSettingsV2Fast uses a faster event loop
func ShowSettingsV2Fast(cfg *config.Config) error {
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

	// Run with FAST event loop
	runFast(modal)
	return nil
}

// runFast uses a faster event loop that doesn't miss events
func runFast(m *SettingsModalV2) {
	log := logger.Get()
	log.Info("Settings modal V2 FAST opened")

	// Initial draw
	m.draw()
	m.screen.Show()

	needsRedraw := false
	lastDraw := time.Now()

	for {
		// Use PostEventWait to ensure we don't miss events
		ev := m.screen.PollEvent()

		switch ev := ev.(type) {
		case *tcell.EventKey:
			if m.editMode {
				if m.handleEditMode(ev) {
					needsRedraw = true
				}
			} else {
				// Handle the key
				selected, escaped := m.menu.HandleInput(ev)

				if escaped {
					log.Info("ESC pressed - exiting settings")
					return
				}

				if selected != nil {
					if settingsItem, ok := selected.(*SettingsMenuItem); ok {
						m.startEdit(settingsItem.number)
					}
				}

				// Always mark for redraw after key event
				needsRedraw = true

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
			needsRedraw = true
		}

		// Batch redraws - only redraw if needed and not too frequent
		if needsRedraw {
			now := time.Now()
			if now.Sub(lastDraw) > 16*time.Millisecond { // ~60fps max
				m.draw()
				m.screen.Show()
				lastDraw = now
				needsRedraw = false
			}
		}

		// Post a nil event to wake up the loop faster
		// This ensures we process events quickly
		m.screen.PostEventWait(nil)
	}
}