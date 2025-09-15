package ui

import (
	"fmt"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/config"
	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/prompts"
)

// PromptsManager manages system prompts selection and editing
type PromptsManager struct {
	screen         tcell.Screen
	config         *config.Config
	categories     []prompts.Category
	selected       int
	scrollOffset   int
	editing        bool
	editBuffer     string
	expandedCat    int // -1 means none expanded
	selectedPrompts map[string]bool
	totalTokens    int
}

// ShowPromptsManager displays the prompts management interface
func ShowPromptsManager(cfg *config.Config) error {
	s, err := tcell.NewScreen()
	if err != nil {
		return err
	}

	if err := s.Init(); err != nil {
		return err
	}
	defer s.Fini()

	s.SetStyle(tcell.StyleDefault.Background(tcell.ColorReset).Foreground(tcell.ColorReset))
	s.Clear()

	manager := &PromptsManager{
		screen:          s,
		config:          cfg,
		categories:      prompts.GetDefaultPrompts(),
		selected:        0,
		scrollOffset:    0,
		editing:         false,
		editBuffer:      cfg.SystemPrompt,
		expandedCat:     -1,
		selectedPrompts: make(map[string]bool),
	}

	// Parse existing system prompt to identify selected prompts
	manager.parseSelectedPrompts()

	manager.run()
	return nil
}

// run runs the main event loop
func (m *PromptsManager) run() {
	log := logger.Get()
	log.Info("Prompts manager opened")

	for {
		m.draw()
		m.screen.Show()

		ev := m.screen.PollEvent()
		switch ev := ev.(type) {
		case *tcell.EventKey:
			if !m.handleKeyEvent(ev) {
				// ESC was pressed - return to chat
				m.applyPrompts()
				log.Info("Returning to chat from prompts manager")
				return
			}
		case *tcell.EventResize:
			m.screen.Sync()
		}
	}
}

// handleKeyEvent handles keyboard input
func (m *PromptsManager) handleKeyEvent(ev *tcell.EventKey) bool {
	log := logger.Get()

	switch ev.Key() {
	case tcell.KeyEscape:
		if m.editing {
			// Cancel editing
			m.editing = false
			m.editBuffer = m.config.SystemPrompt
			return true
		}
		// ESC at top level - return to chat
		return false

	case tcell.KeyUp:
		if m.editing {
			// In edit mode, up/down navigate within text
			return true
		}
		if m.selected > 0 {
			m.selected--
			m.adjustScroll()
		}
		return true

	case tcell.KeyDown:
		if m.editing {
			return true
		}
		totalItems := m.getTotalItems()
		if m.selected < totalItems-1 {
			m.selected++
			m.adjustScroll()
		}
		return true

	case tcell.KeyEnter:
		if m.editing {
			// Apply custom prompt
			m.config.SystemPrompt = m.editBuffer
			m.editing = false
			log.Info("Custom prompt applied")
		} else {
			item := m.getItemAtIndex(m.selected)
			if item != nil {
				if item.IsCategory {
					// Toggle category expansion
					if m.expandedCat == item.CategoryIndex {
						m.expandedCat = -1
					} else {
						m.expandedCat = item.CategoryIndex
					}
				} else if item.IsCustom {
					// Edit custom prompt
					m.editing = true
					m.editBuffer = m.config.SystemPrompt
				} else {
					// Toggle prompt selection
					m.selectedPrompts[item.Prompt.ID] = !m.selectedPrompts[item.Prompt.ID]
					m.updateTotalTokens()
				}
			}
		}
		return true


	case tcell.KeyCtrlA:
		// Select all in current category
		if !m.editing && m.expandedCat >= 0 {
			cat := m.categories[m.expandedCat]
			for _, p := range cat.Prompts {
				m.selectedPrompts[p.ID] = true
			}
			m.updateTotalTokens()
		}
		return true

	case tcell.KeyCtrlD:
		// Deselect all
		if !m.editing {
			m.selectedPrompts = make(map[string]bool)
			m.updateTotalTokens()
		}
		return true

	case tcell.KeyRune:
		r := ev.Rune()
		if m.editing {
			m.editBuffer += string(r)
		} else if r == ' ' {
			// Space toggles selection when not editing
			item := m.getItemAtIndex(m.selected)
			if item != nil && !item.IsCategory && !item.IsCustom {
				m.selectedPrompts[item.Prompt.ID] = !m.selectedPrompts[item.Prompt.ID]
				m.updateTotalTokens()
			}
		}
		return true

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if m.editing && len(m.editBuffer) > 0 {
			m.editBuffer = m.editBuffer[:len(m.editBuffer)-1]
		}
		return true
	}

	return true
}

// ListItem represents an item in the prompts list
type ListItem struct {
	IsCategory    bool
	IsCustom      bool
	CategoryIndex int
	Prompt        *prompts.Prompt
	Category      *prompts.Category
}

