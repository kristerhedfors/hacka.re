package pages

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/models"
	"github.com/hacka-re/cli/internal/tui/internal/prompts"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// PromptsReadOnlyPage displays system prompts configuration (read-only)
type PromptsReadOnlyPage struct {
	*BasePage
	defaultPromptsGroup *components.ExpandableGroup
	customPromptsGroup  *components.ExpandableGroup
	tokenUsageBar       *components.TokenUsageBar
	infoIcon            *components.InfoIcon
	systemPromptPreview []string
	scrollOffset        int
	maxScroll           int
	selectedGroup       int  // 0 = default prompts, 1 = custom prompts
	selectedItemIndex   int  // Index of selected item within the group (-1 = group header)
	visibleHeight       int  // Height of the visible content area
	enabledPrompts      map[string]bool // Track which prompts are enabled
	promptContents      map[string]string // Store prompt contents for token calculation
	defaultPromptIDs    []string // Track prompt IDs in order for default prompts
	mcpPromptIDs        []string // Track prompt IDs in order for MCP prompts
}

// NewPromptsReadOnlyPage creates a new read-only prompts configuration page
func NewPromptsReadOnlyPage(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *PromptsReadOnlyPage {
	_, h := screen.Size()
	page := &PromptsReadOnlyPage{
		BasePage:          NewBasePage(screen, config, state, eventBus, "System Prompts", PageTypePrompts),
		scrollOffset:      0,
		selectedGroup:     0,  // Start with default prompts selected
		selectedItemIndex: -1, // Start on group header
		visibleHeight:     h - 12, // Account for header, footer, borders
		enabledPrompts:    make(map[string]bool),
		promptContents:    make(map[string]string),
		defaultPromptIDs:  []string{},
		mcpPromptIDs:      []string{},
	}

	w, h := screen.Size()

	// Initialize components
	page.defaultPromptsGroup = components.NewExpandableGroup(screen, 3, 6, w-6, "Default Prompts")
	page.defaultPromptsGroup.SetExpanded(true)

	page.customPromptsGroup = components.NewExpandableGroup(screen, 3, 12, w-6, "Custom Prompts")

	// Token usage bar
	page.tokenUsageBar = components.NewTokenUsageBar(screen, 3, h-5, w-6)
	page.tokenUsageBar.SetDescription("System prompt token usage")

	// Info icon with tooltip
	page.infoIcon = components.NewInfoIcon(screen, w-30, 3, 60, 15)
	page.infoIcon.SetTooltipContent(
		"System Prompts",
		"System prompts define the AI assistant's behavior, personality, and capabilities. "+
			"You can combine multiple prompt components to create a customized system prompt.\n\n"+
			"Default prompts include pre-configured templates for common use cases. "+
			"Custom prompts allow you to define your own specific instructions.",
	)

	// Load prompts
	page.loadPrompts()

	return page
}

// loadPrompts loads prompt configuration from config and embedded defaults
func (pp *PromptsReadOnlyPage) loadPrompts() {
	// cfg := pp.config.Get() // TODO: Use for loading enabled prompts

	// Clear existing items
	pp.defaultPromptsGroup.ClearItems()
	pp.customPromptsGroup.ClearItems()

	// Load default prompts from our new prompts package
	defaultPrompts := prompts.GetDefaultPrompts()
	pp.defaultPromptIDs = []string{} // Reset the list

	// Add default prompts to the group (no categories, flat list)
	for _, prompt := range defaultPrompts {
		// Store prompt content for token calculation
		pp.promptContents[prompt.ID] = prompt.Content
		pp.defaultPromptIDs = append(pp.defaultPromptIDs, prompt.ID)

		item := components.ExpandableItem{
			Text:       prompt.Name,
			Indented:   false,
			Style:      tcell.StyleDefault,
			IsCheckbox: true,
			IsChecked:  pp.enabledPrompts[prompt.ID],
		}
		pp.defaultPromptsGroup.AddItem(item)

		// Add description
		if prompt.Description != "" {
			descItem := components.ExpandableItem{
				Text:     "  " + prompt.Description,
				Indented: true,
				Style:    tcell.StyleDefault.Foreground(tcell.ColorGray),
			}
			pp.defaultPromptsGroup.AddItem(descItem)
		}

		// Add token count (rough estimate)
		tokenItem := components.ExpandableItem{
			Text:     fmt.Sprintf("  ~%d tokens", len(prompt.Content)/4),
			Indented: true,
			Style:    tcell.StyleDefault.Foreground(tcell.ColorBlue),
		}
		pp.defaultPromptsGroup.AddItem(tokenItem)
	}

	// Check if MCP is connected (simple check - improve later)
	mcpConnected := false // MCP prompts only show when actually connected

	// Load MCP prompts if connected
	if mcpConnected {
		mcpPrompts := prompts.GetMCPPrompts()
		pp.mcpPromptIDs = []string{} // Reset the list
		for _, prompt := range mcpPrompts {
			// Store prompt content for token calculation
			pp.promptContents[prompt.ID] = prompt.Content
			pp.mcpPromptIDs = append(pp.mcpPromptIDs, prompt.ID)

			item := components.ExpandableItem{
				Text:       prompt.Name,
				Indented:   false,
				Style:      tcell.StyleDefault,
				IsCheckbox: true,
				IsChecked:  pp.enabledPrompts[prompt.ID],
			}
			pp.customPromptsGroup.AddItem(item)

			// Add description
			if prompt.Description != "" {
				descItem := components.ExpandableItem{
					Text:     "  " + prompt.Description,
					Indented: true,
					Style:    tcell.StyleDefault.Foreground(tcell.ColorGray),
				}
				pp.customPromptsGroup.AddItem(descItem)
			}

			// Add token count
			tokenItem := components.ExpandableItem{
				Text:     fmt.Sprintf("  ~%d tokens", len(prompt.Content)/4),
				Indented: true,
				Style:    tcell.StyleDefault.Foreground(tcell.ColorBlue),
			}
			pp.customPromptsGroup.AddItem(tokenItem)
		}
	} else {
		// No MCP prompts or custom prompts
		pp.mcpPromptIDs = []string{} // Clear MCP prompt IDs
		item := components.ExpandableItem{
			Text:  "(No custom prompts defined)",
			Style: tcell.StyleDefault.Foreground(tcell.ColorGray).Italic(true),
		}
		pp.customPromptsGroup.AddItem(item)
	}

	// Build system prompt preview
	pp.buildSystemPromptPreview()

	// Update token usage
	pp.updateTokenUsage()
}

// buildSystemPromptPreview builds the complete system prompt from enabled components
func (pp *PromptsReadOnlyPage) buildSystemPromptPreview() {
	cfg := pp.config.Get()
	var promptParts []string

	// Add main system prompt if set
	if cfg.SystemPrompt != "" {
		promptParts = append(promptParts, cfg.SystemPrompt)
	}

	// For read-only view, add some example prompt content
	promptParts = append(promptParts, "You are a helpful AI assistant.")

	// Combine all parts
	fullPrompt := strings.Join(promptParts, "\n\n")

	// Split into lines for preview
	pp.systemPromptPreview = strings.Split(fullPrompt, "\n")
}

// estimateTokens roughly estimates token count
func (pp *PromptsReadOnlyPage) estimateTokens(text string) int {
	// Rough estimation: ~4 characters per token
	return len(text) / 4
}

// getContentPreview returns a truncated preview of content
func (pp *PromptsReadOnlyPage) getContentPreview(content string, maxLen int) string {
	// Remove newlines and extra spaces
	preview := strings.ReplaceAll(content, "\n", " ")
	preview = strings.Join(strings.Fields(preview), " ")

	if len(preview) > maxLen {
		return preview[:maxLen-3] + "..."
	}
	return preview
}

// updateTokenUsage calculates and updates token usage display
func (pp *PromptsReadOnlyPage) updateTokenUsage() {
	totalTokens := 0

	// Calculate tokens from all enabled prompts
	for promptID, isEnabled := range pp.enabledPrompts {
		if isEnabled {
			if content, exists := pp.promptContents[promptID]; exists {
				totalTokens += pp.estimateTokens(content)
			}
		}
	}

	// Get the actual model's token limit
	cfg := pp.config.Get()
	provider := cfg.Provider
	model := cfg.Model

	// Get max tokens based on the model
	maxTokens := models.GetSystemPromptMaxTokens(provider, model)

	// Update the token usage bar
	pp.tokenUsageBar.SetTokens(totalTokens, maxTokens)
}

// Draw renders the prompts page
func (pp *PromptsReadOnlyPage) Draw() {
	w, h := pp.screen.Size()

	// Clear screen
	pp.ClearContent()

	// Draw header
	pp.DrawHeader()

	// Draw scroll position indicator and selection info
	if pp.maxScroll > 0 || pp.scrollOffset > 0 {
		groupName := "Default"
		if pp.selectedGroup == 1 {
			groupName = "Custom"
		}
		itemInfo := "Header"
		if pp.selectedItemIndex >= 0 {
			itemInfo = fmt.Sprintf("Item %d", pp.selectedItemIndex + 1)
		}
		scrollInfo := fmt.Sprintf("%s: %s | Scroll: %d/%d", groupName, itemInfo, pp.scrollOffset, pp.maxScroll)
		scrollStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
		// Clear previous text first
		for x := w-40; x < w-2; x++ {
			pp.screen.SetContent(x, 3, ' ', nil, tcell.StyleDefault)
		}
		// Draw new text
		for i, ch := range scrollInfo {
			if w-len(scrollInfo)-2+i >= 0 {
				pp.screen.SetContent(w-len(scrollInfo)-2+i, 3, ch, nil, scrollStyle)
			}
		}
	}

	// Draw "Show System Prompt" button hint
	buttonHint := "[S] Show System Prompt"
	buttonStyle := tcell.StyleDefault.Foreground(tcell.ColorBlue)
	pp.DrawText(3, 3, buttonHint, buttonStyle)

	// Draw info icon
	pp.infoIcon.Draw()

	// Draw main content area border
	pp.drawContentBorder(2, 5, w-4, h-8)

	// Draw expandable groups with scroll support
	baseY := 6
	currentY := baseY - pp.scrollOffset

	// Draw default prompts group
	defaultY := currentY
	// Highlight header if selected
	if pp.selectedGroup == 0 && pp.selectedItemIndex == -1 && currentY >= 6 && currentY < h-4 {
		selectionStyle := tcell.StyleDefault.Background(tcell.ColorDarkBlue).Foreground(tcell.ColorYellow)
		for x := 3; x < w-3; x++ {
			pp.screen.SetContent(x, currentY, ' ', nil, selectionStyle)
		}
	}
	pp.defaultPromptsGroup.Y = currentY
	linesDrawn := pp.defaultPromptsGroup.Draw()

	// Highlight selected item within default prompts if expanded
	if pp.selectedGroup == 0 && pp.selectedItemIndex >= 0 && pp.defaultPromptsGroup.IsExpanded() {
		actualY := defaultY + 1 + pp.selectedItemIndex // +1 for header
		if actualY >= 6 && actualY < h-4 {
			// Draw item highlight
			selectionStyle := tcell.StyleDefault.Background(tcell.ColorDarkBlue).Foreground(tcell.ColorWhite)
			for x := 3; x < w-3; x++ {
				pp.screen.SetContent(x, actualY, ' ', nil, selectionStyle)
			}
			// Redraw the item text with highlight
			items := pp.defaultPromptsGroup.GetItems()
			if pp.selectedItemIndex < len(items) {
				item := items[pp.selectedItemIndex]
				x := pp.defaultPromptsGroup.X + 2 // Same as component base indentation
				if item.Indented {
					x += 2
				}
				text := item.Text
				if item.IsCheckbox {
					checkbox := "[ ]"
					if item.IsChecked {
						checkbox = "[x]"
					}
					text = checkbox + " " + text
				}
				for i, ch := range text {
					if i < w-x-3 {
						pp.screen.SetContent(x+i, actualY, ch, nil, selectionStyle)
					}
				}
			}
		}
	}
	currentY += linesDrawn + 1

	// Draw custom prompts group
	customY := currentY
	// Highlight header if selected
	if pp.selectedGroup == 1 && pp.selectedItemIndex == -1 && currentY >= 6 && currentY < h-4 {
		selectionStyle := tcell.StyleDefault.Background(tcell.ColorDarkBlue).Foreground(tcell.ColorYellow)
		for x := 3; x < w-3; x++ {
			pp.screen.SetContent(x, currentY, ' ', nil, selectionStyle)
		}
	}
	pp.customPromptsGroup.Y = currentY
	linesDrawn = pp.customPromptsGroup.Draw()

	// Highlight selected item within custom prompts if expanded
	if pp.selectedGroup == 1 && pp.selectedItemIndex >= 0 && pp.customPromptsGroup.IsExpanded() {
		actualY := customY + 1 + pp.selectedItemIndex // +1 for header
		if actualY >= 6 && actualY < h-4 {
			// Draw item highlight
			selectionStyle := tcell.StyleDefault.Background(tcell.ColorDarkBlue).Foreground(tcell.ColorWhite)
			for x := 3; x < w-3; x++ {
				pp.screen.SetContent(x, actualY, ' ', nil, selectionStyle)
			}
			// Redraw the item text with highlight
			items := pp.customPromptsGroup.GetItems()
			if pp.selectedItemIndex < len(items) {
				item := items[pp.selectedItemIndex]
				x := pp.customPromptsGroup.X + 2 // Same as component base indentation
				if item.Indented {
					x += 2
				}
				text := item.Text
				if item.IsCheckbox {
					checkbox := "[ ]"
					if item.IsChecked {
						checkbox = "[x]"
					}
					text = checkbox + " " + text
				}
				for i, ch := range text {
					if i < w-x-3 {
						pp.screen.SetContent(x+i, actualY, ch, nil, selectionStyle)
					}
				}
			}
		}
	}
	currentY += linesDrawn

	// Draw token usage bar
	pp.tokenUsageBar.Draw()

	// Draw instructions
	instructions := " ↑↓:Navigate | Space/Enter:Expand/Toggle | S:System Prompt | I:Info | ESC:Back "
	instructionStyle := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	pp.DrawCenteredText(h-2, instructions, instructionStyle)
}

// drawContentBorder draws a border around the content area
func (pp *PromptsReadOnlyPage) drawContentBorder(x, y, width, height int) {
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)

	// Top border
	pp.screen.SetContent(x, y, '╭', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		pp.screen.SetContent(x+i, y, '─', nil, borderStyle)
	}
	pp.screen.SetContent(x+width-1, y, '╮', nil, borderStyle)

	// Side borders
	for i := 1; i < height-1; i++ {
		pp.screen.SetContent(x, y+i, '│', nil, borderStyle)
		pp.screen.SetContent(x+width-1, y+i, '│', nil, borderStyle)
	}

	// Bottom border
	pp.screen.SetContent(x, y+height-1, '╰', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		pp.screen.SetContent(x+i, y+height-1, '─', nil, borderStyle)
	}
	pp.screen.SetContent(x+width-1, y+height-1, '╯', nil, borderStyle)
}

