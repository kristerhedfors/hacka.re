package pages

import (
	"fmt"
	"strings"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/models"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// SettingsModal provides a streamlined settings interface matching the web app
type SettingsModal struct {
	screen   tcell.Screen
	config   *core.ConfigManager
	state    *core.AppState
	eventBus *core.EventBus

	// UI state
	selectedIndex    int
	items            []SettingsItem
	editingField     bool
	editBuffer       string
	dropdownSelector *components.DropdownSelector
	modelSelector    *components.ModelSelector
	isLoadingModels  bool
	errorMessage     string

	// Original values for restore
	originalConfig   *core.Config

	// Model registry for accessing model metadata
	modelRegistry    *models.ModelRegistry

	// Callbacks
	OnSave         func(*core.Config) error
	OnCancel       func()
	OnOpenPrompts  func()
	OnOpenNamespaceManager func()
}

// SettingsItem represents a single settings item
type SettingsItem struct {
	Type        SettingsItemType
	Label       string
	Key         string
	Value       interface{}
	Options     []string // For dropdowns
	StatusText  string   // Gray status text shown to the right
	Handler     func() error // For action items like links
}

type SettingsItemType int

const (
	ItemTypeDropdown SettingsItemType = iota
	ItemTypePassword
	ItemTypeCheckbox
	ItemTypeLink
	ItemTypeAction
)

// NewSettingsModal creates a new streamlined settings modal
func NewSettingsModal(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *SettingsModal {
	sm := &SettingsModal{
		screen:       screen,
		config:       config,
		state:        state,
		eventBus:     eventBus,
		modelRegistry: models.NewModelRegistry(),
	}

	// Save original config for restore
	cfg := config.Get()
	sm.originalConfig = &core.Config{
		Provider: cfg.Provider,
		APIKey: cfg.APIKey,
		Model: cfg.Model,
		YoloMode: cfg.YoloMode,
		VoiceControl: cfg.VoiceControl,
	}

	sm.initializeItems()
	return sm
}

// initializeItems creates the settings items in the correct order
func (sm *SettingsModal) initializeItems() {
	cfg := sm.config.Get()

	sm.items = []SettingsItem{
		// API Provider dropdown
		{
			Type:    ItemTypeDropdown,
			Label:   "API Provider",
			Key:     "provider",
			Value:   cfg.Provider,
			Options: sm.getProviderOptions(),
		},
		// API Key field with auto-detection
		{
			Type:       ItemTypePassword,
			Label:      "API Key",
			Key:        "api_key",
			Value:      cfg.APIKey,
			StatusText: sm.getAPIKeyStatus(cfg.APIKey),
		},
		// Model dropdown with refresh
		{
			Type:       ItemTypeDropdown,
			Label:      "Model",
			Key:        "model",
			Value:      cfg.Model,
			Options:    sm.getModelOptions(cfg.Provider),
			StatusText: "[R] to refresh",
		},
		// System Prompts link
		{
			Type:    ItemTypeLink,
			Label:   "System Prompt",
			Key:     "system_prompt",
			Value:   "Open System Prompt Menu →",
			Handler: sm.openSystemPrompts,
		},
		// YOLO Mode checkbox
		{
			Type:       ItemTypeCheckbox,
			Label:      "YOLO mode",
			Key:        "yolo_mode",
			Value:      cfg.YoloMode,
			StatusText: sm.getYoloModeStatus(cfg.YoloMode),
		},
		// Voice Control checkbox
		{
			Type:       ItemTypeCheckbox,
			Label:      "Microphone / Voice Control",
			Key:        "voice_control",
			Value:      cfg.VoiceControl,
			StatusText: sm.getVoiceControlStatus(cfg.VoiceControl, cfg.Provider),
		},
		// Delete namespace action
		{
			Type:    ItemTypeAction,
			Label:   "Delete current namespace and settings",
			Key:     "delete_namespace",
			Handler: sm.deleteNamespace,
		},
	}
}

// getProviderOptions returns the list of available providers
func (sm *SettingsModal) getProviderOptions() []string {
	return []string{
		"openai",
		"berget",
		"groq",
		"ollama",
		"llamafile",
		"gpt4all",
		"lmstudio",
		"localai",
		"custom",
	}
}

// getModelOptions returns available models for a provider
func (sm *SettingsModal) getModelOptions(provider string) []string {
	// Map provider string to ModelProvider type
	var modelProvider models.ModelProvider
	switch provider {
	case "openai":
		modelProvider = models.ProviderOpenAI
	case "groq":
		modelProvider = models.ProviderGroq
	case "berget":
		modelProvider = models.ProviderBerget
	case "ollama":
		modelProvider = models.ProviderOllama
	case "llamafile":
		modelProvider = models.ProviderLlamafile
	case "gpt4all":
		modelProvider = models.ProviderGPT4All
	case "lmstudio":
		modelProvider = models.ProviderLMStudio
	case "localai":
		modelProvider = models.ProviderLocalAI
	default:
		// For custom or unknown providers, return a default set
		return []string{"gpt-3.5-turbo"}
	}

	// Get all models for the provider from the registry
	providerModels := sm.modelRegistry.GetProviderModels(modelProvider)

	// Build list of model IDs, prioritizing default models and production/preview categories
	var modelIDs []string
	var defaultModel string
	var productionModels []string
	var previewModels []string

	for _, model := range providerModels {
		// Skip system and legacy models for the dropdown
		if model.Category == "system" || model.Category == "legacy" {
			continue
		}

		if model.IsDefault {
			defaultModel = model.ID
		} else if model.Category == "production" {
			productionModels = append(productionModels, model.ID)
		} else if model.Category == "preview" {
			previewModels = append(previewModels, model.ID)
		}
	}

	// Build final list with default first, then production, then preview
	if defaultModel != "" {
		modelIDs = append(modelIDs, defaultModel)
	}
	modelIDs = append(modelIDs, productionModels...)
	modelIDs = append(modelIDs, previewModels...)

	// If no models found, return provider-specific defaults matching the web app
	if len(modelIDs) == 0 {
		switch provider {
		case "openai":
			return []string{"gpt-5-nano", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"}
		case "groq":
			return []string{"moonshotai/kimi-k2-instruct", "llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"}
		case "berget":
			return []string{"mistralai/Magistral-Small-2506", "llama-3.3-70b", "gpt-5-nano", "claude-3-opus-20240229"}
		case "ollama":
			return []string{"llama3.2", "llama3.1", "llama3", "mistral"}
		default:
			return []string{"gpt-3.5-turbo"}
		}
	}

	return modelIDs
}

// Status text generators
func (sm *SettingsModal) getAPIKeyStatus(apiKey string) string {
	if apiKey == "" {
		return "(No API key set)"
	}

	// Simple API key detection based on prefix
	if strings.HasPrefix(apiKey, "sk-") {
		return "(Detected: OpenAI)"
	} else if strings.HasPrefix(apiKey, "sk-ant-") {
		return "(Detected: Anthropic)"
	} else if strings.HasPrefix(apiKey, "gsk_") {
		return "(Detected: Groq)"
	}

	return "(Key configured)"
}

func (sm *SettingsModal) getYoloModeStatus(enabled bool) string {
	if enabled {
		return "(Enabled: User is NOT prompted for every function call!)"
	}
	return "(Disabled: Prompt user for every function call)"
}

func (sm *SettingsModal) getVoiceControlStatus(enabled bool, provider string) string {
	if !enabled {
		return "(Disabled)"
	}

	// Auto-detect Whisper provider
	providerName := "OpenAI Whisper"
	if provider == "groq" {
		providerName = "Groq Whisper"
	}

	return fmt.Sprintf("(Enabled, auto-detected: %s)", providerName)
}

// Action handlers
func (sm *SettingsModal) openSystemPrompts() error {
	if sm.OnOpenPrompts != nil {
		sm.OnOpenPrompts()
	}
	return nil
}

func (sm *SettingsModal) deleteNamespace() error {
	// Show confirmation dialog
	// For now, just reset the config to defaults
	sm.config.Update(func(cfg *core.Config) {
		cfg.Provider = "openai"
		cfg.APIKey = ""
		cfg.Model = "gpt-3.5-turbo"
		cfg.YoloMode = false
		cfg.VoiceControl = false
	})

	if sm.OnOpenNamespaceManager != nil {
		sm.OnOpenNamespaceManager()
	}
	return nil
}

// Draw renders the settings modal
func (sm *SettingsModal) Draw() {
	w, h := sm.screen.Size()

	// Calculate modal dimensions
	modalWidth := 70
	modalHeight := 25
	modalX := (w - modalWidth) / 2
	modalY := (h - modalHeight) / 2

	// Draw modal background
	sm.drawModalBackground(modalX, modalY, modalWidth, modalHeight)

	// Draw header
	sm.drawHeader(modalX, modalY, modalWidth)

	// Draw items
	sm.drawItems(modalX, modalY+3, modalWidth, modalHeight-6)

	// Draw footer
	sm.drawFooter(modalX, modalY+modalHeight-2, modalWidth)

	// Draw dropdown if active
	if sm.dropdownSelector != nil {
		sm.dropdownSelector.Draw()
	}

	// Draw model selector if active
	if sm.modelSelector != nil {
		sm.modelSelector.Draw()
	}

	// Draw loading spinner if loading models
	if sm.isLoadingModels {
		sm.drawLoadingSpinner(modalX+modalWidth/2, modalY+modalHeight/2)
	}
}

// drawModalBackground draws the modal border and background
func (sm *SettingsModal) drawModalBackground(x, y, w, h int) {
	style := tcell.StyleDefault.Background(tcell.ColorBlack)
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen)

	// Clear background
	for i := 0; i < h; i++ {
		for j := 0; j < w; j++ {
			sm.screen.SetContent(x+j, y+i, ' ', nil, style)
		}
	}

	// Draw border
	// Top
	sm.screen.SetContent(x, y, '╔', nil, borderStyle)
	for i := 1; i < w-1; i++ {
		sm.screen.SetContent(x+i, y, '═', nil, borderStyle)
	}
	sm.screen.SetContent(x+w-1, y, '╗', nil, borderStyle)

	// Sides
	for i := 1; i < h-1; i++ {
		sm.screen.SetContent(x, y+i, '║', nil, borderStyle)
		sm.screen.SetContent(x+w-1, y+i, '║', nil, borderStyle)
	}

	// Bottom
	sm.screen.SetContent(x, y+h-1, '╚', nil, borderStyle)
	for i := 1; i < w-1; i++ {
		sm.screen.SetContent(x+i, y+h-1, '═', nil, borderStyle)
	}
	sm.screen.SetContent(x+w-1, y+h-1, '╝', nil, borderStyle)
}

// drawHeader draws the modal header
func (sm *SettingsModal) drawHeader(x, y, w int) {
	title := " Settings "
	titleX := x + (w-len(title))/2
	titleStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)

	for i, r := range title {
		sm.screen.SetContent(titleX+i, y, r, nil, titleStyle)
	}

	// Draw separator
	sepStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	for i := 1; i < w-1; i++ {
		sm.screen.SetContent(x+i, y+2, '─', nil, sepStyle)
	}
}

// drawItems draws all settings items
func (sm *SettingsModal) drawItems(x, y, w, h int) {
	currentY := y

	for i, item := range sm.items {
		if currentY >= y+h {
			break // Don't draw beyond bounds
		}

		isSelected := i == sm.selectedIndex
		sm.drawItem(x+2, currentY, w-4, item, isSelected, i == sm.selectedIndex && sm.editingField)
		currentY += 2 // Space between items
	}
}

// drawItem draws a single settings item
func (sm *SettingsModal) drawItem(x, y, w int, item SettingsItem, isSelected, isEditing bool) {
	labelStyle := tcell.StyleDefault
	valueStyle := tcell.StyleDefault
	statusStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)

	if isSelected {
		labelStyle = labelStyle.Bold(true).Foreground(tcell.ColorYellow)
		valueStyle = valueStyle.Bold(true)
	}

	// Draw label
	label := item.Label + ":"
	for i, r := range label {
		if i < w {
			sm.screen.SetContent(x+i, y, r, nil, labelStyle)
		}
	}

	// Draw value based on type
	valueX := x + len(label) + 2
	valueText := ""

	switch item.Type {
	case ItemTypeDropdown:
		valueText = fmt.Sprintf("[%v]", item.Value)
		if isSelected && !isEditing {
			valueText += " ↓"
		}

	case ItemTypePassword:
		if val := item.Value.(string); val != "" {
			valueText = strings.Repeat("•", 8) + val[len(val)-min(4, len(val)):]
		} else {
			valueText = "(not set)"
		}
		if isEditing {
			valueText = sm.editBuffer
		}

	case ItemTypeCheckbox:
		if item.Value.(bool) {
			valueText = "[x]"
		} else {
			valueText = "[ ]"
		}

	case ItemTypeLink:
		valueText = item.Value.(string)
		valueStyle = valueStyle.Foreground(tcell.ColorBlue).Underline(true)

	case ItemTypeAction:
		valueText = ""
		// Draw the label as a link
		linkStyle := tcell.StyleDefault.Foreground(tcell.ColorBlue).Underline(true)
		if isSelected {
			linkStyle = linkStyle.Bold(true)
		}
		for i, r := range item.Label {
			if i < w {
				sm.screen.SetContent(x+i, y, r, nil, linkStyle)
			}
		}
		return // Skip the rest for action items
	}

	// Draw value
	for i, r := range valueText {
		if valueX+i < x+w {
			sm.screen.SetContent(valueX+i, y, r, nil, valueStyle)
		}
	}

	// Draw status text (gray, to the right)
	if item.StatusText != "" {
		statusX := valueX + len(valueText) + 2
		for i, r := range item.StatusText {
			if statusX+i < x+w {
				sm.screen.SetContent(statusX+i, y, r, nil, statusStyle)
			}
		}
	}
}

