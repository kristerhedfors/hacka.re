package pages

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// MCPServersPage displays MCP (Model Context Protocol) servers configuration (read-only)
type MCPServersPage struct {
	*BasePage
	quickConnectors  *components.ExpandableGroup
	advancedSection  *components.ExpandableGroup
	connectedServers []*MCPServerInfo
	infoIcon         *components.InfoIcon
	scrollOffset     int
}

// MCPServerInfo represents information about an MCP server
type MCPServerInfo struct {
	Name      string
	Type      string // "github", "gmail", "shodan", "custom"
	Status    string // "connected", "disconnected", "error"
	URL       string
	Tools     []string
	AuthType  string // "PAT", "OAuth", "API Key"
	IsBuiltIn bool
}

// NewMCPServersPage creates a new MCP servers configuration page
func NewMCPServersPage(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *MCPServersPage {
	page := &MCPServersPage{
		BasePage:     NewBasePage(screen, config, state, eventBus, "MCP Servers", PageTypeMCP),
		scrollOffset: 0,
	}

	w, _ := screen.Size()

	// Initialize components
	page.quickConnectors = components.NewExpandableGroup(screen, 3, 6, w-6, "Quick Connectors")
	page.quickConnectors.SetExpanded(true) // Default expanded

	page.advancedSection = components.NewExpandableGroup(screen, 3, 15, w-6, "Advanced")

	// Info icon with tooltip
	page.infoIcon = components.NewInfoIcon(screen, w-30, 3, 60, 20)
	page.infoIcon.SetTooltipContent(
		"Model Context Protocol",
		"MCP is an open standard for connecting AI models to external tools and data sources. "+
			"It enables AI assistants to interact with local services, APIs, and databases through a standardized protocol.\n\n"+
			"Built-in Servers: hacka.re includes MCP servers for GitHub, Gmail, and Shodan as proof-of-concept examples. "+
			"These servers are not thoroughly tested but serve to demonstrate how hacka.re's architecture can be extended with external integrations.",
	)

	// Load MCP servers configuration
	page.loadMCPServers()

	return page
}

// loadMCPServers loads MCP server configuration from config
func (mp *MCPServersPage) loadMCPServers() {
	// Clear existing items
	mp.quickConnectors.ClearItems()
	mp.advancedSection.ClearItems()
	mp.connectedServers = []*MCPServerInfo{}

	// For read-only view, show mock data
	// In real implementation, this would load from actual config

	// Load quick connectors (showing as disconnected for demo)
	mp.loadQuickConnector("GitHub", "PAT", false, []string{
		"list_repos - List repositories",
		"get_repo - Get repository details",
		"list_issues - List repository issues",
		"create_issue - Create new issue",
	})

	mp.loadQuickConnector("Gmail", "OAuth", false, []string{
		"list_messages - List email messages",
		"get_message - Get message details",
		"search_messages - Search emails",
		"send_message - Send email",
	})

	mp.loadQuickConnector("Shodan", "API Key", true, []string{
		"dns_resolve - Resolve DNS",
		"host_info - Get host information",
		"search - Search Shodan database",
		"scan - Initiate network scan",
	})

	// Load advanced section - built-in tools
	mp.loadAdvancedTool("Share Link MCP", "Built-in MCP tool for creating secure share links", []string{
		"check_content - Check available content",
		"generate_link - Generate encrypted share link",
		"create_qr - Create QR code",
		"validate_link - Validate share link",
	}, false)

	mp.loadAdvancedTool("Introspection MCP", "Built-in tool for system introspection", []string{
		"get_config - Get current configuration",
		"list_functions - List available functions",
		"get_stats - Get usage statistics",
		"export_config - Export configuration",
	}, false)

	// Load custom MCP servers (mock data for read-only view)
	hasCustom := false

	if !hasCustom {
		mp.advancedSection.AddItem(components.ExpandableItem{
			Text:  "(No custom MCP servers configured)",
			Style: tcell.StyleDefault.Foreground(tcell.ColorGray).Italic(true),
		})
	}
}

// loadQuickConnector loads a quick connector configuration
func (mp *MCPServersPage) loadQuickConnector(name, authType string, connected bool, tools []string) {
	// Use the passed connected parameter directly

	// Create status indicator
	status := "Not Connected"
	statusSymbol := "○"
	statusStyle := tcell.StyleDefault.Foreground(tcell.ColorRed)

	if connected {
		status = "Connected"
		statusSymbol = "●"
		statusStyle = tcell.StyleDefault.Foreground(tcell.ColorGreen)

		// Add to connected servers list
		mp.connectedServers = append(mp.connectedServers, &MCPServerInfo{
			Name:      name,
			Type:      name,
			Status:    "connected",
			Tools:     tools,
			AuthType:  authType,
			IsBuiltIn: true,
		})
	}

	// Add header
	mp.quickConnectors.AddItem(components.ExpandableItem{
		Text:  fmt.Sprintf("%s %s (%s) - %s", statusSymbol, name, authType, status),
		Style: statusStyle,
	})

	// Add tools if connected
	if connected {
		mp.quickConnectors.AddItem(components.ExpandableItem{
			Text:     "Available tools:",
			Indented: true,
			Style:    tcell.StyleDefault.Foreground(tcell.ColorGray),
		})

		for _, tool := range tools {
			mp.quickConnectors.AddItem(components.ExpandableItem{
				Text:       "• " + tool,
				Indented:   true,
				Style:      tcell.StyleDefault.Foreground(tcell.ColorBlue),
				IsCheckbox: false,
			})
		}
	} else {
		mp.quickConnectors.AddItem(components.ExpandableItem{
			Text:     fmt.Sprintf("Requires %s authentication", authType),
			Indented: true,
			Style:    tcell.StyleDefault.Foreground(tcell.ColorGray).Italic(true),
		})
	}

	// Add spacing
	mp.quickConnectors.AddItem(components.ExpandableItem{Text: ""})
}

// loadAdvancedTool loads an advanced/built-in tool configuration
func (mp *MCPServersPage) loadAdvancedTool(name, description string, tools []string, enabled bool) {
	statusSymbol := "[ ]"
	if enabled {
		statusSymbol = "[x]"
	}

	// Add header with checkbox
	mp.advancedSection.AddItem(components.ExpandableItem{
		Text:  fmt.Sprintf("%s %s", statusSymbol, name),
		Style: tcell.StyleDefault.Bold(true),
	})

	// Add description
	mp.advancedSection.AddItem(components.ExpandableItem{
		Text:     description,
		Indented: true,
		Style:    tcell.StyleDefault.Foreground(tcell.ColorGray),
	})

	// Add tools if enabled
	if enabled {
		mp.advancedSection.AddItem(components.ExpandableItem{
			Text:     "Functions:",
			Indented: true,
			Style:    tcell.StyleDefault.Foreground(tcell.ColorGray),
		})

		for _, tool := range tools {
			mp.advancedSection.AddItem(components.ExpandableItem{
				Text:     "  • " + tool,
				Indented: true,
				Style:    tcell.StyleDefault.Foreground(tcell.ColorBlue),
			})
		}
	}

	// Add spacing
	mp.advancedSection.AddItem(components.ExpandableItem{Text: ""})
}

// isBuiltInServer checks if a server name is a built-in server
func (mp *MCPServersPage) isBuiltInServer(name string) bool {
	builtIn := []string{"GitHub", "Gmail", "Shodan", "share-link", "introspection"}
	for _, bi := range builtIn {
		if name == bi {
			return true
		}
	}
	return false
}


// Draw renders the MCP servers page
func (mp *MCPServersPage) Draw() {
	w, h := mp.screen.Size()

	// Clear screen
	mp.ClearContent()

	// Draw header
	mp.DrawHeader()

	// Draw info icon
	mp.infoIcon.Draw()

	// Draw main content area border
	mp.drawContentBorder(2, 5, w-4, h-8)

	// Draw quick connectors
	currentY := mp.quickConnectors.Draw()

	// Draw advanced section
	mp.advancedSection.Y = currentY + 2
	mp.advancedSection.Draw()

	// Draw connected servers summary
	mp.drawConnectedSummary()

	// Draw instructions
	instructions := " I:Info | Space:Expand/Collapse | ↑↓:Scroll | ESC:Back "
	instructionStyle := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	mp.DrawCenteredText(h-2, instructions, instructionStyle)
}

// drawContentBorder draws a border around the content area
func (mp *MCPServersPage) drawContentBorder(x, y, width, height int) {
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)

	// Top border
	mp.screen.SetContent(x, y, '╭', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		mp.screen.SetContent(x+i, y, '─', nil, borderStyle)
	}
	mp.screen.SetContent(x+width-1, y, '╮', nil, borderStyle)

	// Side borders
	for i := 1; i < height-1; i++ {
		mp.screen.SetContent(x, y+i, '│', nil, borderStyle)
		mp.screen.SetContent(x+width-1, y+i, '│', nil, borderStyle)
	}

	// Bottom border
	mp.screen.SetContent(x, y+height-1, '╰', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		mp.screen.SetContent(x+i, y+height-1, '─', nil, borderStyle)
	}
	mp.screen.SetContent(x+width-1, y+height-1, '╯', nil, borderStyle)
}