// DrawText is a helper to draw text at a position
func (pp *PromptsReadOnlyPage) DrawText(x, y int, text string, style tcell.Style) {
	for i, ch := range text {
		pp.screen.SetContent(x+i, y, ch, nil, style)
	}
}

// DrawCenteredText draws centered text
func (pp *PromptsReadOnlyPage) DrawCenteredText(y int, text string, style tcell.Style) {
	w, _ := pp.screen.Size()
	x := (w - len(text)) / 2
	pp.DrawText(x, y, text, style)
}

// ClearContent clears the content area
func (pp *PromptsReadOnlyPage) ClearContent() {
	w, h := pp.screen.Size()
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			pp.screen.SetContent(x, y, ' ', nil, tcell.StyleDefault)
		}
	}
}

// DrawHeader draws the page header
func (pp *PromptsReadOnlyPage) DrawHeader() {
	w, _ := pp.screen.Size()

	// Draw title
	title := fmt.Sprintf(" %s ", pp.title)
	titleStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	pp.DrawCenteredText(1, title, titleStyle)

	// Draw separator
	for x := 0; x < w; x++ {
		pp.screen.SetContent(x, 2, '─', nil, tcell.StyleDefault.Foreground(tcell.ColorGray))
	}
}

// HandleInput processes keyboard input
func (pp *PromptsReadOnlyPage) HandleInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEscape:
		// Hide info tooltip if visible, otherwise exit
		if pp.infoIcon.Tooltip.IsVisible() {
			pp.infoIcon.Tooltip.Hide()
			return false
		}
		return true // Exit the page

	case tcell.KeyUp:
		// Navigate through items within groups
		if pp.selectedGroup == 1 {
			// In custom prompts group
			if pp.selectedItemIndex > -1 {
				// Find previous selectable item
				items := pp.customPromptsGroup.GetItems()
				prevIndex := pp.findPreviousSelectableItem(items, pp.selectedItemIndex)
				pp.selectedItemIndex = prevIndex
				pp.handleScrollForSelection()
			} else {
				// At custom prompts header, move to default prompts
				pp.selectedGroup = 0
				if pp.defaultPromptsGroup.IsExpanded() {
					// Select last selectable item in default prompts
					items := pp.defaultPromptsGroup.GetItems()
					pp.selectedItemIndex = pp.findLastSelectableItem(items)
				} else {
					// Select header if collapsed
					pp.selectedItemIndex = -1
				}
				pp.handleScrollForSelection()
			}
		} else {
			// In default prompts group
			if pp.selectedItemIndex > -1 {
				// Find previous selectable item
				items := pp.defaultPromptsGroup.GetItems()
				prevIndex := pp.findPreviousSelectableItem(items, pp.selectedItemIndex)
				pp.selectedItemIndex = prevIndex
				pp.handleScrollForSelection()
			}
			// If at header, stay there
		}
		return false

	case tcell.KeyDown:
		// Navigate through items within groups
		if pp.selectedGroup == 0 {
			// In default prompts group
			if pp.defaultPromptsGroup.IsExpanded() {
				// Find next selectable item (checkbox or header)
				items := pp.defaultPromptsGroup.GetItems()
				nextIndex := pp.findNextSelectableItem(items, pp.selectedItemIndex)
				if nextIndex != -2 { // -2 means no more items
					pp.selectedItemIndex = nextIndex
					pp.handleScrollForSelection()
				} else {
					// No more items in default prompts, move to custom prompts
					pp.selectedGroup = 1
					pp.selectedItemIndex = -1 // Select header
					pp.handleScrollForSelection()
				}
			} else {
				// Group is collapsed - move to custom prompts
				pp.selectedGroup = 1
				pp.selectedItemIndex = -1
				pp.handleScrollForSelection()
			}
		} else {
			// In custom prompts group
			if pp.customPromptsGroup.IsExpanded() {
				// Find next selectable item
				items := pp.customPromptsGroup.GetItems()
				nextIndex := pp.findNextSelectableItem(items, pp.selectedItemIndex)
				if nextIndex != -2 {
					pp.selectedItemIndex = nextIndex
					pp.handleScrollForSelection()
				}
				// If at last item, stay there
			}
			// If collapsed, stay on header
		}
		return false

	case tcell.KeyEnter:
		// Toggle expansion when on header, or select item when on item
		if pp.selectedItemIndex == -1 {
			// On header - toggle expansion
			if pp.selectedGroup == 0 {
				pp.defaultPromptsGroup.Toggle()
			} else {
				pp.customPromptsGroup.Toggle()
			}
		} else {
			// On an item - could trigger item-specific action
			// For now, just acknowledge selection
		}
		return false

	case tcell.KeyRune:
		switch ev.Rune() {
		case 's', 'S':
			// Show system prompt in a modal or expanded view
			// For now, just toggle the groups
			pp.defaultPromptsGroup.Toggle()
			pp.customPromptsGroup.Toggle()
			return false

		case 'i', 'I':
			// Toggle info tooltip
			pp.infoIcon.HandleInput(ev)
			return false

		case ' ':
			// Space toggles expansion when on header or checkbox when on item
			if pp.selectedItemIndex == -1 {
				// On header - toggle expansion
				if pp.selectedGroup == 0 {
					pp.defaultPromptsGroup.Toggle()
				} else {
					pp.customPromptsGroup.Toggle()
				}
			} else {
				// On an item - toggle checkbox if it has one
				var items []components.ExpandableItem
				if pp.selectedGroup == 0 {
					items = pp.defaultPromptsGroup.GetItems()
				} else {
					items = pp.customPromptsGroup.GetItems()
				}
				if pp.selectedItemIndex < len(items) {
					item := &items[pp.selectedItemIndex]
					if item.IsCheckbox {
						item.IsChecked = !item.IsChecked

						// Find the actual prompt item index (skip non-checkbox items)
						checkboxIndex := 0
						for i := 0; i <= pp.selectedItemIndex; i++ {
							if items[i].IsCheckbox {
								if i == pp.selectedItemIndex {
									break
								}
								checkboxIndex++
							}
						}

						// Update enabledPrompts map
						var promptID string
						if pp.selectedGroup == 0 {
							// Default prompts
							if checkboxIndex < len(pp.defaultPromptIDs) {
								promptID = pp.defaultPromptIDs[checkboxIndex]
							}
							pp.defaultPromptsGroup.UpdateItem(pp.selectedItemIndex, *item)
						} else {
							// MCP prompts in custom group
							if checkboxIndex < len(pp.mcpPromptIDs) {
								promptID = pp.mcpPromptIDs[checkboxIndex]
							}
							pp.customPromptsGroup.UpdateItem(pp.selectedItemIndex, *item)
						}

						// Update the enabled state
						if promptID != "" {
							pp.enabledPrompts[promptID] = item.IsChecked
						}

						// Update token usage when toggling prompts
						pp.updateTokenUsage()
					}
				}
			}
			return false
		}
	}

	return false
}