// drawFooter draws the modal footer
func (sm *SettingsModal) drawFooter(x, y, w int) {
	instructions := " ↑↓:Navigate | Enter:Edit | Space:Toggle | R:Restore | ESC:Close | Ctrl+S:Save "
	instrX := x + (w-len(instructions))/2
	instrStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)

	for i, r := range instructions {
		if i < w-2 {
			sm.screen.SetContent(instrX+i, y, r, nil, instrStyle)
		}
	}
}

// drawLoadingSpinner draws a loading spinner for model refresh
func (sm *SettingsModal) drawLoadingSpinner(x, y int) {
	spinner := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
	frame := int(time.Now().UnixMilli()/100) % len(spinner)

	text := spinner[frame] + " Loading models..."
	style := tcell.StyleDefault.Foreground(tcell.ColorYellow)

	for i, r := range text {
		sm.screen.SetContent(x-len(text)/2+i, y, r, nil, style)
	}
}

// HandleInput processes keyboard input
func (sm *SettingsModal) HandleInput(ev *tcell.EventKey) bool {
	// Handle model selector if active
	if sm.modelSelector != nil {
		value, done := sm.modelSelector.HandleInput(ev)
		if done {
			if value != "" {
				sm.items[sm.selectedIndex].Value = value
				sm.updateConfig()
			}
			sm.modelSelector = nil
			sm.editingField = false
			return false
		}
		return false
	}

	// Handle dropdown if active
	if sm.dropdownSelector != nil {
		value, done := sm.dropdownSelector.HandleInput(ev)
		if done {
			if value != "" {
				sm.items[sm.selectedIndex].Value = value
				sm.updateConfig()
			}
			sm.dropdownSelector = nil
			sm.editingField = false
			return false
		}
		return false
	}

	// Handle editing mode
	if sm.editingField {
		return sm.handleEditMode(ev)
	}

	// Handle navigation
	switch ev.Key() {
	case tcell.KeyUp:
		if sm.selectedIndex > 0 {
			sm.selectedIndex--
		}
		return false

	case tcell.KeyDown:
		if sm.selectedIndex < len(sm.items)-1 {
			sm.selectedIndex++
		}
		return false

	case tcell.KeyEnter:
		sm.handleEnter()
		return false

	case tcell.KeyRune:
		switch ev.Rune() {
		case ' ':
			sm.handleSpace()
		case 'r', 'R':
			// Refresh models
			if sm.items[sm.selectedIndex].Key == "model" {
				sm.refreshModels()
			}
		}
		return false

	case tcell.KeyCtrlS:
		sm.save()
		return false

	case tcell.KeyEscape:
		// Save current values and close
		sm.updateConfig()
		if sm.OnSave != nil {
			cfg := sm.config.Get()
			sm.OnSave(cfg)
		}
		if sm.OnCancel != nil {
			sm.OnCancel()
		}
		return true
	}

	return false
}

