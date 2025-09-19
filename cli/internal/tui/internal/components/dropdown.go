package components

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// DropdownItem represents an option in the dropdown
type DropdownItem struct {
	value       string
	index       int
	description string
}

func (d *DropdownItem) GetID() string          { return d.value }
func (d *DropdownItem) GetNumber() int         { return d.index }
func (d *DropdownItem) GetTitle() string       { return d.value }
func (d *DropdownItem) GetDescription() string { return d.description }
func (d *DropdownItem) GetInfo() string        { return d.description }
func (d *DropdownItem) GetCategory() string    { return "" }
func (d *DropdownItem) IsEnabled() bool        { return true }

// DropdownSelector provides a filterable dropdown menu
type DropdownSelector struct {
	screen       tcell.Screen
	menu         *FilterableMenu
	title        string
	options      []string
	descriptions map[string]string
	currentValue string
	onSelect     func(string)
	onCancel     func()
}

// NewDropdownSelector creates a new dropdown selector
func NewDropdownSelector(screen tcell.Screen, title string, options []string, currentValue string) *DropdownSelector {
	ds := &DropdownSelector{
		screen:       screen,
		title:        title,
		options:      options,
		currentValue: currentValue,
		descriptions: make(map[string]string),
	}

	// Create filterable menu
	ds.menu = NewFilterableMenu(screen, title)

	// Configure menu size and position - ensure we show more options
	w, h := screen.Size()
	menuWidth := 40
	// Show at least 10 lines for options, but no more than screen allows
	minHeight := 12  // This will show about 5-6 options after accounting for borders/filter
	maxHeight := min(20, h-10)  // Don't exceed screen bounds
	menuHeight := max(minHeight, min(maxHeight, len(options)+7))
	infoWidth := 30

	ds.menu.SetDimensions(menuWidth, menuHeight)
	ds.menu.SetPosition((w-menuWidth-infoWidth-2)/2, (h-menuHeight)/2)
	ds.menu.SetInfoPanel(true, infoWidth)

	// Add options as menu items
	for i, option := range options {
		item := &DropdownItem{
			value:       option,
			index:       i,
			description: ds.getDescription(option),
		}
		ds.menu.AddItem(item)
	}

	return ds
}

// SetDescriptions sets descriptions for options
func (ds *DropdownSelector) SetDescriptions(descriptions map[string]string) {
	ds.descriptions = descriptions

	// Update menu items with descriptions
	ds.menu.items = make([]MenuItem, 0)
	ds.menu.filteredItems = make([]MenuItem, 0)

	for i, option := range ds.options {
		item := &DropdownItem{
			value:       option,
			index:       i,
			description: ds.getDescription(option),
		}
		ds.menu.AddItem(item)
	}
}

// getDescription returns the description for an option
func (ds *DropdownSelector) getDescription(option string) string {
	if desc, ok := ds.descriptions[option]; ok {
		return desc
	}

	// Default descriptions for common options
	switch option {
	case "openai":
		return "OpenAI's GPT models"
	case "anthropic":
		return "Anthropic's Claude models"
	case "groq":
		return "Groq's fast inference"
	case "ollama":
		return "Local models via Ollama"
	case "custom":
		return "Custom API endpoint"

	// Model descriptions
	case "gpt-4-turbo-preview":
		return "Latest GPT-4 Turbo with 128k context"
	case "gpt-4":
		return "GPT-4 base model"
	case "gpt-3.5-turbo":
		return "Fast and cost-effective"
	case "gpt-3.5-turbo-16k":
		return "GPT-3.5 with 16k context"

	case "claude-3-opus":
		return "Most capable Claude model"
	case "claude-3-sonnet":
		return "Balanced performance"
	case "claude-3-haiku":
		return "Fast and efficient"
	case "claude-2.1":
		return "Previous generation Claude"

	case "mixtral-8x7b-32768":
		return "Mixtral MoE with 32k context"
	case "llama2-70b-4096":
		return "Large Llama 2 model"
	case "gemma-7b-it":
		return "Google's Gemma instruct"

	case "llama2":
		return "Meta's Llama 2"
	case "mistral":
		return "Mistral AI model"
	case "codellama":
		return "Code-optimized Llama"
	case "phi":
		return "Microsoft's Phi model"

	// Theme descriptions
	case "dark":
		return "Dark theme for low light"
	case "light":
		return "Light theme for bright environments"
	case "auto":
		return "Automatically adjust based on system"

	default:
		if ds.currentValue == option {
			return "Currently selected"
		}
		return ""
	}
}