// findNextSelectableItem finds the next checkbox or header item
func (pp *PromptsReadOnlyPage) findNextSelectableItem(items []components.ExpandableItem, currentIndex int) int {
	for i := currentIndex + 1; i < len(items); i++ {
		if items[i].IsCheckbox || (!items[i].Indented && strings.Contains(items[i].Text, ":")) {
			return i
		}
	}
	return -2 // No more selectable items
}

// findPreviousSelectableItem finds the previous checkbox or header item
func (pp *PromptsReadOnlyPage) findPreviousSelectableItem(items []components.ExpandableItem, currentIndex int) int {
	for i := currentIndex - 1; i >= 0; i-- {
		if items[i].IsCheckbox || (!items[i].Indented && strings.Contains(items[i].Text, ":")) {
			return i
		}
	}
	return -1 // Back to header
}

// findLastSelectableItem finds the last checkbox or header item
func (pp *PromptsReadOnlyPage) findLastSelectableItem(items []components.ExpandableItem) int {
	for i := len(items) - 1; i >= 0; i-- {
		if items[i].IsCheckbox || (!items[i].Indented && strings.Contains(items[i].Text, ":")) {
			return i
		}
	}
	return -1 // No selectable items
}

// handleScrollForSelection adjusts scroll offset based on current selection
func (pp *PromptsReadOnlyPage) handleScrollForSelection() {
	// Calculate the absolute line position of current selection
	var currentLine int

	if pp.selectedGroup == 0 {
		// Default prompts group
		currentLine = 0 // Header is at line 0
		if pp.selectedItemIndex >= 0 && pp.defaultPromptsGroup.IsExpanded() {
			// Add lines for each item before the selected one
			currentLine += pp.selectedItemIndex + 1 // +1 to skip header
		}
	} else {
		// Custom prompts group - calculate position after default prompts
		currentLine = 1 // Default prompts header
		if pp.defaultPromptsGroup.IsExpanded() {
			currentLine += len(pp.defaultPromptsGroup.GetItems())
		}
		currentLine += 1 // Gap between groups

		if pp.selectedItemIndex >= 0 && pp.customPromptsGroup.IsExpanded() {
			currentLine += pp.selectedItemIndex + 1 // +1 to skip header
		}
	}

	// Calculate visible position
	visibleY := currentLine - pp.scrollOffset

	// Scroll down if selection is too close to bottom
	if visibleY >= pp.visibleHeight - 3 {
		pp.scrollOffset = currentLine - (pp.visibleHeight - 4)
		if pp.scrollOffset < 0 {
			pp.scrollOffset = 0
		}
	}

	// Scroll up if selection is above visible area
	if visibleY < 2 {
		pp.scrollOffset = currentLine - 2
		if pp.scrollOffset < 0 {
			pp.scrollOffset = 0
		}
	}

	// Update max scroll for display
	pp.maxScroll = 10 // Approximate based on content
}

