package pages

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// PageType represents different page types in the application
type PageType int

const (
	PageTypeChat PageType = iota
	PageTypeSettings
	PageTypePrompts
	PageTypeFunctions
	PageTypeMCP
	PageTypeRAG
	PageTypeShare
)

// Page defines the interface for all pages in the application
type Page interface {
	// Core lifecycle methods
	Draw()
	HandleInput(ev *tcell.EventKey) bool
	HandleMouse(event *core.MouseEvent) bool
	OnActivate()
	OnDeactivate()

	// Metadata
	GetTitle() string
	GetType() PageType

	// State management
	IsDirty() bool
	Save() error
}

// BasePage provides common functionality for all pages
type BasePage struct {
	screen   tcell.Screen
	config   *core.ConfigManager
	state    *core.AppState
	eventBus *core.EventBus
	title    string
	pageType PageType
	dirty    bool
}

// NewBasePage creates a new base page
func NewBasePage(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus, title string, pageType PageType) *BasePage {
	return &BasePage{
		screen:   screen,
		config:   config,
		state:    state,
		eventBus: eventBus,
		title:    title,
		pageType: pageType,
		dirty:    false,
	}
}

// GetTitle returns the page title
func (p *BasePage) GetTitle() string {
	return p.title
}

// GetType returns the page type
func (p *BasePage) GetType() PageType {
	return p.pageType
}

// IsDirty returns whether the page has unsaved changes
func (p *BasePage) IsDirty() bool {
	return p.dirty
}

// SetDirty marks the page as having unsaved changes
func (p *BasePage) SetDirty(dirty bool) {
	p.dirty = dirty
}

// OnActivate is called when the page becomes active
func (p *BasePage) OnActivate() {
	// Default implementation - override in subclasses
}

// OnDeactivate is called when the page becomes inactive
func (p *BasePage) OnDeactivate() {
	// Default implementation - override in subclasses
}

// Save saves any changes
func (p *BasePage) Save() error {
	// Default implementation - override in subclasses
	p.dirty = false
	return nil
}

// HandleMouse handles mouse events for the page
func (p *BasePage) HandleMouse(event *core.MouseEvent) bool {
	// Default implementation - override in subclasses
	return false
}

// Common drawing helpers

// DrawBox draws a box with the specified style
func (p *BasePage) DrawBox(x, y, w, h int, style tcell.Style) {
	// Top border
	p.screen.SetContent(x, y, '╔', nil, style)
	for i := 1; i < w-1; i++ {
		p.screen.SetContent(x+i, y, '═', nil, style)
	}
	p.screen.SetContent(x+w-1, y, '╗', nil, style)

	// Side borders
	for i := 1; i < h-1; i++ {
		p.screen.SetContent(x, y+i, '║', nil, style)
		p.screen.SetContent(x+w-1, y+i, '║', nil, style)
		// Clear interior
		for j := 1; j < w-1; j++ {
			p.screen.SetContent(x+j, y+i, ' ', nil, style)
		}
	}

	// Bottom border
	p.screen.SetContent(x, y+h-1, '╚', nil, style)
	for i := 1; i < w-1; i++ {
		p.screen.SetContent(x+i, y+h-1, '═', nil, style)
	}
	p.screen.SetContent(x+w-1, y+h-1, '╝', nil, style)
}

// DrawText draws text at the specified position
func (p *BasePage) DrawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		p.screen.SetContent(x+i, y, r, nil, style)
	}
}

// ClearLine clears a line at the specified position
func (p *BasePage) ClearLine(y int, style tcell.Style) {
	w, _ := p.screen.Size()
	for x := 0; x < w; x++ {
		p.screen.SetContent(x, y, ' ', nil, style)
	}
}

// IsClickOutsideModal checks if a mouse click is outside modal bounds
func (p *BasePage) IsClickOutsideModal(event *core.MouseEvent, modalX, modalY, modalWidth, modalHeight int) bool {
	return event.X < modalX || event.X >= modalX+modalWidth ||
		event.Y < modalY || event.Y >= modalY+modalHeight
}

// DrawCenteredText draws text centered horizontally
func (p *BasePage) DrawCenteredText(y int, text string, style tcell.Style) {
	w, _ := p.screen.Size()
	x := (w - len(text)) / 2
	p.DrawText(x, y, text, style)
}

// ClearContent clears the entire screen content area
func (p *BasePage) ClearContent() {
	w, h := p.screen.Size()
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			p.screen.SetContent(x, y, ' ', nil, tcell.StyleDefault)
		}
	}
}

// DrawHeader draws a standard page header with title
func (p *BasePage) DrawHeader() {
	w, _ := p.screen.Size()

	// Draw title
	title := fmt.Sprintf(" %s ", p.title)
	titleStyle := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	p.DrawCenteredText(1, title, titleStyle)

	// Draw separator line
	for x := 0; x < w; x++ {
		p.screen.SetContent(x, 2, '─', nil, tcell.StyleDefault.Foreground(tcell.ColorGray))
	}
}