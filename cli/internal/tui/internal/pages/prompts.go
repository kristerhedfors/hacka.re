package pages

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
	"github.com/hacka-re/cli/internal/tui/internal/prompts"
)

// Prompt represents a system prompt
type Prompt struct {
	ID          string
	Name        string
	Content     string
	Description string
	IsDefault   bool
	IsMCP       bool // Whether this is an MCP prompt
	IsActive    bool
	IsEnabled   bool // Whether the prompt is enabled (checkbox)
}

// PromptsPage manages system prompts
type PromptsPage struct {
	*BasePage
	defaultPrompts []Prompt
	customPrompts  []Prompt
	mcpPrompts     []Prompt
	menu           *components.FilterableMenu
	editor         *components.Editor
	currentMode    PromptMode
	selectedPrompt *Prompt
	editingPrompt  *Prompt
	mcpConnected   bool // Whether MCP is connected
}

// PromptMode represents the current view mode
type PromptMode int

const (
	PromptModeList PromptMode = iota
	PromptModeView
	PromptModeEdit
	PromptModeCreate
)

// PromptMenuItem implements MenuItem for prompts
type PromptMenuItem struct {
	prompt *Prompt
	number int
}

func (p *PromptMenuItem) GetID() string          { return p.prompt.ID }
func (p *PromptMenuItem) GetNumber() int         { return p.number }
func (p *PromptMenuItem) GetTitle() string       { return p.prompt.Name }
func (p *PromptMenuItem) GetDescription() string { return p.prompt.Description }
func (p *PromptMenuItem) GetCategory() string {
	if p.prompt.IsDefault {
		return "Default"
	} else if p.prompt.IsMCP {
		return "MCP"
	}
	return "Custom"
}
func (p *PromptMenuItem) IsEnabled() bool { return true }
func (p *PromptMenuItem) GetInfo() string {
	info := fmt.Sprintf("Name: %s\n", p.prompt.Name)
	info += fmt.Sprintf("Type: %s\n", p.GetCategory())
	if p.prompt.IsEnabled {
		info += "Status: ✓ Enabled\n"
	} else {
		info += "Status: ☐ Disabled\n"
	}
	info += fmt.Sprintf("\nDescription:\n%s\n", p.prompt.Description)
	info += fmt.Sprintf("\nContent Preview:\n%s", p.getContentPreview())
	return info
}

func (p *PromptMenuItem) getContentPreview() string {
	lines := strings.Split(p.prompt.Content, "\n")
	preview := ""
	maxLines := 10
	for i := 0; i < len(lines) && i < maxLines; i++ {
		preview += lines[i] + "\n"
	}
	if len(lines) > maxLines {
		preview += fmt.Sprintf("... (%d more lines)", len(lines)-maxLines)
	}
	return preview
}

