package pages

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/share"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// FunctionsPage displays function calling configuration (read-only)
type FunctionsPage struct {
	*BasePage
	defaultFunctions  *components.ExpandableGroup
	customFunctions   *components.ExpandableGroup
	tokenUsageBar     *components.TokenUsageBar
	infoIcon          *components.InfoIcon
	scrollOffset      int
	maxScroll         int
	selectedFunction  *share.Function
	functionPreview   []string
	selectedGroup     int  // 0 = default functions, 1 = custom functions
	selectedItemIndex int  // Index of selected item within the group (-1 = group header)
	visibleHeight     int  // Height of the visible content area
	totalLines        int  // Total number of lines in content
}

// NewFunctionsPage creates a new function calling configuration page
func NewFunctionsPage(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *FunctionsPage {
	_, h := screen.Size()
	page := &FunctionsPage{
		BasePage:          NewBasePage(screen, config, state, eventBus, "Function Calling", PageTypeFunctions),
		scrollOffset:      0,
		selectedGroup:     0,  // Start with default functions selected
		selectedItemIndex: -1, // Start on group header
		visibleHeight:     h - 12, // Account for header, footer, borders
		totalLines:        0,
	}

	w, _ := screen.Size()

	// Initialize components
	page.defaultFunctions = components.NewExpandableGroup(screen, 3, 6, w-6, "Default Functions")
	page.customFunctions = components.NewExpandableGroup(screen, 3, 8, w-6, "Custom Functions")

	// Token usage bar
	page.tokenUsageBar = components.NewTokenUsageBar(screen, 3, h-5, w-6)
	page.tokenUsageBar.SetDescription("Function definitions token usage")

	// Info icon with tooltip
	page.infoIcon = components.NewInfoIcon(screen, w-30, 3, 60, 15)
	page.infoIcon.SetTooltipContent(
		"Function Calling",
		"Create JavaScript functions that can be called by AI models through the OpenAI-compatible API. "+
			"(The underlying API mechanism is known as Tool Calling in OpenAI's architecture.)\n\n"+
			"Functions can be marked with @callable or @tool tags to make them available to the AI. "+
			"Default functions include encryption, mathematical operations, and MCP examples.",
	)

	// Load functions
	page.loadFunctions()

	return page
}

// loadFunctions loads function configuration from config
func (fp *FunctionsPage) loadFunctions() {
	// cfg := fp.config.Get() // Not used in read-only view

	// Clear existing items
	fp.defaultFunctions.ClearItems()
	fp.customFunctions.ClearItems()

	// Load default functions - organized by category
	// Since this is read-only, we'll show example data
	fp.loadDefaultFunctionGroup("RC4 Encryption", []defaultFunction{
		{"rc4Encrypt", "Encrypt text using RC4", true},
		{"rc4Decrypt", "Decrypt RC4-encrypted text", true},
		{"generateKey", "Generate random encryption key", false},
	})

	fp.loadDefaultFunctionGroup("Mathematical Functions", []defaultFunction{
		{"calculate", "Perform mathematical calculations", true},
		{"fibonacci", "Calculate Fibonacci sequence", false},
		{"factorial", "Calculate factorial", false},
		{"isPrime", "Check if number is prime", false},
	})

	fp.loadDefaultFunctionGroup("MCP Example Functions", []defaultFunction{
		{"mcpListTools", "List available MCP tools", false},
		{"mcpCallTool", "Call an MCP tool", false},
		{"mcpGetStatus", "Get MCP server status", false},
	})

	// Load custom functions (mock data for read-only view)
	// In a real implementation, this would load from actual config
	hasCustomFunctions := false

	if !hasCustomFunctions {
		// Show placeholder if no custom functions
		item := components.ExpandableItem{
			Text:     "(No custom functions defined)",
			Indented: false,
			Style:    tcell.StyleDefault.Foreground(tcell.ColorGray).Italic(true),
		}
		fp.customFunctions.AddItem(item)
	}

	// Calculate token usage
	fp.updateTokenUsage()
}

// defaultFunction represents a default function entry
type defaultFunction struct {
	name        string
	description string
	enabled     bool
}

// loadDefaultFunctionGroup loads a group of default functions
func (fp *FunctionsPage) loadDefaultFunctionGroup(groupName string, functions []defaultFunction) {
	// Add group header
	groupItem := components.ExpandableItem{
		Text:     groupName + ":",
		Indented: false,
		Style:    tcell.StyleDefault.Bold(true),
	}
	fp.defaultFunctions.AddItem(groupItem)

	// Add functions
	for _, fn := range functions {
		item := components.ExpandableItem{
			Text:       fn.name,
			Indented:   true,
			Style:      tcell.StyleDefault,
			IsCheckbox: true,
			IsChecked:  fn.enabled,
		}
		fp.defaultFunctions.AddItem(item)

		// Add description
		if fn.description != "" {
			descItem := components.ExpandableItem{
				Text:     "  " + fn.description,
				Indented: true,
				Style:    tcell.StyleDefault.Foreground(tcell.ColorGray),
			}
			fp.defaultFunctions.AddItem(descItem)
		}
	}
}

// updateTokenUsage calculates and updates token usage display
func (fp *FunctionsPage) updateTokenUsage() {
	// Mock token calculation for read-only view
	// In real implementation, this would calculate from actual functions

	// Estimate tokens (rough calculation)
	totalTokens := 0

	// Count enabled default functions (~50 tokens each)
	// We have 3 enabled functions in our mock data
	totalTokens += 3 * 50

	// Update the token usage bar
	maxTokens := 8192 // Typical context window portion for functions
	fp.tokenUsageBar.SetTokens(totalTokens, maxTokens)
}

// Draw renders the functions page
func (fp *FunctionsPage) Draw() {
	w, h := fp.screen.Size()

	// Clear screen
	fp.ClearContent()

	// Draw header with scroll indicator
	fp.DrawHeader()

	// Draw scroll position indicator and selection info
	if fp.maxScroll > 0 || fp.scrollOffset > 0 {
		groupName := "Default"
		if fp.selectedGroup == 1 {
			groupName = "Custom"
		}
		itemInfo := "Header"
		if fp.selectedItemIndex >= 0 {
			itemInfo = fmt.Sprintf("Item %d", fp.selectedItemIndex + 1)
		}
		scrollInfo := fmt.Sprintf("%s: %s | Scroll: %d/%d", groupName, itemInfo, fp.scrollOffset, fp.maxScroll)
		scrollStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
		// Clear previous text first
		for x := w-40; x < w-2; x++ {
			fp.screen.SetContent(x, 3, ' ', nil, tcell.StyleDefault)
		}
		// Draw new text
		for i, ch := range scrollInfo {
			if w-len(scrollInfo)-2+i >= 0 {
				fp.screen.SetContent(w-len(scrollInfo)-2+i, 3, ch, nil, scrollStyle)
			}
		}
	}

	// Draw info icon
	fp.infoIcon.Draw()

	// Draw main content area border
	fp.drawContentBorder(2, 5, w-4, h-8)

	// Draw expandable groups with scroll support
	// When scrollOffset increases, content should move UP (decrease Y)
	baseY := 6
	currentY := baseY - fp.scrollOffset

	// Draw default functions group
	defaultY := currentY
	// Highlight header if selected
	if fp.selectedGroup == 0 && fp.selectedItemIndex == -1 && currentY >= 6 && currentY < h-4 {
		selectionStyle := tcell.StyleDefault.Background(tcell.ColorDarkBlue).Foreground(tcell.ColorYellow)
		for x := 3; x < w-3; x++ {
			fp.screen.SetContent(x, currentY, ' ', nil, selectionStyle)
		}
	}
	fp.defaultFunctions.Y = currentY
	linesDrawn := fp.defaultFunctions.Draw()

	// Highlight selected item within default functions if expanded
	if fp.selectedGroup == 0 && fp.selectedItemIndex >= 0 && fp.defaultFunctions.IsExpanded() {
		// Calculate the actual screen Y position for the selected item
		// defaultY is already adjusted for scroll, so just add the item offset
		actualY := defaultY + 1 + fp.selectedItemIndex // +1 for header
		if actualY >= 6 && actualY < h-4 {
			// Draw item highlight
			selectionStyle := tcell.StyleDefault.Background(tcell.ColorDarkBlue).Foreground(tcell.ColorWhite)
			for x := 3; x < w-3; x++ {
				fp.screen.SetContent(x, actualY, ' ', nil, selectionStyle)
			}
			// Redraw the item text with highlight
			items := fp.defaultFunctions.GetItems()
			if fp.selectedItemIndex < len(items) {
				item := items[fp.selectedItemIndex]
				// Use same positioning as ExpandableGroup component (X + 2 base, +2 more if indented)
				x := fp.defaultFunctions.X + 2 // Same as component base indentation
				if item.Indented {
					x += 2 // Same additional indentation as component
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
						fp.screen.SetContent(x+i, actualY, ch, nil, selectionStyle)
					}
				}
			}
		}
	}
	currentY += linesDrawn + 1

	// Draw custom functions group
	customY := currentY
	// Highlight header if selected
	if fp.selectedGroup == 1 && fp.selectedItemIndex == -1 && currentY >= 6 && currentY < h-4 {
		selectionStyle := tcell.StyleDefault.Background(tcell.ColorDarkBlue).Foreground(tcell.ColorYellow)
		for x := 3; x < w-3; x++ {
			fp.screen.SetContent(x, currentY, ' ', nil, selectionStyle)
		}
	}
	fp.customFunctions.Y = currentY
	linesDrawn = fp.customFunctions.Draw()

	// Highlight selected item within custom functions if expanded
	if fp.selectedGroup == 1 && fp.selectedItemIndex >= 0 && fp.customFunctions.IsExpanded() {
		// Calculate the actual screen Y position for the selected item
		// customY is already adjusted for scroll, so just add the item offset
		actualY := customY + 1 + fp.selectedItemIndex // +1 for header
		if actualY >= 6 && actualY < h-4 {
			// Draw item highlight
			selectionStyle := tcell.StyleDefault.Background(tcell.ColorDarkBlue).Foreground(tcell.ColorWhite)
			for x := 3; x < w-3; x++ {
				fp.screen.SetContent(x, actualY, ' ', nil, selectionStyle)
			}
			// Redraw the item text with highlight
			items := fp.customFunctions.GetItems()
			if fp.selectedItemIndex < len(items) {
				item := items[fp.selectedItemIndex]
				// Use same positioning as ExpandableGroup component (X + 2 base, +2 more if indented)
				x := fp.customFunctions.X + 2 // Same as component base indentation
				if item.Indented {
					x += 2 // Same additional indentation as component
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
						fp.screen.SetContent(x+i, actualY, ch, nil, selectionStyle)
					}
				}
			}
		}
	}
	currentY += linesDrawn

	// Draw function preview if selected
	if fp.selectedFunction != nil {
		fp.drawFunctionPreview()
	}

	// Draw token usage bar
	fp.tokenUsageBar.Draw()

	// Draw instructions
	instructions := " ↑↓:Navigate | Space/Enter:Expand/Collapse | I:Info | ESC:Back "
	instructionStyle := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	fp.DrawCenteredText(h-2, instructions, instructionStyle)
}

