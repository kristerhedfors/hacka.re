package internal

import (
	// "fmt" // Unused - socket mode disabled
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
	"github.com/hacka-re/cli/internal/tui/internal/pages"
)

// App represents the rich TUI application
type App struct {
	screen   tcell.Screen
	config   *core.ConfigManager
	state    *core.AppState
	eventBus *core.EventBus

	mainMenu       *components.FilterableMenu
	settingsModal  *pages.SettingsModal
	chatPanel      *components.ChatPanel
	confirmDialog  *components.ConfirmDialog

	// Configuration view pages (read-only)
	promptsPage    *pages.PromptsReadOnlyPage
	functionsPage  *pages.FunctionsPage
	mcpServersPage *pages.MCPServersPage
	ragPage        *pages.RAGPage
	sharePage      *pages.SharePage

	showConfirmExit bool
	currentPanel   Panel
	running        bool
	needsRedraw    bool
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
	PanelShare
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

	// Enable mouse support for scrolling
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
	a.mainMenu = components.NewFilterableMenu(a.screen, "hacka.re Terminal UI v2.0")

	// Configure menu position and size
	w, h := a.screen.Size()
	menuWidth := 50
	menuHeight := 20
	infoWidth := 40

	a.mainMenu.SetDimensions(menuWidth, menuHeight)
	a.mainMenu.SetPosition((w-menuWidth-infoWidth-2)/2, (h-menuHeight)/2)
	a.mainMenu.SetInfoPanel(true, infoWidth)

	// Add menu items
	a.mainMenu.AddItem(&components.BasicMenuItem{
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

	a.mainMenu.AddItem(&components.BasicMenuItem{
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
			// Use the TUI's internal chat panel
			a.currentPanel = PanelChat
			return a.showChat()
		},
	})

	a.mainMenu.AddItem(&components.BasicMenuItem{
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

	a.mainMenu.AddItem(&components.BasicMenuItem{
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

	a.mainMenu.AddItem(&components.BasicMenuItem{
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

	a.mainMenu.AddItem(&components.BasicMenuItem{
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

	a.mainMenu.AddItem(&components.BasicMenuItem{
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

	/* ============================================================
	   SOCKET MODE OPTION DISABLED - WORKING ON TUI ONLY
	   ============================================================
	a.mainMenu.AddItem(&components.BasicMenuItem{
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
	*/

	a.mainMenu.AddItem(&components.BasicMenuItem{
		Number:      7,
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

	a.mainMenu.AddItem(&components.BasicMenuItem{
		Number:      8,
		Title:       "Exit",
		Description: "Exit the application",
		Info: `Exit the hacka.re Terminal UI.

Your settings and configuration are automatically saved.

Press Enter to confirm exit, or ESC to cancel.`,
		Enabled: true,
		Handler: func() error {
			a.showExitConfirmation()
			return nil
		},
	})
}

// SetInitialPanel sets the panel to display when the app starts
func (a *App) SetInitialPanel(panelName string) {
	switch panelName {
	case "functions":
		a.currentPanel = PanelFunctions
		a.showFunctions()
	case "prompts":
		a.currentPanel = PanelPrompts
		a.showPrompts()
	case "mcp":
		a.currentPanel = PanelMCP
		a.showMCP()
	case "rag":
		a.currentPanel = PanelRAG
		a.showRAG()
	case "share":
		a.currentPanel = PanelShare
		a.generateShareLink()
	case "settings":
		a.currentPanel = PanelSettings
		a.showSettings()
	case "chat":
		a.currentPanel = PanelChat
		a.showChat()
	default:
		// Stay on main menu
		a.currentPanel = PanelMainMenu
	}
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
			a.handleMouseEvent(ev)
		}
	}

	return nil
}

// handleKeyEvent processes keyboard input
func (a *App) handleKeyEvent(ev *tcell.EventKey) {
	// Handle exit confirmation dialog first if it's showing
	if a.showConfirmExit && a.confirmDialog != nil {
		confirmed, done := a.confirmDialog.HandleInput(ev)
		if done {
			if confirmed {
				// User confirmed exit
				a.running = false
			} else {
				// User cancelled exit
				a.showConfirmExit = false
				a.confirmDialog = nil
			}
		}
		a.needsRedraw = true
		return
	}

	switch a.currentPanel {
	case PanelMainMenu:
		item, exit := a.mainMenu.HandleInput(ev)
		if exit {
			// Show exit confirmation dialog
			a.showExitConfirmation()
		} else if item != nil {
			// Check if it's a BasicMenuItem with a handler
			if basicItem, ok := item.(*components.BasicMenuItem); ok && basicItem.Handler != nil {
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

	case PanelChat:
		if a.chatPanel != nil {
			done := a.chatPanel.HandleInput(ev)
			if done {
				a.currentPanel = PanelMainMenu
				a.chatPanel = nil // Reset chat panel to save memory
			}
			a.needsRedraw = true
		}

	case PanelPrompts:
		if a.promptsPage != nil {
			done := a.promptsPage.HandleInput(ev)
			if done {
				a.currentPanel = PanelMainMenu
				a.promptsPage = nil
			}
			a.needsRedraw = true
		}

	case PanelFunctions:
		if a.functionsPage != nil {
			done := a.functionsPage.HandleInput(ev)
			if done {
				a.currentPanel = PanelMainMenu
				a.functionsPage = nil
			}
			a.needsRedraw = true
		}

	case PanelMCP:
		if a.mcpServersPage != nil {
			done := a.mcpServersPage.HandleInput(ev)
			if done {
				a.currentPanel = PanelMainMenu
				a.mcpServersPage = nil
			}
			a.needsRedraw = true
		}

	case PanelRAG:
		if a.ragPage != nil {
			done := a.ragPage.HandleInput(ev)
			if done {
				a.currentPanel = PanelMainMenu
				a.ragPage = nil
			}
			a.needsRedraw = true
		}

	case PanelShare:
		if a.sharePage != nil {
			done := a.sharePage.HandleInput(ev)
			if done {
				a.currentPanel = PanelMainMenu
				a.sharePage = nil
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
		if a.chatPanel != nil {
			a.chatPanel.Draw()
		}

	case PanelPrompts:
		if a.promptsPage != nil {
			a.promptsPage.Draw()
		} else {
			a.drawPlaceholder("Prompts Panel", "Loading...")
		}

	case PanelFunctions:
		if a.functionsPage != nil {
			a.functionsPage.Draw()
		} else {
			a.drawPlaceholder("Functions Panel", "Loading...")
		}

	case PanelMCP:
		if a.mcpServersPage != nil {
			a.mcpServersPage.Draw()
		} else {
			a.drawPlaceholder("MCP Panel", "Loading...")
		}

	case PanelRAG:
		if a.ragPage != nil {
			a.ragPage.Draw()
		} else {
			a.drawPlaceholder("RAG Panel", "Loading...")
		}

	case PanelShare:
		if a.sharePage != nil {
			a.sharePage.Draw()
		} else {
			a.drawPlaceholder("Share Panel", "Loading...")
		}
	}

	// Draw exit confirmation dialog on top if active
	if a.showConfirmExit && a.confirmDialog != nil {
		a.confirmDialog.Draw()
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
	a.settingsModal = pages.NewSettingsModal(a.screen, a.config, a.state)

	// Set callbacks
	a.settingsModal.OnSave = func(cfg *core.Config) error {
		// Publish config changed event
		a.eventBus.PublishAsync(core.EventConfigChanged, cfg)
		// Return to main menu
		a.currentPanel = PanelMainMenu
		a.settingsModal = nil
		return nil
	}

	a.settingsModal.OnCancel = func() {
		a.currentPanel = PanelMainMenu
		a.settingsModal = nil
	}

	return nil
}

func (a *App) showChat() error {
	// Create chat panel if it doesn't exist
	if a.chatPanel == nil {
		a.chatPanel = components.NewChatPanel(a.screen, a.config, a.state, a.eventBus)
	}

	// Update panel dimensions in case screen size changed
	w, h := a.screen.Size()
	padding := 2
	a.chatPanel.SetDimensions(w-(padding*2), h-(padding*2))
	a.chatPanel.SetPosition(padding, padding)

	a.currentPanel = PanelChat
	a.needsRedraw = true
	return nil
}

func (a *App) showPrompts() error {
	// Create read-only prompts page
	if a.promptsPage == nil {
		// Use the read-only version for viewing configuration
		a.promptsPage = pages.NewPromptsReadOnlyPage(a.screen, a.config, a.state, a.eventBus)
	}
	a.currentPanel = PanelPrompts
	a.needsRedraw = true
	return nil
}

func (a *App) showFunctions() error {
	// Create functions page (read-only)
	if a.functionsPage == nil {
		a.functionsPage = pages.NewFunctionsPage(a.screen, a.config, a.state, a.eventBus)
	}
	a.currentPanel = PanelFunctions
	a.needsRedraw = true
	return nil
}

func (a *App) showMCP() error {
	// Create MCP servers page (read-only)
	if a.mcpServersPage == nil {
		a.mcpServersPage = pages.NewMCPServersPage(a.screen, a.config, a.state, a.eventBus)
	}
	a.currentPanel = PanelMCP
	a.needsRedraw = true
	return nil
}

func (a *App) showRAG() error {
	// Create RAG configuration page (read-only)
	if a.ragPage == nil {
		a.ragPage = pages.NewRAGPage(a.screen, a.config, a.state, a.eventBus)
	}
	a.currentPanel = PanelRAG
	a.needsRedraw = true
	return nil
}

func (a *App) generateShareLink() error {
	// Create share configuration page (read-only)
	if a.sharePage == nil {
		a.sharePage = pages.NewSharePage(a.screen, a.config, a.state, a.eventBus)
	}
	a.currentPanel = PanelShare
	a.needsRedraw = true
	return nil
}

func (a *App) showAbout() error {
	// About panel
	return nil
}

// handleMouseEvent processes mouse input
func (a *App) handleMouseEvent(ev *tcell.EventMouse) {
	if a.currentPanel == PanelChat && a.chatPanel != nil {
		// Pass mouse events to chat panel
		a.chatPanel.HandleMouse(ev)
		a.needsRedraw = true
	}
}

// showExitConfirmation displays the exit confirmation dialog
func (a *App) showExitConfirmation() {
	a.confirmDialog = components.NewConfirmDialog(
		a.screen,
		"Exit hacka.re?",
		"Are you sure you want to exit?\n\nWarning: Your current chat history will be lost if you haven't saved it.",
	)
	a.confirmDialog.Center()
	a.showConfirmExit = true
	a.needsRedraw = true
}