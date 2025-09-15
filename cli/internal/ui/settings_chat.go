package ui

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/models"
)

// ShowSettingsForChat displays the settings modal and returns to chat on ESC
// Returns error only if there's a fatal error, not on normal ESC
func ShowSettingsForChat(cfg *config.Config) error {
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

	// Use the existing SettingsModal but modify its behavior
	modal := &SettingsModal{
		screen:        s,
		config:        cfg,
		apiClient:     api.NewClient(cfg),
		modelRegistry: models.NewModelRegistry(),
		fields:        buildFields(cfg),
		expandedField: -1,
	}

	// Load model list for current provider
	modal.loadModelsForProvider()

	// Run the modal - this is modified to only exit on ESC, never on Ctrl+Q
	modal.runForChat()

	// Always save configuration when exiting settings
	configPath := config.GetConfigPath()
	cfg.SaveToFile(configPath)

	return nil
}

// runForChat runs the settings modal in chat mode (ESC returns to chat, no exit)
func (m *SettingsModal) runForChat() {
	log := logger.Get()
	log.Info("Settings modal opened from chat")

	for {
		m.draw()
		m.screen.Show()

		ev := m.screen.PollEvent()
		switch ev := ev.(type) {
		case *tcell.EventKey:
			// Handle key event
			handled := m.handleKeyEventForChat(ev)
			if !handled {
				// ESC was pressed at top level - return to chat
				log.Info("Returning to chat from settings")
				return
			}
		case *tcell.EventResize:
			m.screen.Sync()
		}
	}
}

// handleKeyEventForChat handles keyboard events in chat mode
func (m *SettingsModal) handleKeyEventForChat(ev *tcell.EventKey) bool {
	log := logger.Get()
	log.KeyEvent(fmt.Sprintf("%v", ev.Key()), fmt.Sprintf("%v", ev.Modifiers()), m.getContext())

	// If model dropdown is active, let it handle input first
	if m.modelDropdown && m.modelMenu != nil {
		selected, escaped := m.modelMenu.HandleInput(ev)
		if escaped {
			log.MenuAction("modelDropdown", "close", "ESC pressed")
			m.modelDropdown = false
			return true
		} else if selected != nil {
			// Apply selection
			if modelItem, ok := selected.(*ModelMenuItem); ok {
				m.config.Model = modelItem.model.ID
				m.fields[3].Value = modelItem.model.ID
				m.modelDropdown = false
				log.MenuAction("modelDropdown", "select", modelItem.model.ID)
			}
			return true
		}
		return true // Menu handled the input
	}

	switch ev.Key() {
	case tcell.KeyEscape:
		if m.expandedField >= 0 {
			log.MenuAction("expandableMenu", "close", fmt.Sprintf("field=%d", m.expandedField))
			m.expandedField = -1
			return true
		} else if m.editing {
			log.MenuAction("editing", "cancel", "ESC pressed")
			m.editing = false
			return true
		}
		// ESC at top level - return to chat
		return false

	case tcell.KeyCtrlQ:
		// In chat mode, Ctrl+Q does nothing (can't exit from settings)
		log.Info("Ctrl+Q ignored in chat mode - use ESC to return to chat")
		return true

	case tcell.KeyUp:
		if m.expandedField >= 0 {
			oldChoice := m.expandedChoice
			m.expandedChoice = 1 - m.expandedChoice
			log.MenuAction("expandableMenu", "toggle", fmt.Sprintf("%d -> %d", oldChoice, m.expandedChoice))
		} else if !m.editing && m.selected > 0 {
			m.selected--
			log.Debug("Field selection: up to %d", m.selected)
		}
		return true

	case tcell.KeyDown:
		if m.expandedField >= 0 {
			oldChoice := m.expandedChoice
			m.expandedChoice = 1 - m.expandedChoice
			log.MenuAction("expandableMenu", "toggle", fmt.Sprintf("%d -> %d", oldChoice, m.expandedChoice))
		} else if !m.editing && m.selected < len(m.fields)-1 {
			m.selected++
			log.Debug("Field selection: down to %d", m.selected)
		}
		return true

	case tcell.KeyEnter:
		if m.expandedField >= 0 {
			// Apply yes/no selection
			field := &m.fields[m.expandedField]
			choiceStr := "No"
			if m.expandedChoice == 1 {
				choiceStr = "Yes"
				field.Value = "Yes"
			} else {
				field.Value = "No"
			}
			log.MenuAction("expandableMenu", "apply", fmt.Sprintf("field=%s, choice=%s", field.Label, choiceStr))
			// Update config based on field
			switch m.expandedField {
			case 7: // Stream Response
				m.config.StreamResponse = (m.expandedChoice == 1)
			case 8: // YOLO Mode
				m.config.YoloMode = (m.expandedChoice == 1)
			case 9: // Voice Control
				m.config.VoiceControl = (m.expandedChoice == 1)
			}
			m.expandedField = -1
		} else if m.selected == 3 && !m.editing {
			// Open model dropdown
			log.MenuAction("modelDropdown", "open", "Enter pressed")
			m.modelDropdown = true
			if m.modelMenu != nil {
				m.modelMenu.Reset()
				// Select current model
				for i, item := range m.modelMenu.items {
					if item.GetID() == m.config.Model {
						m.modelMenu.SetSelectedIndex(i)
						break
					}
				}
			}
		} else if m.fields[m.selected].Expandable && !m.editing {
			// Open expandable menu
			field := m.fields[m.selected]
			log.MenuAction("expandableMenu", "open", fmt.Sprintf("field=%s", field.Label))
			m.expandedField = m.selected
			// Set initial choice based on current value
			if m.fields[m.selected].Value == "Yes" {
				m.expandedChoice = 1
			} else {
				m.expandedChoice = 0
			}
		} else if !m.editing && m.fields[m.selected].Editable && !m.fields[m.selected].Expandable {
			log.MenuAction("editing", "start", fmt.Sprintf("field=%s", m.fields[m.selected].Label))
			m.editing = true
		} else if m.editing {
			log.MenuAction("editing", "apply", fmt.Sprintf("field=%s", m.fields[m.selected].Label))
			m.applyFieldEdit()
			m.editing = false
		}
		return true

	case tcell.KeyTab:
		if m.fields[m.selected].Type == FieldSelect && m.selected != 3 {
			m.cycleOption()
		}
		return true

	case tcell.KeyCtrlR:
		if m.selected == 3 {
			m.refreshModelList()
		}
		return true

	case tcell.KeyCtrlS:
		m.saveConfig()
		return true

	case tcell.KeyCtrlT:
		m.testConnection()
		return true

	case tcell.KeyRune:
		log.Debug("Rune key: %c", ev.Rune())
		if m.editing {
			m.handleTextInput(ev.Rune())
		}
		return true

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if m.editing && len(m.fields[m.selected].Value) > 0 {
			field := &m.fields[m.selected]
			field.Value = field.Value[:len(field.Value)-1]
		}
		return true
	}

	return false
}