package ui

import (
	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/models"
)

// ShowSettingsV2Fixed displays the settings modal with better event handling
func ShowSettingsV2Fixed(cfg *config.Config) error {
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

	// Run with improved event handling
	runFixed(modal)
	return nil
}

// runFixed handles the main event loop with batch event processing
func runFixed(m *SettingsModalV2) {
	log := logger.Get()
	log.Info("Settings modal V2 (fixed) opened")

	// Initial draw
	m.draw()
	m.screen.Show()

	for {
		// Wait for at least one event
		ev := m.screen.PollEvent()
		if ev == nil {
			continue
		}

		// Log the first event
		log.Debug("[SETTINGS-V2-FIXED] First event: %T", ev)

		// Check if it's a key event
		keyEv, isKey := ev.(*tcell.EventKey)

		if isKey && !m.editMode {
			// Use batch processing for menu navigation
			selected, escaped := m.menu.HandleInputBatched(m.screen)

			if escaped {
				log.Info("ESC pressed - exiting settings")
				return
			}

			if selected != nil {
				// Handle selection
				if settingsItem, ok := selected.(*SettingsMenuItem); ok {
					m.startEdit(settingsItem.number)
				}
			}

			// Also handle the original event for special keys
			switch keyEv.Key() {
			case tcell.KeyCtrlR:
				// Refresh models if on model field
				if item := m.menu.GetSelectedItem(); item != nil {
					if settingsItem, ok := item.(*SettingsMenuItem); ok {
						if settingsItem.field.Refreshable {
							m.refreshField(settingsItem.number)
						}
					}
				}

			case tcell.KeyCtrlT:
				// Test connection
				m.testConnection()

			case tcell.KeyCtrlS:
				// Save configuration
				m.saveConfig()

			case tcell.KeyCtrlQ:
				// Quit
				log.Info("Ctrl+Q pressed - quit")
				return
			}
		} else if isKey && m.editMode {
			// Handle edit mode with the single event
			if m.handleEditMode(keyEv) {
				// Continue if handled
			}
		} else if !isKey {
			// Handle non-key events
			switch resizeEv := ev.(type) {
			case *tcell.EventResize:
				_ = resizeEv // Mark as used
				w, h := m.screen.Size()
				m.menu.SetPosition((w-110)/2, (h-20)/2)
			}
		}

		// Process any remaining events before drawing
		for m.screen.HasPendingEvent() {
			pendingEv := m.screen.PollEvent()
			log.Debug("[SETTINGS-V2-FIXED] Processing pending event: %T", pendingEv)

			// Quick processing of additional events
			if keyEv, ok := pendingEv.(*tcell.EventKey); ok && !m.editMode {
				// Let menu handle it
				m.menu.HandleInputSingle(keyEv)
			}
		}

		// Now draw once after processing all events
		m.draw()
		m.screen.Show()
	}
}