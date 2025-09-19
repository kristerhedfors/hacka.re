package pages

import (
	"fmt"
	"strings"
	"time"

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
	editor         *components.Editor
	currentMode    PromptMode
	selectedPrompt *Prompt
	editingPrompt  *Prompt
	mcpConnected   bool // Whether MCP is connected

	// List navigation - tracks actual prompt index (0-based)
	selectedPromptIndex  int  // Index in the combined prompt list (0 to N-1)
	scrollOffset        int

	// Input fields for custom prompts
	nameInput        string
	editingName      bool
	cursorPos        int
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
	page.editor = components.NewEditor(screen)

	// Configure editor layout
	w, h := screen.Size()
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
	cfg := p.config.Get()
	enabledMap := make(map[string]bool)
	for _, id := range cfg.EnabledPrompts {
		enabledMap[id] = true
	}

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
			IsEnabled:   enabledMap[dp.ID], // Restore enabled state from config
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
				IsEnabled:   enabledMap[mp.ID], // Restore enabled state from config
			})
		}
	} else {
		p.mcpPrompts = []Prompt{}
	}

	// Load custom prompts from config (user-created)
	p.customPrompts = make([]Prompt, 0, len(cfg.CustomPrompts))
	for _, cp := range cfg.CustomPrompts {
		p.customPrompts = append(p.customPrompts, Prompt{
			ID:          cp.ID,
			Name:        cp.Name,
			Content:     cp.Content,
			Description: "", // No description for custom prompts
			IsDefault:   false,
			IsMCP:       false,
			IsActive:    false,
			IsEnabled:   enabledMap[cp.ID], // Restore enabled state from config
		})
	}

	// Update menu items
	p.updateMenuItems()
}

// updateMenuItems refreshes the menu with current prompts
func (p *PromptsPage) updateMenuItems() {
	// Reset selection if out of bounds
	totalItems := len(p.defaultPrompts) + len(p.customPrompts) + len(p.mcpPrompts)
	if p.selectedPromptIndex >= totalItems {
		p.selectedPromptIndex = 0
	}
}

// getAllPrompts returns all prompts in order
func (p *PromptsPage) getAllPrompts() []Prompt {
	var allPrompts []Prompt
	allPrompts = append(allPrompts, p.defaultPrompts...)
	allPrompts = append(allPrompts, p.customPrompts...)
	allPrompts = append(allPrompts, p.mcpPrompts...)
	return allPrompts
}

