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

// SettingsModal represents the settings UI with model dropdown
type SettingsModal struct {
	screen        tcell.Screen
	config        *config.Config
	apiClient     *api.Client
	modelRegistry *models.ModelRegistry
	selected      int
	editing       bool
	fields        []Field
	modelList     []*models.ModelMetadata
	filteredList  []*models.ModelMetadata
	modelDropdown bool
	dropdownIdx   int
	filterText    string
	// Expandable menu states
	expandedField int // -1 means none expanded, otherwise the field index
	expandedChoice int // 0 for No, 1 for Yes
}

// FieldType represents the type of a field
type FieldType int

const (
	FieldText FieldType = iota
	FieldPassword
	FieldSelect
	FieldNumber
	FieldBool
)

// Field represents a settings field with enhanced features
type Field struct {
	Label       string
	Value       string
	Type        FieldType
	Options     []string // For select fields
	Editable    bool
	Refreshable bool // Can be refreshed from API
	// For expandable yes/no fields
	Expandable  bool
	Info        string // Main info text
	YesBrief    string // Brief yes description (few words)
	NoBrief     string // Brief no description (few words)
}

// ShowSettings displays the settings modal
// Returns true if user wants to continue (ESC pressed), false if they want to quit (Ctrl+Q)
func ShowSettings(cfg *config.Config) error {
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

	modal := &SettingsModal{
		screen:        s,
		config:        cfg,
		apiClient:     api.NewClient(cfg),
		modelRegistry: models.NewModelRegistry(),
		fields:        buildFields(cfg),
		expandedField: -1, // No field expanded initially
	}

	// Load model list for current provider
	modal.loadModelsForProvider()

	result := modal.run()
	if !result {
		logger.Get().Info("User requested quit from settings")
	}
	return nil
}

// buildFields creates the field list from config
func buildFields(cfg *config.Config) []Field {
	fields := []Field{
		{
			Label:    "API Provider",
			Value:    string(cfg.Provider),
			Type:     FieldSelect,
			Options:  getProviderOptions(),
			Editable: true,
		},
		{
			Label:    "Base URL",
			Value:    cfg.BaseURL,
			Type:     FieldText,
			Editable: cfg.Provider == config.ProviderCustom,
		},
		{
			Label:    "API Key",
			Value:    maskAPIKey(cfg.APIKey),
			Type:     FieldPassword,
			Editable: true,
		},
		{
			Label:       "Model",
			Value:       cfg.Model,
			Type:        FieldSelect,
			Editable:    true,
			Refreshable: true, // Can refresh model list
		},
		{
			Label:    "Max Tokens",
			Value:    fmt.Sprintf("%d", cfg.MaxTokens),
			Type:     FieldNumber,
			Editable: true,
		},
		{
			Label:    "Temperature",
			Value:    fmt.Sprintf("%.1f", cfg.Temperature),
			Type:     FieldNumber,
			Editable: true,
		},
		{
			Label:    "System Prompt",
			Value:    truncateForDisplay(cfg.SystemPrompt, 40),
			Type:     FieldText,
			Editable: true,
		},
		{
			Label:       "Stream Response",
			Value:       boolToString(cfg.StreamResponse),
			Type:        FieldBool,
			Editable:    true,
			Expandable:  true,
			Info:        "Stream Response controls how AI responses are delivered. When enabled, text appears word-by-word. When disabled, waits for complete response.",
			YesBrief:    "Show words as they arrive",
			NoBrief:     "Wait for complete response",
		},
		{
			Label:       "YOLO Mode",
			Value:       boolToString(cfg.YoloMode),
			Type:        FieldBool,
			Editable:    true,
			Expandable:  true,
			Info:        "⚠️ YOLO Mode controls function execution approval. When enabled, functions execute WITHOUT confirmation. When disabled, you approve each call.",
			YesBrief:    "Auto-execute (no confirmation)",
			NoBrief:     "Require approval for each call",
		},
		{
			Label:       "Voice Control",
			Value:       boolToString(cfg.VoiceControl),
			Type:        FieldBool,
			Editable:    true,
			Expandable:  true,
			Info:        "Voice Control enables speech-to-text using the Whisper API. When enabled, a microphone button appears for voice input. Requires microphone permissions and a Whisper-compatible API endpoint.",
			YesBrief:    "Enable microphone input",
			NoBrief:     "Text input only",
		},
	}

	return fields
}

