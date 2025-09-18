package components

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/models"
)

// ModelSelectorItem represents a model option with context info
type ModelSelectorItem struct {
	ID           string
	Name         string
	ContextSize  int
	Provider     models.ModelProvider
	IsDefault    bool
}

// ModelSelector provides a filterable model selection dropdown
type ModelSelector struct {
	screen        tcell.Screen
	models        []ModelSelectorItem
	filteredModels []ModelSelectorItem
	selectedIndex int
	filterText    string

	// Display settings
	title         string
	x, y          int
	width, height int

	// Current selection
	currentValue  string

	// Styles
	normalStyle   tcell.Style
	selectedStyle tcell.Style
	borderStyle   tcell.Style
	filterStyle   tcell.Style
	defaultStyle  tcell.Style

	// Callbacks
	onSelect      func(string)
	onCancel      func()
}

// NewModelSelector creates a new model selector
func NewModelSelector(screen tcell.Screen, title string, modelRegistry *models.ModelRegistry, provider models.ModelProvider, currentValue string) *ModelSelector {
	ms := &ModelSelector{
		screen:        screen,
		title:         title,
		models:        make([]ModelSelectorItem, 0),
		filteredModels: make([]ModelSelectorItem, 0),
		selectedIndex: 0,
		filterText:    "",
		currentValue:  currentValue,
		width:         60,
		height:        20,

		// Styles
		normalStyle:   tcell.StyleDefault.Foreground(tcell.ColorWhite),
		selectedStyle: tcell.StyleDefault.Background(tcell.ColorBlue).Foreground(tcell.ColorWhite),
		borderStyle:   tcell.StyleDefault.Foreground(tcell.ColorGreen),
		filterStyle:   tcell.StyleDefault.Foreground(tcell.ColorYellow),
		defaultStyle:  tcell.StyleDefault.Foreground(tcell.ColorTeal).Bold(true),
	}

	// Load models from registry
	ms.loadModels(modelRegistry, provider)

	// Set position (centered)
	w, h := screen.Size()
	ms.x = (w - ms.width) / 2
	ms.y = (h - ms.height) / 2

	// Apply initial filter (empty shows all)
	ms.applyFilter()

	// Find and select current model
	ms.selectCurrentModel()

	return ms
}

// loadModels loads models from the registry
func (ms *ModelSelector) loadModels(registry *models.ModelRegistry, provider models.ModelProvider) {
	providerModels := registry.GetProviderModels(provider)

	for _, model := range providerModels {
		// Skip system and legacy models
		if model.Category == "system" || model.Category == "legacy" {
			continue
		}

		item := ModelSelectorItem{
			ID:          model.ID,
			Name:        model.Name,
			ContextSize: model.ContextWindow,
			Provider:    model.Provider,
			IsDefault:   model.IsDefault,
		}

		// Add default models first
		if model.IsDefault {
			ms.models = append([]ModelSelectorItem{item}, ms.models...)
		} else {
			ms.models = append(ms.models, item)
		}
	}
}

// applyFilter applies the current filter text to the models
func (ms *ModelSelector) applyFilter() {
	ms.filteredModels = make([]ModelSelectorItem, 0)

	if ms.filterText == "" {
		// No filter, show all
		ms.filteredModels = ms.models
	} else {
		// Filter models by ID or name containing the filter text
		filterLower := strings.ToLower(ms.filterText)
		for _, model := range ms.models {
			idLower := strings.ToLower(model.ID)
			nameLower := strings.ToLower(model.Name)

			if strings.Contains(idLower, filterLower) || strings.Contains(nameLower, filterLower) {
				ms.filteredModels = append(ms.filteredModels, model)
			}
		}
	}

	// Reset selection if out of bounds
	if ms.selectedIndex >= len(ms.filteredModels) {
		ms.selectedIndex = 0
	}
}

// selectCurrentModel finds and selects the current model
func (ms *ModelSelector) selectCurrentModel() {
	for i, model := range ms.filteredModels {
		if model.ID == ms.currentValue {
			ms.selectedIndex = i
			return
		}
	}
}

// Draw renders the model selector
func (ms *ModelSelector) Draw() {
	ms.drawBorder()
	ms.drawTitle()
	ms.drawFilter()
	ms.drawModels()
	ms.drawInstructions()
}

// drawBorder draws the selector border
func (ms *ModelSelector) drawBorder() {
	// Clear background
	bgStyle := tcell.StyleDefault.Background(tcell.ColorBlack)
	for row := 0; row < ms.height; row++ {
		for col := 0; col < ms.width; col++ {
			ms.screen.SetContent(ms.x+col, ms.y+row, ' ', nil, bgStyle)
		}
	}

	// Draw border
	// Top
	ms.screen.SetContent(ms.x, ms.y, '╔', nil, ms.borderStyle)
	for i := 1; i < ms.width-1; i++ {
		ms.screen.SetContent(ms.x+i, ms.y, '═', nil, ms.borderStyle)
	}
	ms.screen.SetContent(ms.x+ms.width-1, ms.y, '╗', nil, ms.borderStyle)

	// Sides
	for i := 1; i < ms.height-1; i++ {
		ms.screen.SetContent(ms.x, ms.y+i, '║', nil, ms.borderStyle)
		ms.screen.SetContent(ms.x+ms.width-1, ms.y+i, '║', nil, ms.borderStyle)
	}

	// Bottom
	ms.screen.SetContent(ms.x, ms.y+ms.height-1, '╚', nil, ms.borderStyle)
	for i := 1; i < ms.width-1; i++ {
		ms.screen.SetContent(ms.x+i, ms.y+ms.height-1, '═', nil, ms.borderStyle)
	}
	ms.screen.SetContent(ms.x+ms.width-1, ms.y+ms.height-1, '╝', nil, ms.borderStyle)
}