// NewPromptsPage creates a new prompts management page
func NewPromptsPage(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *PromptsPage {
	page := &PromptsPage{
		BasePage:      NewBasePage(screen, config, state, eventBus, "System Prompts", PageTypePrompts),
		currentMode:   PromptModeList,
		defaultPrompts: []Prompt{},
		customPrompts:  []Prompt{},
		mcpPrompts:     []Prompt{},
		mcpConnected:   false,
	}

	// Initialize components
	page.menu = components.NewFilterableMenu(screen, "System Prompts")
	page.editor = components.NewEditor(screen)

	// Configure menu layout
	w, h := screen.Size()
	menuWidth := 60
	menuHeight := min(25, h-10)
	infoWidth := 50

	page.menu.SetDimensions(menuWidth, menuHeight)
	page.menu.SetPosition((w-menuWidth-infoWidth-2)/2, (h-menuHeight)/2)
	page.menu.SetInfoPanel(true, infoWidth)

	// Configure editor layout
	editorWidth := min(80, w-10)
	editorHeight := min(30, h-10)
	page.editor.SetDimensions(editorWidth, editorHeight)
	page.editor.SetPosition((w-editorWidth)/2, (h-editorHeight)/2)

	// Load prompts
	page.loadPrompts()

	return page
}

// loadPrompts loads available prompts
func (p *PromptsPage) loadPrompts() {
	// Load default prompts from the prompts package
	defaultPrompts := prompts.GetDefaultPrompts()
	p.defaultPrompts = make([]Prompt, 0, len(defaultPrompts))
	for _, dp := range defaultPrompts {
		p.defaultPrompts = append(p.defaultPrompts, Prompt{
			ID:          dp.ID,
			Name:        dp.Name,
			Content:     dp.Content,
			Description: dp.Description,
			IsDefault:   true,
			IsMCP:       false,
			IsActive:    false,
			IsEnabled:   false, // Default prompts start disabled
		})
	}

	// Load MCP prompts if MCP is connected
	if p.mcpConnected {
		mcpPrompts := prompts.GetMCPPrompts()
		p.mcpPrompts = make([]Prompt, 0, len(mcpPrompts))
		for _, mp := range mcpPrompts {
			p.mcpPrompts = append(p.mcpPrompts, Prompt{
				ID:          mp.ID,
				Name:        mp.Name,
				Content:     mp.Content,
				Description: mp.Description,
				IsDefault:   false,
				IsMCP:       true,
				IsActive:    false,
				IsEnabled:   false, // MCP prompts also start disabled
			})
		}
	} else {
		p.mcpPrompts = []Prompt{}
	}

	// Load custom prompts from config (user-created)
	p.customPrompts = []Prompt{}
	// TODO: Load from persistent storage when implemented

	// Update menu items
	p.updateMenuItems()
}

// updateMenuItems refreshes the menu with current prompts
func (p *PromptsPage) updateMenuItems() {
	p.menu.Clear()
	number := 0

	// Add default prompts
	for i := range p.defaultPrompts {
		item := &PromptMenuItem{
			prompt: &p.defaultPrompts[i],
			number: number,
		}
		p.menu.AddItem(item)
		number++
	}

	// Add custom prompts
	for i := range p.customPrompts {
		item := &PromptMenuItem{
			prompt: &p.customPrompts[i],
			number: number,
		}
		p.menu.AddItem(item)
		number++
	}

	// Add MCP prompts (shown in custom section)
	for i := range p.mcpPrompts {
		item := &PromptMenuItem{
			prompt: &p.mcpPrompts[i],
			number: number,
		}
		p.menu.AddItem(item)
		number++
	}
}

// Draw renders the prompts page
func (p *PromptsPage) Draw() {
	switch p.currentMode {
	case PromptModeList:
		p.drawListMode()
	case PromptModeView:
		p.drawViewMode()
	case PromptModeEdit:
		p.drawEditMode()
	case PromptModeCreate:
		p.drawCreateMode()
	}
}

// drawListMode renders the prompt list
func (p *PromptsPage) drawListMode() {
	p.menu.Draw()

	// Draw sections headers
	w, _ := p.screen.Size()

	// Draw Default Prompts header
	headerY := p.menu.GetY() - 2
	defaultHeader := "Default Prompts"
	p.DrawText(p.menu.GetX(), headerY, defaultHeader, tcell.StyleDefault.Bold(true))

	// Draw Custom Prompts header if there are custom or MCP prompts
	if len(p.customPrompts) > 0 || len(p.mcpPrompts) > 0 {
		customY := headerY + len(p.defaultPrompts) + 3
		customHeader := "Custom Prompts"
		if p.mcpConnected {
			customHeader = "Custom Prompts (including MCP)"
		}
		p.DrawText(p.menu.GetX(), customY, customHeader, tcell.StyleDefault.Bold(true))
	}

	// Draw instructions at the bottom
	instructions := " Enter:View | Space:Toggle | N:New | D:Delete | ESC:Back "
	x := (w - len(instructions)) / 2
	y := p.menu.GetY() + p.menu.GetHeight() + 1

	style := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	p.DrawText(x, y, instructions, style)
}

// drawViewMode renders the prompt viewer
func (p *PromptsPage) drawViewMode() {
	if p.selectedPrompt == nil {
		return
	}

	_, h := p.screen.Size()

	// Draw title
	title := fmt.Sprintf(" Viewing: %s ", p.selectedPrompt.Name)
	titleStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	p.DrawCenteredText(2, title, titleStyle)

	// Draw description
	descStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	p.DrawCenteredText(4, p.selectedPrompt.Description, descStyle)

	// Set editor content and draw
	p.editor.SetText(p.selectedPrompt.Content)
	p.editor.SetReadOnly(true)
	p.editor.Draw()

	// Draw instructions based on prompt type
	var instructions string
	if p.selectedPrompt.IsDefault || p.selectedPrompt.IsMCP {
		instructions = " Space:Toggle | ESC:Back to List "
	} else {
		instructions = " E:Edit | D:Delete | Space:Toggle | ESC:Back to List "
	}
	p.DrawCenteredText(h-2, instructions, tcell.StyleDefault.Foreground(tcell.ColorYellow))
}

// drawEditMode renders the prompt editor
func (p *PromptsPage) drawEditMode() {
	if p.editingPrompt == nil {
		return
	}

	w, h := p.screen.Size()

	// Draw title
	title := fmt.Sprintf(" Editing: %s ", p.editingPrompt.Name)
	if p.editingPrompt.IsDefault {
		title += " (Copy) "
	}
	titleStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	p.DrawCenteredText(2, title, titleStyle)

	// Draw editor
	p.editor.SetReadOnly(false)
	p.editor.Draw()

	// Draw instructions
	instructions := " Ctrl-S:Save | ESC:Cancel "
	p.DrawCenteredText(h-2, instructions, tcell.StyleDefault.Foreground(tcell.ColorYellow))

	// Show if dirty
	if p.IsDirty() {
		modifiedText := " * Modified * "
		p.DrawText(w-len(modifiedText)-2, 2, modifiedText, tcell.StyleDefault.Foreground(tcell.ColorYellow).Bold(true))
	}
}

// drawCreateMode renders the prompt creation interface
func (p *PromptsPage) drawCreateMode() {
	_, h := p.screen.Size()

	// Draw title
	title := " Create New System Prompt "
	titleStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	p.DrawCenteredText(2, title, titleStyle)

	// Draw editor
	p.editor.SetReadOnly(false)
	p.editor.Draw()

	// Draw instructions
	instructions := " Ctrl-S:Save | ESC:Cancel "
	p.DrawCenteredText(h-2, instructions, tcell.StyleDefault.Foreground(tcell.ColorYellow))
}

// HandleInput processes keyboard input
func (p *PromptsPage) HandleInput(ev *tcell.EventKey) bool {
	switch p.currentMode {
	case PromptModeList:
		return p.handleListInput(ev)
	case PromptModeView:
		return p.handleViewInput(ev)
	case PromptModeEdit, PromptModeCreate:
		return p.handleEditInput(ev)
	}
	return false
}

// handleListInput handles input in list mode
func (p *PromptsPage) handleListInput(ev *tcell.EventKey) bool {
	// Let menu handle navigation
	item, exit := p.menu.HandleInput(ev)

	if exit {
		return true // Exit the page
	}

	if item != nil {
		// Enter pressed - view the prompt
		if menuItem, ok := item.(*PromptMenuItem); ok {
			p.selectedPrompt = menuItem.prompt
			p.editor.SetText(p.selectedPrompt.Content)
			p.currentMode = PromptModeView
		}
		return false
	}

	// Handle other keys
	switch ev.Key() {
	case tcell.KeyRune:
		switch ev.Rune() {
		case ' ':
			// Toggle enabled status
			if item := p.menu.GetSelectedItem(); item != nil {
				if menuItem, ok := item.(*PromptMenuItem); ok {
					p.togglePrompt(menuItem.prompt)
				}
			}
			return false

		case 'e', 'E':
			// Edit selected prompt (only for custom prompts)
			if item := p.menu.GetSelectedItem(); item != nil {
				if menuItem, ok := item.(*PromptMenuItem); ok {
					if !menuItem.prompt.IsDefault && !menuItem.prompt.IsMCP {
						p.startEdit(menuItem.prompt)
					}
				}
			}
			return false

		case 'n', 'N':
			// Create new prompt
			p.startCreate()
			return false

		case 'd', 'D':
			// Delete selected prompt (only custom, non-MCP prompts)
			if item := p.menu.GetSelectedItem(); item != nil {
				if menuItem, ok := item.(*PromptMenuItem); ok {
					if !menuItem.prompt.IsDefault && !menuItem.prompt.IsMCP {
						p.deletePrompt(menuItem.prompt)
					}
				}
			}
			return false
		}
	}

	return false
}

// handleViewInput handles input in view mode
func (p *PromptsPage) handleViewInput(ev *tcell.EventKey) bool {
	// Let editor handle scrolling
	if p.editor.HandleInput(ev) {
		return false
	}

	switch ev.Key() {
	case tcell.KeyEscape:
		p.currentMode = PromptModeList
		return false

	case tcell.KeyRune:
		switch ev.Rune() {
		case 'e', 'E':
			if !p.selectedPrompt.IsDefault && !p.selectedPrompt.IsMCP {
				p.startEdit(p.selectedPrompt)
			}
			return false

		case 'd', 'D':
			if !p.selectedPrompt.IsDefault && !p.selectedPrompt.IsMCP {
				p.deletePrompt(p.selectedPrompt)
				p.currentMode = PromptModeList
			}
			return false

		case ' ':
			p.togglePrompt(p.selectedPrompt)
			return false
		}
	}

	return false
}

// handleEditInput handles input in edit/create mode
func (p *PromptsPage) handleEditInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEscape:
		// Cancel editing
		p.SetDirty(false)
		p.currentMode = PromptModeList
		return false

	case tcell.KeyCtrlS:
		// Save changes
		p.savePrompt()
		return false

	default:
		// Let editor handle the input
		if p.editor.HandleInput(ev) {
			p.SetDirty(true)
		}
	}

	return false
}

