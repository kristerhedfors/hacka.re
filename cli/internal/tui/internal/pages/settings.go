package pages

import (
	"fmt"
	"log"
	"reflect"
	"sort"
	"strconv"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/models"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
	"github.com/hacka-re/cli/internal/utils"
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

// SettingsModal provides a filterable settings interface
type SettingsModal struct {
	screen   tcell.Screen
	config   *core.ConfigManager
	state    *core.AppState  // For accessing callbacks
	fields   []*SettingsField
	menu     *components.FilterableMenu

	// Edit state
	editingField     bool
	editBuffer       string
	dropdownIndex    int
	editingItem      *SettingsMenuItem
	dropdownSelector *components.DropdownSelector

	// UI state
	modified        bool
	errorMessage    string
	confirmingExit  bool

	// Paste detection for terminal paste (Cmd+V on macOS)
	lastKeyTime     int64
	rapidKeyCount   int

	// Original state for restore
	originalValues map[string]interface{}

	// Callbacks
	OnSave   func(*core.Config) error
	OnCancel func()
}

// NewSettingsModal creates a new filterable settings modal
func NewSettingsModal(screen tcell.Screen, config *core.ConfigManager, state *core.AppState) *SettingsModal {
	sm := &SettingsModal{
		screen:         screen,
		config:         config,
		state:          state,
		originalValues: make(map[string]interface{}),
	}

	// Initialize fields
	sm.initializeFields()

	// Store original values for restore
	sm.storeOriginalValues()

	// Create filterable menu
	sm.menu = components.NewFilterableMenu(screen, "Settings Configuration")

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

// callGetModels uses reflection to call OnGetModels callback
// This avoids import cycle with pkg/tui
func (sm *SettingsModal) callGetModels(callbacks interface{}, provider string) []string {
	val := reflect.ValueOf(callbacks)
	if val.Kind() == reflect.Ptr && !val.IsNil() {
		val = val.Elem()
	}

	// Look for OnGetModels field
	field := val.FieldByName("OnGetModels")
	if field.IsValid() && field.Kind() == reflect.Func && !field.IsNil() {
		// Call the function
		results := field.Call([]reflect.Value{reflect.ValueOf(provider)})
		if len(results) == 2 {
			// Extract []string and error
			if !results[1].IsNil() {
				// Error occurred
				return nil
			}
			if results[0].Kind() == reflect.Slice {
				// Convert to []string
				models := results[0].Interface().([]string)
				if len(models) > 0 {
					return models
				}
			}
		}
	}
	return nil
}

// getModelOptions returns model options based on provider
func (sm *SettingsModal) getModelOptions(provider string) []string {
	// Try to get models from callback if available (for API refresh)
	if sm.state != nil {
		if callbacks := sm.state.GetCallbacks(); callbacks != nil {
			// Use reflection to call OnGetModels if available
			// This avoids import cycle with pkg/tui
			if apiModels := sm.callGetModels(callbacks, provider); apiModels != nil && len(apiModels) > 0 {
				// Get priority models for this provider
				priorityModels := sm.getPriorityModels(provider)
				prioritySet := make(map[string]bool)
				for _, pm := range priorityModels {
					prioritySet[pm] = true
				}

				// Separate priority and non-priority models
				var priorityList, regularList []string
				modelSet := make(map[string]bool)

				// Process API models
				for _, model := range apiModels {
					if !modelSet[model] {
						modelSet[model] = true
						if prioritySet[model] {
							// Add to priority list in the order defined
							priorityList = append(priorityList, model)
						} else {
							regularList = append(regularList, model)
						}
					}
				}

				// Add our known models that aren't already in the list
				if providerModels, ok := models.ModelsData[provider]; ok {
					for modelName := range providerModels {
						if !modelSet[modelName] {
							modelSet[modelName] = true
							if prioritySet[modelName] {
								priorityList = append(priorityList, modelName)
							} else {
								regularList = append(regularList, modelName)
							}
						}
					}
				}

				// Sort regular models alphabetically for consistency
				sort.Strings(regularList)

				// Build final result: priority models first (in defined order), then regular models (alphabetically)
				result := []string{}

				// Add priority models in the order they appear in getPriorityModels
				for _, pm := range priorityModels {
					for _, model := range priorityList {
						if model == pm {
							result = append(result, model)
							break
						}
					}
				}

				// Add remaining regular models
				result = append(result, regularList...)

				return result
			}
		}
	}

	// Use pre-populated models from models_data.go
	if providerModels, ok := models.ModelsData[provider]; ok {
		modelList := make([]string, 0, len(providerModels))
		for modelName := range providerModels {
			modelList = append(modelList, modelName)
		}

		// Sort the model list alphabetically first for stability
		sort.Strings(modelList)

		// Sort models to put common ones first (matching web app behavior)
		// Priority order for common models
		priorityModels := sm.getPriorityModels(provider)
		sortedList := []string{}

		// Add priority models first if they exist
		for _, pModel := range priorityModels {
			for i := 0; i < len(modelList); i++ {
				if modelList[i] == pModel {
					sortedList = append(sortedList, pModel)
					// Remove from modelList to avoid duplicates
					modelList = append(modelList[:i], modelList[i+1:]...)
					break
				}
			}
		}

		// Add remaining models (already sorted alphabetically)
		sortedList = append(sortedList, modelList...)

		return sortedList
	}

	// Fallback for unknown providers
	switch provider {
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

// getPriorityModels returns the priority models for each provider (matching web app)
func (sm *SettingsModal) getPriorityModels(provider string) []string {
	switch provider {
	case "openai":
		return []string{
			"gpt-5-nano",
			"gpt-5-mini",
			"gpt-5",
			"gpt-4.1-nano",
			"gpt-4.1-mini",
			"gpt-4.1",
			"gpt-4o",
			"gpt-4o-mini",
			"gpt-4-turbo",
			"gpt-4",
			"gpt-3.5-turbo",
			"o1",
			"o1-mini",
			"o3",
			"o3-mini",
		}
	case "anthropic":
		return []string{
			"claude-3-5-sonnet-20241022",
			"claude-3-5-haiku-20241022",
			"claude-3-opus-20240229",
			"claude-3-sonnet-20240229",
			"claude-3-haiku-20240307",
			"claude-opus-4-1",
			"claude-opus-4",
			"claude-sonnet-4",
			"claude-2.1",
			"claude-2.0",
			"claude-instant-1.2",
		}
	case "groq":
		return []string{
			"llama-3.3-70b-versatile",
			"llama-3.3-70b-specdec",
			"llama-3.3-8b-specdec",
			"llama-3.2-90b-vision-preview",
			"llama-3.2-11b-vision-preview",
			"llama-3.2-3b-preview",
			"llama-3.2-1b-preview",
			"llama-3.1-405b-reasoning",
			"llama-3.1-70b-versatile",
			"llama-3.1-8b-instant",
			"mixtral-8x7b-32768",
		}
	case "mistral":
		return []string{
			"mistral-large-latest",
			"mistral-large-2411",
			"mistral-medium-2505",
			"mistral-small-2503",
			"codestral-2501",
			"mistral-nemo",
			"ministral-8b-2410",
			"ministral-3b-2410",
			"open-mistral-7b",
		}
	case "deepseek":
		return []string{
			"deepseek-r1",
			"deepseek-reasoner",
			"deepseek-chat",
			"deepseek-coder",
			"deepseek-r1-distill-llama-70b",
			"deepseek-r1-distill-qwen-14b",
		}
	default:
		return []string{}
	}
}

// refreshModels attempts to refresh the model list from the API
func (sm *SettingsModal) refreshModels() {
	// Get the current provider
	var currentProvider string
	for _, field := range sm.fields {
		if field.Key == "provider" {
			currentProvider = field.Value.(string)
			break
		}
	}

	// Find and update the model field
	for _, field := range sm.fields {
		if field.Key == "model" {
			// Clear any cached API models to force refresh
			// The next call to getModelOptions will try to fetch from API
			field.Options = sm.getModelOptions(currentProvider)

			// Update menu to show refreshed models
			sm.updateMenuItems()
			sm.errorMessage = "Models refreshed"
			break
		}
	}
}

// Draw renders the settings modal
func (sm *SettingsModal) Draw() {
	if sm.confirmingExit {
		// Draw the confirmation modal
		sm.drawConfirmationModal()
	} else if sm.dropdownSelector != nil {
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

// drawConfirmationModal shows a yes/no confirmation modal
func (sm *SettingsModal) drawConfirmationModal() {
	w, h := sm.screen.Size()

	// Calculate modal dimensions
	modalWidth := 50
	modalHeight := 8
	x := (w - modalWidth) / 2
	y := (h - modalHeight) / 2

	// Draw modal background
	style := tcell.StyleDefault.Background(tcell.ColorDarkRed)
	for i := 0; i < modalHeight; i++ {
		for j := 0; j < modalWidth; j++ {
			sm.screen.SetContent(x+j, y+i, ' ', nil, style)
		}
	}

	// Draw border
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	sm.drawBox(x, y, modalWidth, modalHeight, borderStyle)

	// Draw title
	title := " Save Changes? "
	titleX := x + (modalWidth-len(title))/2
	sm.drawText(titleX, y, title, borderStyle)

	// Draw message
	msg := "You have unsaved changes."
	msgX := x + (modalWidth-len(msg))/2
	sm.drawText(msgX, y+2, msg, tcell.StyleDefault.Foreground(tcell.ColorWhite))

	msg2 := "Save before exiting?"
	msg2X := x + (modalWidth-len(msg2))/2
	sm.drawText(msg2X, y+3, msg2, tcell.StyleDefault.Foreground(tcell.ColorWhite))

	// Draw options
	optionsY := y + 5
	optionsText := "[Y]es    [N]o    [C]ancel"
	optionsX := x + (modalWidth-len(optionsText))/2
	sm.drawText(optionsX, optionsY, optionsText, tcell.StyleDefault.Foreground(tcell.ColorGreen))
}

// drawEditOverlay shows the editing interface
func (sm *SettingsModal) drawEditOverlay() {
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
		// Add paste hint for password fields
		if field.Type == FieldTypePassword {
			hint = "Type or ^V to paste (clear & replace), Enter to confirm"
		}
		hintX := x + (overlayWidth-len(hint))/2
		sm.drawText(hintX, valueY+2, hint, tcell.StyleDefault.Foreground(tcell.ColorGray))
	}

	// Draw cancel instruction
	cancel := "ESC to cancel"
	cancelX := x + (overlayWidth-len(cancel))/2
	sm.drawText(cancelX, y+overlayHeight-2, cancel, tcell.StyleDefault.Foreground(tcell.ColorRed))
}

// drawBottomInstructions adds save/cancel hints
func (sm *SettingsModal) drawBottomInstructions() {
	x, y, w, h := sm.menu.GetX(), sm.menu.GetY(), sm.menu.GetWidth(), sm.menu.GetHeight()

	// Check if model field is selected
	instructions := " Changes auto-save | Ctrl-R:Restore | ESC:Close "
	if selected := sm.menu.GetSelectedItem(); selected != nil {
		if menuItem, ok := selected.(*SettingsMenuItem); ok && menuItem.field.Key == "model" {
			instructions = " Changes auto-save | Ctrl-R:Refresh Models | ESC:Close "
		}
	}

	instX := x + (w-len(instructions))/2
	instY := y + h

	style := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	if sm.modified {
		style = style.Bold(true)
	}

	sm.drawText(instX, instY, instructions, style)
}

// drawModifiedIndicator shows that settings have been changed
func (sm *SettingsModal) drawModifiedIndicator() {
	x, y, w, _ := sm.menu.GetX(), sm.menu.GetY(), sm.menu.GetWidth(), sm.menu.GetHeight()

	indicator := " * Modified * "
	indX := x + w - len(indicator) - 1
	indY := y

	style := tcell.StyleDefault.Foreground(tcell.ColorYellow).Bold(true)
	sm.drawText(indX, indY, indicator, style)
}

// drawError displays error message
func (sm *SettingsModal) drawError() {
	x, y, w, h := sm.menu.GetX(), sm.menu.GetY(), sm.menu.GetWidth(), sm.menu.GetHeight()

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
func (sm *SettingsModal) HandleInput(ev *tcell.EventKey) bool {
	// Handle confirmation modal if active
	if sm.confirmingExit {
		switch ev.Key() {
		case tcell.KeyRune:
			switch ev.Rune() {
			case 'y', 'Y':
				// Save and exit
				sm.save()
				if sm.OnCancel != nil {
					sm.OnCancel()
				}
				return true
			case 'n', 'N':
				// Exit without saving
				sm.restoreOriginalValues()
				if sm.OnCancel != nil {
					sm.OnCancel()
				}
				return true
			case 'c', 'C':
				// Cancel exit
				sm.confirmingExit = false
				return false
			}
		case tcell.KeyEscape:
			// Cancel exit
			sm.confirmingExit = false
			return false
		}
		return false
	}

	// Handle dropdown selector if active
	if sm.dropdownSelector != nil {
		// Check for refresh shortcut specifically for model dropdown
		if ev.Key() == tcell.KeyCtrlR && sm.editingItem != nil && sm.editingItem.field.Key == "model" {
			// Close current dropdown
			sm.dropdownSelector = nil
			sm.editingField = false

			// Refresh models
			sm.refreshModels()

			// Reopen dropdown with refreshed models
			sm.startEditing(sm.editingItem)
			return false
		}

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

	// Check for model refresh shortcut when model field is selected
	if ev.Key() == tcell.KeyCtrlR {
		// Check if current selection is model field
		if selected := sm.menu.GetSelectedItem(); selected != nil {
			if menuItem, ok := selected.(*SettingsMenuItem); ok && menuItem.field.Key == "model" {
				sm.refreshModels()
				return false
			}
		}
		// Otherwise restore original values (old behavior)
		sm.restoreOriginalValues()
		return false
	}

	// Let the menu handle navigation and filtering
	item, exit := sm.menu.HandleInput(ev)

	if exit {
		// Show confirmation modal if modified
		if sm.modified {
			sm.confirmingExit = true
			return false
		}
		// Exit directly if no changes
		if sm.OnCancel != nil {
			sm.OnCancel()
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
func (sm *SettingsModal) handleEditingInput(ev *tcell.EventKey) bool {
	field := sm.editingItem.field

	switch ev.Key() {
	case tcell.KeyEscape:
		sm.cancelEditing()
		return false

	case tcell.KeyEnter:
		sm.confirmEditing()
		return false

	case tcell.KeyCtrlV:
		// Paste from clipboard (especially useful for API keys)
		if field.Type == FieldTypePassword || field.Type == FieldTypeString || field.Type == FieldTypeText {
			if content, err := utils.GetClipboardContent(); err == nil && content != "" {
				// Complete overwrite - replace entire buffer
				sm.editBuffer = strings.TrimSpace(content)

				// Log the paste action
				log.Printf("[DEBUG] Pasted content to %s field (length: %d)", field.Key, len(sm.editBuffer))

				// Auto-detect provider if this is the API key field
				if field.Key == "api_key" {
					log.Printf("[DEBUG] Attempting provider detection for API key")
					if detection := utils.DetectProvider(sm.editBuffer); detection != nil {
						log.Printf("[DEBUG] Provider detected: %s", detection.ProviderName)

						// Update provider field
						for _, f := range sm.fields {
							if f.Key == "provider" {
								f.Value = detection.Provider
								// Update model options for new provider
								sm.updateModelOptionsForProvider(detection.Provider)
								// Set default model
								for _, mf := range sm.fields {
									if mf.Key == "model" {
										mf.Value = detection.DefaultModel
										break
									}
								}
								// Set base URL
								for _, uf := range sm.fields {
									if uf.Key == "base_url" {
										uf.Value = detection.BaseURL
										break
									}
								}
								sm.errorMessage = "Provider auto-detected: " + detection.ProviderName
								sm.modified = true
								break
							}
						}
					} else {
						log.Printf("[DEBUG] No provider detected for API key")
					}
				}
			} else {
				if err != nil {
					log.Printf("[ERROR] Failed to get clipboard: %v", err)
					sm.errorMessage = "Failed to paste from clipboard"
				}
			}
		}

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
func (sm *SettingsModal) startEditing(item *SettingsMenuItem) {
	sm.editingField = true
	sm.editingItem = item
	sm.errorMessage = ""

	field := item.field

	switch field.Type {
	case FieldTypeDropdown:
		// Create a dropdown selector for this field
		currentValue := fmt.Sprintf("%v", field.Value)
		sm.dropdownSelector = components.NewDropdownSelector(
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
func (sm *SettingsModal) storeOriginalValues() {
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
func (sm *SettingsModal) restoreOriginalValues() {
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
func (sm *SettingsModal) updateModelOptionsForProvider(provider string) {
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
func (sm *SettingsModal) confirmEditing() {
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

		// Auto-detect provider if this is the API key field and user typed it
		if field.Key == "api_key" && field.Type == FieldTypePassword {
			if detection := utils.DetectProvider(sm.editBuffer); detection != nil {
				// Update provider field
				for _, f := range sm.fields {
					if f.Key == "provider" {
						f.Value = detection.Provider
						// Update model options for new provider
						sm.updateModelOptionsForProvider(detection.Provider)
						// Set default model
						for _, mf := range sm.fields {
							if mf.Key == "model" {
								mf.Value = detection.DefaultModel
								break
							}
						}
						// Set base URL
						for _, uf := range sm.fields {
							if uf.Key == "base_url" {
								uf.Value = detection.BaseURL
								break
							}
						}
						sm.errorMessage = "Provider auto-detected: " + detection.ProviderName
						break
					}
				}
			}
		}
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
func (sm *SettingsModal) cancelEditing() {
	sm.editingField = false
	sm.editingItem = nil
	sm.editBuffer = ""
	sm.errorMessage = ""
}

// updateMenuItems refreshes menu items with current values
func (sm *SettingsModal) updateMenuItems() {
	// Clear and re-add items with updated values
	sm.menu.Clear()

	for i, field := range sm.fields {
		sm.menu.AddItem(&SettingsMenuItem{
			field:  field,
			number: i,
			config: sm.config.Get(),
		})
	}
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
	if sm.OnSave != nil {
		sm.OnSave(sm.config.Get())
	}
}

// Helper methods

func (sm *SettingsModal) drawBox(x, y, w, h int, style tcell.Style) {
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

func (sm *SettingsModal) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		sm.screen.SetContent(x+i, y, r, nil, style)
	}
}

// HandleMouse processes mouse events for the settings modal
func (sm *SettingsModal) HandleMouse(event *core.MouseEvent) bool {
	// If dropdown selector is active, handle its mouse events
	if sm.dropdownSelector != nil {
		value, done := sm.dropdownSelector.HandleMouse(event)
		if done && value != "" {
			// Handle dropdown selection
			if sm.editingItem != nil && sm.editingItem.field != nil {
				// Update the field value
				sm.editingItem.field.Value = value
				// Save config (which will update all fields)
				sm.save()
			}
			// Close dropdown
			sm.dropdownSelector = nil
			sm.editingField = false
			sm.editingItem = nil
			sm.updateMenuItems()
			return true
		} else if done {
			// Cancelled
			sm.dropdownSelector = nil
			sm.editingField = false
			sm.editingItem = nil
			return true
		}
		return true // Dropdown is consuming events
	}

	// If we're editing a field, handle mouse events specially
	if sm.editingField {
		// Check for clicks outside the edit area to cancel editing
		if event.Type == core.MouseEventClick {
			// For now, any click cancels editing
			sm.editingField = false
			sm.editingItem = nil
			return true
		}
	}

	// Forward mouse events to the menu
	if sm.menu != nil {
		// Check if menu item was clicked to trigger editing
		if event.Type == core.MouseEventClick {
			selectedItem := sm.menu.GetSelectedItem()
			if selectedItem != nil {
				// Let menu handle the click first
				if sm.menu.HandleMouse(event) {
					// If it's a settings menu item, start editing
					if settingsItem, ok := selectedItem.(*SettingsMenuItem); ok {
						sm.startEditing(settingsItem)
					}
					return true
				}
			}
		} else {
			// For non-click events, just forward to menu
			return sm.menu.HandleMouse(event)
		}
	}

	return false
}