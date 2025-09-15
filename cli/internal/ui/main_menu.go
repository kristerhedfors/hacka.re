package ui

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/chat"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
)

// ShowMainMenu displays the main options menu
func ShowMainMenu(cfg *config.Config) error {
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

	menu := &MainMenu{
		screen:   s,
		config:   cfg,
		selected: 0,
	}

	menu.run()
	return nil
}

// MainMenu represents the main options menu
type MainMenu struct {
	screen   tcell.Screen
	config   *config.Config
	selected int
}

// MenuOption represents a menu option
type MenuOption struct {
	Number      string
	Label       string
	Description string
	Action      func(*config.Config) bool // returns true to continue, false to exit menu
}

// getMenuOptions returns the available menu options
func (m *MainMenu) getMenuOptions() []MenuOption {
	return []MenuOption{
		{
			Number:      "1",
			Label:       "Open settings",
			Description: "Configure API settings, models, and features",
			Action: func(cfg *config.Config) bool {
				// Show settings - it returns to this menu on ESC
				if err := ShowSettings(cfg); err != nil {
					log := logger.Get()
					log.Error("Error showing settings: %v", err)
				}
				return true // Continue showing menu after settings closes
			},
		},
		{
			Number:      "2",
			Label:       "Start chat session",
			Description: "Begin an interactive chat with the AI",
			Action: func(cfg *config.Config) bool {
				// Validate configuration
				if cfg.APIKey == "" || cfg.BaseURL == "" {
					m.drawError("API key and Base URL are required. Please configure settings first.")
					m.screen.Show()
					m.screen.PollEvent() // Wait for key
					return true
				}
				// Start chat
				if err := chat.StartChat(cfg); err != nil {
					m.drawError(fmt.Sprintf("Error starting chat: %v", err))
					m.screen.Show()
					m.screen.PollEvent() // Wait for key
				}
				return true
			},
		},
		{
			Number:      "3",
			Label:       "Save configuration",
			Description: "Save current settings to file",
			Action: func(cfg *config.Config) bool {
				configPath := config.GetConfigPath()
				if err := cfg.SaveToFile(configPath); err != nil {
					m.drawError(fmt.Sprintf("Error saving: %v", err))
				} else {
					m.drawSuccess(fmt.Sprintf("Configuration saved to %s", configPath))
				}
				m.screen.Show()
				m.screen.PollEvent() // Wait for key
				return true
			},
		},
		{
			Number:      "4",
			Label:       "Generate share link",
			Description: "Create a shareable URL with encrypted configuration",
			Action: func(cfg *config.Config) bool {
				// TODO: Implement share link generation
				m.drawError("Share link generation not yet implemented in TUI")
				m.screen.Show()
				m.screen.PollEvent()
				return true
			},
		},
		{
			Number:      "5",
			Label:       "Exit",
			Description: "Quit the application",
			Action: func(cfg *config.Config) bool {
				return false // Exit menu
			},
		},
	}
}

// run runs the main menu event loop
func (m *MainMenu) run() {
	log := logger.Get()
	log.Info("Main menu opened")
	
	for {
		m.draw()
		m.screen.Show()

		ev := m.screen.PollEvent()
		switch ev := ev.(type) {
		case *tcell.EventKey:
			handled := m.handleKeyEvent(ev)
			if !handled {
				return // Exit menu
			}
		case *tcell.EventResize:
			m.screen.Sync()
		}
	}
}

// handleKeyEvent handles keyboard input
func (m *MainMenu) handleKeyEvent(ev *tcell.EventKey) bool {
	log := logger.Get()
	options := m.getMenuOptions()
	
	switch ev.Key() {
	case tcell.KeyUp:
		if m.selected > 0 {
			m.selected--
			log.Debug("Menu selection up: %d", m.selected)
		}
		
	case tcell.KeyDown:
		if m.selected < len(options)-1 {
			m.selected++
			log.Debug("Menu selection down: %d", m.selected)
		}
		
	case tcell.KeyEnter:
		option := options[m.selected]
		log.Info("Menu option selected: %s - %s", option.Number, option.Label)
		// Execute action and check if we should continue
		return option.Action(m.config)
		
	case tcell.KeyRune:
		// Handle number key selection
		r := ev.Rune()
		if r >= '1' && r <= '5' {
			idx := int(r - '1')
			if idx < len(options) {
				m.selected = idx
				log.Info("Menu option selected by number: %s", options[idx].Label)
				return options[idx].Action(m.config)
			}
		}
		
	case tcell.KeyEscape, tcell.KeyCtrlQ:
		log.Info("Exiting main menu")
		return false // Exit menu
	}
	
	return true // Continue menu
}