// startEdit starts editing a prompt
func (p *PromptsPage) startEdit(prompt *Prompt) {
	p.editingPrompt = &Prompt{
		ID:          prompt.ID,
		Name:        prompt.Name,
		Content:     prompt.Content,
		Description: prompt.Description,
		IsDefault:   prompt.IsDefault,
		IsActive:    prompt.IsActive,
	}

	// If editing a default prompt, create a copy
	if prompt.IsDefault {
		p.editingPrompt.ID = fmt.Sprintf("custom-%s-copy", prompt.ID)
		p.editingPrompt.Name = fmt.Sprintf("%s (Custom)", prompt.Name)
		p.editingPrompt.IsDefault = false
	}

	p.editor.SetText(p.editingPrompt.Content)
	p.currentMode = PromptModeEdit
}

// startCreate starts creating a new prompt
func (p *PromptsPage) startCreate() {
	p.editingPrompt = &Prompt{
		ID:          fmt.Sprintf("custom-%d", len(p.customPrompts)),
		Name:        "New Prompt",
		Content:     "",
		Description: "A new custom system prompt",
		IsDefault:   false,
		IsMCP:       false,
		IsEnabled:   false,
	}

	p.editor.SetText("")
	p.currentMode = PromptModeCreate
}

// savePrompt saves the current editing prompt
func (p *PromptsPage) savePrompt() {
	if p.editingPrompt == nil {
		return
	}

	p.editingPrompt.Content = p.editor.GetText()

	// Check if this is a new prompt or update
	found := false
	for i, prompt := range p.customPrompts {
		if prompt.ID == p.editingPrompt.ID {
			p.customPrompts[i] = *p.editingPrompt
			found = true
			break
		}
	}

	if !found {
		// Add new prompt to custom prompts
		p.customPrompts = append(p.customPrompts, *p.editingPrompt)
	}

	// Update system prompt if needed
	p.updateSystemPrompt()

	p.SetDirty(false)
	p.updateMenuItems()
	p.currentMode = PromptModeList
}

