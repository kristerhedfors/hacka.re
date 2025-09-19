package pages

import (
	"fmt"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/components"
	"github.com/hacka-re/cli/internal/tui/internal/core"
)

// RAGPage displays RAG (Retrieval-Augmented Generation) configuration (read-only)
type RAGPage struct {
	*BasePage
	enabledCheckbox   *components.Checkbox
	documentsGroup    *components.ExpandableGroup
	customDocsGroup   *components.ExpandableGroup
	tokenUsageBar     *components.TokenUsageBar
	infoIcon          *components.InfoIcon
	ragEnabled        bool
	providerWarning   bool
	documents         []*RAGDocument
}

// RAGDocument represents a document in the RAG knowledge base
type RAGDocument struct {
	Name        string
	Type        string // "EU Regulation", "Custom"
	Acronym     string // "AIA", "CRA", "PLD"
	FullName    string
	Status      string // "Indexed", "Processing", "Error"
	Chunks      int
	Embeddings  int
	ChunkSize   int
	ChunkOverlap int
	LastRefresh string
	Enabled     bool
}

// NewRAGPage creates a new RAG configuration page
func NewRAGPage(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *RAGPage {
	page := &RAGPage{
		BasePage: NewBasePage(screen, config, state, eventBus, "Knowledge Base", PageTypeRAG),
	}

	w, h := screen.Size()

	// Initialize components
	page.enabledCheckbox = components.NewCheckbox(screen, 3, 7, "Enable RAG (Retrieval-Augmented Generation)", false)

	page.documentsGroup = components.NewExpandableGroup(screen, 3, 11, w-6, "📜 EU Regulatory Documents")
	page.documentsGroup.SetExpanded(true)

	page.customDocsGroup = components.NewExpandableGroup(screen, 3, 20, w-6, "📁 Custom Documents")

	// Token usage bar
	page.tokenUsageBar = components.NewTokenUsageBar(screen, 3, h-5, w-6)
	page.tokenUsageBar.SetDescription("Knowledge base index size")

	// Info icon with tooltip
	page.infoIcon = components.NewInfoIcon(screen, w-30, 3, 60, 20)
	page.infoIcon.SetTooltipContent(
		"What is RAG?",
		"Retrieval-Augmented Generation (RAG) enhances AI responses by searching through a knowledge base to find relevant context. "+
			"It combines the power of semantic search with language models to provide more accurate and contextual answers.\n\n"+
			"How it Works: hacka.re includes pre-generated embeddings for three example EU regulatory documents. "+
			"To use this index, you need an OpenAI API key since the same embedding model must be used for queries as was used to generate the index. "+
			"When enabled, RAG automatically searches these documents to include relevant regulatory context in AI responses.",
	)

	// Load RAG configuration
	page.loadRAGConfig()

	return page
}

// loadRAGConfig loads RAG configuration from config
func (rp *RAGPage) loadRAGConfig() {
	cfg := rp.config.Get()

	// For read-only view, set example state
	rp.ragEnabled = false // Default disabled for demo
	rp.enabledCheckbox.SetChecked(rp.ragEnabled)

	// Check provider compatibility
	if cfg.Provider != "openai" {
		rp.providerWarning = true
		rp.ragEnabled = false
		rp.enabledCheckbox.SetChecked(false)
	}

	// Clear existing items
	rp.documentsGroup.ClearItems()
	rp.customDocsGroup.ClearItems()
	rp.documents = []*RAGDocument{}

	// Load EU regulatory documents
	euDocs := []RAGDocument{
		{
			Name:         "AIA",
			Type:         "EU Regulation",
			Acronym:      "AIA",
			FullName:     "Artificial Intelligence Act",
			Status:       "Indexed",
			Chunks:       156,
			Embeddings:   156,
			ChunkSize:    1000,
			ChunkOverlap: 200,
			LastRefresh:  "2024-01-15",
			Enabled:      true,
		},
		{
			Name:         "CRA",
			Type:         "EU Regulation",
			Acronym:      "CRA",
			FullName:     "Cyber Resilience Act",
			Status:       "Indexed",
			Chunks:       89,
			Embeddings:   89,
			ChunkSize:    1000,
			ChunkOverlap: 200,
			LastRefresh:  "2024-01-15",
			Enabled:      true,
		},
		{
			Name:         "PLD",
			Type:         "EU Regulation",
			Acronym:      "PLD",
			FullName:     "Product Liability Directive",
			Status:       "Indexed",
			Chunks:       42,
			Embeddings:   42,
			ChunkSize:    1000,
			ChunkOverlap: 200,
			LastRefresh:  "2024-01-15",
			Enabled:      false,
		},
	}

	// Add EU documents to the group
	for _, doc := range euDocs {
		rp.documents = append(rp.documents, &doc)
		rp.addDocumentToGroup(&doc, rp.documentsGroup)
	}

	// Load custom documents (mock data for read-only view)
	hasCustom := false

	if !hasCustom {
		rp.customDocsGroup.AddItem(components.ExpandableItem{
			Text:  "(No custom documents added)",
			Style: tcell.StyleDefault.Foreground(tcell.ColorGray).Italic(true),
		})
	}

	// Update token usage
	rp.updateTokenUsage()
}

// addDocumentToGroup adds a document to an expandable group
func (rp *RAGPage) addDocumentToGroup(doc *RAGDocument, group *components.ExpandableGroup) {
	// Document header with checkbox
	checkbox := "[ ]"
	if doc.Enabled {
		checkbox = "[x]"
	}

	statusColor := tcell.ColorGreen
	if doc.Status == "Error" {
		statusColor = tcell.ColorRed
	} else if doc.Status == "Processing" {
		statusColor = tcell.ColorYellow
	}

	headerText := fmt.Sprintf("%s %s", checkbox, doc.Name)
	if doc.FullName != "" {
		headerText = fmt.Sprintf("%s %s - %s", checkbox, doc.Acronym, doc.FullName)
	}

	group.AddItem(components.ExpandableItem{
		Text:  headerText,
		Style: tcell.StyleDefault.Bold(true),
	})

	// Status line
	group.AddItem(components.ExpandableItem{
		Text:     fmt.Sprintf("Status: %s", doc.Status),
		Indented: true,
		Style:    tcell.StyleDefault.Foreground(statusColor),
	})

	// Statistics
	if doc.Chunks > 0 {
		group.AddItem(components.ExpandableItem{
			Text:     fmt.Sprintf("Chunks: %d | Embeddings: %d", doc.Chunks, doc.Embeddings),
			Indented: true,
			Style:    tcell.StyleDefault.Foreground(tcell.ColorGray),
		})
	}

	// Chunking parameters (for EU docs)
	if doc.ChunkSize > 0 {
		group.AddItem(components.ExpandableItem{
			Text:     fmt.Sprintf("Chunk Size: %d | Overlap: %d", doc.ChunkSize, doc.ChunkOverlap),
			Indented: true,
			Style:    tcell.StyleDefault.Foreground(tcell.ColorGray),
		})
	}

	// Last refresh date
	if doc.LastRefresh != "" {
		group.AddItem(components.ExpandableItem{
			Text:     fmt.Sprintf("Last Refresh: %s", doc.LastRefresh),
			Indented: true,
			Style:    tcell.StyleDefault.Foreground(tcell.ColorGray),
		})
	}

	// Add spacing
	group.AddItem(components.ExpandableItem{Text: ""})
}

// updateTokenUsage calculates and updates token usage display
func (rp *RAGPage) updateTokenUsage() {
	totalEmbeddings := 0
	for _, doc := range rp.documents {
		if doc.Enabled {
			totalEmbeddings += doc.Embeddings
		}
	}

	// Estimate tokens (embeddings * average tokens per embedding)
	estimatedTokens := totalEmbeddings * 50 // Rough estimate
	maxTokens := 50000 // Typical embedding space limit

	rp.tokenUsageBar.SetTokens(estimatedTokens, maxTokens)
}

// Draw renders the RAG page
func (rp *RAGPage) Draw() {
	w, h := rp.screen.Size()

	// Clear screen
	rp.ClearContent()

	// Draw header
	rp.DrawHeader()

	// Draw info icon
	rp.infoIcon.Draw()

	// Draw main content area border
	rp.drawContentBorder(2, 5, w-4, h-8)

	// Draw enabled checkbox
	rp.enabledCheckbox.Draw()

	// Draw provider warning if applicable
	if rp.providerWarning {
		rp.drawProviderWarning()
	}

	// Draw document groups
	currentY := rp.documentsGroup.Draw()

	rp.customDocsGroup.Y = currentY + 2
	rp.customDocsGroup.Draw()

	// Draw index statistics
	rp.drawIndexStats()

	// Draw token usage bar
	rp.tokenUsageBar.Draw()

	// Draw instructions
	instructions := " I:Info | Space:Expand/Collapse | ↑↓:Scroll | ESC:Back "
	instructionStyle := tcell.StyleDefault.Foreground(tcell.ColorYellow)
	rp.DrawCenteredText(h-2, instructions, instructionStyle)
}

// drawContentBorder draws a border around the content area
func (rp *RAGPage) drawContentBorder(x, y, width, height int) {
	borderStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)

	// Top border
	rp.screen.SetContent(x, y, '╭', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		rp.screen.SetContent(x+i, y, '─', nil, borderStyle)
	}
	rp.screen.SetContent(x+width-1, y, '╮', nil, borderStyle)

	// Side borders
	for i := 1; i < height-1; i++ {
		rp.screen.SetContent(x, y+i, '│', nil, borderStyle)
		rp.screen.SetContent(x+width-1, y+i, '│', nil, borderStyle)
	}

	// Bottom border
	rp.screen.SetContent(x, y+height-1, '╰', nil, borderStyle)
	for i := 1; i < width-1; i++ {
		rp.screen.SetContent(x+i, y+height-1, '─', nil, borderStyle)
	}
	rp.screen.SetContent(x+width-1, y+height-1, '╯', nil, borderStyle)
}

