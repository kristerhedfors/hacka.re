package rich

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/tui/internal/core"
)

// SettingsMenuItem implements MenuItem for settings fields
type SettingsMenuItem struct {
	field  *SettingsField
	number int
	config *core.Config
}

func (s *SettingsMenuItem) GetID() string          { return s.field.Key }
func (s *SettingsMenuItem) GetNumber() int         { return s.number }
func (s *SettingsMenuItem) GetTitle() string       { return s.field.Label }
func (s *SettingsMenuItem) GetDescription() string { return s.formatValue() }
func (s *SettingsMenuItem) GetCategory() string    { return "" }
func (s *SettingsMenuItem) IsEnabled() bool        { return true }

func (s *SettingsMenuItem) GetInfo() string {
	info := s.field.Description

	// Add current value info
	info += "\n\nCurrent setting: " + s.formatValue()

	// Add type-specific help
	switch s.field.Type {
	case FieldTypeDropdown:
		info += "\n\nOptions:\n"
		for _, opt := range s.field.Options {
			if opt == s.field.Value {
				info += fmt.Sprintf("• %s (current)\n", opt)
			} else {
				info += fmt.Sprintf("• %s\n", opt)
			}
		}
	case FieldTypeBool:
		info += "\n\nPress Space or Enter to toggle"
	case FieldTypeFloat:
		if s.field.Min != 0 || s.field.Max != 0 {
			info += fmt.Sprintf("\n\nRange: %.2f - %.2f", s.field.Min, s.field.Max)
		}
	case FieldTypeNumber:
		if s.field.Min != 0 || s.field.Max != 0 {
			info += fmt.Sprintf("\n\nRange: %d - %d", int(s.field.Min), int(s.field.Max))
		}
	case FieldTypePassword:
		info += "\n\nYour password will be masked for security"
	}

	return info
}

func (s *SettingsMenuItem) formatValue() string {
	switch s.field.Type {
	case FieldTypePassword:
		if val, ok := s.field.Value.(string); ok && val != "" {
			if len(val) > 8 {
				return val[:4] + "..." + val[len(val)-4:]
			}
			return strings.Repeat("*", len(val))
		}
		return "(not set)"
	case FieldTypeBool:
		if val, ok := s.field.Value.(bool); ok && val {
			return "[x] Enabled"
		}
		return "[ ] Disabled"
	case FieldTypeFloat:
		if val, ok := s.field.Value.(float64); ok {
			return fmt.Sprintf("%.2f", val)
		}
		return "0.00"
	default:
		return fmt.Sprintf("%v", s.field.Value)
	}
}

// SettingsModalV2 provides a filterable settings interface
type SettingsModalV2 struct {
	screen   tcell.Screen
	config   *core.ConfigManager
	fields   []*SettingsField
	menu     *FilterableMenu

	// Edit state
	editingField     bool
	editBuffer       string
	dropdownIndex    int
	editingItem      *SettingsMenuItem
	dropdownSelector *DropdownSelector

	// UI state
	modified     bool
	errorMessage string

	// Original state for restore
	originalValues map[string]interface{}

	// Callbacks
	onSave   func(*core.Config) error
	onCancel func()
}

// NewSettingsModalV2 creates a new filterable settings modal
func NewSettingsModalV2(screen tcell.Screen, config *core.ConfigManager) *SettingsModalV2 {
	sm := &SettingsModalV2{
		screen:         screen,
		config:         config,
		originalValues: make(map[string]interface{}),
	}

	// Initialize fields
	sm.initializeFields()

	// Store original values for restore
	sm.storeOriginalValues()

	// Create filterable menu
	sm.menu = NewFilterableMenu(screen, "Settings Configuration")

	// Configure menu layout
	w, h := screen.Size()
	menuWidth := 50
	menuHeight := min(20, h-10)
	infoWidth := 40

	sm.menu.SetDimensions(menuWidth, menuHeight)
	sm.menu.SetPosition((w-menuWidth-infoWidth-2)/2, (h-menuHeight)/2)
	sm.menu.SetInfoPanel(true, infoWidth)

	// Add fields as menu items
	for i, field := range sm.fields {
		sm.menu.AddItem(&SettingsMenuItem{
			field:  field,
			number: i,
			config: config.Get(),
		})
	}

	return sm
}