// deletePrompt deletes a prompt
func (p *PromptsPage) deletePrompt(prompt *Prompt) {
	if prompt.IsDefault || prompt.IsMCP {
		// Can't delete default or MCP prompts
		return
	}

	// Remove from custom prompts list
	newPrompts := []Prompt{}
	for _, pr := range p.customPrompts {
		if pr.ID != prompt.ID {
			newPrompts = append(newPrompts, pr)
		}
	}
	p.customPrompts = newPrompts
	p.updateMenuItems()
}

// togglePrompt toggles the enabled state of a prompt
func (p *PromptsPage) togglePrompt(prompt *Prompt) {
	// Find and toggle the prompt in the appropriate list
	if prompt.IsDefault {
		for i := range p.defaultPrompts {
			if p.defaultPrompts[i].ID == prompt.ID {
				p.defaultPrompts[i].IsEnabled = !p.defaultPrompts[i].IsEnabled
				break
			}
		}
	} else if prompt.IsMCP {
		for i := range p.mcpPrompts {
			if p.mcpPrompts[i].ID == prompt.ID {
				p.mcpPrompts[i].IsEnabled = !p.mcpPrompts[i].IsEnabled
				break
			}
		}
	} else {
		for i := range p.customPrompts {
			if p.customPrompts[i].ID == prompt.ID {
				p.customPrompts[i].IsEnabled = !p.customPrompts[i].IsEnabled
				break
			}
		}
	}

	// Update the system prompt in config with all enabled prompts
	p.updateSystemPrompt()
	p.updateMenuItems()
}