// drawConnectedSummary draws a summary of connected servers
func (mp *MCPServersPage) drawConnectedSummary() {
	w, h := mp.screen.Size()
	summaryY := h - 6

	// Draw summary box
	summaryText := fmt.Sprintf(" Connected Servers: %d ", len(mp.connectedServers))
	summaryStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen)

	if len(mp.connectedServers) == 0 {
		summaryText = " No servers connected "
		summaryStyle = tcell.StyleDefault.Foreground(tcell.ColorYellow)
	}

	summaryX := w - len(summaryText) - 3
	for i, ch := range summaryText {
		mp.screen.SetContent(summaryX+i, summaryY, ch, nil, summaryStyle)
	}

	// List connected servers
	if len(mp.connectedServers) > 0 {
		for i, server := range mp.connectedServers {
			if i >= 2 {
				// Show "and X more" for additional servers
				moreText := fmt.Sprintf("  ... and %d more", len(mp.connectedServers)-2)
				for j, ch := range moreText {
					mp.screen.SetContent(summaryX+j, summaryY+i+1, ch, nil, tcell.StyleDefault.Foreground(tcell.ColorGray))
				}
				break
			}
			serverText := fmt.Sprintf("  • %s (%d tools)", server.Name, len(server.Tools))
			for j, ch := range serverText {
				mp.screen.SetContent(summaryX+j, summaryY+i+1, ch, nil, tcell.StyleDefault.Foreground(tcell.ColorBlue))
			}
		}
	}
}

