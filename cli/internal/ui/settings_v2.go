package ui

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/models"
)

// SettingsMenuItem implements MenuItem for settings fields
type SettingsMenuItem struct {
	field  *Field
	number int
	config *config.Config
}

func (s *SettingsMenuItem) GetID() string          { return fmt.Sprintf("field_%d", s.number) }
func (s *SettingsMenuItem) GetNumber() int         { return s.number }
func (s *SettingsMenuItem) GetTitle() string       { return s.field.Label }
func (s *SettingsMenuItem) GetDescription() string {
	// Show current value as description
	value := s.field.Value
	if s.field.Type == FieldPassword && value != "" {
		value = "••••••••" // Mask password
	}
	return value
}
func (s *SettingsMenuItem) GetInfo() string {
	info := fmt.Sprintf("Type: %s\n", getFieldTypeName(s.field.Type))

	if s.field.Editable {
		info += "Status: Editable\n"
	} else {
		info += "Status: Read-only\n"
	}

	if s.field.Type == FieldSelect && len(s.field.Options) > 0 {
		info += fmt.Sprintf("\nOptions (%d available):\n", len(s.field.Options))
		for i, opt := range s.field.Options {
			if i < 5 { // Show first 5 options
				info += fmt.Sprintf("• %s\n", opt)
			}
		}
		if len(s.field.Options) > 5 {
			info += fmt.Sprintf("... and %d more\n", len(s.field.Options)-5)
		}
	}

	if s.field.Expandable {
		info += "\n" + s.field.Info
		if s.field.YesBrief != "" {
			info += fmt.Sprintf("\n\n✓ Yes: %s", s.field.YesBrief)
		}
		if s.field.NoBrief != "" {
			info += fmt.Sprintf("\n✗ No: %s", s.field.NoBrief)
		}
	}

	if s.field.Refreshable {
		info += "\n\nPress Ctrl+R to refresh available options"
	}

	return info
}
func (s *SettingsMenuItem) GetCategory() string {
	switch s.field.Type {
	case FieldBool:
		return "toggle"
	case FieldSelect:
		return "select"
	case FieldPassword:
		return "secure"
	default:
		return "input"
	}
}
func (s *SettingsMenuItem) IsEnabled() bool { return s.field.Editable }

// SettingsModalV2 uses FilterableMenu for consistent behavior
type SettingsModalV2 struct {
	screen        tcell.Screen
	config        *config.Config
	apiClient     *api.Client
	modelRegistry *models.ModelRegistry
	fields        []Field
	menu          *FilterableMenu
	editMode      bool
	editBuffer    string
}

// ShowSettingsV2 displays the settings modal with FilterableMenu
func ShowSettingsV2(cfg *config.Config) error {
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

	modal.run()
	return nil
}