// handleEnter handles Enter key press
func (sm *SettingsModal) handleEnter() {
	item := sm.items[sm.selectedIndex]

	switch item.Type {
	case ItemTypeDropdown:
		// Check if this is the Model field - use special selector
		if item.Key == "model" {
			sm.editingField = true

			// Get the current provider to determine which models to show
			providerStr := sm.items[0].Value.(string) // Provider is first item
			var provider models.ModelProvider
			switch providerStr {
			case "openai":
				provider = models.ProviderOpenAI
			case "groq":
				provider = models.ProviderGroq
			case "berget":
				provider = models.ProviderBerget
			case "ollama":
				provider = models.ProviderOllama
			case "llamafile":
				provider = models.ProviderLlamafile
			case "gpt4all":
				provider = models.ProviderGPT4All
			case "lmstudio":
				provider = models.ProviderLMStudio
			case "localai":
				provider = models.ProviderLocalAI
			default:
				provider = models.ProviderOpenAI
			}

			sm.modelSelector = components.NewModelSelector(
				sm.screen,
				"Select Model",
				sm.modelRegistry,
				provider,
				fmt.Sprintf("%v", item.Value),
			)
		} else {
			// Use regular dropdown for other fields
			sm.editingField = true
			sm.dropdownSelector = components.NewDropdownSelector(
				sm.screen,
				item.Label,
				item.Options,
				fmt.Sprintf("%v", item.Value),
			)
		}

	case ItemTypePassword:
		// Start editing
		sm.editingField = true
		sm.editBuffer = item.Value.(string)

	case ItemTypeCheckbox:
		// Toggle
		sm.items[sm.selectedIndex].Value = !item.Value.(bool)
		sm.updateStatusText()
		sm.updateConfig()

	case ItemTypeLink, ItemTypeAction:
		// Execute handler
		if item.Handler != nil {
			item.Handler()
		}
	}
}

