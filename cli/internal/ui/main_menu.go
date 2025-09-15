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
		screen: s,
		config: cfg,
	}

	// Create menu items
	options := menu.getMenuOptions()
	var menuItems []MenuItem
	for _, opt := range options {
		optCopy := opt // Important: capture loop variable
		menuItems = append(menuItems, &MainMenuItem{option: &optCopy})
	}

	menu.menu = NewFilterableMenu(s, "hacka.re CLI Main Menu", menuItems)

	// Configure menu display
	w, h := s.Size()
	menu.menu.SetDimensions(60, 20)
	menu.menu.SetPosition((w-100)/2, (h-20)/2)
	menu.menu.SetInfoPanel(true, 40)

	menu.run()
	return nil
}

// MainMenu represents the main options menu
type MainMenu struct {
	screen   tcell.Screen
	config   *config.Config
	menu     *FilterableMenu
}

// MenuOption represents a menu option
type MenuOption struct {
	Number      int
	Label       string
	Description string
	Info        string
	Action      func(*config.Config) bool // returns true to continue, false to exit menu
}

// MainMenuItem implements MenuItem for main menu options
type MainMenuItem struct {
	option *MenuOption
}

func (m *MainMenuItem) GetID() string          { return fmt.Sprintf("%d", m.option.Number) }
func (m *MainMenuItem) GetNumber() int         { return m.option.Number }
func (m *MainMenuItem) GetTitle() string       { return m.option.Label }
func (m *MainMenuItem) GetDescription() string { return m.option.Description }
func (m *MainMenuItem) GetCategory() string    { return "" }
func (m *MainMenuItem) IsEnabled() bool        { return true }
func (m *MainMenuItem) GetInfo() string        { return m.option.Info }

// getMenuOptions returns the available menu options
func (m *MainMenu) getMenuOptions() []MenuOption {
	return []MenuOption{
		{
			Number:      0,
			Label:       "Open settings",
			Description: "Configure API settings, models, and features",
			Info:        "Access the settings menu to configure:\n\n• API Provider (OpenAI, Groq, Ollama, etc.)\n• API Key and authentication\n• Model selection\n• Temperature and token limits\n• System prompts\n• Stream mode, YOLO mode, Voice control\n\nSettings are saved locally and can be shared via encrypted links.",
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
			Number:      1,
			Label:       "Start chat session",
			Description: "Begin an interactive chat with the AI",
			Info:        "Start an interactive terminal chat session with the configured AI model.\n\nFeatures:\n• Real-time streaming responses\n• Multi-line input support\n• Command history\n• Session persistence\n\nRequires valid API configuration.",
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
			Number:      2,
			Label:       "Save configuration",
			Description: "Save current settings to file",
			Info:        "Save your current configuration to a local file.\n\nThe configuration file stores:\n• API credentials (encrypted)\n• Selected provider and model\n• Chat preferences\n• Custom settings\n\nConfiguration is saved to:\n~/.config/hacka.re/config.json",
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
			Number:      3,
			Label:       "Generate share link",
			Description: "Create a shareable URL with encrypted configuration",
			Info:        "Generate an encrypted share link containing your current configuration.\n\nShare links:\n• Contain encrypted settings\n• Do not expose API keys\n• Can be shared safely\n• Work across devices\n\nNote: This feature is coming soon!",
			Action: func(cfg *config.Config) bool {
				// TODO: Implement share link generation
				m.drawError("Share link generation not yet implemented in TUI")
				m.screen.Show()
				m.screen.PollEvent()
				return true
			},
		},
		{
			Number:      4,
			Label:       "Exit",
			Description: "Quit the application",
			Info:        "Exit the hacka.re CLI.\n\nYour configuration is automatically saved and will be restored next time you run the application.",
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
			selected, escaped := m.menu.HandleInput(ev)
			if escaped {
				log.Info("Exiting main menu")
				return
			} else if selected != nil {
				// Execute the selected action
				if menuItem, ok := selected.(*MainMenuItem); ok {
					log.Info("Menu option selected: %d - %s", menuItem.option.Number, menuItem.option.Label)
					continueMenu := menuItem.option.Action(m.config)
					if !continueMenu {
						return
					}
					// Reset menu after action
					m.menu.Reset()
				}
			}
		case *tcell.EventResize:
			w, h := m.screen.Size()
			m.menu.SetPosition((w-100)/2, (h-20)/2)
			m.screen.Sync()
		}
	}
}

// draw renders the main menu
func (m *MainMenu) draw() {
	m.screen.Clear()
	w, h := m.screen.Size()

	// Draw header
	m.drawHeader(w)

	// Draw the filterable menu
	m.menu.Draw()

	// Draw config status
	m.drawConfigStatus(w, h-8)

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


// drawConfigStatus shows current configuration
func (m *MainMenu) drawConfigStatus(w, y int) {
	style := tcell.StyleDefault.Dim(true)

	// Center the status box
	statusX := (w - 60) / 2

	m.drawText(statusX, y, "Current Configuration:", style.Bold(true))

	if m.config.Provider != "" {
		info := config.Providers[m.config.Provider]
		status := fmt.Sprintf("Provider: %s %s", info.Flag, info.Name)
		m.drawText(statusX+2, y+1, status, style)
	}

	if m.config.Model != "" {
		status := fmt.Sprintf("Model: %s", m.config.Model)
		m.drawText(statusX+2, y+2, status, style)
	}

	if m.config.APIKey != "" {
		maskedKey := m.config.APIKey
		if len(maskedKey) > 4 {
			maskedKey = "****" + maskedKey[len(maskedKey)-4:]
		} else {
			maskedKey = "****"
		}
		status := "API Key: " + maskedKey
		m.drawText(statusX+2, y+3, status, style)
	} else {
		m.drawText(statusX+2, y+3, "API Key: (not set)", style.Foreground(tcell.ColorRed))
	}
}

// drawFooter draws the menu footer
func (m *MainMenu) drawFooter(w, h int) {
	help := "Type to filter | Numbers for direct selection | ↵ Select | ESC Exit"
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