// updateSystemPrompt combines all enabled prompts into the system prompt
func (p *PromptsPage) updateSystemPrompt() {
	var enabledPrompts []string

	// Collect enabled default prompts
	for _, prompt := range p.defaultPrompts {
		if prompt.IsEnabled {
			enabledPrompts = append(enabledPrompts, prompt.Content)
		}
	}

	// Collect enabled custom prompts
	for _, prompt := range p.customPrompts {
		if prompt.IsEnabled {
			enabledPrompts = append(enabledPrompts, prompt.Content)
		}
	}

	// Collect enabled MCP prompts
	for _, prompt := range p.mcpPrompts {
		if prompt.IsEnabled {
			enabledPrompts = append(enabledPrompts, prompt.Content)
		}
	}

	// Combine all enabled prompts
	combinedPrompt := strings.Join(enabledPrompts, "\n\n")

	// Update config
	p.config.Update(func(cfg *core.Config) {
		cfg.SystemPrompt = combinedPrompt
	})
}

// OnActivate is called when the page becomes active
func (p *PromptsPage) OnActivate() {
	// Check MCP connection status
	p.checkMCPConnection()
	p.loadPrompts()
}

// checkMCPConnection checks if MCP servers are connected
func (p *PromptsPage) checkMCPConnection() {
	// TODO: Properly check actual MCP connection status
	// For now, MCP is not connected until we implement it
	p.mcpConnected = false
}

// Save saves any changes
func (p *PromptsPage) Save() error {
	if p.currentMode == PromptModeEdit || p.currentMode == PromptModeCreate {
		p.savePrompt()
	}
	return nil
}

// Helper function since Go doesn't have built-in min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}