// loadModelsForProvider loads the model list for the current provider
func (m *SettingsModal) loadModelsForProvider() {
	provider := models.ModelProvider(m.config.Provider)
	m.modelList = m.modelRegistry.GetProviderModels(provider)
	m.filteredList = m.modelList // Initially show all models
	m.filterText = "" // Reset filter
	
	// Update model field options
	if len(m.fields) > 3 {
		modelOptions := []string{}
		for _, model := range m.modelList {
			modelOptions = append(modelOptions, model.ID)
		}
		m.fields[3].Options = modelOptions
		
		// Set default model if current is empty
		if m.config.Model == "" {
			if defaultModel := m.modelRegistry.GetDefaultModel(provider); defaultModel != nil {
				m.config.Model = defaultModel.ID
				m.fields[3].Value = defaultModel.ID
			}
		}
	}
}

// run runs the main event loop
// Returns true if ESC was pressed (return to menu), false if Ctrl+Q (quit app)
func (m *SettingsModal) run() bool {
	log := logger.Get()
	log.Info("Settings modal opened")
	
	for {
		m.draw()
		m.screen.Show()

		ev := m.screen.PollEvent()
		switch ev := ev.(type) {
		case *tcell.EventKey:
			// Handle key event and check if it was handled
			handled := m.handleKeyEvent(ev)
			log.Debug("Key event handled=%v", handled)
			
			// If the key was handled, don't check for exit
			// This prevents ESC from exiting when it closes a submenu
			if handled {
				log.Debug("Key was handled by submenu, not checking for exit")
				continue
			}
			
			// Check if we should exit settings
			// ev is already of type *tcell.EventKey from the type switch
			if ev.Key() == tcell.KeyCtrlQ {
				log.Info("Ctrl+Q pressed - quit application")
				return false // Quit app
			} else if ev.Key() == tcell.KeyEscape && !m.editing && !m.modelDropdown && m.expandedField < 0 {
				log.Info("ESC pressed - return to main menu")
				return true // Return to menu
			}
		case *tcell.EventResize:
			m.screen.Sync()
		}
	}
}

