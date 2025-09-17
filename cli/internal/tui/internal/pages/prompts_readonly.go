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
}

// NewPromptsReadOnlyPage creates a new read-only prompts configuration page
func NewPromptsReadOnlyPage(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *PromptsReadOnlyPage {
	page := &PromptsReadOnlyPage{
		BasePage:     NewBasePage(screen, config, state, eventBus, "System Prompts", PageTypePrompts),
		scrollOffset: 0,
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

	// Draw "Show System Prompt" button hint
	buttonHint := "[S] Show System Prompt"
	buttonStyle := tcell.StyleDefault.Foreground(tcell.ColorBlue)
	pp.DrawText(w-len(buttonHint)-5, 3, buttonHint, buttonStyle)

	// Draw info icon
	pp.infoIcon.Draw()

	// Draw main content area border
	pp.drawContentBorder(2, 5, w-4, h-8)

	// Draw expandable groups
	currentY := pp.defaultPromptsGroup.Draw()

	pp.customPromptsGroup.Y = currentY + 1
	pp.customPromptsGroup.Draw()

	// Draw token usage bar
	pp.tokenUsageBar.Draw()

	// Draw instructions
	instructions := " S:System Prompt | I:Info | Space:Expand | ↑↓:Scroll | ESC:Back "
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
		if pp.scrollOffset > 0 {
			pp.scrollOffset--
		}
		return false

	case tcell.KeyDown:
		pp.scrollOffset++
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
			// Toggle expansion of groups
			if pp.defaultPromptsGroup.IsExpanded() {
				pp.defaultPromptsGroup.Toggle()
			} else {
				pp.customPromptsGroup.Toggle()
			}
			return false
		}
	}

	return false
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