// initializeFields sets up the settings fields (same as before)
func (sm *SettingsModalV2) initializeFields() {
	cfg := sm.config.Get()

	sm.fields = []*SettingsField{
		{
			Label:       "API Provider",
			Key:         "provider",
			Type:        FieldTypeDropdown,
			Value:       cfg.Provider,
			Options:     []string{"openai", "groq", "ollama", "anthropic", "custom"},
			Description: "Select your AI provider",
		},
		{
			Label:       "API Key",
			Key:         "api_key",
			Type:        FieldTypePassword,
			Value:       cfg.APIKey,
			Description: "Your API authentication key",
		},
		{
			Label:       "Base URL",
			Key:         "base_url",
			Type:        FieldTypeString,
			Value:       cfg.BaseURL,
			Description: "API endpoint URL",
		},
		{
			Label:       "Model",
			Key:         "model",
			Type:        FieldTypeDropdown,
			Value:       cfg.Model,
			Options:     sm.getModelOptions(cfg.Provider),
			Description: "AI model to use",
		},
		{
			Label:       "Temperature",
			Key:         "temperature",
			Type:        FieldTypeFloat,
			Value:       cfg.Temperature,
			Min:         0.0,
			Max:         2.0,
			Description: "Response randomness (0=deterministic, 2=creative)",
		},
		{
			Label:       "Max Tokens",
			Key:         "max_tokens",
			Type:        FieldTypeNumber,
			Value:       cfg.MaxTokens,
			Min:         1,
			Max:         128000,
			Description: "Maximum response length in tokens",
		},
		{
			Label:       "Stream Mode",
			Key:         "stream_mode",
			Type:        FieldTypeBool,
			Value:       cfg.StreamMode,
			Description: "Enable streaming responses for real-time output",
		},
		{
			Label:       "YOLO Mode",
			Key:         "yolo_mode",
			Type:        FieldTypeBool,
			Value:       cfg.YoloMode,
			Description: "Auto-execute functions without confirmation (use with caution!)",
		},
		{
			Label:       "Voice Control",
			Key:         "voice_control",
			Type:        FieldTypeBool,
			Value:       cfg.VoiceControl,
			Description: "Enable voice input/output for hands-free interaction",
		},
		{
			Label:       "System Prompt",
			Key:         "system_prompt",
			Type:        FieldTypeText,
			Value:       cfg.SystemPrompt,
			Description: "Initial system message to set AI behavior and context",
		},
		{
			Label:       "Theme",
			Key:         "theme",
			Type:        FieldTypeDropdown,
			Value:       cfg.Theme,
			Options:     []string{"dark", "light", "auto"},
			Description: "UI color theme preference",
		},
		{
			Label:       "Namespace",
			Key:         "namespace",
			Type:        FieldTypeString,
			Value:       cfg.Namespace,
			Description: "Storage namespace for data isolation",
		},
	}
}

// getModelOptions returns model options based on provider (same as before)
func (sm *SettingsModalV2) getModelOptions(provider string) []string {
	switch provider {
	case "openai":
		return []string{
			"gpt-4-turbo-preview",
			"gpt-4",
			"gpt-3.5-turbo",
			"gpt-3.5-turbo-16k",
		}
	case "anthropic":
		return []string{
			"claude-3-opus",
			"claude-3-sonnet",
			"claude-3-haiku",
			"claude-2.1",
		}
	case "groq":
		return []string{
			"mixtral-8x7b-32768",
			"llama2-70b-4096",
			"gemma-7b-it",
		}
	case "ollama":
		return []string{
			"llama2",
			"mistral",
			"codellama",
			"phi",
		}
	default:
		return []string{"custom-model"}
	}
}

// Draw renders the settings modal
func (sm *SettingsModalV2) Draw() {
	if sm.dropdownSelector != nil {
		// Draw the dropdown selector
		sm.dropdownSelector.Draw()
	} else if sm.editingField {
		// Draw edit overlay for non-dropdown fields
		sm.drawEditOverlay()
	} else {
		// Draw the filterable menu
		sm.menu.Draw()

		// Add save/cancel instructions
		sm.drawBottomInstructions()

		// Show error if any
		if sm.errorMessage != "" {
			sm.drawError()
		}

		// Show modified indicator
		if sm.modified {
			sm.drawModifiedIndicator()
		}
	}
}