// drawContentBorder draws a border around the content area
func (fp *FunctionsPage) drawContentBorder(x, y, width, height int) {
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)

	// Top border
	fp.screen.SetContent(x, y, '╭', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		fp.screen.SetContent(x+i, y, '─', nil, borderStyle)
	}
	fp.screen.SetContent(x+width-1, y, '╮', nil, borderStyle)

	// Side borders
	for i := 1; i < height-1; i++ {
		fp.screen.SetContent(x, y+i, '│', nil, borderStyle)
		fp.screen.SetContent(x+width-1, y+i, '│', nil, borderStyle)
	}

	// Bottom border
	fp.screen.SetContent(x, y+height-1, '╰', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		fp.screen.SetContent(x+i, y+height-1, '─', nil, borderStyle)
	}
	fp.screen.SetContent(x+width-1, y+height-1, '╯', nil, borderStyle)
}

// drawFunctionPreview draws a preview of the selected function
func (fp *FunctionsPage) drawFunctionPreview() {
	if fp.selectedFunction == nil {
		return
	}

	w, h := fp.screen.Size()
	previewWidth := w/2 - 4
	previewHeight := h/2 - 4
	previewX := w/2 + 2
	previewY := 6

	// Draw preview border
	fp.drawContentBorder(previewX-1, previewY-1, previewWidth+2, previewHeight+2)

	// Draw title
	title := fmt.Sprintf(" Function: %s ", fp.selectedFunction.Name)
	titleStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	for i, ch := range title {
		if i < previewWidth {
			fp.screen.SetContent(previewX+i, previewY, ch, nil, titleStyle)
		}
	}

	// Draw description
	if fp.selectedFunction.Description != "" {
		desc := fp.selectedFunction.Description
		descStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
		lines := fp.wrapText(desc, previewWidth-2)
		for i, line := range lines {
			if i+2 < previewHeight {
				for j, ch := range line {
					fp.screen.SetContent(previewX+j, previewY+i+2, ch, nil, descStyle)
				}
			}
		}
	}

	// Draw code preview
	codeY := previewY + 4
	if fp.selectedFunction.Description != "" {
		codeY += 2
	}

	codeLabel := "Code:"
	labelStyle := tcell.StyleDefault.Bold(true)
	for i, ch := range codeLabel {
		fp.screen.SetContent(previewX+i, codeY, ch, nil, labelStyle)
	}

	// Show first few lines of code
	codeLines := strings.Split(fp.selectedFunction.Code, "\n")
	codeStyle := tcell.StyleDefault.Foreground(tcell.ColorBlue)
	maxCodeLines := previewHeight - (codeY - previewY) - 2

	for i := 0; i < len(codeLines) && i < maxCodeLines; i++ {
		line := codeLines[i]
		if len(line) > previewWidth-2 {
			line = line[:previewWidth-5] + "..."
		}
		for j, ch := range line {
			fp.screen.SetContent(previewX+j, codeY+i+1, ch, nil, codeStyle)
		}
	}

	if len(codeLines) > maxCodeLines {
		moreText := fmt.Sprintf("... (%d more lines)", len(codeLines)-maxCodeLines)
		moreStyle := tcell.StyleDefault.Foreground(tcell.ColorGray).Italic(true)
		for i, ch := range moreText {
			fp.screen.SetContent(previewX+i, codeY+maxCodeLines+1, ch, nil, moreStyle)
		}
	}
}