// getTotalItems returns the total number of visible items
func (m *PromptsManager) getTotalItems() int {
	count := 1 // Custom prompt item

	for i, cat := range m.categories {
		count++ // Category header
		if m.expandedCat == i {
			count += len(cat.Prompts)
		}
	}

	return count
}

// getItemAtIndex returns the item at the given index
func (m *PromptsManager) getItemAtIndex(index int) *ListItem {
	if index == 0 {
		return &ListItem{IsCustom: true}
	}

	currentIdx := 1
	for i, cat := range m.categories {
		if currentIdx == index {
			return &ListItem{
				IsCategory:    true,
				CategoryIndex: i,
				Category:      &cat,
			}
		}
		currentIdx++

		if m.expandedCat == i {
			for _, p := range cat.Prompts {
				if currentIdx == index {
					prompt := p // Capture value
					return &ListItem{
						IsCategory:    false,
						CategoryIndex: i,
						Prompt:        &prompt,
						Category:      &cat,
					}
				}
				currentIdx++
			}
		}
	}

	return nil
}

// draw renders the prompts manager interface
func (m *PromptsManager) draw() {
	m.screen.Clear()
	w, h := m.screen.Size()

	// Draw border
	m.drawBorder(2, 1, w-4, h-2)

	// Draw title
	title := " System Prompts Manager "
	m.drawText((w-len(title))/2, 1, title, tcell.StyleDefault.Bold(true))

	// Draw token counter
	tokenText := fmt.Sprintf("Total Tokens: %d", m.totalTokens)
	m.drawText(w-len(tokenText)-3, 1, tokenText, tcell.StyleDefault)

	// Draw list
	m.drawPromptsList(w, h)

	// Draw help
	helpY := h - 3
	help := "↑↓ Navigate | ↵ Toggle/Edit | Space Select | ^A All | ^D None | ESC Back"
	m.drawText((w-len(help))/2, helpY, help, tcell.StyleDefault.Dim(true))

	// Draw edit overlay if editing
	if m.editing {
		m.drawEditOverlay(w, h)
	}
}

// drawPromptsList draws the scrollable list of prompts
func (m *PromptsManager) drawPromptsList(w, h int) {
	listY := 3
	listHeight := h - 8
	currentIdx := 0

	// Custom prompt item
	if currentIdx >= m.scrollOffset && currentIdx < m.scrollOffset+listHeight {
		y := listY + (currentIdx - m.scrollOffset)
		style := tcell.StyleDefault
		if m.selected == currentIdx {
			style = style.Background(tcell.ColorDarkBlue)
		}

		label := "📝 Custom System Prompt"
		if m.config.SystemPrompt != "" {
			preview := m.config.SystemPrompt
			if len(preview) > 40 {
				preview = preview[:37] + "..."
			}
			label += fmt.Sprintf(": %s", preview)
		}

		m.drawText(4, y, label, style.Bold(true))
	}
	currentIdx++

	// Categories and prompts
	for catIdx, cat := range m.categories {
		// Category header
		if currentIdx >= m.scrollOffset && currentIdx < m.scrollOffset+listHeight {
			y := listY + (currentIdx - m.scrollOffset)
			style := tcell.StyleDefault
			if m.selected == currentIdx {
				style = style.Background(tcell.ColorDarkBlue)
			}

			// Category icon
			icon := "▶"
			if m.expandedCat == catIdx {
				icon = "▼"
			}

			label := fmt.Sprintf("%s %s (%d prompts)", icon, cat.Name, len(cat.Prompts))
			m.drawText(4, y, label, style.Bold(true))
		}
		currentIdx++

		// Prompts in category (if expanded)
		if m.expandedCat == catIdx {
			for _, prompt := range cat.Prompts {
				if currentIdx >= m.scrollOffset && currentIdx < m.scrollOffset+listHeight {
					y := listY + (currentIdx - m.scrollOffset)
					style := tcell.StyleDefault
					if m.selected == currentIdx {
						style = style.Background(tcell.ColorDarkBlue)
					}

					// Checkbox
					checkbox := "[ ]"
					if m.selectedPrompts[prompt.ID] {
						checkbox = "[✓]"
						style = style.Foreground(tcell.ColorGreen)
					}

					// Prompt name and tokens
					label := fmt.Sprintf("  %s %s (%d tokens)", checkbox, prompt.Name, prompt.Tokens)
					m.drawText(6, y, label, style)

					// Description
					if len(prompt.Description) > 0 && m.selected == currentIdx {
						desc := prompt.Description
						if len(desc) > w-16 {
							desc = desc[:w-19] + "..."
						}
						m.drawText(12, y+1, desc, tcell.StyleDefault.Dim(true))
					}
				}
				currentIdx++
			}
		}
	}
}

