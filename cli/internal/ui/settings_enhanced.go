package ui

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/api"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/models"
)

// EnhancedSettingsModal represents the enhanced settings UI with model dropdown
type EnhancedSettingsModal struct {
	screen        tcell.Screen
	config        *config.Config
	apiClient     *api.Client
	modelRegistry *models.ModelRegistry
	selected      int
	editing       bool
	fields        []EnhancedField
	modelList     []*models.ModelMetadata
	modelDropdown bool
	dropdownIdx   int
}

// EnhancedField represents a settings field with enhanced features
type EnhancedField struct {
	Label       string
	Value       string
	Type        FieldType
	Options     []string // For select fields
	Editable    bool
	Refreshable bool // Can be refreshed from API
}

// ShowEnhancedSettings displays the enhanced settings modal
func ShowEnhancedSettings(cfg *config.Config) error {
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

	modal := &EnhancedSettingsModal{
		screen:        s,
		config:        cfg,
		apiClient:     api.NewClient(cfg),
		modelRegistry: models.NewModelRegistry(),
		fields:        buildEnhancedFields(cfg),
	}

	// Load model list for current provider
	modal.loadModelsForProvider()

	modal.run()
	return nil
}

// buildEnhancedFields creates the enhanced field list from config
func buildEnhancedFields(cfg *config.Config) []EnhancedField {
	fields := []EnhancedField{
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
			Label:    "Stream Response",
			Value:    boolToString(cfg.StreamResponse),
			Type:     FieldBool,
			Editable: true,
		},
		{
			Label:    "YOLO Mode",
			Value:    boolToString(cfg.YoloMode),
			Type:     FieldBool,
			Editable: true,
		},
		{
			Label:    "Voice Control",
			Value:    boolToString(cfg.VoiceControl),
			Type:     FieldBool,
			Editable: true,
		},
	}

	return fields
}