// getPromptAtIndex returns the prompt at the given index
func (p *PromptsPage) getPromptAtIndex(index int) *Prompt {
	allPrompts := p.getAllPrompts()
	if index >= 0 && index < len(allPrompts) {
		return &allPrompts[index]
	}
	return nil
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
	w, h := p.screen.Size()

	// Calculate dimensions
	listWidth := 70
	listHeight := h - 10
	listX := (w - listWidth) / 2
	listY := 3

	// Draw border
	p.drawListBorder(listX, listY, listWidth, listHeight)

	// Draw title
	title := " System Prompts "
	titleX := listX + (listWidth-len(title))/2
	p.DrawText(titleX, listY, title, tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true))

	// Calculate visible area
	contentY := listY + 2
	visibleHeight := listHeight - 4 // Account for borders and instructions

	// Calculate display position for selected prompt
	// We need to account for headers and spacing in the display
	displayIndex := p.getDisplayIndex(p.selectedPromptIndex)

	// Adjust scroll offset to keep selected item visible
	if displayIndex < p.scrollOffset {
		p.scrollOffset = displayIndex
	} else if displayIndex >= p.scrollOffset + visibleHeight {
		p.scrollOffset = displayIndex - visibleHeight + 1
	}

	// Draw prompts
	currentY := contentY
	itemIndex := 0

	// Draw default prompts section
	if len(p.defaultPrompts) > 0 {
		// Only draw header if it's visible
		if itemIndex >= p.scrollOffset && currentY < contentY + visibleHeight {
			sectionHeader := "─── Default Prompts ───"
			headerX := listX + (listWidth-len(sectionHeader))/2
			p.DrawText(headerX, currentY, sectionHeader, tcell.StyleDefault.Foreground(tcell.ColorTeal))
			currentY++
		}
		itemIndex++

		for i, prompt := range p.defaultPrompts {
			if itemIndex >= p.scrollOffset && currentY < contentY + visibleHeight {
				p.drawPromptItem(listX+2, currentY, listWidth-4, i, &prompt, i == p.selectedPromptIndex)
				currentY++
			}
			itemIndex++
		}
	}

	// Draw custom prompts section
	if len(p.customPrompts) > 0 || len(p.mcpPrompts) > 0 {
		// Add spacing
		if itemIndex >= p.scrollOffset && currentY < contentY + visibleHeight {
			currentY++ // Empty line for spacing
		}
		itemIndex++

		// Only draw header if it's visible
		if itemIndex >= p.scrollOffset && currentY < contentY + visibleHeight {
			sectionHeader := "─── Custom Prompts ───"
			if p.mcpConnected && len(p.mcpPrompts) > 0 {
				sectionHeader = "─── Custom Prompts (including MCP) ───"
			}
			headerX := listX + (listWidth-len(sectionHeader))/2
			p.DrawText(headerX, currentY, sectionHeader, tcell.StyleDefault.Foreground(tcell.ColorYellow).Bold(true))
			currentY++
		}
		itemIndex++

		for i, prompt := range p.customPrompts {
			promptIdx := len(p.defaultPrompts) + i
			if itemIndex >= p.scrollOffset && currentY < contentY + visibleHeight {
				p.drawPromptItem(listX+2, currentY, listWidth-4, promptIdx, &prompt, promptIdx == p.selectedPromptIndex)
				currentY++
			}
			itemIndex++
		}

		for i, prompt := range p.mcpPrompts {
			promptIdx := len(p.defaultPrompts) + len(p.customPrompts) + i
			if itemIndex >= p.scrollOffset && currentY < contentY + visibleHeight {
				p.drawPromptItem(listX+2, currentY, listWidth-4, promptIdx, &prompt, promptIdx == p.selectedPromptIndex)
				currentY++
			}
			itemIndex++
		}
	}

	// Draw scroll indicators
	if p.scrollOffset > 0 {
		p.DrawText(listX+listWidth-3, contentY, "↑", tcell.StyleDefault.Foreground(tcell.ColorYellow))
	}
	totalItems := len(p.defaultPrompts) + len(p.customPrompts) + len(p.mcpPrompts) + 2 // +2 for section headers
	if len(p.customPrompts) > 0 || len(p.mcpPrompts) > 0 {
		totalItems++ // +1 for spacing line
	}
	if p.scrollOffset + visibleHeight < totalItems {
		p.DrawText(listX+listWidth-3, contentY+visibleHeight-1, "↓", tcell.StyleDefault.Foreground(tcell.ColorYellow))
	}

	// Draw instructions at the bottom
	instructions := " ↑↓:Navigate | Enter:View | Space:Toggle | N:New | D/Backspace:Delete | ESC:Back "
	instructionsX := listX + (listWidth-len(instructions))/2
	if instructionsX < listX + 2 {
		// If instructions are too long, use shorter version
		instructions = " ↑↓ Enter Space N D/⌫ ESC "
		instructionsX = listX + (listWidth-len(instructions))/2
	}
	p.DrawText(instructionsX, listY+listHeight-2, instructions, tcell.StyleDefault.Foreground(tcell.ColorYellow))
}

// drawListBorder draws the border for the prompt list
func (p *PromptsPage) drawListBorder(x, y, w, h int) {
	// Clear background
	bgStyle := tcell.StyleDefault.Background(tcell.ColorBlack)
	for row := 0; row < h; row++ {
		for col := 0; col < w; col++ {
			p.screen.SetContent(x+col, y+row, ' ', nil, bgStyle)
		}
	}

	// Draw border
	style := tcell.StyleDefault.Foreground(tcell.ColorGreen)
	// Top
	p.screen.SetContent(x, y, '╔', nil, style)
	for i := 1; i < w-1; i++ {
		p.screen.SetContent(x+i, y, '═', nil, style)
	}
	p.screen.SetContent(x+w-1, y, '╗', nil, style)

	// Sides
	for i := 1; i < h-1; i++ {
		p.screen.SetContent(x, y+i, '║', nil, style)
		p.screen.SetContent(x+w-1, y+i, '║', nil, style)
	}

	// Bottom
	p.screen.SetContent(x, y+h-1, '╚', nil, style)
	for i := 1; i < w-1; i++ {
		p.screen.SetContent(x+i, y+h-1, '═', nil, style)
	}
	p.screen.SetContent(x+w-1, y+h-1, '╝', nil, style)
}

