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
}

// NewFunctionsPage creates a new function calling configuration page
func NewFunctionsPage(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *FunctionsPage {
	page := &FunctionsPage{
		BasePage:     NewBasePage(screen, config, state, eventBus, "Function Calling", PageTypeFunctions),
		scrollOffset: 0,
	}

	w, h := screen.Size()

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

	// Draw header
	fp.DrawHeader()

	// Draw info icon
	fp.infoIcon.Draw()

	// Draw main content area border
	fp.drawContentBorder(2, 5, w-4, h-8)

	// Draw expandable groups with scroll support
	currentY := 6

	// Default functions group
	fp.defaultFunctions.SetExpanded(true) // Always expanded in read-only view
	linesDrawn := fp.defaultFunctions.Draw()
	currentY += linesDrawn + 1

	// Custom functions group
	fp.customFunctions.SetExpanded(true) // Always expanded in read-only view
	fp.customFunctions.Y = currentY
	linesDrawn = fp.customFunctions.Draw()
	currentY += linesDrawn

	// Draw function preview if selected
	if fp.selectedFunction != nil {
		fp.drawFunctionPreview()
	}

	// Draw token usage bar
	fp.tokenUsageBar.Draw()

	// Draw instructions
	instructions := " I:Info | ↑↓:Scroll | Enter:View Function | ESC:Back "
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
		if fp.scrollOffset > 0 {
			fp.scrollOffset--
		}
		return false

	case tcell.KeyDown:
		if fp.scrollOffset < fp.maxScroll {
			fp.scrollOffset++
		}
		return false

	case tcell.KeyEnter:
		// Toggle selected group expansion or show function details
		// In read-only mode, we just show the preview
		return false

	case tcell.KeyRune:
		switch ev.Rune() {
		case 'i', 'I':
			// Toggle info tooltip
			fp.infoIcon.HandleInput(ev)
			return false

		case ' ':
			// Toggle expansion of focused group
			if fp.defaultFunctions.IsExpanded() {
				fp.defaultFunctions.Toggle()
			} else {
				fp.customFunctions.Toggle()
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