// drawEditOverlay shows the editing interface
func (sm *SettingsModalV2) drawEditOverlay() {
	w, h := sm.screen.Size()

	// Calculate overlay dimensions
	overlayWidth := 60
	overlayHeight := 10
	x := (w - overlayWidth) / 2
	y := (h - overlayHeight) / 2

	// Draw overlay background
	style := tcell.StyleDefault.Background(tcell.ColorDarkBlue)
	for i := 0; i < overlayHeight; i++ {
		for j := 0; j < overlayWidth; j++ {
			sm.screen.SetContent(x+j, y+i, ' ', nil, style)
		}
	}

	// Draw border
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	sm.drawBox(x, y, overlayWidth, overlayHeight, borderStyle)

	// Draw title
	title := fmt.Sprintf(" Edit: %s ", sm.editingItem.field.Label)
	titleX := x + (overlayWidth-len(title))/2
	sm.drawText(titleX, y, title, borderStyle)

	// Draw current value based on type
	valueY := y + 3
	field := sm.editingItem.field

	switch field.Type {
	case FieldTypeBool:
		// Show toggle state centered with 'x'
		value := "[ ] Disabled"
		if field.Value.(bool) {
			value = "[x] Enabled"
		}
		valueX := x + (overlayWidth-len(value))/2
		sm.drawText(valueX, valueY, value, tcell.StyleDefault.Foreground(tcell.ColorGreen))

		// Show toggle hint
		hint := "Press Space to toggle, Enter to confirm"
		hintX := x + (overlayWidth-len(hint))/2
		sm.drawText(hintX, valueY+2, hint, tcell.StyleDefault.Foreground(tcell.ColorGray))

	default:
		// Show text input
		sm.drawText(x+2, valueY, "Value: ", tcell.StyleDefault.Foreground(tcell.ColorWhite))
		inputX := x + 9

		// Draw edit buffer
		bufferStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen)
		sm.drawText(inputX, valueY, sm.editBuffer, bufferStyle)

		// Draw cursor
		cursorX := inputX + len(sm.editBuffer)
		if cursorX < x+overlayWidth-2 {
			sm.screen.SetContent(cursorX, valueY, '_', nil, bufferStyle.Blink(true))
		}

		// Show type hint
		hint := "Type value, Enter to confirm"
		hintX := x + (overlayWidth-len(hint))/2
		sm.drawText(hintX, valueY+2, hint, tcell.StyleDefault.Foreground(tcell.ColorGray))
	}

	// Draw cancel instruction
	cancel := "ESC to cancel"
	cancelX := x + (overlayWidth-len(cancel))/2
	sm.drawText(cancelX, y+overlayHeight-2, cancel, tcell.StyleDefault.Foreground(tcell.ColorRed))
}

// drawBottomInstructions adds save/cancel hints
func (sm *SettingsModalV2) drawBottomInstructions() {
	x, y, w, h := sm.menu.x, sm.menu.y, sm.menu.width, sm.menu.height

	// Update instructions to reflect auto-save
	instructions := " Changes auto-save | Ctrl-R:Restore | ESC:Close "

	instX := x + (w-len(instructions))/2
	instY := y + h

	style := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	if sm.modified {
		style = style.Bold(true)
	}

	sm.drawText(instX, instY, instructions, style)
}

// drawModifiedIndicator shows that settings have been changed
func (sm *SettingsModalV2) drawModifiedIndicator() {
	x, y, w, _ := sm.menu.x, sm.menu.y, sm.menu.width, sm.menu.height

	indicator := " * Modified * "
	indX := x + w - len(indicator) - 1
	indY := y

	style := tcell.StyleDefault.Foreground(tcell.ColorYellow).Bold(true)
	sm.drawText(indX, indY, indicator, style)
}

// drawError displays error message
func (sm *SettingsModalV2) drawError() {
	x, y, w, h := sm.menu.x, sm.menu.y, sm.menu.width, sm.menu.height

	msg := sm.errorMessage
	if len(msg) > w-4 {
		msg = msg[:w-7] + "..."
	}

	errX := x + (w-len(msg))/2
	errY := y + h + 2

	style := tcell.StyleDefault.Foreground(tcell.ColorRed).Bold(true)
	sm.drawText(errX, errY, msg, style)
}