// Draw renders the dropdown selector
func (ds *DropdownSelector) Draw() {
	// Draw the filterable menu
	ds.menu.Draw()

	// Add current value indicator
	ds.drawCurrentValue()

	// Add selection instructions
	ds.drawInstructions()
}

// drawCurrentValue shows the currently selected value
func (ds *DropdownSelector) drawCurrentValue() {
	x, y, w, _ := ds.menu.x, ds.menu.y, ds.menu.width, ds.menu.height

	current := fmt.Sprintf(" Current: %s ", ds.currentValue)
	curX := x + w - len(current) - 1
	curY := y

	style := tcell.StyleDefault.Foreground(tcell.ColorYellow).Bold(true)
	ds.drawText(curX, curY, current, style)
}

// drawInstructions shows help text
func (ds *DropdownSelector) drawInstructions() {
	x, y, w, h := ds.menu.x, ds.menu.y, ds.menu.width, ds.menu.height

	instructions := " Type to filter | 0-9:Quick select | Enter:Choose | ESC:Cancel "

	// Truncate if too long
	if len(instructions) > w+30 {
		instructions = " Filter | 0-9 | Enter | ESC "
	}

	instX := x + (w-len(instructions)+30)/2
	instY := y + h

	style := tcell.StyleDefault.Foreground(tcell.ColorGray)
	ds.drawText(instX, instY, instructions, style)
}

// HandleInput processes keyboard input
func (ds *DropdownSelector) HandleInput(ev *tcell.EventKey) (string, bool) {
	// Let the menu handle the input
	item, exit := ds.menu.HandleInput(ev)

	if exit {
		if ds.onCancel != nil {
			ds.onCancel()
		}
		return "", true
	}

	if item != nil {
		// Get the selected value
		if dropdownItem, ok := item.(*DropdownItem); ok {
			selectedValue := dropdownItem.value
			if ds.onSelect != nil {
				ds.onSelect(selectedValue)
			}
			return selectedValue, true
		}
	}

	return "", false
}

// SetCallbacks sets the selection callbacks
func (ds *DropdownSelector) SetCallbacks(onSelect func(string), onCancel func()) {
	ds.onSelect = onSelect
	ds.onCancel = onCancel
}

// drawText draws text at the given position
func (ds *DropdownSelector) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		ds.screen.SetContent(x+i, y, r, nil, style)
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// HandleMouse processes mouse events for the dropdown selector
func (ds *DropdownSelector) HandleMouse(event *core.MouseEvent) (string, bool) {
	// Forward mouse events to the menu
	if ds.menu != nil {
		// Check if the menu handled a click
		if event.Type == core.MouseEventClick {
			// Get the currently selected item from the menu
			selectedItem := ds.menu.GetSelectedItem()
			if selectedItem != nil {
				// Check if this was actually clicked
				if ds.menu.HandleMouse(event) {
					// If the menu handled it and an item is selected, treat it as a selection
					if dropdownItem, ok := selectedItem.(*DropdownItem); ok {
						selectedValue := dropdownItem.value
						if ds.onSelect != nil {
							ds.onSelect(selectedValue)
						}
						return selectedValue, true
					}
				}
			}
		} else {
			// For non-click events, just forward to menu
			ds.menu.HandleMouse(event)
		}
	}

	return "", false
}