// handleSpace handles spacebar press (for checkboxes)
func (sm *SettingsModal) handleSpace() {
	item := sm.items[sm.selectedIndex]
	if item.Type == ItemTypeCheckbox {
		sm.items[sm.selectedIndex].Value = !item.Value.(bool)
		sm.updateStatusText()
		sm.updateConfig()
	}
}

// handleEditMode handles input in edit mode
func (sm *SettingsModal) handleEditMode(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEnter:
		// Save the edited value
		sm.items[sm.selectedIndex].Value = sm.editBuffer

		// If API key was edited, detect provider and update models
		if sm.items[sm.selectedIndex].Key == "api_key" {
			sm.detectAPIKeyProvider(sm.editBuffer)
		}

		sm.updateStatusText()
		sm.updateConfig()
		sm.editingField = false
		sm.editBuffer = ""

	case tcell.KeyEscape:
		// Cancel editing
		sm.editingField = false
		sm.editBuffer = ""

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		// For API key field, clear entirely on first backspace
		if sm.items[sm.selectedIndex].Key == "api_key" && sm.editBuffer != "" {
			sm.editBuffer = ""
		} else if len(sm.editBuffer) > 0 {
			sm.editBuffer = sm.editBuffer[:len(sm.editBuffer)-1]
		}

	case tcell.KeyRune:
		sm.editBuffer += string(ev.Rune())
	}

	return false
}