// OnActivate is called when the page becomes active
func (pp *PromptsReadOnlyPage) OnActivate() {
	pp.loadPrompts()
}

// Save saves any changes (no-op for read-only page)
func (pp *PromptsReadOnlyPage) Save() error {
	// Read-only page, nothing to save
	return nil
}
// HandleMouse processes mouse events for the page
func (pp *PromptsReadOnlyPage) HandleMouse(event *core.MouseEvent) bool {
	// Handle scroll events globally
	if event.Type == core.MouseEventScroll {
		switch event.Button {
		case core.MouseWheelUp:
			if pp.scrollOffset > 0 {
				pp.scrollOffset--
				return true
			}
		case core.MouseWheelDown:
			if pp.scrollOffset < pp.maxScroll {
				pp.scrollOffset++
				return true
			}
		}
		return false
	}

	// Check if click is on the default prompts group
	defaultGroupY := pp.defaultPromptsGroup.Y - pp.scrollOffset
	defaultGroupHeight := 1 // Header height
	if pp.defaultPromptsGroup.IsExpanded() {
		defaultGroupHeight += len(pp.defaultPromptsGroup.GetItems())
	}

	if event.Y >= defaultGroupY && event.Y < defaultGroupY+defaultGroupHeight {
		// Calculate relative Y within the group
		relativeY := event.Y - defaultGroupY

		if relativeY == 0 {
			// Click on header - toggle expansion
			if event.Type == core.MouseEventClick {
				pp.defaultPromptsGroup.Toggle()
				pp.selectedGroup = 0
				pp.selectedItemIndex = -1
				return true
			}
		} else if pp.defaultPromptsGroup.IsExpanded() && relativeY > 0 {
			// Click on an item
			itemIndex := relativeY - 1
			items := pp.defaultPromptsGroup.GetItems()

			if itemIndex < len(items) {
				item := items[itemIndex]
				if item.IsCheckbox && event.Type == core.MouseEventClick {
					// Toggle checkbox state
					items[itemIndex].IsChecked = !items[itemIndex].IsChecked
					pp.defaultPromptsGroup.UpdateItem(itemIndex, items[itemIndex])

					// Update the enabled prompts tracking
					if itemIndex/3 < len(pp.defaultPromptIDs) {
						promptID := pp.defaultPromptIDs[itemIndex/3]
						pp.enabledPrompts[promptID] = items[itemIndex].IsChecked
					}

					// Update selection
					pp.selectedGroup = 0
					pp.selectedItemIndex = itemIndex
					return true
				} else if event.Type == core.MouseEventHover {
					// Update selection on hover
					pp.selectedGroup = 0
					pp.selectedItemIndex = itemIndex
					return true
				}
			}
		}
	}

	// Check if click is on the custom prompts group
	customGroupY := pp.customPromptsGroup.Y - pp.scrollOffset
	if pp.defaultPromptsGroup.IsExpanded() {
		customGroupY = defaultGroupY + defaultGroupHeight + 1
	}

	customGroupHeight := 1 // Header height
	if pp.customPromptsGroup.IsExpanded() {
		customGroupHeight += len(pp.customPromptsGroup.GetItems())
	}

	if event.Y >= customGroupY && event.Y < customGroupY+customGroupHeight {
		// Calculate relative Y within the group
		relativeY := event.Y - customGroupY

		if relativeY == 0 {
			// Click on header - toggle expansion
			if event.Type == core.MouseEventClick {
				pp.customPromptsGroup.Toggle()
				pp.selectedGroup = 1
				pp.selectedItemIndex = -1
				return true
			}
		} else if pp.customPromptsGroup.IsExpanded() && relativeY > 0 {
			// Click on an item
			itemIndex := relativeY - 1
			items := pp.customPromptsGroup.GetItems()

			if itemIndex < len(items) {
				item := items[itemIndex]
				if item.IsCheckbox && event.Type == core.MouseEventClick {
					// Toggle checkbox state
					items[itemIndex].IsChecked = !items[itemIndex].IsChecked
					pp.customPromptsGroup.UpdateItem(itemIndex, items[itemIndex])

					// Update the enabled prompts tracking
					if itemIndex/3 < len(pp.mcpPromptIDs) {
						promptID := pp.mcpPromptIDs[itemIndex/3]
						pp.enabledPrompts[promptID] = items[itemIndex].IsChecked
					}

					// Update selection
					pp.selectedGroup = 1
					pp.selectedItemIndex = itemIndex
					return true
				} else if event.Type == core.MouseEventHover {
					// Update selection on hover
					pp.selectedGroup = 1
					pp.selectedItemIndex = itemIndex
					return true
				}
			}
		}
	}

	// Check if click is on info icon
	if pp.infoIcon != nil && pp.infoIcon.HandleMouse(event) {
		return true
	}

	return false
}
