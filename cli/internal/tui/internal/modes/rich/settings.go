package rich

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// FieldType represents the type of settings field
type FieldType int

const (
	FieldTypeString FieldType = iota
	FieldTypePassword
	FieldTypeDropdown
	FieldTypeNumber
	FieldTypeFloat
	FieldTypeBool
	FieldTypeText // Multi-line text
)

// SettingsField represents a single settings field
type SettingsField struct {
	Label       string
	Key         string
	Type        FieldType
	Value       interface{}
	Options     []string // For dropdown
	Description string
	Validator   func(interface{}) error
	Min, Max    float64 // For number fields
}

// SettingsModal provides a settings configuration interface
type SettingsModal struct {
	screen   tcell.Screen
	config   *core.ConfigManager
	fields   []*SettingsField

	// UI state
	selectedField int
	editingField  bool
	editBuffer    string
	dropdownIndex int

	// Layout
	x, y          int
	width, height int

	// Styles
	normalStyle    tcell.Style
	selectedStyle  tcell.Style
	editingStyle   tcell.Style
	labelStyle     tcell.Style
	valueStyle     tcell.Style
	errorStyle     tcell.Style
	borderStyle    tcell.Style

	// Callbacks
	onSave   func(*core.Config) error
	onCancel func()

	errorMessage string
	modified     bool
}

// NewSettingsModal creates a new settings modal
func NewSettingsModal(screen tcell.Screen, config *core.ConfigManager) *SettingsModal {
	sm := &SettingsModal{
		screen:        screen,
		config:        config,
		selectedField: 0,
		editingField:  false,
		width:         70,
		height:        24,

		// Default styles
		normalStyle:   tcell.StyleDefault.Foreground(tcell.ColorWhite),
		selectedStyle: tcell.StyleDefault.Background(tcell.ColorBlue).Foreground(tcell.ColorWhite),
		editingStyle:  tcell.StyleDefault.Background(tcell.ColorGreen).Foreground(tcell.ColorBlack),
		labelStyle:    tcell.StyleDefault.Foreground(tcell.ColorYellow),
		valueStyle:    tcell.StyleDefault.Foreground(tcell.ColorTeal),
		errorStyle:    tcell.StyleDefault.Foreground(tcell.ColorRed),
		borderStyle:   tcell.StyleDefault.Foreground(tcell.ColorGreen),
	}

	// Center the modal
	w, h := screen.Size()
	sm.x = (w - sm.width) / 2
	sm.y = (h - sm.height) / 2

	// Initialize fields
	sm.initializeFields()

	return sm
}

// initializeFields sets up the settings fields
func (sm *SettingsModal) initializeFields() {
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
			Validator: func(v interface{}) error {
				key := v.(string)
				provider := sm.getFieldValue("provider").(string)
				if provider != "ollama" && key == "" {
					return fmt.Errorf("API key required for %s", provider)
				}
				return nil
			},
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
			Validator: func(v interface{}) error {
				temp := v.(float64)
				if temp < 0 || temp > 2 {
					return fmt.Errorf("temperature must be between 0 and 2")
				}
				return nil
			},
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
			Description: "Enable streaming responses",
		},
		{
			Label:       "YOLO Mode",
			Key:         "yolo_mode",
			Type:        FieldTypeBool,
			Value:       cfg.YoloMode,
			Description: "Auto-execute functions without confirmation",
		},
		{
			Label:       "Voice Control",
			Key:         "voice_control",
			Type:        FieldTypeBool,
			Value:       cfg.VoiceControl,
			Description: "Enable voice input/output",
		},
		{
			Label:       "System Prompt",
			Key:         "system_prompt",
			Type:        FieldTypeText,
			Value:       cfg.SystemPrompt,
			Description: "Initial system message to set AI behavior",
		},
		{
			Label:       "Theme",
			Key:         "theme",
			Type:        FieldTypeDropdown,
			Value:       cfg.Theme,
			Options:     []string{"dark", "light", "auto"},
			Description: "UI color theme",
		},
		{
			Label:       "Namespace",
			Key:         "namespace",
			Type:        FieldTypeString,
			Value:       cfg.Namespace,
			Description: "Storage namespace for isolation",
		},
	}
}