// handleKeyEvent handles keyboard events
func (m *SettingsModal) handleKeyEvent(ev *tcell.EventKey) bool {
	log := logger.Get()
	log.KeyEvent(fmt.Sprintf("%v", ev.Key()), fmt.Sprintf("%v", ev.Modifiers()), m.getContext())
	
	switch ev.Key() {
	case tcell.KeyEscape:
		if m.modelDropdown {
			log.MenuAction("modelDropdown", "close", "ESC pressed")
			m.modelDropdown = false
			m.filterText = "" // Clear filter on escape
			m.filteredList = m.modelList // Reset to full list
			return true // Event handled, don't propagate
		} else if m.expandedField >= 0 {
			log.MenuAction("expandableMenu", "close", fmt.Sprintf("field=%d", m.expandedField))
			m.expandedField = -1 // Close expandable menu only
			return true // Event handled, don't propagate
		} else if m.editing {
			log.MenuAction("editing", "cancel", "ESC pressed")
			m.editing = false
			return true // Event handled, don't propagate
		}
		// ESC not handled here, let it propagate
		log.Debug("ESC not handled, will propagate to exit settings")
		return false
		
	case tcell.KeyUp:
		if m.modelDropdown {
			if m.dropdownIdx > 0 {
				m.dropdownIdx--
				log.Debug("Model dropdown: up to index %d", m.dropdownIdx)
			}
		} else if m.expandedField >= 0 {
			// Toggle between Yes and No
			oldChoice := m.expandedChoice
			m.expandedChoice = 1 - m.expandedChoice
			log.MenuAction("expandableMenu", "toggle", fmt.Sprintf("%d -> %d", oldChoice, m.expandedChoice))
		} else if !m.editing && m.selected > 0 {
			m.selected--
			log.Debug("Field selection: up to %d", m.selected)
		}
		return true
		
	case tcell.KeyDown:
		if m.modelDropdown {
			if m.dropdownIdx < len(m.filteredList)-1 {
				m.dropdownIdx++
				log.Debug("Model dropdown: down to index %d", m.dropdownIdx)
			}
		} else if m.expandedField >= 0 {
			// Toggle between Yes and No
			oldChoice := m.expandedChoice
			m.expandedChoice = 1 - m.expandedChoice
			log.MenuAction("expandableMenu", "toggle", fmt.Sprintf("%d -> %d", oldChoice, m.expandedChoice))
		} else if !m.editing && m.selected < len(m.fields)-1 {
			m.selected++
			log.Debug("Field selection: down to %d", m.selected)
		}
		return true
		
	case tcell.KeyEnter:
		if m.modelDropdown {
			// Select model from dropdown
			if m.dropdownIdx < len(m.filteredList) {
				selectedModel := m.filteredList[m.dropdownIdx]
				log.MenuAction("modelDropdown", "select", selectedModel.ID)
				m.config.Model = selectedModel.ID
				m.fields[3].Value = selectedModel.ID
				m.modelDropdown = false
				m.filterText = "" // Clear filter
				m.filteredList = m.modelList // Reset list
			}
		} else if m.expandedField >= 0 {
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
			m.expandedField = -1 // Close menu
		} else if m.selected == 3 && !m.editing {
			// Open model dropdown
			log.MenuAction("modelDropdown", "open", "Enter pressed")
			m.modelDropdown = true
			m.filteredList = m.modelList
			m.filterText = ""
			m.dropdownIdx = m.findModelIndex(m.config.Model)
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
		
	default:
		log.Debug("Unhandled key: %v", ev.Key())
		
	case tcell.KeyTab:
		if m.fields[m.selected].Type == FieldSelect && m.selected != 3 {
			// Cycle through options (except for model field which uses dropdown)
			m.cycleOption()
		}
		return true
		
	case tcell.KeyCtrlR:
		// Refresh model list from API
		if m.selected == 3 {
			m.refreshModelList()
		}
		return true
		
	case tcell.KeyCtrlS:
		// Save configuration
		m.saveConfig()
		return true
		
	case tcell.KeyCtrlT:
		// Test API connection
		m.testConnection()
		return true
		
	case tcell.KeyCtrlQ:
		// Quit without saving
		log.Info("Ctrl+Q pressed, exiting settings")
		return false // Let it propagate to exit
		
	case tcell.KeyRune:
		log.Debug("Rune key: %c", ev.Rune())
		if m.modelDropdown {
			// Add character to filter
			m.filterText += string(ev.Rune())
			m.applyFilter()
		} else if m.editing {
			m.handleTextInput(ev.Rune())
		}
		return true
		
	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if m.modelDropdown && len(m.filterText) > 0 {
			// Remove character from filter
			m.filterText = m.filterText[:len(m.filterText)-1]
			m.applyFilter()
		} else if m.editing && len(m.fields[m.selected].Value) > 0 {
			field := &m.fields[m.selected]
			field.Value = field.Value[:len(field.Value)-1]
		}
		return true
	}
	
	return false // Key not handled
}

// draw renders the enhanced settings modal
func (m *SettingsModal) draw() {
	m.screen.Clear()
	w, h := m.screen.Size()

	// Draw border
	m.drawBorder(2, 1, w-4, h-2)

	// Draw title
	title := " hacka.re CLI Settings "
	m.drawText((w-len(title))/2, 1, title, tcell.StyleDefault.Bold(true))

	// Draw provider info
	providerInfo := fmt.Sprintf("Provider: %s", m.config.Provider)
	m.drawText(4, 3, providerInfo, tcell.StyleDefault)

	// Draw fields
	startY := 5
	for i, field := range m.fields {
		style := tcell.StyleDefault
		if i == m.selected {
			if m.editing {
				style = style.Background(tcell.ColorDarkGreen)
			} else {
				style = style.Background(tcell.ColorDarkBlue)
			}
		}

		// Draw label
		label := fmt.Sprintf("%-20s", field.Label+":")
		m.drawText(4, startY+i*2, label, style)

		// Draw value
		value := field.Value
		if field.Type == FieldPassword && !m.editing {
			value = strings.Repeat("*", len(value))
		}
		
		// Show model name if it's the model field
		if i == 3 && !m.editing {
			if model, exists := m.modelRegistry.GetModel(value); exists {
				value = fmt.Sprintf("%s (%s)", model.Name, model.ID)
				if len(value) > 50 {
					value = value[:47] + "..."
				}
			}
		}
		
		m.drawText(25, startY+i*2, value, style)

		// Draw indicators
		if field.Editable {
			indicator := ""
			if i == m.selected {
				if m.editing {
					indicator = " [editing...]"
				} else if i == 3 {
					indicator = " [↵ select] [^R refresh]"
				} else if field.Expandable {
					indicator = " [↵ expand]"
				} else {
					indicator = " [↵ edit]"
				}
			}
			if indicator != "" {
				m.drawText(25+len(value), startY+i*2, indicator, tcell.StyleDefault.Dim(true))
			}
		}
	}

	// Draw model dropdown if active
	if m.modelDropdown {
		m.drawModelDropdown()
	}
	
	// Draw expandable menu if active
	if m.expandedField >= 0 {
		m.drawExpandableMenu()
	}

	// Draw help text
	helpY := h - 3
	help := "↑↓ Navigate | ↵ Select/Edit | ^R Refresh | ^T Test | ^S Save | ^Q Quit | ESC Cancel"
	m.drawText((w-len(help))/2, helpY, help, tcell.StyleDefault.Dim(true))
}

// drawModelDropdown draws the model selection dropdown
func (m *SettingsModal) drawModelDropdown() {
	w, h := m.screen.Size()
	
	// Calculate dropdown position
	dropdownX := 25
	dropdownY := 5 + 3*2 + 1 // Below model field
	dropdownW := w - dropdownX - 10
	if dropdownW > 80 {
		dropdownW = 80
	}
	dropdownH := len(m.filteredList) + 3 // Extra line for filter
	if dropdownH > 20 {
		dropdownH = 20
	}
	
	// Draw dropdown border
	m.drawBorder(dropdownX, dropdownY, dropdownW, dropdownH)
	
	// Draw dropdown title with filter
	if m.filterText != "" {
		title := fmt.Sprintf(" Filter: %s ", m.filterText)
		m.drawText(dropdownX+2, dropdownY, title, tcell.StyleDefault.Bold(true))
	} else {
		title := " Select Model (type to filter) "
		m.drawText(dropdownX+(dropdownW-len(title))/2, dropdownY, title, tcell.StyleDefault)
	}
	
	// Show result count
	countText := fmt.Sprintf("(%d models)", len(m.filteredList))
	m.drawText(dropdownX+dropdownW-len(countText)-2, dropdownY, countText, tcell.StyleDefault.Dim(true))
	
	// Draw model list
	startIdx := 0
	if m.dropdownIdx >= dropdownH-4 {
		startIdx = m.dropdownIdx - (dropdownH - 5)
	}
	
	listHeight := dropdownH - 3
	for i := 0; i < listHeight && startIdx+i < len(m.filteredList); i++ {
		model := m.filteredList[startIdx+i]
		isSelected := startIdx+i == m.dropdownIdx
		
		// Draw the model name with highlighting
		y := dropdownY + 2 + i
		x := dropdownX + 2
		
		// Format model entry
		entry := fmt.Sprintf("%-30s", model.Name)
		if len(model.Description) > 0 {
			desc := model.Description
			if len(desc) > 40 {
				desc = desc[:37] + "..."
			}
			entry += " - " + desc
		}
		
		// Truncate if too long
		maxLen := dropdownW - 4
		if len(entry) > maxLen {
			entry = entry[:maxLen-3] + "..."
		}
		
		// Draw with highlighting for filter matches
		if m.filterText != "" && !isSelected {
			m.drawTextWithHighlight(x, y, entry, m.filterText, tcell.StyleDefault)
		} else {
			style := tcell.StyleDefault
			if isSelected {
				style = style.Background(tcell.ColorDarkBlue)
			}
			m.drawText(x, y, entry, style)
		}
		
		// Show category badge
		if model.Category != "production" {
			badge := fmt.Sprintf("[%s]", model.Category)
			badgeStyle := tcell.StyleDefault.Dim(true)
			if model.Category == "preview" {
				badgeStyle = badgeStyle.Foreground(tcell.ColorYellow)
			} else if model.Category == "legacy" {
				badgeStyle = badgeStyle.Foreground(tcell.ColorRed)
			}
			m.drawText(dropdownX+dropdownW-len(badge)-2, y, badge, badgeStyle)
		}
	}
	
	// Show scrollbar if needed
	if len(m.filteredList) > listHeight {
		scrollPos := (m.dropdownIdx * (listHeight - 1)) / len(m.filteredList)
		m.screen.SetContent(dropdownX+dropdownW-2, dropdownY+2+scrollPos, '▓', nil, tcell.StyleDefault)
	}
	
	// Draw model info popup (positioned to not cover current selection)
	if m.dropdownIdx < len(m.filteredList) {
		selectedModel := m.filteredList[m.dropdownIdx]
		m.drawModelInfoPopup(selectedModel, dropdownX, dropdownY, dropdownH, w, h)
	}
}


// refreshModelList refreshes the model list from the API
func (m *SettingsModal) refreshModelList() {
	w, h := m.screen.Size()
	
	// Show loading message
	msg := "Refreshing model list..."
	m.drawText((w-len(msg))/2, h/2, msg, tcell.StyleDefault.Bold(true))
	m.screen.Show()
	
	// Try to fetch models from API
	apiModels, err := m.apiClient.ListModels()
	if err != nil {
		// Show error
		errMsg := fmt.Sprintf("Error: %v", err)
		m.drawText((w-len(errMsg))/2, h/2+1, errMsg, tcell.StyleDefault.Foreground(tcell.ColorRed))
		m.screen.Show()
		m.screen.PollEvent() // Wait for key
	} else {
		// Update model list
		for _, modelID := range apiModels {
			// Add to registry if not exists
			if _, exists := m.modelRegistry.GetModel(modelID); !exists {
				m.modelRegistry.AddModel(&models.ModelMetadata{
					ID:       modelID,
					Name:     modelID,
					Provider: models.ModelProvider(m.config.Provider),
					Category: "production",
				})
			}
		}
		
		// Reload models for provider
		m.loadModelsForProvider()
		
		// Show success
		successMsg := fmt.Sprintf("Found %d models", len(apiModels))
		m.drawText((w-len(successMsg))/2, h/2+1, successMsg, tcell.StyleDefault.Foreground(tcell.ColorGreen))
		m.screen.Show()
		m.screen.PollEvent() // Wait for key
	}
}

// testConnection tests the API connection
func (m *SettingsModal) testConnection() {
	w, h := m.screen.Size()
	
	// Show testing message
	msg := "Testing API connection..."
	m.drawText((w-len(msg))/2, h/2, msg, tcell.StyleDefault.Bold(true))
	m.screen.Show()
	
	// Test connection
	err := m.apiClient.TestConnection()
	if err != nil {
		// Show error
		errMsg := fmt.Sprintf("Connection failed: %v", err)
		m.drawText((w-len(errMsg))/2, h/2+1, errMsg, tcell.StyleDefault.Foreground(tcell.ColorRed))
	} else {
		// Show success with model info
		successMsg := "✓ Connection successful!"
		m.drawText((w-len(successMsg))/2, h/2+1, successMsg, tcell.StyleDefault.Foreground(tcell.ColorGreen))
		
		modelInfo := m.apiClient.GetModelInfo()
		m.drawText((w-len(modelInfo))/2, h/2+2, modelInfo, tcell.StyleDefault.Dim(true))
	}
	
	m.screen.Show()
	m.screen.PollEvent() // Wait for key
}

// Helper methods

// applyFilter filters the model list based on the filter text
func (m *SettingsModal) applyFilter() {
	if m.filterText == "" {
		m.filteredList = m.modelList
		m.dropdownIdx = 0
		return
	}
	
	filter := strings.ToLower(m.filterText)
	m.filteredList = []*models.ModelMetadata{}
	
	for _, model := range m.modelList {
		if strings.Contains(strings.ToLower(model.ID), filter) ||
		   strings.Contains(strings.ToLower(model.Name), filter) ||
		   strings.Contains(strings.ToLower(model.Description), filter) {
			m.filteredList = append(m.filteredList, model)
		}
	}
	
	// Reset index if out of bounds
	if m.dropdownIdx >= len(m.filteredList) {
		m.dropdownIdx = 0
	}
}

// drawModelInfoPopup draws a compact model info popup
func (m *SettingsModal) drawModelInfoPopup(model *models.ModelMetadata, dropX, dropY, dropH, screenW, screenH int) {
	// Calculate popup position - try to position it where it won't cover the selection
	infoW := 60
	infoH := 10
	
	// Position popup to the left of dropdown if there's space, otherwise to the right
	var infoX int
	if dropX > infoW + 2 {
		// Place to the left
		infoX = dropX - infoW - 2
	} else {
		// Place to the right
		infoX = dropX + 82 // After dropdown width
		if infoX + infoW > screenW {
			infoX = screenW - infoW - 2
		}
	}
	
	// Position vertically - try to align with current selection
	selectionY := dropY + 2 + (m.dropdownIdx % (dropH - 3))
	infoY := selectionY - 2
	
	// Ensure popup stays on screen
	if infoY < 2 {
		infoY = 2
	}
	if infoY + infoH > screenH - 2 {
		infoY = screenH - infoH - 2
	}
	
	// Clear area and draw border
	for y := infoY; y < infoY+infoH; y++ {
		for x := infoX; x < infoX+infoW; x++ {
			m.screen.SetContent(x, y, ' ', nil, tcell.StyleDefault.Background(tcell.ColorBlack))
		}
	}
	m.drawBorder(infoX, infoY, infoW, infoH)
	
	// Draw title
	title := fmt.Sprintf(" %s ", model.Name)
	m.drawText(infoX+(infoW-len(title))/2, infoY, title, tcell.StyleDefault.Bold(true))
	
	// Draw compact info
	info := []string{
		fmt.Sprintf("ID: %s", model.ID),
		fmt.Sprintf("Context: %s", formatNumber(model.ContextWindow)),
		fmt.Sprintf("Max Output: %s", formatNumber(model.MaxTokens)),
		fmt.Sprintf("Category: %s", model.Category),
		fmt.Sprintf("Owner: %s", model.OwnedBy),
	}
	
	if len(model.Description) > 0 {
		desc := model.Description
		if len(desc) > infoW-6 {
			desc = desc[:infoW-9] + "..."
		}
		info = append(info, fmt.Sprintf("Info: %s", desc))
	}
	
	if len(model.Capabilities) > 0 {
		caps := strings.Join(model.Capabilities, ", ")
		if len(caps) > infoW-12 {
			caps = caps[:infoW-15] + "..."
		}
		info = append(info, fmt.Sprintf("Features: %s", caps))
	}
	
	for i, line := range info {
		if i < infoH-2 {
			if len(line) > infoW-4 {
				line = line[:infoW-7] + "..."
			}
			m.drawText(infoX+2, infoY+1+i, line, tcell.StyleDefault)
		}
	}
}

// drawTextWithHighlight draws text with highlighted search matches
func (m *SettingsModal) drawTextWithHighlight(x, y int, text, filter string, baseStyle tcell.Style) {
	if filter == "" {
		m.drawText(x, y, text, baseStyle)
		return
	}
	
	lowerText := strings.ToLower(text)
	lowerFilter := strings.ToLower(filter)
	highlightStyle := baseStyle.Background(tcell.ColorYellow).Foreground(tcell.ColorBlack)
	
	pos := 0
	for pos < len(text) {
		idx := strings.Index(lowerText[pos:], lowerFilter)
		if idx == -1 {
			// Draw rest of text normally
			for i, r := range text[pos:] {
				m.screen.SetContent(x+pos+i, y, r, nil, baseStyle)
			}
			break
		}
		
		// Draw text before match
		for i, r := range text[pos : pos+idx] {
			m.screen.SetContent(x+pos+i, y, r, nil, baseStyle)
		}
		
		// Draw matched text with highlight
		for i, r := range text[pos+idx : pos+idx+len(filter)] {
			m.screen.SetContent(x+pos+idx+i, y, r, nil, highlightStyle)
		}
		
		pos += idx + len(filter)
	}
}

// formatNumber formats a number with thousands separators
func formatNumber(n int) string {
	if n == 0 {
		return "0"
	}
	
	// Convert to string and add commas
	s := fmt.Sprintf("%d", n)
	result := ""
	for i, r := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += ","
		}
		result += string(r)
	}
	
	// Also show in K/M notation for large numbers
	if n >= 1000000 {
		return fmt.Sprintf("%s (%.1fM)", result, float64(n)/1000000)
	} else if n >= 1000 {
		return fmt.Sprintf("%s (%.0fK)", result, float64(n)/1000)
	}
	
	return result
}