// HandleInput processes keyboard input
func (mp *MCPServersPage) HandleInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEscape:
		// Hide info tooltip if visible, otherwise exit
		if mp.infoIcon.Tooltip.IsVisible() {
			mp.infoIcon.Tooltip.Hide()
			return false
		}
		return true // Exit the page

	case tcell.KeyUp:
		if mp.scrollOffset > 0 {
			mp.scrollOffset--
		}
		return false

	case tcell.KeyDown:
		mp.scrollOffset++
		return false

	case tcell.KeyRune:
		switch ev.Rune() {
		case 'i', 'I':
			// Toggle info tooltip
			mp.infoIcon.HandleInput(ev)
			return false

		case ' ':
			// Toggle expansion of sections
			if !mp.advancedSection.IsExpanded() {
				mp.advancedSection.Toggle()
			} else {
				mp.quickConnectors.Toggle()
			}
			return false
		}
	}

	return false
}

// OnActivate is called when the page becomes active
func (mp *MCPServersPage) OnActivate() {
	mp.loadMCPServers()
}

// Save saves any changes (no-op for read-only page)
func (mp *MCPServersPage) Save() error {
	// Read-only page, nothing to save
	return nil
}
// HandleMouse processes mouse events for the page
func (p *MCPServersPage) HandleMouse(event *core.MouseEvent) bool {
	// TODO: Implement mouse support for interactive elements
	// For now, just return false to indicate event not handled
	return false
}
