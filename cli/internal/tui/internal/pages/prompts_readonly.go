package pages

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/prompts"
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
	// cfg := pp.config.Get() // Not used directly in read-only view

	// Clear existing items
	pp.defaultPromptsGroup.ClearItems()
	pp.customPromptsGroup.ClearItems()

	// Load embedded default prompts (categories)
	defaultCategories := prompts.GetDefaultPrompts()
	enabledDefaults := make(map[string]bool)

	// For read-only view, mock which prompts are enabled
	// In real implementation, this would load from actual config
	enabledDefaults["agent-orchestration"] = true
	enabledDefaults["agent-coding"] = true

	// Add default prompts to the group (organized by category)
	for _, category := range defaultCategories {
		// Add category header
		categoryItem := components.ExpandableItem{
			Text:  category.Name + ":",
			Style: tcell.StyleDefault.Bold(true),
		}
		pp.defaultPromptsGroup.AddItem(categoryItem)

		// Add prompts in this category
		for _, prompt := range category.Prompts {
			item := components.ExpandableItem{
				Text:       prompt.Name,
				Indented:   true,
				Style:      tcell.StyleDefault,
				IsCheckbox: true,
				IsChecked:  enabledDefaults[prompt.ID],
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

			// Add token count
			tokenItem := components.ExpandableItem{
				Text:     fmt.Sprintf("  ~%d tokens", prompt.Tokens),
				Indented: true,
				Style:    tcell.StyleDefault.Foreground(tcell.ColorBlue),
			}
			pp.defaultPromptsGroup.AddItem(tokenItem)
		}

		// Add spacing between categories
		pp.defaultPromptsGroup.AddItem(components.ExpandableItem{Text: ""})
	}

	// Load custom prompts (mock data for read-only view)
	hasCustom := false

	if !hasCustom {
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

	// Count tokens from system prompt
	cfg := pp.config.Get()
	if cfg.SystemPrompt != "" {
		totalTokens += pp.estimateTokens(cfg.SystemPrompt)
	}

	// For read-only view, estimate based on enabled defaults
	// agent-orchestration: 850 tokens, agent-coding: 650 tokens
	totalTokens += 850 + 650

	// Update the token usage bar
	maxTokens := 2048 // Typical system prompt allocation
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
						// Update the item in the group
						if pp.selectedGroup == 0 {
							pp.defaultPromptsGroup.UpdateItem(pp.selectedItemIndex, *item)
						} else {
							pp.customPromptsGroup.UpdateItem(pp.selectedItemIndex, *item)
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