// wordWrap wraps text to fit within the given width
func wordWrap(text string, width int) []string {
	words := strings.Fields(text)
	if len(words) == 0 {
		return []string{}
	}
	
	var lines []string
	currentLine := ""
	
	for _, word := range words {
		if currentLine == "" {
			currentLine = word
		} else if len(currentLine)+1+len(word) <= width {
			currentLine += " " + word
		} else {
			lines = append(lines, currentLine)
			currentLine = word
		}
	}
	
	if currentLine != "" {
		lines = append(lines, currentLine)
	}
	
	return lines
}

func (m *SettingsModal) findModelIndex(modelID string) int {
	for i, model := range m.filteredList {
		if model.ID == modelID {
			return i
		}
	}
	// If not in filtered list, check full list
	for i, model := range m.modelList {
		if model.ID == modelID {
			// Reset filter to show this model
			m.filterText = ""
			m.filteredList = m.modelList
			return i
		}
	}
	return 0
}

func (m *SettingsModal) cycleOption() {
	field := &m.fields[m.selected]
	if field.Type != FieldSelect || len(field.Options) == 0 {
		return
	}

	// Find current index
	currentIdx := -1
	for i, opt := range field.Options {
		if opt == field.Value {
			currentIdx = i
			break
		}
	}

	// Move to next option
	nextIdx := (currentIdx + 1) % len(field.Options)
	field.Value = field.Options[nextIdx]

	// Update config
	if m.selected == 0 { // Provider field
		m.config.Provider = config.Provider(field.Value)
		// Reload models for new provider
		m.loadModelsForProvider()
		// Update base URL
		if m.config.Provider != config.ProviderCustom {
			m.config.BaseURL = config.Providers[m.config.Provider].BaseURL
			m.fields[1].Value = m.config.BaseURL
			m.fields[1].Editable = false
		} else {
			m.fields[1].Editable = true
		}
	}
}