// draw renders the main menu
func (m *MainMenu) draw() {
	m.screen.Clear()
	w, h := m.screen.Size()
	
	// Draw header
	m.drawHeader(w)
	
	// Draw menu options
	m.drawMenuOptions(w, h)
	
	// Draw footer
	m.drawFooter(w, h)
}

// drawHeader draws the menu header
func (m *MainMenu) drawHeader(w int) {
	header := []string{
		"╔════════════════════════════════════════════╗",
		"║         hacka.re: serverless agency         ║",
		"╠════════════════════════════════════════════╣",
		"║              Main Menu                      ║",
		"╚════════════════════════════════════════════╝",
	}
	
	startX := (w - len(header[0])) / 2
	for i, line := range header {
		m.drawText(startX, i+1, line, tcell.StyleDefault)
	}
}

// drawMenuOptions draws the menu options
func (m *MainMenu) drawMenuOptions(w, h int) {
	options := m.getMenuOptions()
	startY := 8
	
	for i, opt := range options {
		y := startY + i*3
		
		// Highlight selected option
		style := tcell.StyleDefault
		if i == m.selected {
			style = style.Background(tcell.ColorDarkBlue)
		}
		
		// Draw option number and label
		optionText := fmt.Sprintf("  %s. %s", opt.Number, opt.Label)
		m.drawText(10, y, optionText, style.Bold(true))
		
		// Draw description
		descText := fmt.Sprintf("     %s", opt.Description)
		m.drawText(10, y+1, descText, tcell.StyleDefault.Dim(true))
	}
	
	// Show current configuration status
	m.drawConfigStatus(w, startY + len(options)*3 + 2)
}

// drawConfigStatus shows current configuration
func (m *MainMenu) drawConfigStatus(w, y int) {
	style := tcell.StyleDefault.Dim(true)
	
	m.drawText(10, y, "Current Configuration:", style.Bold(true))
	
	if m.config.Provider != "" {
		info := config.Providers[m.config.Provider]
		status := fmt.Sprintf("Provider: %s %s", info.Flag, info.Name)
		m.drawText(12, y+1, status, style)
	}
	
	if m.config.Model != "" {
		status := fmt.Sprintf("Model: %s", m.config.Model)
		m.drawText(12, y+2, status, style)
	}
	
	if m.config.APIKey != "" {
		status := "API Key: ****" + m.config.APIKey[len(m.config.APIKey)-4:]
		m.drawText(12, y+3, status, style)
	} else {
		m.drawText(12, y+3, "API Key: (not set)", style.Foreground(tcell.ColorRed))
	}
}

// drawFooter draws the menu footer
func (m *MainMenu) drawFooter(w, h int) {
	help := "↑↓ Navigate | ↵ Select | 1-5 Quick Select | ESC/^Q Exit"
	m.drawText((w-len(help))/2, h-2, help, tcell.StyleDefault.Dim(true))
}

// drawText draws text at the specified position
func (m *MainMenu) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		m.screen.SetContent(x+i, y, r, nil, style)
	}
}

// drawError draws an error message
func (m *MainMenu) drawError(msg string) {
	w, h := m.screen.Size()
	m.drawText((w-len(msg))/2, h/2, msg, tcell.StyleDefault.Foreground(tcell.ColorRed))
}

// drawSuccess draws a success message
func (m *MainMenu) drawSuccess(msg string) {
	w, h := m.screen.Size()
	m.drawText((w-len(msg))/2, h/2, msg, tcell.StyleDefault.Foreground(tcell.ColorGreen))
}