// refreshModels refreshes the model list from the API
func (sm *SettingsModal) refreshModels() {
	sm.isLoadingModels = true

	// In a real implementation, this would call the API
	// For now, just simulate a delay
	go func() {
		time.Sleep(2 * time.Second)
		sm.isLoadingModels = false

		// Update model options
		provider := sm.items[0].Value.(string)
		sm.items[2].Options = sm.getModelOptions(provider)
	}()
}

// updateStatusText updates status text for items that need it
func (sm *SettingsModal) updateStatusText() {
	for i := range sm.items {
		switch sm.items[i].Key {
		case "api_key":
			sm.items[i].StatusText = sm.getAPIKeyStatus(sm.items[i].Value.(string))
		case "yolo_mode":
			sm.items[i].StatusText = sm.getYoloModeStatus(sm.items[i].Value.(bool))
		case "voice_control":
			provider := sm.items[0].Value.(string)
			sm.items[i].StatusText = sm.getVoiceControlStatus(sm.items[i].Value.(bool), provider)
		}
	}
}

// updateConfig updates the configuration with current values
func (sm *SettingsModal) updateConfig() {
	sm.config.Update(func(cfg *core.Config) {
		for _, item := range sm.items {
			switch item.Key {
			case "provider":
				cfg.Provider = item.Value.(string)
			case "api_key":
				cfg.APIKey = item.Value.(string)
			case "model":
				cfg.Model = item.Value.(string)
			case "yolo_mode":
				cfg.YoloMode = item.Value.(bool)
			case "voice_control":
				cfg.VoiceControl = item.Value.(bool)
			}
		}
	})
}