// HandleInput processes keyboard input
func (sm *SettingsModalV2) HandleInput(ev *tcell.EventKey) bool {
	// Handle dropdown selector if active
	if sm.dropdownSelector != nil {
		value, done := sm.dropdownSelector.HandleInput(ev)
		if done {
			if value != "" {
				// Apply the selected value
				sm.editingItem.field.Value = value
				sm.modified = true

				// Special handling for provider change
				if sm.editingItem.field.Key == "provider" {
					sm.updateModelOptionsForProvider(value)
				}

				// Update menu items and save
				sm.updateMenuItems()
				sm.save()
			}
			// Close dropdown
			sm.dropdownSelector = nil
			sm.editingField = false
			sm.editingItem = nil
		}
		return false
	}

	if sm.editingField {
		return sm.handleEditingInput(ev)
	}

	// Check for restore shortcut (Ctrl-R)
	if ev.Key() == tcell.KeyCtrlR {
		sm.restoreOriginalValues()
		return false
	}

	// Let the menu handle navigation and filtering
	item, exit := sm.menu.HandleInput(ev)

	if exit {
		// Auto-save on exit if modified
		if sm.modified {
			sm.save()
		}
		if sm.onCancel != nil {
			sm.onCancel()
		}
		return true
	}

	if item != nil {
		// Start editing the selected field
		if menuItem, ok := item.(*SettingsMenuItem); ok {
			sm.startEditing(menuItem)
		}
	}

	return false
}

// handleEditingInput handles input when editing a field
func (sm *SettingsModalV2) handleEditingInput(ev *tcell.EventKey) bool {
	field := sm.editingItem.field

	switch ev.Key() {
	case tcell.KeyEscape:
		sm.cancelEditing()
		return false

	case tcell.KeyEnter:
		sm.confirmEditing()
		return false

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if field.Type != FieldTypeBool {
			if len(sm.editBuffer) > 0 {
				sm.editBuffer = sm.editBuffer[:len(sm.editBuffer)-1]
			}
		}

	case tcell.KeyRune:
		if field.Type == FieldTypeBool {
			if ev.Rune() == ' ' {
				// Toggle boolean
				field.Value = !field.Value.(bool)
				sm.modified = true
			}
		} else {
			sm.editBuffer += string(ev.Rune())
		}
	}

	return false
}

// startEditing begins editing a field
func (sm *SettingsModalV2) startEditing(item *SettingsMenuItem) {
	sm.editingField = true
	sm.editingItem = item
	sm.errorMessage = ""

	field := item.field

	switch field.Type {
	case FieldTypeDropdown:
		// Create a dropdown selector for this field
		currentValue := fmt.Sprintf("%v", field.Value)
		sm.dropdownSelector = NewDropdownSelector(
			sm.screen,
			fmt.Sprintf("Select %s", field.Label),
			field.Options,
			currentValue,
		)

	case FieldTypeBool:
		// Nothing to prepare

	default:
		// Initialize edit buffer with current value
		sm.editBuffer = fmt.Sprintf("%v", field.Value)
		if field.Type == FieldTypePassword && field.Value.(string) != "" {
			sm.editBuffer = field.Value.(string)
		}
	}
}

// storeOriginalValues saves the initial state for restore
func (sm *SettingsModalV2) storeOriginalValues() {
	for _, field := range sm.fields {
		// Deep copy the value to avoid reference issues
		switch v := field.Value.(type) {
		case string:
			sm.originalValues[field.Key] = v
		case bool:
			sm.originalValues[field.Key] = v
		case int:
			sm.originalValues[field.Key] = v
		case float64:
			sm.originalValues[field.Key] = v
		default:
			sm.originalValues[field.Key] = field.Value
		}
	}
}

// restoreOriginalValues restores all fields to their original values
func (sm *SettingsModalV2) restoreOriginalValues() {
	for _, field := range sm.fields {
		if originalValue, exists := sm.originalValues[field.Key]; exists {
			field.Value = originalValue
		}
	}

	// Reset modified flag
	sm.modified = false
	sm.errorMessage = ""

	// Update menu items to reflect restored values
	sm.updateMenuItems()

	// Auto-save the restored state
	sm.save()
}

// updateModelOptionsForProvider updates model options when provider changes
func (sm *SettingsModalV2) updateModelOptionsForProvider(provider string) {
	// Update model field options
	for _, f := range sm.fields {
		if f.Key == "model" {
			f.Options = sm.getModelOptions(provider)
			// Reset to first option if current model not in new list
			found := false
			for _, opt := range f.Options {
				if opt == f.Value.(string) {
					found = true
					break
				}
			}
			if !found && len(f.Options) > 0 {
				f.Value = f.Options[0]
			}
			break
		}
	}
}

