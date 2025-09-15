package rich

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/tui/internal/core"
)

// App represents the rich TUI application
type App struct {
	screen   tcell.Screen
	config   *core.ConfigManager
	state    *core.AppState
	eventBus *core.EventBus

	mainMenu      *FilterableMenu
	settingsModal *SettingsModalV2
	currentPanel  Panel
	running       bool
	needsRedraw   bool
}

// Panel represents different application panels
type Panel int

const (
	PanelMainMenu Panel = iota
	PanelChat
	PanelSettings
	PanelPrompts
	PanelFunctions
	PanelMCP
	PanelRAG
)

// NewApp creates a new rich TUI application
func NewApp(config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) (*App, error) {
	return NewAppWithCallbacks(config, state, eventBus, nil)
}

// NewAppWithCallbacks creates a new rich TUI application with external callbacks
func NewAppWithCallbacks(config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus, callbacks interface{}) (*App, error) {
	screen, err := tcell.NewScreen()
	if err != nil {
		return nil, err
	}

	if err := screen.Init(); err != nil {
		return nil, err
	}

	// Enable mouse support
	screen.EnableMouse()

	// Set default style
	screen.SetStyle(tcell.StyleDefault.Background(tcell.ColorReset).Foreground(tcell.ColorReset))

	app := &App{
		screen:       screen,
		config:       config,
		state:        state,
		eventBus:     eventBus,
		currentPanel: PanelMainMenu,
		needsRedraw:  true,
	}

	// Store callbacks in state if provided
	if callbacks != nil {
		state.SetCallbacks(callbacks)
	}

	// Create main menu
	app.createMainMenu()

	// Subscribe to events
	app.subscribeToEvents()

	return app, nil
}