// loadModelsForProvider loads the model list for the current provider
func (m *EnhancedSettingsModal) loadModelsForProvider() {
	provider := models.ModelProvider(m.config.Provider)
	m.modelList = m.modelRegistry.GetProviderModels(provider)
	
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
func (m *EnhancedSettingsModal) run() {
	for {
		m.draw()
		m.screen.Show()

		ev := m.screen.PollEvent()
		switch ev := ev.(type) {
		case *tcell.EventKey:
			m.handleKeyEvent(ev)
		case *tcell.EventResize:
			m.screen.Sync()
		}
		
		// Check if we should exit
		if m.shouldExit(ev) {
			return
		}
	}
}

// handleKeyEvent handles keyboard events
func (m *EnhancedSettingsModal) handleKeyEvent(ev *tcell.EventKey) {
	switch ev.Key() {
	case tcell.KeyEscape:
		if m.modelDropdown {
			m.modelDropdown = false
		} else if m.editing {
			m.editing = false
		}
		
	case tcell.KeyUp:
		if m.modelDropdown {
			if m.dropdownIdx > 0 {
				m.dropdownIdx--
			}
		} else if !m.editing && m.selected > 0 {
			m.selected--
		}
		
	case tcell.KeyDown:
		if m.modelDropdown {
			if m.dropdownIdx < len(m.modelList)-1 {
				m.dropdownIdx++
			}
		} else if !m.editing && m.selected < len(m.fields)-1 {
			m.selected++
		}
		
	case tcell.KeyEnter:
		if m.modelDropdown {
			// Select model from dropdown
			if m.dropdownIdx < len(m.modelList) {
				selectedModel := m.modelList[m.dropdownIdx]
				m.config.Model = selectedModel.ID
				m.fields[3].Value = selectedModel.ID
				m.modelDropdown = false
				
				// Show model info
				m.showModelInfo(selectedModel)
			}
		} else if m.selected == 3 && !m.editing {
			// Open model dropdown
			m.modelDropdown = true
			m.dropdownIdx = m.findModelIndex(m.config.Model)
		} else if !m.editing && m.fields[m.selected].Editable {
			m.editing = true
		} else if m.editing {
			m.applyFieldEdit()
			m.editing = false
		}
		
	case tcell.KeyTab:
		if m.fields[m.selected].Type == FieldSelect && m.selected != 3 {
			// Cycle through options (except for model field which uses dropdown)
			m.cycleOption()
		}
		
	case tcell.KeyCtrlR:
		// Refresh model list from API
		if m.selected == 3 {
			m.refreshModelList()
		}
		
	case tcell.KeyCtrlS:
		// Save configuration
		m.saveConfig()
		
	case tcell.KeyCtrlT:
		// Test API connection
		m.testConnection()
		
	case tcell.KeyCtrlQ:
		// Quit without saving (handled by shouldExit)
		
	case tcell.KeyRune:
		if m.editing {
			m.handleTextInput(ev.Rune())
		}
		
	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if m.editing && len(m.fields[m.selected].Value) > 0 {
			field := &m.fields[m.selected]
			field.Value = field.Value[:len(field.Value)-1]
		}
	}
}

// draw renders the enhanced settings modal
func (m *EnhancedSettingsModal) draw() {
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

	// Draw help text
	helpY := h - 3
	help := "↑↓ Navigate | ↵ Select/Edit | ^R Refresh | ^T Test | ^S Save | ^Q Quit | ESC Cancel"
	m.drawText((w-len(help))/2, helpY, help, tcell.StyleDefault.Dim(true))
}

// drawModelDropdown draws the model selection dropdown
func (m *EnhancedSettingsModal) drawModelDropdown() {
	w, _ := m.screen.Size()
	
	// Calculate dropdown position
	dropdownX := 25
	dropdownY := 5 + 3*2 + 1 // Below model field
	dropdownW := w - dropdownX - 10
	if dropdownW > 80 {
		dropdownW = 80
	}
	dropdownH := len(m.modelList) + 2
	if dropdownH > 20 {
		dropdownH = 20
	}
	
	// Draw dropdown border
	m.drawBorder(dropdownX, dropdownY, dropdownW, dropdownH)
	
	// Draw dropdown title
	title := " Select Model "
	m.drawText(dropdownX+(dropdownW-len(title))/2, dropdownY, title, tcell.StyleDefault)
	
	// Draw model list
	startIdx := 0
	if m.dropdownIdx >= dropdownH-3 {
		startIdx = m.dropdownIdx - (dropdownH - 4)
	}
	
	for i := 0; i < dropdownH-2 && startIdx+i < len(m.modelList); i++ {
		model := m.modelList[startIdx+i]
		style := tcell.StyleDefault
		
		if startIdx+i == m.dropdownIdx {
			style = style.Background(tcell.ColorDarkBlue)
		}
		
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
		
		m.drawText(dropdownX+2, dropdownY+1+i, entry, style)
		
		// Show category badge
		if model.Category != "production" {
			badge := fmt.Sprintf("[%s]", model.Category)
			badgeStyle := tcell.StyleDefault.Dim(true)
			if model.Category == "preview" {
				badgeStyle = badgeStyle.Foreground(tcell.ColorYellow)
			} else if model.Category == "legacy" {
				badgeStyle = badgeStyle.Foreground(tcell.ColorRed)
			}
			m.drawText(dropdownX+dropdownW-len(badge)-2, dropdownY+1+i, badge, badgeStyle)
		}
	}
	
	// Show scrollbar if needed
	if len(m.modelList) > dropdownH-2 {
		scrollPos := (m.dropdownIdx * (dropdownH - 3)) / len(m.modelList)
		m.screen.SetContent(dropdownX+dropdownW-2, dropdownY+1+scrollPos, '▓', nil, tcell.StyleDefault)
	}
}

// showModelInfo displays information about the selected model
func (m *EnhancedSettingsModal) showModelInfo(model *models.ModelMetadata) {
	w, h := m.screen.Size()
	
	// Create info box
	infoW := 60
	infoH := 10
	infoX := (w - infoW) / 2
	infoY := (h - infoH) / 2
	
	// Clear area and draw border
	for y := infoY; y < infoY+infoH; y++ {
		for x := infoX; x < infoX+infoW; x++ {
			m.screen.SetContent(x, y, ' ', nil, tcell.StyleDefault)
		}
	}
	m.drawBorder(infoX, infoY, infoW, infoH)
	
	// Draw title
	title := fmt.Sprintf(" %s ", model.Name)
	m.drawText(infoX+(infoW-len(title))/2, infoY, title, tcell.StyleDefault.Bold(true))
	
	// Draw model info
	info := []string{
		fmt.Sprintf("ID: %s", model.ID),
		fmt.Sprintf("Context: %d tokens", model.ContextWindow),
		fmt.Sprintf("Max Output: %d tokens", model.MaxTokens),
		fmt.Sprintf("Category: %s", model.Category),
		fmt.Sprintf("Owner: %s", model.OwnedBy),
	}
	
	if len(model.Description) > 0 {
		info = append(info, fmt.Sprintf("Info: %s", model.Description))
	}
	
	if len(model.Capabilities) > 0 {
		info = append(info, fmt.Sprintf("Features: %s", strings.Join(model.Capabilities, ", ")))
	}
	
	for i, line := range info {
		if i < infoH-2 {
			m.drawText(infoX+2, infoY+1+i, line, tcell.StyleDefault)
		}
	}
	
	m.screen.Show()
	
	// Wait for key press
	ev := m.screen.PollEvent()
	if _, ok := ev.(*tcell.EventKey); ok {
		// Redraw main screen
		m.draw()
	}
}

// refreshModelList refreshes the model list from the API
func (m *EnhancedSettingsModal) refreshModelList() {
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
func (m *EnhancedSettingsModal) testConnection() {
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

func (m *EnhancedSettingsModal) findModelIndex(modelID string) int {
	for i, model := range m.modelList {
		if model.ID == modelID {
			return i
		}
	}
	return 0
}

func (m *EnhancedSettingsModal) cycleOption() {
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

func (m *EnhancedSettingsModal) applyFieldEdit() {
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

func (m *EnhancedSettingsModal) handleTextInput(r rune) {
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

func (m *EnhancedSettingsModal) saveConfig() {
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

func (m *EnhancedSettingsModal) shouldExit(ev tcell.Event) bool {
	if key, ok := ev.(*tcell.EventKey); ok {
		return key.Key() == tcell.KeyCtrlQ || 
		       (key.Key() == tcell.KeyEscape && !m.editing && !m.modelDropdown)
	}
	return false
}

func (m *EnhancedSettingsModal) drawBorder(x, y, w, h int) {
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

func (m *EnhancedSettingsModal) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		m.screen.SetContent(x+i, y, r, nil, style)
	}
}