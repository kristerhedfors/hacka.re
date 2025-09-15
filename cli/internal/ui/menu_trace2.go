package ui

import (
	"fmt"
	"os"

	"github.com/gdamore/tcell/v2"
)

// WriteTrace writes a trace message to a file that definitely exists
func WriteTrace(msg string) {
	// Write to a fixed file that we know the path to
	f, err := os.OpenFile("/tmp/hacka_trace.txt", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	f.WriteString(msg + "\n")
}

// HandleInputWithTrace wraps HandleInput with simple tracing
func (m *FilterableMenu) HandleInputWithTrace(ev *tcell.EventKey) (MenuItem, bool) {
	before := m.selectedIdx
	WriteTrace(fmt.Sprintf("BEFORE HandleInput: selectedIdx=%d, key=%v", before, ev.Key()))

	result, escaped := m.HandleInput(ev)

	after := m.selectedIdx
	WriteTrace(fmt.Sprintf("AFTER HandleInput: selectedIdx=%d (changed=%v)", after, after != before))

	return result, escaped
}

// DrawWithTrace wraps Draw with tracing
func (m *FilterableMenu) DrawWithTrace() {
	WriteTrace(fmt.Sprintf("Draw() called, selectedIdx=%d", m.selectedIdx))
	m.Draw()
	WriteTrace("Draw() complete")
}