// save saves the configuration
func (sm *SettingsModal) save() {
	sm.updateConfig()
	if err := sm.config.Save(); err != nil {
		sm.errorMessage = fmt.Sprintf("Error saving: %v", err)
	} else {
		if sm.OnSave != nil {
			cfg := sm.config.Get()
			sm.OnSave(cfg)
		}
	}
}

// HandleMouse processes mouse events for the settings modal
func (sm *SettingsModal) HandleMouse(event *core.MouseEvent) bool {
	// If model selector is active, forward the event to it
	if sm.modelSelector != nil {
		value, done := sm.modelSelector.HandleMouse(event)
		if done {
			if value != "" {
				// Model was selected
				sm.items[sm.selectedIndex].Value = value
				sm.updateConfig()
			}
			// Either selected or cancelled - close the selector
			sm.modelSelector = nil
			sm.editingField = false
		}
		return true
	}

	// If dropdown is active, forward to it
	if sm.dropdownSelector != nil {
		value, done := sm.dropdownSelector.HandleMouse(event)
		if done && value != "" {
			sm.items[sm.selectedIndex].Value = value
			sm.updateConfig()
			sm.dropdownSelector = nil
			sm.editingField = false
		} else if done {
			sm.dropdownSelector = nil
			sm.editingField = false
		}
		return true
	}

	// Calculate modal bounds
	w, h := sm.screen.Size()
	modalWidth := 70
	modalHeight := 25
	modalX := (w - modalWidth) / 2
	modalY := (h - modalHeight) / 2

	// Check if click is within modal
	if event.X < modalX || event.X >= modalX+modalWidth ||
		event.Y < modalY || event.Y >= modalY+modalHeight {
		// Click outside modal - save and close
		if event.Type == core.MouseEventClick {
			sm.updateConfig()
			if sm.OnSave != nil {
				cfg := sm.config.Get()
				sm.OnSave(cfg)
			}
			if sm.OnCancel != nil {
				sm.OnCancel()
			}
		}
		return false
	}

	// Calculate which item was clicked
	itemY := modalY + 3
	for i, item := range sm.items {
		if event.Y == itemY {
			if event.Type == core.MouseEventClick {
				sm.selectedIndex = i

				// Handle different item types
				switch item.Type {
				case ItemTypeCheckbox:
					// Toggle on click
					sm.items[i].Value = !item.Value.(bool)
					sm.updateStatusText()
					sm.updateConfig()

				case ItemTypeLink, ItemTypeAction:
					// Execute handler on click
					if item.Handler != nil {
						item.Handler()
					}

				default:
					// Open for editing
					sm.handleEnter()
				}
				return true
			}
		}
		itemY += 2
	}

	return true // Event was within modal
}

// detectAPIKeyProvider automatically detects the provider based on API key format
func (sm *SettingsModal) detectAPIKeyProvider(apiKey string) {
	var detectedProvider string

	if strings.HasPrefix(apiKey, "sk-") && !strings.HasPrefix(apiKey, "sk-ant-") {
		detectedProvider = "openai"
	} else if strings.HasPrefix(apiKey, "sk-ant-") {
		detectedProvider = "anthropic"
	} else if strings.HasPrefix(apiKey, "gsk_") {
		detectedProvider = "groq"
	}

	// If we detected a provider, update it
	if detectedProvider != "" {
		for i, item := range sm.items {
			if item.Key == "provider" {
				sm.items[i].Value = detectedProvider
				break
			}
		}

		// Update model options for the new provider
		modelOptions := sm.getModelOptions(detectedProvider)
		for i, item := range sm.items {
			if item.Key == "model" {
				sm.items[i].Options = modelOptions
				// Reset to first available model for new provider
				if len(modelOptions) > 0 {
					sm.items[i].Value = modelOptions[0]
				}
				break
			}
		}

		sm.updateConfig()
	}
}

// restoreOriginal restores settings to their original values
func (sm *SettingsModal) restoreOriginal() {
	if sm.originalConfig == nil {
		return
	}

	// Update the config
	sm.config.Update(func(cfg *core.Config) {
		cfg.Provider = sm.originalConfig.Provider
		cfg.APIKey = sm.originalConfig.APIKey
		cfg.Model = sm.originalConfig.Model
		cfg.YoloMode = sm.originalConfig.YoloMode
		cfg.VoiceControl = sm.originalConfig.VoiceControl
	})

	// Reinitialize items to reflect restored values
	sm.initializeItems()
}