func (m *SettingsModal) applyFieldEdit() {
	field := &m.fields[m.selected]
	
	switch m.selected {
	case 2: // API Key
		m.config.APIKey = field.Value
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
	}
}

func (m *SettingsModal) handleTextInput(r rune) {
	if !m.editing {
		return
	}
	
	field := &m.fields[m.selected]
	
	// Validate input based on field type
	switch field.Type {
	case FieldNumber:
		if (r >= '0' && r <= '9') || r == '.' {
			field.Value += string(r)
		}
	case FieldText, FieldPassword:
		field.Value += string(r)
	}
}

func (m *SettingsModal) saveConfig() {
	configPath := config.GetConfigPath()
	if err := m.config.SaveToFile(configPath); err != nil {
		// Show error message
		m.drawText(4, 4, fmt.Sprintf("Error saving: %v", err), tcell.StyleDefault.Foreground(tcell.ColorRed))
	} else {
		// Show success message
		m.drawText(4, 4, "✓ Configuration saved!", tcell.StyleDefault.Foreground(tcell.ColorGreen))
	}
	m.screen.Show()
	m.screen.PollEvent() // Wait for key
}

// drawExpandableMenu draws the expandable yes/no menu with information
func (m *SettingsModal) drawExpandableMenu() {
	w, h := m.screen.Size()
	field := m.fields[m.expandedField]
	
	// Calculate menu dimensions
	menuW := 70
	menuH := 12  // Smaller height for simpler layout
	menuX := (w - menuW) / 2
	menuY := (h - menuH) / 2
	
	// Clear area and draw border
	for y := menuY; y < menuY+menuH; y++ {
		for x := menuX; x < menuX+menuW; x++ {
			m.screen.SetContent(x, y, ' ', nil, tcell.StyleDefault.Background(tcell.ColorBlack))
		}
	}
	m.drawBorder(menuX, menuY, menuW, menuH)
	
	// Draw title
	title := fmt.Sprintf(" %s ", field.Label)
	m.drawText(menuX+(menuW-len(title))/2, menuY, title, tcell.StyleDefault.Bold(true))
	
	// Draw info text (wrapped to fit)
	infoLines := wordWrap(field.Info, menuW-6)
	infoY := menuY + 2
	for i, line := range infoLines {
		if i < 3 {  // Show up to 3 lines of info
			m.drawText(menuX+3, infoY+i, line, tcell.StyleDefault)
		}
	}
	
	// Draw separator line
	sepY := infoY + len(infoLines)
	if len(infoLines) > 3 {
		sepY = infoY + 3
	}
	for x := menuX+3; x < menuX+menuW-3; x++ {
		m.screen.SetContent(x, sepY, '─', nil, tcell.StyleDefault.Dim(true))
	}
	
	// Draw Yes option
	yesY := sepY + 2
	yesStyle := tcell.StyleDefault
	yesBriefStyle := tcell.StyleDefault.Dim(true)
	if m.expandedChoice == 1 {
		yesStyle = yesStyle.Background(tcell.ColorDarkGreen).Bold(true)
		yesBriefStyle = tcell.StyleDefault.Background(tcell.ColorDarkGreen)
	}
	m.drawText(menuX+5, yesY, "[ ] Yes", yesStyle)
	if m.expandedChoice == 1 {
		m.screen.SetContent(menuX+6, yesY, '●', nil, yesStyle)  // Filled circle when selected
	}
	m.drawText(menuX+14, yesY, "- "+field.YesBrief, yesBriefStyle)
	
	// Draw No option
	noY := yesY + 1
	noStyle := tcell.StyleDefault
	noBriefStyle := tcell.StyleDefault.Dim(true)
	if m.expandedChoice == 0 {
		noStyle = noStyle.Background(tcell.ColorDarkRed).Bold(true)
		noBriefStyle = tcell.StyleDefault.Background(tcell.ColorDarkRed)
	}
	m.drawText(menuX+5, noY, "[ ] No", noStyle)
	if m.expandedChoice == 0 {
		m.screen.SetContent(menuX+6, noY, '●', nil, noStyle)  // Filled circle when selected
	}
	m.drawText(menuX+14, noY, "- "+field.NoBrief, noBriefStyle)
	
	// Draw help text
	helpText := "↑↓ Select | ↵ Apply | ESC Cancel"
	m.drawText(menuX+(menuW-len(helpText))/2, menuY+menuH-2, helpText, tcell.StyleDefault.Dim(true))
}