// confirmEditing saves the edited value
func (sm *SettingsModalV2) confirmEditing() {
	field := sm.editingItem.field

	// Parse and validate new value
	var newValue interface{}
	var err error

	switch field.Type {
	case FieldTypeDropdown:
		// This case is now handled by the dropdown selector
		// Should not reach here
		return

	case FieldTypeBool:
		// Already updated during editing
		sm.editingField = false
		sm.editingItem = nil
		sm.updateMenuItems()
		// Auto-save after toggle
		sm.save()
		return

	case FieldTypeFloat:
		newValue, err = strconv.ParseFloat(sm.editBuffer, 64)
		if err != nil {
			sm.errorMessage = fmt.Sprintf("Invalid number: %v", err)
			return
		}
		if field.Min != 0 || field.Max != 0 {
			val := newValue.(float64)
			if val < field.Min || val > field.Max {
				sm.errorMessage = fmt.Sprintf("Value must be between %.2f and %.2f", field.Min, field.Max)
				return
			}
		}

	case FieldTypeNumber:
		newValue, err = strconv.Atoi(sm.editBuffer)
		if err != nil {
			sm.errorMessage = fmt.Sprintf("Invalid number: %v", err)
			return
		}

	default:
		newValue = sm.editBuffer
	}

	// Update value
	field.Value = newValue
	sm.modified = true
	sm.editingField = false
	sm.editingItem = nil
	sm.editBuffer = ""

	// Update menu items to reflect changes
	sm.updateMenuItems()

	// Auto-save after each change
	sm.save()
}

// cancelEditing cancels the current edit
func (sm *SettingsModalV2) cancelEditing() {
	sm.editingField = false
	sm.editingItem = nil
	sm.editBuffer = ""
	sm.errorMessage = ""
}

// updateMenuItems refreshes menu items with current values
func (sm *SettingsModalV2) updateMenuItems() {
	// Clear and re-add items with updated values
	sm.menu.items = make([]MenuItem, 0)
	sm.menu.filteredItems = make([]MenuItem, 0)

	for i, field := range sm.fields {
		sm.menu.AddItem(&SettingsMenuItem{
			field:  field,
			number: i,
			config: sm.config.Get(),
		})
	}
}

// save saves all settings
func (sm *SettingsModalV2) save() {
	// Update config with all field values
	err := sm.config.Update(func(cfg *core.Config) {
		for _, field := range sm.fields {
			switch field.Key {
			case "provider":
				cfg.Provider = field.Value.(string)
			case "api_key":
				cfg.APIKey = field.Value.(string)
			case "base_url":
				cfg.BaseURL = field.Value.(string)
			case "model":
				cfg.Model = field.Value.(string)
			case "temperature":
				cfg.Temperature = field.Value.(float64)
			case "max_tokens":
				cfg.MaxTokens = field.Value.(int)
			case "stream_mode":
				cfg.StreamMode = field.Value.(bool)
			case "yolo_mode":
				cfg.YoloMode = field.Value.(bool)
			case "voice_control":
				cfg.VoiceControl = field.Value.(bool)
			case "system_prompt":
				cfg.SystemPrompt = field.Value.(string)
			case "theme":
				cfg.Theme = field.Value.(string)
			case "namespace":
				cfg.Namespace = field.Value.(string)
			}
		}
	})

	if err != nil {
		sm.errorMessage = fmt.Sprintf("Save failed: %v", err)
		return
	}

	sm.modified = false
	if sm.onSave != nil {
		sm.onSave(sm.config.Get())
	}
}

// Helper methods

func (sm *SettingsModalV2) drawBox(x, y, w, h int, style tcell.Style) {
	// Top border
	sm.screen.SetContent(x, y, '╔', nil, style)
	for i := 1; i < w-1; i++ {
		sm.screen.SetContent(x+i, y, '═', nil, style)
	}
	sm.screen.SetContent(x+w-1, y, '╗', nil, style)

	// Side borders
	for i := 1; i < h-1; i++ {
		sm.screen.SetContent(x, y+i, '║', nil, style)
		sm.screen.SetContent(x+w-1, y+i, '║', nil, style)
	}

	// Bottom border
	sm.screen.SetContent(x, y+h-1, '╚', nil, style)
	for i := 1; i < w-1; i++ {
		sm.screen.SetContent(x+i, y+h-1, '═', nil, style)
	}
	sm.screen.SetContent(x+w-1, y+h-1, '╝', nil, style)
}

func (sm *SettingsModalV2) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		sm.screen.SetContent(x+i, y, r, nil, style)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}