// findNextSelectableItem finds the next checkbox or header item
func (fp *FunctionsPage) findNextSelectableItem(items []components.ExpandableItem, currentIndex int) int {
	for i := currentIndex + 1; i < len(items); i++ {
		if items[i].IsCheckbox || (!items[i].Indented && strings.Contains(items[i].Text, ":")) {
			return i
		}
	}
	return -2 // No more selectable items
}

// findPreviousSelectableItem finds the previous checkbox or header item
func (fp *FunctionsPage) findPreviousSelectableItem(items []components.ExpandableItem, currentIndex int) int {
	for i := currentIndex - 1; i >= 0; i-- {
		if items[i].IsCheckbox || (!items[i].Indented && strings.Contains(items[i].Text, ":")) {
			return i
		}
	}
	return -1 // Back to header
}

// findLastSelectableItem finds the last checkbox or header item
func (fp *FunctionsPage) findLastSelectableItem(items []components.ExpandableItem) int {
	for i := len(items) - 1; i >= 0; i-- {
		if items[i].IsCheckbox || (!items[i].Indented && strings.Contains(items[i].Text, ":")) {
			return i
		}
	}
	return -1 // No selectable items
}

// handleScrollForSelection adjusts scroll offset based on current selection
func (fp *FunctionsPage) handleScrollForSelection() {
	// Calculate the absolute line position of current selection
	var currentLine int

	if fp.selectedGroup == 0 {
		// Default functions group
		currentLine = 0 // Header is at line 0
		if fp.selectedItemIndex >= 0 && fp.defaultFunctions.IsExpanded() {
			// Add lines for each item before the selected one
			currentLine += fp.selectedItemIndex + 1 // +1 to skip header
		}
	} else {
		// Custom functions group - calculate position after default functions
		currentLine = 1 // Default functions header
		if fp.defaultFunctions.IsExpanded() {
			currentLine += len(fp.defaultFunctions.GetItems())
		}
		currentLine += 1 // Gap between groups

		if fp.selectedItemIndex >= 0 && fp.customFunctions.IsExpanded() {
			currentLine += fp.selectedItemIndex + 1 // +1 to skip header
		}
	}

	// Calculate visible position
	visibleY := currentLine - fp.scrollOffset

	// Scroll down if selection is too close to bottom
	if visibleY >= fp.visibleHeight - 3 {
		fp.scrollOffset = currentLine - (fp.visibleHeight - 4)
		if fp.scrollOffset < 0 {
			fp.scrollOffset = 0
		}
	}

	// Scroll up if selection is above visible area
	if visibleY < 2 {
		fp.scrollOffset = currentLine - 2
		if fp.scrollOffset < 0 {
			fp.scrollOffset = 0
		}
	}
}