// Removed shouldExit - logic is now inline in run() for clarity

func (m *SettingsModal) drawBorder(x, y, w, h int) {
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

func (m *SettingsModal) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		m.screen.SetContent(x+i, y, r, nil, style)
	}
}

// getContext returns the current UI context for logging
func (m *SettingsModal) getContext() string {
	if m.modelDropdown {
		return "modelDropdown"
	}
	if m.expandedField >= 0 {
		return fmt.Sprintf("expandableMenu[%s]", m.fields[m.expandedField].Label)
	}
	if m.editing {
		return fmt.Sprintf("editing[%s]", m.fields[m.selected].Label)
	}
	return "main"
}

// Helper functions

func getProviderOptions() []string {
	return []string{
		string(config.ProviderOpenAI),
		string(config.ProviderBerget),
		string(config.ProviderGroq),
		string(config.ProviderOllama),
		string(config.ProviderLlamafile),
		string(config.ProviderGPT4All),
		string(config.ProviderLMStudio),
		string(config.ProviderLocalAI),
		string(config.ProviderCustom),
	}
}

func maskAPIKey(key string) string {
	if key == "" {
		return "(not set)"
	}
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "..." + key[len(key)-4:]
}

func truncateForDisplay(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func boolToString(b bool) string {
	if b {
		return "Yes"
	}
	return "No"
}