package components

import (
	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// Checkbox represents a read-only checkbox display
type Checkbox struct {
	screen      tcell.Screen
	x, y        int
	label       string
	checked     bool
	style       tcell.Style
	focusStyle  tcell.Style
	hoverStyle  tcell.Style
	hasFocus    bool
	isHovered   bool
	isReadOnly  bool
	onChange    func(bool)
}

// NewCheckbox creates a new checkbox component
func NewCheckbox(screen tcell.Screen, x, y int, label string, checked bool) *Checkbox {
	return &Checkbox{
		screen:     screen,
		x:          x,
		y:          y,
		label:      label,
		checked:    checked,
		style:      tcell.StyleDefault,
		focusStyle: tcell.StyleDefault.Foreground(tcell.ColorYellow),
		hoverStyle: tcell.StyleDefault.Foreground(tcell.ColorTeal),
		hasFocus:   false,
		isHovered:  false,
		isReadOnly: false,
		onChange:   nil,
	}
}

// SetChecked sets the checked state
func (c *Checkbox) SetChecked(checked bool) {
	c.checked = checked
}

// IsChecked returns the checked state
func (c *Checkbox) IsChecked() bool {
	return c.checked
}

// SetFocus sets the focus state
func (c *Checkbox) SetFocus(focus bool) {
	c.hasFocus = focus
}

// Draw renders the checkbox
func (c *Checkbox) Draw() {
	style := c.style
	if c.hasFocus {
		style = c.focusStyle
	} else if c.isHovered {
		style = c.hoverStyle
	}

	// Draw checkbox
	checkbox := "[ ]"
	if c.checked {
		checkbox = "[x]"
	}

	// Draw checkbox and label
	text := checkbox + " " + c.label
	for i, ch := range text {
		c.screen.SetContent(c.x+i, c.y, ch, nil, style)
	}
}

// GetWidth returns the total width of the checkbox including label
func (c *Checkbox) GetWidth() int {
	return 3 + 1 + len(c.label) // checkbox + space + label
}

// SetReadOnly sets whether the checkbox can be toggled
func (c *Checkbox) SetReadOnly(readOnly bool) {
	c.isReadOnly = readOnly
}

// SetOnChange sets the callback function for checkbox state changes
func (c *Checkbox) SetOnChange(onChange func(bool)) {
	c.onChange = onChange
}

// Toggle toggles the checkbox state if not read-only
func (c *Checkbox) Toggle() {
	if !c.isReadOnly {
		c.checked = !c.checked
		if c.onChange != nil {
			c.onChange(c.checked)
		}
	}
}

// HandleMouse processes mouse events for the checkbox
func (c *Checkbox) HandleMouse(event *core.MouseEvent) bool {
	// Check if mouse is within checkbox bounds
	hitTest := core.NewComponentHitTest(c.x, c.y, c.GetWidth(), 1)
	isWithin := hitTest.ContainsEvent(event)

	switch event.Type {
	case core.MouseEventClick:
		if isWithin && !c.isReadOnly {
			c.Toggle()
			return true
		}

	case core.MouseEventHover:
		c.isHovered = isWithin
		return isWithin
	}

	return false
}

// CheckboxGroup manages a group of checkboxes
type CheckboxGroup struct {
	screen     tcell.Screen
	x, y       int
	checkboxes []*Checkbox
	title      string
	style      tcell.Style
}

// NewCheckboxGroup creates a new checkbox group
func NewCheckboxGroup(screen tcell.Screen, x, y int, title string) *CheckboxGroup {
	return &CheckboxGroup{
		screen:     screen,
		x:          x,
		y:          y,
		title:      title,
		checkboxes: []*Checkbox{},
		style:      tcell.StyleDefault,
	}
}

// AddCheckbox adds a checkbox to the group
func (cg *CheckboxGroup) AddCheckbox(label string, checked bool) {
	checkbox := NewCheckbox(cg.screen, cg.x+2, cg.y+1+len(cg.checkboxes), label, checked)
	cg.checkboxes = append(cg.checkboxes, checkbox)
}

// Clear removes all checkboxes
func (cg *CheckboxGroup) Clear() {
	cg.checkboxes = []*Checkbox{}
}

// Draw renders the checkbox group
func (cg *CheckboxGroup) Draw() int {
	currentY := cg.y

	// Draw title if provided
	if cg.title != "" {
		titleStyle := cg.style.Bold(true)
		for i, ch := range cg.title {
			cg.screen.SetContent(cg.x+i, currentY, ch, nil, titleStyle)
		}
		currentY++
	}

	// Draw checkboxes
	for i, checkbox := range cg.checkboxes {
		checkbox.x = cg.x + 2
		checkbox.y = currentY + i
		checkbox.Draw()
	}

	if len(cg.checkboxes) > 0 {
		currentY += len(cg.checkboxes)
	}

	return currentY - cg.y
}

// HandleMouse processes mouse events for the checkbox group
func (cg *CheckboxGroup) HandleMouse(event *core.MouseEvent) bool {
	// Forward mouse events to individual checkboxes
	handled := false
	for _, checkbox := range cg.checkboxes {
		if checkbox.HandleMouse(event) {
			handled = true
		}
	}
	return handled
}