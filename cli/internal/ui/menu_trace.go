package ui

import (
	"fmt"
	"os"
	"time"

	"github.com/gdamore/tcell/v2"
)

var traceFile *os.File

func init() {
	// Create a trace file that we can tail -f
	var err error
	traceFile, err = os.Create("/tmp/menu_trace.log")
	if err == nil {
		traceFile.WriteString(fmt.Sprintf("=== MENU TRACE STARTED %s ===\n", time.Now().Format("15:04:05.000")))
	}
}

func trace(format string, args ...interface{}) {
	if traceFile != nil {
		msg := fmt.Sprintf(format, args...)
		timestamp := time.Now().Format("15:04:05.000")
		traceFile.WriteString(fmt.Sprintf("[%s] %s\n", timestamp, msg))
		traceFile.Sync() // Force write immediately
	}
}

// HandleInputTraced wraps HandleInput with detailed tracing
func (m *FilterableMenu) HandleInputTraced(ev *tcell.EventKey) (MenuItem, bool) {
	trace("HandleInput CALLED - Key: %v, Rune: %c", ev.Key(), ev.Rune())
	trace("  BEFORE: selectedIdx=%d, filteredItems=%d", m.selectedIdx, len(m.filteredItems))

	result, escaped := m.HandleInput(ev)

	trace("  AFTER: selectedIdx=%d, result=%v, escaped=%v", m.selectedIdx, result != nil, escaped)
	return result, escaped
}

// DrawTraced wraps Draw with detailed tracing
func (m *FilterableMenu) DrawTraced() {
	trace("Draw CALLED - selectedIdx=%d", m.selectedIdx)

	// Call the actual Draw
	m.Draw()

	trace("Draw COMPLETE")
}

// ShowTraced wraps screen.Show() with tracing
func TraceShow(s tcell.Screen) {
	trace("Screen.Show() CALLED")
	s.Show()
	trace("Screen.Show() COMPLETE")
}