// createMainMenu sets up the main menu
func (a *App) createMainMenu() {
	a.mainMenu = NewFilterableMenu(a.screen, "hacka.re Terminal UI v2.0")

	// Configure menu position and size
	w, h := a.screen.Size()
	menuWidth := 50
	menuHeight := 20
	infoWidth := 40

	a.mainMenu.SetDimensions(menuWidth, menuHeight)
	a.mainMenu.SetPosition((w-menuWidth-infoWidth-2)/2, (h-menuHeight)/2)
	a.mainMenu.SetInfoPanel(true, infoWidth)

	// Add menu items
	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      0,
		Title:       "Open Settings",
		Description: "Configure API settings, models, and features",
		Info: `Access the settings menu to configure:

• API Provider (OpenAI, Groq, Ollama, etc.)
• API Key and authentication
• Model selection
• Temperature and token limits
• System prompts
• Stream mode, YOLO mode, Voice control

Settings are saved locally and can be shared via encrypted links.`,
		Enabled: true,
		Handler: func() error {
			a.currentPanel = PanelSettings
			return a.showSettings()
		},
	})

	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      1,
		Title:       "Start Chat",
		Description: "Begin an interactive chat session",
		Info: `Start chatting with the AI assistant.

Features:
• Real-time streaming responses
• Multi-turn conversations
• Message history
• Export chat logs
• System prompt support

The chat interface supports both simple messages and complex conversations with context retention.`,
		Enabled: true,
		Handler: func() error {
			a.currentPanel = PanelChat
			return a.showChat()
		},
	})

	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      2,
		Title:       "Manage Prompts",
		Description: "Create and manage system prompts",
		Info: `Manage system prompts that define the AI's behavior and personality.

• Create custom prompts
• Edit existing prompts
• Import/Export prompt libraries
• Set default prompts
• Category organization

System prompts help customize the AI's responses for specific use cases.`,
		Enabled: true,
		Handler: func() error {
			a.currentPanel = PanelPrompts
			return a.showPrompts()
		},
	})

	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      3,
		Title:       "Functions",
		Description: "Manage callable functions",
		Info: `Define and manage functions that the AI can call.

• Create new functions
• Edit function code
• Enable/disable functions
• Test function execution
• Import function libraries

Functions extend the AI's capabilities with custom code execution.`,
		Enabled: true,
		Handler: func() error {
			a.currentPanel = PanelFunctions
			return a.showFunctions()
		},
	})

	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      4,
		Title:       "MCP Servers",
		Description: "Configure MCP server connections",
		Info: `Model Context Protocol (MCP) server management.

• Connect to MCP servers
• Browse available tools
• Configure server settings
• Monitor connections
• Quick connectors for popular services

MCP enables the AI to interact with external services and tools.`,
		Enabled: true,
		Handler: func() error {
			a.currentPanel = PanelMCP
			return a.showMCP()
		},
	})

	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      5,
		Title:       "RAG Configuration",
		Description: "Set up Retrieval-Augmented Generation",
		Info: `Configure RAG for enhanced AI responses using your documents.

• Upload documents
• Configure embeddings
• Set retrieval parameters
• Manage document collections
• Query testing

RAG allows the AI to reference your specific documents and data.`,
		Enabled: true,
		Handler: func() error {
			a.currentPanel = PanelRAG
			return a.showRAG()
		},
	})

	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      6,
		Title:       "Share Configuration",
		Description: "Generate a shareable configuration link",
		Info: `Create an encrypted link to share your configuration.

• Export current settings
• Generate secure link
• Optional password protection
• QR code generation
• Import shared configurations

Share links allow you to transfer settings between devices securely.`,
		Enabled: true,
		Handler: func() error {
			return a.generateShareLink()
		},
	})

	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      7,
		Title:       "Switch to Socket Mode",
		Description: "Use simple terminal mode",
		Info: `Switch to socket mode for basic terminals.

Socket mode features:
• Works over any character stream
• No special terminal requirements
• Slash commands (/help, /chat, etc.)
• Minimal bandwidth usage
• Maximum compatibility

Useful for SSH, telnet, or serial connections.`,
		Enabled: true,
		Handler: func() error {
			a.state.SetMode(core.ModeSocket)
			return fmt.Errorf("switching to socket mode")
		},
	})

	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      8,
		Title:       "About",
		Description: "About hacka.re Terminal UI",
		Info: `hacka.re Terminal UI v2.0

A privacy-focused, serverless chat interface for OpenAI-compatible APIs.

Features:
• Dual-mode interface (Rich TUI & Socket)
• Complete client-side operation
• Encrypted configuration storage
• No tracking or analytics
• Open source

Built with Go, tcell, and love.`,
		Enabled: true,
		Handler: func() error {
			return a.showAbout()
		},
	})

	a.mainMenu.AddItem(&BasicMenuItem{
		Number:      9,
		Title:       "Exit",
		Description: "Exit the application",
		Info: `Exit the hacka.re Terminal UI.

Your settings and configuration are automatically saved.

Press Enter to confirm exit, or ESC to cancel.`,
		Enabled: true,
		Handler: func() error {
			a.running = false
			return nil
		},
	})
}

// Run starts the application main loop
func (a *App) Run() error {
	defer a.screen.Fini()

	a.running = true

	// Clear screen and sync
	a.screen.Clear()
	a.screen.Sync()

	// Main event loop
	for a.running {
		// Redraw if needed
		if a.needsRedraw {
			a.draw()
			a.needsRedraw = false
		}

		// Poll for events
		ev := a.screen.PollEvent()
		if ev == nil {
			continue
		}

		// Handle events
		switch ev := ev.(type) {
		case *tcell.EventKey:
			a.handleKeyEvent(ev)

		case *tcell.EventResize:
			a.screen.Sync()
			a.needsRedraw = true

		case *tcell.EventMouse:
			// Could handle mouse events here
		}
	}

	return nil
}