// getModelOptions returns model options based on provider
func (sm *SettingsModal) getModelOptions(provider string) []string {
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
func (sm *SettingsModal) Draw() {
	// Draw border
	sm.drawBorder()

	// Draw title
	title := " Settings Configuration "
	if sm.modified {
		title = " Settings Configuration (Modified) "
	}
	x := sm.x + (sm.width-len(title))/2
	sm.drawText(x, sm.y, title, sm.borderStyle)

	// Draw fields
	sm.drawFields()

	// Draw error message if any
	if sm.errorMessage != "" {
		sm.drawError()
	}

	// Draw instructions
	sm.drawInstructions()
}

// drawBorder draws the modal border
func (sm *SettingsModal) drawBorder() {
	// Top border
	sm.screen.SetContent(sm.x, sm.y, '╔', nil, sm.borderStyle)
	for i := 1; i < sm.width-1; i++ {
		sm.screen.SetContent(sm.x+i, sm.y, '═', nil, sm.borderStyle)
	}
	sm.screen.SetContent(sm.x+sm.width-1, sm.y, '╗', nil, sm.borderStyle)

	// Side borders
	for i := 1; i < sm.height-1; i++ {
		sm.screen.SetContent(sm.x, sm.y+i, '║', nil, sm.borderStyle)
		sm.screen.SetContent(sm.x+sm.width-1, sm.y+i, '║', nil, sm.borderStyle)
	}

	// Bottom border
	sm.screen.SetContent(sm.x, sm.y+sm.height-1, '╚', nil, sm.borderStyle)
	for i := 1; i < sm.width-1; i++ {
		sm.screen.SetContent(sm.x+i, sm.y+sm.height-1, '═', nil, sm.borderStyle)
	}
	sm.screen.SetContent(sm.x+sm.width-1, sm.y+sm.height-1, '╝', nil, sm.borderStyle)
}

// drawFields renders all settings fields
func (sm *SettingsModal) drawFields() {
	startY := sm.y + 2
	maxVisible := sm.height - 6 // Account for borders and instructions

	// Calculate scroll position
	scrollStart := 0
	if sm.selectedField >= maxVisible {
		scrollStart = sm.selectedField - maxVisible + 1
	}

	// Draw visible fields
	for i := 0; i < maxVisible && i+scrollStart < len(sm.fields); i++ {
		field := sm.fields[i+scrollStart]
		y := startY + i

		// Determine if this field is selected/editing
		isSelected := i+scrollStart == sm.selectedField
		isEditing := isSelected && sm.editingField

		// Draw field
		sm.drawField(field, y, isSelected, isEditing)
	}

	// Draw scroll indicators
	if scrollStart > 0 {
		sm.drawText(sm.x+sm.width-3, startY, "↑", sm.borderStyle)
	}
	if scrollStart+maxVisible < len(sm.fields) {
		sm.drawText(sm.x+sm.width-3, startY+maxVisible-1, "↓", sm.borderStyle)
	}
}

// drawField renders a single field
func (sm *SettingsModal) drawField(field *SettingsField, y int, isSelected, isEditing bool) {
	labelWidth := 20
	valueWidth := sm.width - labelWidth - 6

	// Draw label
	label := field.Label + ":"
	if len(label) > labelWidth {
		label = label[:labelWidth-1] + "…"
	}
	labelStyle := sm.labelStyle
	if isSelected {
		labelStyle = sm.selectedStyle
	}
	sm.drawText(sm.x+2, y, fmt.Sprintf("%-*s", labelWidth, label), labelStyle)

	// Draw value
	valueX := sm.x + 2 + labelWidth + 1
	valueStr := sm.getFieldDisplayValue(field, isEditing)

	// Determine value style
	valueStyle := sm.valueStyle
	if isEditing {
		valueStyle = sm.editingStyle
	} else if isSelected {
		valueStyle = sm.selectedStyle
	}

	// Clear value area first if selected/editing
	if isSelected || isEditing {
		for i := 0; i < valueWidth; i++ {
			sm.screen.SetContent(valueX+i, y, ' ', nil, valueStyle)
		}
	}

	// Truncate value if too long
	if len(valueStr) > valueWidth {
		valueStr = valueStr[:valueWidth-1] + "…"
	}

	sm.drawText(valueX, y, valueStr, valueStyle)

	// Draw cursor if editing
	if isEditing && field.Type != FieldTypeDropdown && field.Type != FieldTypeBool {
		cursorX := valueX + len(valueStr)
		if cursorX < valueX+valueWidth {
			sm.screen.SetContent(cursorX, y, '_', nil, valueStyle.Blink(true))
		}
	}
}

// getFieldDisplayValue returns the display string for a field value
func (sm *SettingsModal) getFieldDisplayValue(field *SettingsField, isEditing bool) string {
	if isEditing && field.Type != FieldTypeDropdown && field.Type != FieldTypeBool {
		return sm.editBuffer
	}

	switch field.Type {
	case FieldTypePassword:
		if val, ok := field.Value.(string); ok && val != "" {
			if isEditing {
				return sm.editBuffer
			}
			// Show first 4 and last 4 characters
			if len(val) > 8 {
				return val[:4] + "..." + val[len(val)-4:]
			}
			return strings.Repeat("*", len(val))
		}
		return "(not set)"

	case FieldTypeDropdown:
		if isEditing {
			options := field.Options
			if sm.dropdownIndex < len(options) {
				return fmt.Sprintf("< %s >", options[sm.dropdownIndex])
			}
		}
		return fmt.Sprintf("%v", field.Value)

	case FieldTypeBool:
		if val, ok := field.Value.(bool); ok {
			if val {
				return "[✓] Enabled"
			}
			return "[ ] Disabled"
		}
		return "[ ] Disabled"

	case FieldTypeFloat:
		if val, ok := field.Value.(float64); ok {
			return fmt.Sprintf("%.2f", val)
		}
		return "0.00"

	case FieldTypeNumber:
		return fmt.Sprintf("%v", field.Value)

	case FieldTypeText:
		if val, ok := field.Value.(string); ok {
			if val == "" {
				return "(empty)"
			}
			// Show first line only
			lines := strings.Split(val, "\n")
			if len(lines) > 1 {
				return lines[0] + "..."
			}
			return val
		}
		return "(empty)"

	default:
		return fmt.Sprintf("%v", field.Value)
	}
}

// drawError displays error message
func (sm *SettingsModal) drawError() {
	y := sm.y + sm.height - 4
	msg := sm.errorMessage
	if len(msg) > sm.width-4 {
		msg = msg[:sm.width-7] + "..."
	}

	// Clear line
	for i := 1; i < sm.width-1; i++ {
		sm.screen.SetContent(sm.x+i, y, ' ', nil, sm.errorStyle)
	}

	x := sm.x + (sm.width-len(msg))/2
	sm.drawText(x, y, msg, sm.errorStyle)
}

// drawInstructions draws help text at the bottom
func (sm *SettingsModal) drawInstructions() {
	y := sm.y + sm.height - 2

	var instructions string
	if sm.editingField {
		field := sm.fields[sm.selectedField]
		switch field.Type {
		case FieldTypeDropdown:
			instructions = " ←→:Select | Enter:Confirm | ESC:Cancel "
		case FieldTypeBool:
			instructions = " Space:Toggle | Enter:Confirm | ESC:Cancel "
		default:
			instructions = " Type value | Enter:Confirm | ESC:Cancel "
		}
	} else {
		instructions = " ↑↓:Navigate | Enter:Edit | S:Save | ESC:Cancel "
	}

	x := sm.x + (sm.width-len(instructions))/2
	sm.drawText(x, y, instructions, sm.normalStyle)
}

// HandleInput processes keyboard input
func (sm *SettingsModal) HandleInput(ev *tcell.EventKey) bool {
	if sm.editingField {
		return sm.handleEditingInput(ev)
	}

	return sm.handleNavigationInput(ev)
}

// handleNavigationInput handles input when not editing
func (sm *SettingsModal) handleNavigationInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEscape:
		if sm.modified {
			// TODO: Show confirmation dialog
		}
		if sm.onCancel != nil {
			sm.onCancel()
		}
		return true

	case tcell.KeyUp:
		if sm.selectedField > 0 {
			sm.selectedField--
		}

	case tcell.KeyDown:
		if sm.selectedField < len(sm.fields)-1 {
			sm.selectedField++
		}

	case tcell.KeyEnter:
		sm.startEditing()

	case tcell.KeyRune:
		switch ev.Rune() {
		case 's', 'S':
			sm.save()
			return true
		}
	}

	return false
}