// wrapText wraps text to fit within the specified width
func (fp *FunctionsPage) wrapText(text string, width int) []string {
	if len(text) <= width {
		return []string{text}
	}

	var lines []string
	words := strings.Fields(text)
	if len(words) == 0 {
		return []string{}
	}

	currentLine := words[0]
	for i := 1; i < len(words); i++ {
		word := words[i]
		if len(currentLine)+1+len(word) <= width {
			currentLine += " " + word
		} else {
			lines = append(lines, currentLine)
			currentLine = word
		}
	}
	if currentLine != "" {
		lines = append(lines, currentLine)
	}

	return lines
}

// HandleInput processes keyboard input
func (fp *FunctionsPage) HandleInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEscape:
		// Hide info tooltip if visible, otherwise exit
		if fp.infoIcon.Tooltip.IsVisible() {
			fp.infoIcon.Tooltip.Hide()
			return false
		}
		return true // Exit the page

	case tcell.KeyUp:
		// Navigate through items within groups
		if fp.selectedGroup == 1 {
			// In custom functions group
			if fp.selectedItemIndex > -1 {
				// Find previous selectable item
				items := fp.customFunctions.GetItems()
				prevIndex := fp.findPreviousSelectableItem(items, fp.selectedItemIndex)
				fp.selectedItemIndex = prevIndex
				fp.handleScrollForSelection()
			} else {
				// At custom functions header, move to default functions
				fp.selectedGroup = 0
				if fp.defaultFunctions.IsExpanded() {
					// Select last selectable item in default functions
					items := fp.defaultFunctions.GetItems()
					fp.selectedItemIndex = fp.findLastSelectableItem(items)
				} else {
					// Select header if collapsed
					fp.selectedItemIndex = -1
				}
				fp.handleScrollForSelection()
			}
		} else {
			// In default functions group
			if fp.selectedItemIndex > -1 {
				// Find previous selectable item
				items := fp.defaultFunctions.GetItems()
				prevIndex := fp.findPreviousSelectableItem(items, fp.selectedItemIndex)
				fp.selectedItemIndex = prevIndex
				fp.handleScrollForSelection()
			}
			// If at header, stay there
		}
		return false

	case tcell.KeyDown:
		// Navigate through items within groups
		if fp.selectedGroup == 0 {
			// In default functions group
			if fp.defaultFunctions.IsExpanded() {
				// Find next selectable item (checkbox or header)
				items := fp.defaultFunctions.GetItems()
				nextIndex := fp.findNextSelectableItem(items, fp.selectedItemIndex)
				if nextIndex != -2 { // -2 means no more items
					fp.selectedItemIndex = nextIndex
					fp.handleScrollForSelection()
				} else {
					// No more items in default functions, move to custom functions
					fp.selectedGroup = 1
					fp.selectedItemIndex = -1 // Select header
					fp.handleScrollForSelection()
				}
			} else {
				// Group is collapsed - move to custom functions
				fp.selectedGroup = 1
				fp.selectedItemIndex = -1
				fp.handleScrollForSelection()
			}
		} else {
			// In custom functions group
			if fp.customFunctions.IsExpanded() {
				// Find next selectable item
				items := fp.customFunctions.GetItems()
				nextIndex := fp.findNextSelectableItem(items, fp.selectedItemIndex)
				if nextIndex != -2 {
					fp.selectedItemIndex = nextIndex
					fp.handleScrollForSelection()
				}
				// If at last item, stay there
			}
			// If collapsed, stay on header
		}
		return false

	case tcell.KeyEnter:
		// Toggle expansion when on header, or select item when on item
		if fp.selectedItemIndex == -1 {
			// On header - toggle expansion
			if fp.selectedGroup == 0 {
				fp.defaultFunctions.Toggle()
				// If expanding and no items selected, stay on header
				// If collapsing, also stay on header
			} else {
				fp.customFunctions.Toggle()
			}
		} else {
			// On an item - could trigger item-specific action
			// For now, just acknowledge selection
		}
		return false

	case tcell.KeyRune:
		switch ev.Rune() {
		case 'i', 'I':
			// Toggle info tooltip
			fp.infoIcon.HandleInput(ev)
			return false

		case ' ':
			// Space toggles expansion when on header or checkbox when on item
			if fp.selectedItemIndex == -1 {
				// On header - toggle expansion
				if fp.selectedGroup == 0 {
					fp.defaultFunctions.Toggle()
				} else {
					fp.customFunctions.Toggle()
				}
			} else {
				// On an item - toggle checkbox if it has one
				var items []components.ExpandableItem
				if fp.selectedGroup == 0 {
					items = fp.defaultFunctions.GetItems()
				} else {
					items = fp.customFunctions.GetItems()
				}
				if fp.selectedItemIndex < len(items) {
					item := &items[fp.selectedItemIndex]
					if item.IsCheckbox {
						item.IsChecked = !item.IsChecked
						// Update the item in the group
						if fp.selectedGroup == 0 {
							fp.defaultFunctions.UpdateItem(fp.selectedItemIndex, *item)
						} else {
							fp.customFunctions.UpdateItem(fp.selectedItemIndex, *item)
						}
					}
				}
			}
			return false
		}
	}

	return false
}

// OnActivate is called when the page becomes active
func (fp *FunctionsPage) OnActivate() {
	fp.loadFunctions()
}

// Save saves any changes (no-op for read-only page)
func (fp *FunctionsPage) Save() error {
	// Read-only page, nothing to save
	return nil
}
// HandleMouse processes mouse events for the page
func (p *FunctionsPage) HandleMouse(event *core.MouseEvent) bool {
	// TODO: Implement mouse support for interactive elements
	// For now, just return false to indicate event not handled
	return false
}