// run handles the main event loop
func (m *SettingsModalV2) run() {
	log := logger.Get()
	log.Info("Settings modal V2 opened")

	// Initial draw
	WriteTrace("SETTINGS: Initial draw")
	m.draw()
	m.screen.Show()
	WriteTrace("SETTINGS: Initial draw complete")

	eventCount := 0
	for {
		WriteTrace(fmt.Sprintf("POLL: About to call PollEvent (event #%d)", eventCount+1))
		ev := m.screen.PollEvent()
		eventCount++
		WriteTrace(fmt.Sprintf("POLL: Got event #%d: %T", eventCount, ev))

		// Log every event
		log.Debug("[SETTINGS-V2] Event type: %T", ev)

		switch ev := ev.(type) {
		case *tcell.EventKey:
			if m.editMode {
				// Handle edit mode
				if m.handleEditMode(ev) {
					continue
				}
			} else {
				// Let the menu handle navigation
				WriteTrace(fmt.Sprintf("SETTINGS: Calling HandleInput for key %v", ev.Key()))
				selected, escaped := m.menu.HandleInputWithTrace(ev)
				WriteTrace("SETTINGS: HandleInput returned")

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

				// Handle special keys
				switch ev.Key() {
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
			}

		case *tcell.EventResize:
			w, h := m.screen.Size()
			m.menu.SetPosition((w-110)/2, (h-20)/2)
		}

		// Redraw after handling any event
		WriteTrace("SETTINGS: Starting redraw after event")
		m.draw()  // Draw the whole modal, not just the menu!
		WriteTrace("SETTINGS: modal.draw complete, calling Show()")
		m.screen.Show()
		WriteTrace("SETTINGS: Show() complete")
	}
}

// draw renders the settings modal
func (m *SettingsModalV2) draw() {
	m.screen.Clear()
	w, h := m.screen.Size()

	// Draw header
	m.drawHeader(w)

	// Draw the filterable menu
	m.menu.Draw()

	// Draw edit overlay if in edit mode
	if m.editMode {
		m.drawEditOverlay(w, h)
	}

	// Draw footer with help
	m.drawFooter(w, h)
}

// drawHeader draws the settings header
func (m *SettingsModalV2) drawHeader(w int) {
	header := []string{
		"╔════════════════════════════════════════════╗",
		"║     hacka.re CLI Settings Configuration     ║",
		"╚════════════════════════════════════════════╝",
	}

	startX := (w - len(header[0])) / 2
	for i, line := range header {
		m.drawText(startX, i+1, line, tcell.StyleDefault)
	}
}

// drawFooter draws the help footer
func (m *SettingsModalV2) drawFooter(w, h int) {
	var help string
	if m.editMode {
		help = "↵ Save | ESC Cancel | Ctrl+U Clear"
	} else {
		help = "Type to filter | Numbers to select | ↵ Edit | ^R Refresh | ^T Test | ^S Save | ESC Exit"
	}

	helpX := (w - len(help)) / 2
	m.drawText(helpX, h-2, help, tcell.StyleDefault.Dim(true))
}

// drawEditOverlay draws the edit mode overlay
func (m *SettingsModalV2) drawEditOverlay(w, h int) {
	// Draw a centered edit box
	boxW := 60
	boxH := 8
	boxX := (w - boxW) / 2
	boxY := (h - boxH) / 2

	// Draw box background
	for y := boxY; y < boxY+boxH; y++ {
		for x := boxX; x < boxX+boxW; x++ {
			m.screen.SetContent(x, y, ' ', nil, tcell.StyleDefault.Background(tcell.ColorDarkBlue))
		}
	}

	// Draw border
	m.drawBorder(boxX, boxY, boxW, boxH)

	// Draw title
	if item := m.menu.GetSelectedItem(); item != nil {
		title := fmt.Sprintf(" Edit: %s ", item.GetTitle())
		titleX := boxX + (boxW-len(title))/2
		m.drawText(titleX, boxY, title, tcell.StyleDefault.Bold(true))
	}

	// Draw current value
	valueY := boxY + 3
	m.drawText(boxX+2, valueY, "Value:", tcell.StyleDefault)
	m.drawText(boxX+9, valueY, m.editBuffer, tcell.StyleDefault.Foreground(tcell.ColorYellow))

	// Show cursor
	cursorX := boxX + 9 + len(m.editBuffer)
	m.screen.SetContent(cursorX, valueY, '_', nil, tcell.StyleDefault.Blink(true))
}

// startEdit starts editing a field
func (m *SettingsModalV2) startEdit(fieldIndex int) {
	if fieldIndex >= len(m.fields) || !m.fields[fieldIndex].Editable {
		return
	}

	field := &m.fields[fieldIndex]

	// Handle boolean fields specially
	if field.Type == FieldBool {
		// Toggle the value
		current := field.Value == "Yes" || field.Value == "true"
		field.Value = boolToString(!current)
		m.updateConfigFromField(fieldIndex)
		m.updateMenuItem(fieldIndex)
		return
	}

	// For select fields with few options, cycle through them
	if field.Type == FieldSelect && len(field.Options) > 0 && len(field.Options) <= 5 {
		// Find current index
		currentIdx := -1
		for i, opt := range field.Options {
			if opt == field.Value {
				currentIdx = i
				break
			}
		}
		// Cycle to next
		nextIdx := (currentIdx + 1) % len(field.Options)
		field.Value = field.Options[nextIdx]
		m.updateConfigFromField(fieldIndex)
		m.updateMenuItem(fieldIndex)
		return
	}

	// For other fields, enter edit mode
	m.editMode = true
	m.editBuffer = field.Value

	// Unmask password for editing
	if field.Type == FieldPassword && strings.Contains(field.Value, "•") {
		m.editBuffer = m.config.APIKey // Get actual value
	}
}

// handleEditMode handles key events in edit mode
func (m *SettingsModalV2) handleEditMode(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEscape:
		// Cancel edit
		m.editMode = false
		m.editBuffer = ""
		return true

	case tcell.KeyEnter:
		// Save edit
		if item := m.menu.GetSelectedItem(); item != nil {
			if settingsItem, ok := item.(*SettingsMenuItem); ok {
				fieldIdx := settingsItem.number
				m.fields[fieldIdx].Value = m.editBuffer
				m.updateConfigFromField(fieldIdx)
				m.updateMenuItem(fieldIdx)
			}
		}
		m.editMode = false
		m.editBuffer = ""
		return true

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if len(m.editBuffer) > 0 {
			m.editBuffer = m.editBuffer[:len(m.editBuffer)-1]
		}
		return true

	case tcell.KeyCtrlU:
		// Clear buffer
		m.editBuffer = ""
		return true

	case tcell.KeyRune:
		// Add character
		m.editBuffer += string(ev.Rune())
		return true

	default:
		return true
	}
}