// drawPromptItem draws a single prompt item
func (p *PromptsPage) drawPromptItem(x, y, width, index int, prompt *Prompt, selected bool) {
	// Determine style
	style := tcell.StyleDefault.Foreground(tcell.ColorWhite)
	if selected {
		style = tcell.StyleDefault.Background(tcell.ColorBlue).Foreground(tcell.ColorWhite)
		// Clear the entire line for selection highlight
		for i := 0; i < width; i++ {
			p.screen.SetContent(x+i, y, ' ', nil, style)
		}
	}

	// Draw checkbox
	checkbox := "☐"
	if prompt.IsEnabled {
		checkbox = "✓"
	}
	p.DrawText(x, y, checkbox, style)

	// Draw number and name
	text := fmt.Sprintf(" %d. %s", index+1, prompt.Name)
	if len(text) > width-3 {
		text = text[:width-6] + "..."
	}
	p.DrawText(x+2, y, text, style)

	// Add type indicator
	if prompt.IsDefault {
		p.DrawText(x+width-10, y, "[default]", style)
	} else if prompt.IsMCP {
		p.DrawText(x+width-6, y, "[mcp]", style)
	}
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
	w, h := p.screen.Size()

	// Draw title
	title := " Create New System Prompt "
	titleStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	p.DrawCenteredText(2, title, titleStyle)

	// Calculate positions
	formX := (w - 60) / 2
	formY := 5

	// Draw name input field
	nameLabel := "Name: "
	p.DrawText(formX, formY, nameLabel, tcell.StyleDefault.Bold(true))

	// Draw name input box
	nameBoxX := formX + len(nameLabel)
	nameBoxWidth := 50
	nameBoxStyle := tcell.StyleDefault.Background(tcell.ColorDarkGray)
	if p.editingName {
		nameBoxStyle = tcell.StyleDefault.Background(tcell.ColorDarkBlue)
	}

	// Draw input box background
	for i := 0; i < nameBoxWidth; i++ {
		p.screen.SetContent(nameBoxX+i, formY, ' ', nil, nameBoxStyle)
	}

	// Draw name text
	displayName := p.nameInput
	if len(displayName) > nameBoxWidth-2 {
		displayName = displayName[len(displayName)-nameBoxWidth+2:]
	}
	p.DrawText(nameBoxX+1, formY, displayName, nameBoxStyle.Foreground(tcell.ColorWhite))

	// Draw cursor if editing name
	if p.editingName {
		cursorX := nameBoxX + 1 + len(displayName)
		if cursorX < nameBoxX + nameBoxWidth - 1 {
			p.screen.SetContent(cursorX, formY, '█', nil, nameBoxStyle.Foreground(tcell.ColorYellow))
		}
	}

	// Draw content label
	p.DrawText(formX, formY+2, "Content:", tcell.StyleDefault.Bold(true))

	// Adjust editor position to be below the input field
	p.editor.SetPosition(formX, formY+3)
	p.editor.SetDimensions(60, h-formY-6)
	p.editor.SetReadOnly(false)
	p.editor.Draw()

	// Draw instructions
	instructions := " Tab:Toggle Name/Content | Ctrl-S:Save | ESC:Cancel "
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

// HandleMouse processes mouse events
func (p *PromptsPage) HandleMouse(event *core.MouseEvent) bool {
	if p.currentMode != PromptModeList {
		return false
	}

	w, h := p.screen.Size()
	listWidth := 70
	listHeight := h - 10
	listX := (w - listWidth) / 2
	listY := 3

	// Check if click is outside the list
	if !core.IsWithinBounds(event.X, event.Y, listX, listY, listWidth, listHeight) {
		if event.Type == core.MouseEventClick && event.Button == core.MouseButtonLeft {
			return true // Exit on click outside
		}
		return false
	}

	switch event.Type {
	case core.MouseEventScroll:
		// Handle mouse wheel scrolling
		totalPrompts := len(p.defaultPrompts) + len(p.customPrompts) + len(p.mcpPrompts)
		if event.Button == core.MouseWheelUp {
			if p.selectedPromptIndex > 0 {
				p.selectedPromptIndex--
			}
		} else if event.Button == core.MouseWheelDown {
			if p.selectedPromptIndex < totalPrompts - 1 {
				p.selectedPromptIndex++
			}
		}

	case core.MouseEventHover:
		// Handle mouse hover
		contentY := listY + 2
		hoveredRow := event.Y - contentY + p.scrollOffset

		// Find which prompt corresponds to this display row
		promptIndex := p.getPromptIndexAtDisplayRow(hoveredRow)
		if promptIndex >= 0 {
			p.selectedPromptIndex = promptIndex
		}

	case core.MouseEventClick:
		if event.Button == core.MouseButtonLeft {
			// Calculate which item was clicked
			contentY := listY + 2
			clickedRow := event.Y - contentY + p.scrollOffset

			// Find which prompt corresponds to this display row
			promptIndex := p.getPromptIndexAtDisplayRow(clickedRow)
			if promptIndex >= 0 {
				p.selectedPromptIndex = promptIndex

				// View the selected prompt
				prompt := p.getPromptAtIndex(promptIndex)
				if prompt != nil {
					p.selectedPrompt = prompt
					p.editor.SetText(p.selectedPrompt.Content)
					p.currentMode = PromptModeView
				}
			}
		}
	}

	return false
}

// getDisplayIndex converts a prompt index to display row index (accounting for headers/spacing)
func (p *PromptsPage) getDisplayIndex(promptIndex int) int {
	// Start with 1 for the default header
	displayIndex := 1

	if promptIndex < len(p.defaultPrompts) {
		// It's a default prompt
		return displayIndex + promptIndex
	}

	// Move past default prompts
	displayIndex += len(p.defaultPrompts)

	// Add spacing and custom header if there are custom/MCP prompts
	if len(p.customPrompts) > 0 || len(p.mcpPrompts) > 0 {
		displayIndex += 2 // spacing + custom header

		// Calculate position within custom/MCP prompts
		customIndex := promptIndex - len(p.defaultPrompts)
		return displayIndex + customIndex
	}

	return displayIndex
}

// getPromptIndexAtDisplayRow converts a display row to prompt index (-1 if not a prompt)
func (p *PromptsPage) getPromptIndexAtDisplayRow(displayRow int) int {
	currentRow := 0

	// Skip default header
	currentRow++
	if displayRow < currentRow {
		return -1
	}

	// Check default prompts
	for i := range p.defaultPrompts {
		if displayRow == currentRow {
			return i
		}
		currentRow++
	}

	// Skip spacing and custom header if they exist
	if len(p.customPrompts) > 0 || len(p.mcpPrompts) > 0 {
		currentRow++ // spacing
		if displayRow < currentRow {
			return -1
		}
		currentRow++ // custom header
		if displayRow < currentRow {
			return -1
		}

		// Check custom prompts
		for i := range p.customPrompts {
			if displayRow == currentRow {
				return len(p.defaultPrompts) + i
			}
			currentRow++
		}

		// Check MCP prompts
		for i := range p.mcpPrompts {
			if displayRow == currentRow {
				return len(p.defaultPrompts) + len(p.customPrompts) + i
			}
			currentRow++
		}
	}

	return -1
}

// handleListInput handles input in list mode
func (p *PromptsPage) handleListInput(ev *tcell.EventKey) bool {
	totalPrompts := len(p.defaultPrompts) + len(p.customPrompts) + len(p.mcpPrompts)

	switch ev.Key() {
	case tcell.KeyEscape:
		return true // Exit the page

	case tcell.KeyUp:
		if p.selectedPromptIndex > 0 {
			p.selectedPromptIndex--
		}
		return false

	case tcell.KeyDown:
		if p.selectedPromptIndex < totalPrompts - 1 {
			p.selectedPromptIndex++
		}
		return false

	case tcell.KeyEnter:
		prompt := p.getPromptAtIndex(p.selectedPromptIndex)
		if prompt != nil {
			p.selectedPrompt = prompt
			p.editor.SetText(p.selectedPrompt.Content)
			p.currentMode = PromptModeView
		}
		return false

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		// Delete selected prompt (only custom, non-MCP prompts)
		prompt := p.getPromptAtIndex(p.selectedPromptIndex)
		if prompt != nil && !prompt.IsDefault && !prompt.IsMCP {
			p.deletePrompt(prompt)
			// Adjust selection after deletion
			if p.selectedPromptIndex >= totalPrompts - 1 && p.selectedPromptIndex > 0 {
				p.selectedPromptIndex--
			}
		}
		return false

	case tcell.KeyRune:
		switch ev.Rune() {
		case ' ':
			// Toggle enabled status
			prompt := p.getPromptAtIndex(p.selectedPromptIndex)
			if prompt != nil {
				p.togglePrompt(prompt)
			}
			return false

		case 'e', 'E':
			// Edit selected prompt (only for custom prompts)
			prompt := p.getPromptAtIndex(p.selectedPromptIndex)
			if prompt != nil && !prompt.IsDefault && !prompt.IsMCP {
				p.startEdit(prompt)
			}
			return false

		case 'n', 'N':
			// Create new prompt
			p.startCreate()
			return false

		case 'd', 'D':
			// Delete selected prompt (only custom, non-MCP prompts)
			prompt := p.getPromptAtIndex(p.selectedPromptIndex)
			if prompt != nil && !prompt.IsDefault && !prompt.IsMCP {
				p.deletePrompt(prompt)
				// Adjust selection after deletion
				if p.selectedPromptIndex >= totalPrompts - 1 && p.selectedPromptIndex > 0 {
					p.selectedPromptIndex--
				}
			}
			return false

		case '1', '2', '3', '4', '5', '6', '7', '8', '9':
			// Number key selection (1-indexed to 0-indexed)
			num := int(ev.Rune() - '0') - 1
			if num < totalPrompts {
				p.selectedPromptIndex = num
				// Directly view the prompt
				prompt := p.getPromptAtIndex(num)
				if prompt != nil {
					p.selectedPrompt = prompt
					p.editor.SetText(p.selectedPrompt.Content)
					p.currentMode = PromptModeView
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
	// In create mode, handle field navigation
	if p.currentMode == PromptModeCreate {
		// Handle Tab key for field navigation (toggle between name and content)
		if ev.Key() == tcell.KeyTab {
			p.editingName = !p.editingName
			return false
		}

		// Handle input in name field
		if p.editingName {
			switch ev.Key() {
			case tcell.KeyBackspace, tcell.KeyBackspace2:
				if len(p.nameInput) > 0 {
					p.nameInput = p.nameInput[:len(p.nameInput)-1]
				}
				return false

			case tcell.KeyRune:
				p.nameInput += string(ev.Rune())
				return false

			case tcell.KeyEnter:
				// Move to content field
				p.editingName = false
				return false
			}
		}
	}

	// Common handling for both edit and create modes
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
		// Let editor handle the input if not in name field
		if !p.editingName {
			if p.editor.HandleInput(ev) {
				p.SetDirty(true)
			}
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
		ID:          fmt.Sprintf("custom-%d-%d", len(p.customPrompts), time.Now().Unix()),
		Name:        "New Prompt",
		Content:     "",
		Description: "", // No description for custom prompts
		IsDefault:   false,
		IsMCP:       false,
		IsEnabled:   true, // Enable by default so it's added to system prompt
	}

	// Initialize input fields
	p.nameInput = "New Prompt"
	p.editingName = true  // Start with name field focused
	p.cursorPos = len(p.nameInput)

	p.editor.SetText("")
	p.currentMode = PromptModeCreate
}

// savePrompt saves the current editing prompt
func (p *PromptsPage) savePrompt() {
	if p.editingPrompt == nil {
		return
	}

	// Update prompt with current field values
	if p.currentMode == PromptModeCreate {
		p.editingPrompt.Name = p.nameInput
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

	// Save custom prompts to config
	p.saveCustomPromptsToConfig()

	// Update system prompt if needed
	p.updateSystemPrompt()

	p.SetDirty(false)
	p.updateMenuItems()
	p.currentMode = PromptModeList
}

// saveCustomPromptsToConfig persists custom prompts to configuration
func (p *PromptsPage) saveCustomPromptsToConfig() {
	// Convert custom prompts to config format
	configPrompts := make([]core.CustomPrompt, 0, len(p.customPrompts))
	for _, prompt := range p.customPrompts {
		configPrompts = append(configPrompts, core.CustomPrompt{
			ID:      prompt.ID,
			Name:    prompt.Name,
			Content: prompt.Content,
		})
	}

	// Update config
	p.config.Update(func(cfg *core.Config) {
		cfg.CustomPrompts = configPrompts
	})
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

	// Save updated custom prompts to config
	p.saveCustomPromptsToConfig()

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
	var enabledPromptContents []string
	var enabledPromptIDs []string

	// Collect enabled default prompts
	for _, prompt := range p.defaultPrompts {
		if prompt.IsEnabled {
			enabledPromptContents = append(enabledPromptContents, prompt.Content)
			enabledPromptIDs = append(enabledPromptIDs, prompt.ID)
		}
	}

	// Collect enabled custom prompts
	for _, prompt := range p.customPrompts {
		if prompt.IsEnabled {
			enabledPromptContents = append(enabledPromptContents, prompt.Content)
			enabledPromptIDs = append(enabledPromptIDs, prompt.ID)
		}
	}

	// Collect enabled MCP prompts
	for _, prompt := range p.mcpPrompts {
		if prompt.IsEnabled {
			enabledPromptContents = append(enabledPromptContents, prompt.Content)
			enabledPromptIDs = append(enabledPromptIDs, prompt.ID)
		}
	}

	// Combine all enabled prompts
	combinedPrompt := strings.Join(enabledPromptContents, "\n\n")

	// Update config - save both the combined prompt and the list of enabled IDs
	p.config.Update(func(cfg *core.Config) {
		cfg.SystemPrompt = combinedPrompt
		cfg.EnabledPrompts = enabledPromptIDs
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