// drawTitle draws the selector title
func (ms *ModelSelector) drawTitle() {
	title := fmt.Sprintf(" %s ", ms.title)
	x := ms.x + (ms.width-len(title))/2
	ms.drawText(x, ms.y, title, ms.borderStyle)
}

// drawFilter draws the filter input
func (ms *ModelSelector) drawFilter() {
	y := ms.y + 2

	// Draw filter label
	filterLabel := "Search: "
	ms.drawText(ms.x+2, y, filterLabel, ms.filterStyle)

	// Draw filter text
	filterX := ms.x + 2 + len(filterLabel)
	filterWidth := ms.width - 4 - len(filterLabel)

	// Draw input background
	for i := 0; i < filterWidth; i++ {
		ms.screen.SetContent(filterX+i, y, ' ', nil, ms.filterStyle)
	}

	// Draw filter text
	displayText := ms.filterText
	if len(displayText) > filterWidth-1 {
		displayText = displayText[len(displayText)-filterWidth+1:]
	}
	ms.drawText(filterX, y, displayText, ms.filterStyle)

	// Draw cursor
	cursorX := filterX + len(displayText)
	if cursorX < ms.x+ms.width-2 {
		ms.screen.SetContent(cursorX, y, '█', nil, ms.filterStyle)
	}

	// Draw separator
	for i := 1; i < ms.width-1; i++ {
		ms.screen.SetContent(ms.x+i, y+1, '─', nil, ms.borderStyle)
	}
}

// drawModels draws the filtered model list
func (ms *ModelSelector) drawModels() {
	startY := ms.y + 4
	maxItems := ms.height - 7 // Account for borders, title, filter, instructions

	// Calculate scroll position
	scrollStart := 0
	if ms.selectedIndex >= maxItems {
		scrollStart = ms.selectedIndex - maxItems + 1
	}

	// Draw models
	for i := 0; i < maxItems && i+scrollStart < len(ms.filteredModels); i++ {
		model := ms.filteredModels[i+scrollStart]
		y := startY + i

		// Determine style
		style := ms.normalStyle
		if i+scrollStart == ms.selectedIndex {
			style = ms.selectedStyle
		} else if model.IsDefault {
			style = ms.defaultStyle
		}

		// Format model display with context size
		contextStr := ms.formatContextSize(model.ContextSize)
		text := fmt.Sprintf("%s (%s)", model.ID, contextStr)

		// Add star for default model
		if model.IsDefault {
			text = "★ " + text
		}

		// Truncate if too long
		maxLen := ms.width - 4
		if len(text) > maxLen {
			text = text[:maxLen-3] + "..."
		}

		// Clear the line first (for selection highlight)
		if i+scrollStart == ms.selectedIndex {
			for j := 1; j < ms.width-1; j++ {
				ms.screen.SetContent(ms.x+j, y, ' ', nil, style)
			}
		}

		// Draw the model
		ms.drawText(ms.x+2, y, text, style)
	}

	// Draw scroll indicators
	if scrollStart > 0 {
		ms.drawText(ms.x+ms.width-3, startY, "↑", ms.borderStyle)
	}
	if scrollStart+maxItems < len(ms.filteredModels) {
		ms.drawText(ms.x+ms.width-3, startY+maxItems-1, "↓", ms.borderStyle)
	}
}

// formatContextSize formats the context window size for display
func (ms *ModelSelector) formatContextSize(size int) string {
	if size >= 1000000 {
		return fmt.Sprintf("%.1fM", float64(size)/1000000)
	} else if size >= 1000 {
		return fmt.Sprintf("%dK", size/1000)
	}
	return fmt.Sprintf("%d", size)
}

// drawInstructions draws the bottom instructions
func (ms *ModelSelector) drawInstructions() {
	y := ms.y + ms.height - 2
	instructions := " Type to search • ↑↓ Navigate • Enter Select • Esc Cancel "

	// Center the instructions
	x := ms.x + (ms.width-len(instructions))/2
	if x < ms.x+1 {
		x = ms.x + 1
	}

	ms.drawText(x, y, instructions, ms.borderStyle)
}

// drawText draws text at the given position
func (ms *ModelSelector) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		ms.screen.SetContent(x+i, y, r, nil, style)
	}
}

// HandleInput processes keyboard input
func (ms *ModelSelector) HandleInput(ev *tcell.EventKey) (string, bool) {
	switch ev.Key() {
	case tcell.KeyEscape:
		// Cancel selection
		return "", true

	case tcell.KeyEnter:
		// Select current item
		if ms.selectedIndex < len(ms.filteredModels) {
			return ms.filteredModels[ms.selectedIndex].ID, true
		}
		return "", true

	case tcell.KeyUp:
		// Move selection up
		if ms.selectedIndex > 0 {
			ms.selectedIndex--
		}

	case tcell.KeyDown:
		// Move selection down
		if ms.selectedIndex < len(ms.filteredModels)-1 {
			ms.selectedIndex++
		}

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		// Remove character from filter
		if len(ms.filterText) > 0 {
			ms.filterText = ms.filterText[:len(ms.filterText)-1]
			ms.applyFilter()
		}

	case tcell.KeyRune:
		// Add character to filter
		r := ev.Rune()
		ms.filterText += string(r)
		ms.applyFilter()

	case tcell.KeyCtrlU:
		// Clear filter
		ms.filterText = ""
		ms.applyFilter()
	}

	return "", false
}

// HandleMouse processes mouse events
func (ms *ModelSelector) HandleMouse(event *tcell.Event) (string, bool) {
	// For now, we don't handle mouse events in the model selector
	// This could be extended to support clicking on models
	return "", false
}