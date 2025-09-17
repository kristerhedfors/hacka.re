package pages

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// Prompt represents a system prompt
type Prompt struct {
	ID          string
	Name        string
	Content     string
	Description string
	IsDefault   bool
	IsActive    bool
}

// PromptsPage manages system prompts
type PromptsPage struct {
	*BasePage
	prompts        []Prompt
	menu           *components.FilterableMenu
	editor         *components.Editor
	currentMode    PromptMode
	selectedPrompt *Prompt
	editingPrompt  *Prompt
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
	}
	return "Custom"
}
func (p *PromptMenuItem) IsEnabled() bool { return true }
func (p *PromptMenuItem) GetInfo() string {
	info := fmt.Sprintf("Name: %s\n", p.prompt.Name)
	info += fmt.Sprintf("Type: %s\n", p.GetCategory())
	if p.prompt.IsActive {
		info += "Status: Active\n"
	} else {
		info += "Status: Inactive\n"
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
		BasePage:    NewBasePage(screen, config, state, eventBus, "System Prompts", PageTypePrompts),
		currentMode: PromptModeList,
		prompts:     []Prompt{},
	}

	// Initialize components
	page.menu = components.NewFilterableMenu(screen, "System Prompts Manager")
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
	// Load default prompts
	p.prompts = []Prompt{
		{
			ID:          "default-helpful",
			Name:        "Helpful Assistant",
			Content:     "You are a helpful AI assistant. Be concise, accurate, and friendly.",
			Description: "A general-purpose helpful assistant prompt",
			IsDefault:   true,
			IsActive:    true,
		},
		{
			ID:          "default-technical",
			Name:        "Technical Expert",
			Content:     "You are a technical expert. Provide detailed, accurate technical information with examples.",
			Description: "For technical discussions and problem-solving",
			IsDefault:   true,
			IsActive:    false,
		},
		{
			ID:          "default-creative",
			Name:        "Creative Writer",
			Content:     "You are a creative writer. Help with creative writing, storytelling, and content creation.",
			Description: "For creative writing and content generation",
			IsDefault:   true,
			IsActive:    false,
		},
	}

	// Load custom prompts from config
	cfg := p.config.Get()
	if cfg.SystemPrompt != "" {
		p.prompts = append(p.prompts, Prompt{
			ID:          "custom-current",
			Name:        "Current System Prompt",
			Content:     cfg.SystemPrompt,
			Description: "The currently configured system prompt",
			IsDefault:   false,
			IsActive:    true,
		})
	}

	// Update menu items
	p.updateMenuItems()
}

// updateMenuItems refreshes the menu with current prompts
func (p *PromptsPage) updateMenuItems() {
	p.menu.Clear()
	for i := range p.prompts {
		item := &PromptMenuItem{
			prompt: &p.prompts[i],
			number: i,
		}
		p.menu.AddItem(item)
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

	// Draw instructions at the bottom
	w, _ := p.screen.Size()
	instructions := " Enter:View | E:Edit | N:New | D:Delete | A:Activate | I:Import | X:Export | ESC:Back "
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

	// Draw instructions
	instructions := " E:Edit | D:Delete | A:Activate | ESC:Back to List "
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
		case 'e', 'E':
			// Edit selected prompt
			if item := p.menu.GetSelectedItem(); item != nil {
				if menuItem, ok := item.(*PromptMenuItem); ok {
					p.startEdit(menuItem.prompt)
				}
			}
			return false

		case 'n', 'N':
			// Create new prompt
			p.startCreate()
			return false

		case 'd', 'D':
			// Delete selected prompt
			if item := p.menu.GetSelectedItem(); item != nil {
				if menuItem, ok := item.(*PromptMenuItem); ok {
					p.deletePrompt(menuItem.prompt)
				}
			}
			return false

		case 'a', 'A':
			// Activate selected prompt
			if item := p.menu.GetSelectedItem(); item != nil {
				if menuItem, ok := item.(*PromptMenuItem); ok {
					p.activatePrompt(menuItem.prompt)
				}
			}
			return false

		case 'i', 'I':
			// Import prompt
			// TODO: Implement import functionality
			return false

		case 'x', 'X':
			// Export prompt
			// TODO: Implement export functionality
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
			p.startEdit(p.selectedPrompt)
			return false

		case 'd', 'D':
			p.deletePrompt(p.selectedPrompt)
			p.currentMode = PromptModeList
			return false

		case 'a', 'A':
			p.activatePrompt(p.selectedPrompt)
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
		ID:          fmt.Sprintf("custom-%d", len(p.prompts)),
		Name:        "New Prompt",
		Content:     "",
		Description: "A new custom system prompt",
		IsDefault:   false,
		IsActive:    false,
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
	for i, prompt := range p.prompts {
		if prompt.ID == p.editingPrompt.ID {
			p.prompts[i] = *p.editingPrompt
			found = true
			break
		}
	}

	if !found {
		// Add new prompt
		p.prompts = append(p.prompts, *p.editingPrompt)
	}

	// If this prompt is active, update the config
	if p.editingPrompt.IsActive {
		p.config.Update(func(cfg *core.Config) {
			cfg.SystemPrompt = p.editingPrompt.Content
		})
	}

	p.SetDirty(false)
	p.updateMenuItems()
	p.currentMode = PromptModeList
}

// deletePrompt deletes a prompt
func (p *PromptsPage) deletePrompt(prompt *Prompt) {
	if prompt.IsDefault {
		// Can't delete default prompts
		return
	}

	// Remove from list
	newPrompts := []Prompt{}
	for _, pr := range p.prompts {
		if pr.ID != prompt.ID {
			newPrompts = append(newPrompts, pr)
		}
	}
	p.prompts = newPrompts
	p.updateMenuItems()
}

// activatePrompt activates a prompt
func (p *PromptsPage) activatePrompt(prompt *Prompt) {
	// Deactivate all prompts
	for i := range p.prompts {
		p.prompts[i].IsActive = false
	}

	// Activate selected prompt
	for i := range p.prompts {
		if p.prompts[i].ID == prompt.ID {
			p.prompts[i].IsActive = true
			break
		}
	}

	// Update config
	p.config.Update(func(cfg *core.Config) {
		cfg.SystemPrompt = prompt.Content
	})

	p.updateMenuItems()
}

// OnActivate is called when the page becomes active
func (p *PromptsPage) OnActivate() {
	p.loadPrompts()
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