// handleEditingInput handles input when editing a field
func (sm *SettingsModal) handleEditingInput(ev *tcell.EventKey) bool {
	field := sm.fields[sm.selectedField]

	switch ev.Key() {
	case tcell.KeyEscape:
		sm.cancelEditing()
		return false

	case tcell.KeyEnter:
		sm.confirmEditing()
		return false

	case tcell.KeyLeft:
		if field.Type == FieldTypeDropdown {
			if sm.dropdownIndex > 0 {
				sm.dropdownIndex--
			}
		}

	case tcell.KeyRight:
		if field.Type == FieldTypeDropdown {
			if sm.dropdownIndex < len(field.Options)-1 {
				sm.dropdownIndex++
			}
		}

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if field.Type != FieldTypeDropdown && field.Type != FieldTypeBool {
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
		} else if field.Type != FieldTypeDropdown {
			sm.editBuffer += string(ev.Rune())
		}
	}

	return false
}

// startEditing begins editing a field
func (sm *SettingsModal) startEditing() {
	field := sm.fields[sm.selectedField]
	sm.editingField = true
	sm.errorMessage = ""

	switch field.Type {
	case FieldTypeDropdown:
		// Find current value in options
		for i, opt := range field.Options {
			if opt == field.Value {
				sm.dropdownIndex = i
				break
			}
		}

	case FieldTypeBool:
		// Nothing to prepare

	default:
		// Initialize edit buffer with current value
		sm.editBuffer = fmt.Sprintf("%v", field.Value)
		if field.Type == FieldTypePassword && field.Value.(string) != "" {
			// Don't show actual password in edit buffer
			sm.editBuffer = field.Value.(string)
		}
	}
}