// drawEditOverlay draws the custom prompt editor
func (m *PromptsManager) drawEditOverlay(w, h int) {
	// Draw overlay background
	overlayX := 10
	overlayY := 5
	overlayW := w - 20
	overlayH := h - 10

	// Clear overlay area
	for y := overlayY; y < overlayY+overlayH; y++ {
		for x := overlayX; x < overlayX+overlayW; x++ {
			m.screen.SetContent(x, y, ' ', nil, tcell.StyleDefault.Background(tcell.ColorBlack))
		}
	}

	// Draw overlay border
	m.drawBorder(overlayX, overlayY, overlayW, overlayH)

	// Title
	title := " Edit Custom System Prompt "
	m.drawText(overlayX+(overlayW-len(title))/2, overlayY, title, tcell.StyleDefault.Bold(true))

	// Instructions
	m.drawText(overlayX+2, overlayY+2, "Enter your custom system prompt:", tcell.StyleDefault)

	// Text area (simplified - just show the text)
	textY := overlayY + 4
	lines := wordWrap(m.editBuffer, overlayW-4)
	for i, line := range lines {
		if i < overlayH-8 {
			m.drawText(overlayX+2, textY+i, line, tcell.StyleDefault)
		}
	}

	// Show cursor
	if len(lines) > 0 {
		lastLine := lines[len(lines)-1]
		cursorX := overlayX + 2 + len(lastLine)
		cursorY := textY + len(lines) - 1
		if cursorY < overlayY+overlayH-3 {
			m.screen.SetContent(cursorX, cursorY, '▌', nil, tcell.StyleDefault.Blink(true))
		}
	}

	// Help
	help := "Enter to save | ESC to cancel"
	m.drawText(overlayX+(overlayW-len(help))/2, overlayY+overlayH-2, help, tcell.StyleDefault.Dim(true))
}

// adjustScroll adjusts the scroll offset to keep selection visible
func (m *PromptsManager) adjustScroll() {
	_, h := m.screen.Size()
	listHeight := h - 8

	if m.selected < m.scrollOffset {
		m.scrollOffset = m.selected
	} else if m.selected >= m.scrollOffset+listHeight {
		m.scrollOffset = m.selected - listHeight + 1
	}
}

// parseSelectedPrompts parses the current system prompt to identify selected prompts
func (m *PromptsManager) parseSelectedPrompts() {
	// This is a simplified version - in reality, you'd parse the actual prompt content
	// For now, we'll just start with nothing selected
	m.selectedPrompts = make(map[string]bool)
	m.updateTotalTokens()
}

// updateTotalTokens calculates the total token count
func (m *PromptsManager) updateTotalTokens() {
	m.totalTokens = 0

	// Add selected prompts
	for id := range m.selectedPrompts {
		if m.selectedPrompts[id] {
			// Find the prompt and add its tokens
			for _, cat := range m.categories {
				for _, p := range cat.Prompts {
					if p.ID == id {
						m.totalTokens += p.Tokens
					}
				}
			}
		}
	}

	// Add custom prompt tokens (rough estimate)
	if m.config.SystemPrompt != "" {
		// Rough estimate: 1 token per 4 characters
		m.totalTokens += len(m.config.SystemPrompt) / 4
	}
}

// applyPrompts combines selected prompts into the system prompt
func (m *PromptsManager) applyPrompts() {
	var parts []string

	// Add custom prompt if present
	if m.editBuffer != "" {
		parts = append(parts, m.editBuffer)
	}

	// Add selected prompts
	for _, cat := range m.categories {
		for _, p := range cat.Prompts {
			if m.selectedPrompts[p.ID] {
				parts = append(parts, fmt.Sprintf("# %s\n%s", p.Name, p.Content))
			}
		}
	}

	// Combine all parts
	m.config.SystemPrompt = strings.Join(parts, "\n\n")
}

// Helper methods

func (m *PromptsManager) drawBorder(x, y, w, h int) {
	style := tcell.StyleDefault

	// Corners
	m.screen.SetContent(x, y, '╔', nil, style)
	m.screen.SetContent(x+w-1, y, '╗', nil, style)
	m.screen.SetContent(x, y+h-1, '╚', nil, style)
	m.screen.SetContent(x+w-1, y+h-1, '╝', nil, style)

	// Horizontal lines
	for i := x + 1; i < x+w-1; i++ {
		m.screen.SetContent(i, y, '═', nil, style)
		m.screen.SetContent(i, y+h-1, '═', nil, style)
	}

	// Vertical lines
	for i := y + 1; i < y+h-1; i++ {
		m.screen.SetContent(x, i, '║', nil, style)
		m.screen.SetContent(x+w-1, i, '║', nil, style)
	}
}

func (m *PromptsManager) drawText(x, y int, text string, style tcell.Style) {
	for i, r := range text {
		m.screen.SetContent(x+i, y, r, nil, style)
	}
}