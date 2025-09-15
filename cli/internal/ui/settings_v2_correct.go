package ui

import (
	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/models"
)

// ShowSettingsV2Correct displays the settings modal with ACTUALLY WORKING event handling
func ShowSettingsV2Correct(cfg *config.Config) error {
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

	// Run with CORRECT event handling
	runCorrect(modal)
	return nil
}

// runCorrect handles the main event loop CORRECTLY
func runCorrect(m *SettingsModalV2) {
	log := logger.Get()
	log.Info("Settings modal V2 (CORRECT) opened")

	// Initial draw
	m.draw()
	m.screen.Show()

	for {
		// Poll ONE event
		ev := m.screen.PollEvent()
		if ev == nil {
			continue
		}

		// Log EVERY event
		log.Debug("[SETTINGS-CORRECT] Event received: %T", ev)

		switch ev := ev.(type) {
		case *tcell.EventKey:
			log.Debug("[SETTINGS-CORRECT] Key event: Key=%v, Rune=%c", ev.Key(), ev.Rune())

			if m.editMode {
				// Handle edit mode
				log.Debug("[SETTINGS-CORRECT] In edit mode")
				if m.handleEditMode(ev) {
					log.Debug("[SETTINGS-CORRECT] Edit mode handled event")
				}
			} else {
				// PROCESS THE ACTUAL EVENT WE ALREADY POLLED!
				selected, escaped := m.menu.HandleInput(ev)

				if escaped {
					log.Info("ESC pressed - exiting settings")
					return
				}

				if selected != nil {
					// Handle selection
					if settingsItem, ok := selected.(*SettingsMenuItem); ok {
						log.Debug("[SETTINGS-CORRECT] Item selected: %d", settingsItem.number)
						m.startEdit(settingsItem.number)
					}
				}

				// Handle special keys that the menu doesn't handle
				switch ev.Key() {
				case tcell.KeyCtrlR:
					log.Debug("[SETTINGS-CORRECT] Ctrl+R pressed")
					// Refresh models if on model field
					if item := m.menu.GetSelectedItem(); item != nil {
						if settingsItem, ok := item.(*SettingsMenuItem); ok {
							if settingsItem.field.Refreshable {
								m.refreshField(settingsItem.number)
							}
						}
					}

				case tcell.KeyCtrlT:
					log.Debug("[SETTINGS-CORRECT] Ctrl+T pressed")
					// Test connection
					m.testConnection()

				case tcell.KeyCtrlS:
					log.Debug("[SETTINGS-CORRECT] Ctrl+S pressed")
					// Save configuration
					m.saveConfig()

				case tcell.KeyCtrlQ:
					// Quit
					log.Info("Ctrl+Q pressed - quit")
					return
				}
			}

		case *tcell.EventResize:
			log.Debug("[SETTINGS-CORRECT] Resize event")
			w, h := m.screen.Size()
			m.menu.SetPosition((w-110)/2, (h-20)/2)
		}

		// Redraw after handling the event
		m.draw()
		m.screen.Show()
	}
}