// handleKeyEvent processes keyboard input
func (a *App) handleKeyEvent(ev *tcell.EventKey) {
	switch a.currentPanel {
	case PanelMainMenu:
		item, exit := a.mainMenu.HandleInput(ev)
		if exit {
			a.running = false
		} else if item != nil {
			// Check if it's a BasicMenuItem with a handler
			if basicItem, ok := item.(*BasicMenuItem); ok && basicItem.Handler != nil {
				if err := basicItem.Handler(); err != nil {
					if err.Error() == "switching to socket mode" {
						a.running = false
					}
				}
			}
		}
		a.needsRedraw = true

	case PanelSettings:
		if a.settingsModal != nil {
			done := a.settingsModal.HandleInput(ev)
			if done {
				a.currentPanel = PanelMainMenu
				a.settingsModal = nil
			}
			a.needsRedraw = true
		}

	default:
		// Handle other panels
		if ev.Key() == tcell.KeyEscape {
			a.currentPanel = PanelMainMenu
			a.needsRedraw = true
		}
	}
}

// draw renders the current view
func (a *App) draw() {
	a.screen.Clear()

	switch a.currentPanel {
	case PanelMainMenu:
		a.mainMenu.Draw()

	case PanelSettings:
		if a.settingsModal != nil {
			a.settingsModal.Draw()
		}

	case PanelChat:
		a.drawPlaceholder("Chat Panel", "Chat interface coming soon.\nPress ESC to return to main menu.")

	case PanelPrompts:
		a.drawPlaceholder("Prompts Panel", "Prompt management coming soon.\nPress ESC to return to main menu.")

	case PanelFunctions:
		a.drawPlaceholder("Functions Panel", "Function management coming soon.\nPress ESC to return to main menu.")

	case PanelMCP:
		a.drawPlaceholder("MCP Panel", "MCP server configuration coming soon.\nPress ESC to return to main menu.")

	case PanelRAG:
		a.drawPlaceholder("RAG Panel", "RAG configuration coming soon.\nPress ESC to return to main menu.")
	}

	a.screen.Show()
}

// drawPlaceholder draws a placeholder screen
func (a *App) drawPlaceholder(title, message string) {
	w, h := a.screen.Size()

	// Draw title
	titleX := (w - len(title)) / 2
	titleY := h / 2 - 2

	style := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	for i, r := range title {
		a.screen.SetContent(titleX+i, titleY, r, nil, style)
	}

	// Draw message
	lines := []string{}
	for _, line := range strings.Split(message, "\n") {
		lines = append(lines, line)
	}

	msgStyle := tcell.StyleDefault.Foreground(tcell.ColorWhite)
	for i, line := range lines {
		msgX := (w - len(line)) / 2
		msgY := titleY + 2 + i
		for j, r := range line {
			a.screen.SetContent(msgX+j, msgY, r, nil, msgStyle)
		}
	}
}

// subscribeToEvents sets up event handlers
func (a *App) subscribeToEvents() {
	// Handle config changes
	a.eventBus.Subscribe(core.EventConfigChanged, func(e core.Event) {
		a.needsRedraw = true
	})

	// Handle message events
	a.eventBus.Subscribe(core.EventMessageAdded, func(e core.Event) {
		if a.currentPanel == PanelChat {
			a.needsRedraw = true
		}
	})
}

// Panel handler methods
func (a *App) showSettings() error {
	// Create settings modal with filterable menu
	a.settingsModal = NewSettingsModalV2(a.screen, a.config)

	// Set callbacks
	a.settingsModal.onSave = func(cfg *core.Config) error {
		// Publish config changed event
		a.eventBus.PublishAsync(core.EventConfigChanged, cfg)
		// Return to main menu
		a.currentPanel = PanelMainMenu
		a.settingsModal = nil
		return nil
	}

	a.settingsModal.onCancel = func() {
		a.currentPanel = PanelMainMenu
		a.settingsModal = nil
	}

	return nil
}

func (a *App) showChat() error {
	// Chat panel implementation
	return nil
}

func (a *App) showPrompts() error {
	// Prompts panel implementation
	return nil
}

func (a *App) showFunctions() error {
	// Functions panel implementation
	return nil
}

func (a *App) showMCP() error {
	// MCP panel implementation
	return nil
}

func (a *App) showRAG() error {
	// RAG panel implementation
	return nil
}

func (a *App) generateShareLink() error {
	// Share link generation
	return nil
}

func (a *App) showAbout() error {
	// About panel
	return nil
}