// drawProviderWarning draws the provider compatibility warning
func (rp *RAGPage) drawProviderWarning() {
	warningY := 9
	warningStyle := tcell.StyleDefault.Foreground(tcell.ColorYellow)

	warning1 := "⚠️ RAG is only available with OpenAI provider"
	warning2 := "OpenAI provides the embeddings API required for vector search."
	warning3 := "Please switch to OpenAI in Settings to use RAG."

	for i, ch := range warning1 {
		rp.screen.SetContent(5+i, warningY, ch, nil, warningStyle.Bold(true))
	}

	for i, ch := range warning2 {
		rp.screen.SetContent(5+i, warningY+1, ch, nil, warningStyle)
	}

	for i, ch := range warning3 {
		rp.screen.SetContent(5+i, warningY+2, ch, nil, warningStyle)
	}
}

// drawIndexStats draws index statistics
func (rp *RAGPage) drawIndexStats() {
	w, h := rp.screen.Size()
	statsX := w - 35
	statsY := h - 10

	// Calculate statistics
	totalDocs := 0
	totalChunks := 0
	totalEmbeddings := 0

	for _, doc := range rp.documents {
		if doc.Enabled {
			totalDocs++
			totalChunks += doc.Chunks
			totalEmbeddings += doc.Embeddings
		}
	}

	// Draw stats box
	statsTitle := " Index Statistics "
	titleStyle := tcell.StyleDefault.Foreground(tcell.ColorBlue).Bold(true)
	for i, ch := range statsTitle {
		rp.screen.SetContent(statsX+i, statsY, ch, nil, titleStyle)
	}

	stats := []string{
		fmt.Sprintf("Documents: %d", totalDocs),
		fmt.Sprintf("Total Chunks: %d", totalChunks),
		fmt.Sprintf("Total Embeddings: %d", totalEmbeddings),
	}

	statsStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	for i, stat := range stats {
		for j, ch := range stat {
			rp.screen.SetContent(statsX+j, statsY+i+1, ch, nil, statsStyle)
		}
	}
}

// HandleInput processes keyboard input
func (rp *RAGPage) HandleInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEscape:
		// Hide info tooltip if visible, otherwise exit
		if rp.infoIcon.Tooltip.IsVisible() {
			rp.infoIcon.Tooltip.Hide()
			return false
		}
		return true // Exit the page

	case tcell.KeyRune:
		switch ev.Rune() {
		case 'i', 'I':
			// Toggle info tooltip
			rp.infoIcon.HandleInput(ev)
			return false

		case ' ':
			// Toggle expansion of groups
			if rp.documentsGroup.IsExpanded() {
				rp.documentsGroup.Toggle()
			} else {
				rp.customDocsGroup.Toggle()
			}
			return false
		}
	}

	return false
}

// OnActivate is called when the page becomes active
func (rp *RAGPage) OnActivate() {
	rp.loadRAGConfig()
}

// Save saves any changes (no-op for read-only page)
func (rp *RAGPage) Save() error {
	// Read-only page, nothing to save
	return nil
}
// HandleMouse processes mouse events for the page
func (p *RAGPage) HandleMouse(event *core.MouseEvent) bool {
	// TODO: Implement mouse support for interactive elements
	// For now, just return false to indicate event not handled
	return false
}