// updateMenuItem updates a menu item after field change
func (m *SettingsModalV2) updateMenuItem(fieldIndex int) {
	if fieldIndex >= len(m.menu.items) {
		return
	}

	// Update the menu item's field reference
	if settingsItem, ok := m.menu.items[fieldIndex].(*SettingsMenuItem); ok {
		settingsItem.field = &m.fields[fieldIndex]
	}
}

// updateConfigFromField updates config from a field value
func (m *SettingsModalV2) updateConfigFromField(fieldIndex int) {
	field := &m.fields[fieldIndex]

	switch fieldIndex {
	case 0: // API Provider
		m.config.Provider = config.Provider(field.Value)
	case 1: // Base URL
		m.config.BaseURL = field.Value
	case 2: // API Key
		m.config.APIKey = field.Value
	case 3: // Model
		m.config.Model = field.Value
	case 4: // Max Tokens
		if val, err := strconv.Atoi(field.Value); err == nil {
			m.config.MaxTokens = val
		}
	case 5: // Temperature
		if val, err := strconv.ParseFloat(field.Value, 64); err == nil {
			m.config.Temperature = val
		}
	case 6: // System Prompt
		m.config.SystemPrompt = field.Value
	case 7: // Stream Response
		m.config.StreamResponse = field.Value == "Yes" || field.Value == "true"
	case 8: // YOLO Mode
		m.config.YoloMode = field.Value == "Yes" || field.Value == "true"
	case 9: // Voice Control
		m.config.VoiceControl = field.Value == "Yes" || field.Value == "true"
	}
}

// refreshField refreshes a field's options (e.g., model list)
func (m *SettingsModalV2) refreshField(fieldIndex int) {
	// For now, just refresh models
	if fieldIndex == 3 {
		// This would fetch models from API
		// For now, just log it
		logger.Get().Info("Refreshing model list...")
	}
}

// testConnection tests the API connection
func (m *SettingsModalV2) testConnection() {
	logger.Get().Info("Testing API connection...")
	// Would implement actual test here
}

// saveConfig saves the configuration
func (m *SettingsModalV2) saveConfig() {
	configPath := config.GetConfigPath()
	if err := m.config.SaveToFile(configPath); err != nil {
		logger.Get().Error("Failed to save config: %v", err)
	} else {
		logger.Get().Info("Configuration saved to %s", configPath)
	}
}

// Helper functions
func (m *SettingsModalV2) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		m.screen.SetContent(x+i, y, r, nil, style)
	}
}

func (m *SettingsModalV2) drawBorder(x, y, w, h int) {
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

func getFieldTypeName(ft FieldType) string {
	switch ft {
	case FieldText:
		return "Text Input"
	case FieldPassword:
		return "Password (Secure)"
	case FieldSelect:
		return "Selection List"
	case FieldNumber:
		return "Numeric Value"
	case FieldBool:
		return "Yes/No Toggle"
	default:
		return "Unknown"
	}
}