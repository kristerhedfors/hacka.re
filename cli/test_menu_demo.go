package main

import (
	"fmt"
	"log"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/ui"
)

// DemoItem implements ui.MenuItem for demonstration
type DemoItem struct {
	id       string
	number   int
	title    string
	desc     string
	info     string
	category string
	enabled  bool
}

func (d *DemoItem) GetID() string          { return d.id }
func (d *DemoItem) GetNumber() int         { return d.number }
func (d *DemoItem) GetTitle() string       { return d.title }
func (d *DemoItem) GetDescription() string { return d.desc }
func (d *DemoItem) GetInfo() string        { return d.info }
func (d *DemoItem) GetCategory() string    { return d.category }
func (d *DemoItem) IsEnabled() bool        { return d.enabled }

func main() {
	// Create screen
	s, err := tcell.NewScreen()
	if err != nil {
		log.Fatal(err)
	}

	if err := s.Init(); err != nil {
		log.Fatal(err)
	}
	defer s.Fini()

	s.SetStyle(tcell.StyleDefault.Background(tcell.ColorReset).Foreground(tcell.ColorReset))
	s.Clear()

	// Create demo items
	items := []ui.MenuItem{
		&DemoItem{
			id:       "settings",
			number:   0,
			title:    "Open settings",
			desc:     "Configure API settings and models",
			info:     "Access comprehensive settings including:\n• API Provider selection\n• Model configuration\n• Advanced options",
			category: "",
			enabled:  true,
		},
		&DemoItem{
			id:       "chat",
			number:   1,
			title:    "Start chat session",
			desc:     "Begin interactive AI chat",
			info:     "Start a new chat session with the configured AI model.\n\nRequires valid API configuration.",
			category: "",
			enabled:  true,
		},
		&DemoItem{
			id:       "save",
			number:   2,
			title:    "Save configuration",
			desc:     "Save settings to file",
			info:     "Save your current configuration for future use.",
			category: "",
			enabled:  true,
		},
		&DemoItem{
			id:       "models",
			number:   10,
			title:    "GPT-4o",
			desc:     "Latest GPT-4 optimized model",
			info:     "Context: 128K tokens\nMax Output: 16K tokens\nHighly capable multimodal model",
			category: "production",
			enabled:  true,
		},
		&DemoItem{
			id:       "models2",
			number:   11,
			title:    "GPT-4o-mini",
			desc:     "Small, fast GPT-4 model",
			info:     "Context: 128K tokens\nMax Output: 16K tokens\nCost-effective for simple tasks",
			category: "production",
			enabled:  true,
		},
		&DemoItem{
			id:       "models3",
			number:   12,
			title:    "GPT-3.5-turbo",
			desc:     "Fast, efficient model",
			info:     "Context: 16K tokens\nMax Output: 4K tokens\nGreat for quick responses",
			category: "production",
			enabled:  true,
		},
		&DemoItem{
			id:       "models4",
			number:   13,
			title:    "GPT-4-turbo-preview",
			desc:     "Preview of next GPT-4 turbo",
			info:     "Context: 128K tokens\nMax Output: 4K tokens\nExperimental features",
			category: "preview",
			enabled:  true,
		},
		&DemoItem{
			id:       "legacy",
			number:   20,
			title:    "text-davinci-003",
			desc:     "Legacy completion model",
			info:     "Deprecated model, use GPT-3.5 or GPT-4 instead",
			category: "deprecated",
			enabled:  false,
		},
	}

	// Create menu
	menu := ui.NewFilterableMenu(s, "Demo Menu - Smart Filtering", items)

	// Configure menu
	w, h := s.Size()
	menu.SetDimensions(70, 20)
	menu.SetPosition((w-110)/2, (h-20)/2)
	menu.SetInfoPanel(true, 40)

	// Instructions
	instructions := []string{
		"SMART FILTERING DEMO:",
		"",
		"1. Type NUMBERS ONLY (e.g., '1', '10', '11') → Direct item selection by number",
		"2. Type TEXT (e.g., 'gpt', 'chat', 'turbo') → Filter items by text match",
		"3. Mixed input (e.g., 'gpt4') → Text filtering mode",
		"",
		"Try these examples:",
		"• Type '1' → Selects item #1 directly",
		"• Type '11' → Shows items #11 (and any starting with 11)",
		"• Type 'gpt' → Shows all GPT models",
		"• Type 'preview' → Shows preview models",
		"",
		"Press ESC to clear filter or exit",
	}

	// Main loop
	for {
		s.Clear()

		// Draw instructions at top
		for i, line := range instructions {
			drawText(s, 5, i+1, line, tcell.StyleDefault.Dim(true))
		}

		// Draw menu
		menu.Draw()
		s.Show()

		// Handle input
		ev := s.PollEvent()
		switch ev := ev.(type) {
		case *tcell.EventKey:
			selected, escaped := menu.HandleInput(ev)
			if escaped {
				s.Fini()
				if selected != nil {
					fmt.Printf("Selected: %s (#%d)\n", selected.GetTitle(), selected.GetNumber())
				} else {
					fmt.Println("No selection made")
				}
				return
			} else if selected != nil {
				// Show selection briefly
				s.Clear()
				msg := fmt.Sprintf("SELECTED: %s (#%d)", selected.GetTitle(), selected.GetNumber())
				drawText(s, (w-len(msg))/2, h/2, msg, tcell.StyleDefault.Bold(true).Foreground(tcell.ColorGreen))
				s.Show()
				s.PollEvent()
				menu.Reset()
			}
		case *tcell.EventResize:
			w, h = s.Size()
			menu.SetPosition((w-110)/2, (h-20)/2)
			s.Sync()
		}
	}
}

func drawText(s tcell.Screen, x, y int, text string, style tcell.Style) {
	for i, r := range text {
		s.SetContent(x+i, y, r, nil, style)
	}
}