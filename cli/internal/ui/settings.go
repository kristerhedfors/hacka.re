package ui

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/config"
)

// SettingsModal represents the settings UI
type SettingsModal struct {
	screen   tcell.Screen
	config   *config.Config
	selected int
	editing  bool
	fields   []Field
}

// Field represents a settings field
type Field struct {
	Label    string
	Value    string
	Type     FieldType
	Options  []string // For select fields
	Editable bool
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

// ShowSettings displays the settings modal
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
		screen: s,
		config: cfg,
		fields: buildFields(cfg),
	}

	modal.run()
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
			Label:    "Model",
			Value:    cfg.Model,
			Type:     FieldText,
			Editable: true,
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
	}

	return fields
}

// run runs the main event loop
func (m *SettingsModal) run() {
	for {
		m.draw()
		m.screen.Show()

		ev := m.screen.PollEvent()
		switch ev := ev.(type) {
		case *tcell.EventKey:
			switch ev.Key() {
			case tcell.KeyEscape:
				if m.editing {
					m.editing = false
				} else {
					return
				}
			case tcell.KeyUp:
				if !m.editing && m.selected > 0 {
					m.selected--
				}
			case tcell.KeyDown:
				if !m.editing && m.selected < len(m.fields)-1 {
					m.selected++
				}
			case tcell.KeyEnter:
				if !m.editing && m.fields[m.selected].Editable {
					m.editing = true
				} else if m.editing {
					m.editing = false
					// TODO: Apply changes to config
				}
			case tcell.KeyTab:
				if m.fields[m.selected].Type == FieldSelect {
					// Cycle through options
					m.cycleOption()
				}
			case tcell.KeyCtrlS:
				// Save configuration
				m.saveConfig()
				return
			case tcell.KeyCtrlQ:
				return
			}
		case *tcell.EventResize:
			m.screen.Sync()
		}
	}
}

// draw renders the settings modal
func (m *SettingsModal) draw() {
	m.screen.Clear()
	w, h := m.screen.Size()

	// Draw border
	m.drawBorder(2, 1, w-4, h-2)

	// Draw title
	title := " hacka.re: settings "
	m.drawText((w-len(title))/2, 1, title, tcell.StyleDefault.Bold(true))

	// Draw fields
	startY := 3
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
		m.drawText(25, startY+i*2, value, style)

		// Draw edit indicator
		if field.Editable {
			indicator := " [↵]"
			if i == m.selected && m.editing {
				indicator = " [editing...]"
			}
			m.drawText(25+len(value), startY+i*2, indicator, tcell.StyleDefault.Dim(true))
		}
	}

	// Draw help text
	helpY := h - 3
	help := "↑↓ Navigate | ↵ Edit | Tab Cycle | ^S Save | ^Q Quit | ESC Cancel"
	m.drawText((w-len(help))/2, helpY, help, tcell.StyleDefault.Dim(true))
}

// drawBorder draws a box border
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

// drawText draws text at the specified position
func (m *SettingsModal) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		m.screen.SetContent(x+i, y, r, nil, style)
	}
}

// cycleOption cycles through select field options
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
		// Update base URL
		if m.config.Provider != config.ProviderCustom {
			m.config.BaseURL = config.GetProviderBaseURL(m.config.Provider)
			m.fields[1].Value = m.config.BaseURL
			m.fields[1].Editable = false
		} else {
			m.fields[1].Editable = true
		}
	}
}

// saveConfig saves the configuration
func (m *SettingsModal) saveConfig() {
	// TODO: Apply all field changes to config
	
	configPath := config.GetConfigPath()
	if err := m.config.SaveToFile(configPath); err != nil {
		// Show error message
		m.drawText(4, 4, fmt.Sprintf("Error saving: %v", err), tcell.StyleDefault.Foreground(tcell.ColorRed))
		m.screen.Show()
	} else {
		// Show success message
		m.drawText(4, 4, "Configuration saved!", tcell.StyleDefault.Foreground(tcell.ColorGreen))
		m.screen.Show()
	}
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