// confirmEditing saves the edited value
func (sm *SettingsModal) confirmEditing() {
	field := sm.fields[sm.selectedField]

	// Parse and validate new value
	var newValue interface{}
	var err error

	switch field.Type {
	case FieldTypeDropdown:
		newValue = field.Options[sm.dropdownIndex]

	case FieldTypeBool:
		// Already updated during editing
		sm.editingField = false
		return

	case FieldTypeFloat:
		newValue, err = strconv.ParseFloat(sm.editBuffer, 64)

	case FieldTypeNumber:
		newValue, err = strconv.Atoi(sm.editBuffer)

	default:
		newValue = sm.editBuffer
	}

	if err != nil {
		sm.errorMessage = fmt.Sprintf("Invalid value: %v", err)
		return
	}

	// Run validator if present
	if field.Validator != nil {
		if err := field.Validator(newValue); err != nil {
			sm.errorMessage = err.Error()
			return
		}
	}

	// Update value
	field.Value = newValue
	sm.modified = true
	sm.editingField = false

	// Special handling for provider change
	if field.Key == "provider" {
		// Update model options
		modelField := sm.getField("model")
		if modelField != nil {
			modelField.Options = sm.getModelOptions(newValue.(string))
			// Reset to first option if current model not in new list
			found := false
			for _, opt := range modelField.Options {
				if opt == modelField.Value.(string) {
					found = true
					break
				}
			}
			if !found && len(modelField.Options) > 0 {
				modelField.Value = modelField.Options[0]
			}
		}
	}
}

// cancelEditing cancels the current edit
func (sm *SettingsModal) cancelEditing() {
	sm.editingField = false
	sm.editBuffer = ""
	sm.errorMessage = ""
}

// save saves all settings
func (sm *SettingsModal) save() {
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

// getField returns a field by key
func (sm *SettingsModal) getField(key string) *SettingsField {
	for _, field := range sm.fields {
		if field.Key == key {
			return field
		}
	}
	return nil
}

// getFieldValue returns a field's value by key
func (sm *SettingsModal) getFieldValue(key string) interface{} {
	if field := sm.getField(key); field != nil {
		return field.Value
	}
	return nil
}

// drawText draws text at the given position
func (sm *SettingsModal) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		sm.screen.SetContent(x+i, y, r, nil, style)
	}
}