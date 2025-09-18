package core

import (
	"testing"
	"time"

	"github.com/gdamore/tcell/v2"
)

func TestMouseManager(t *testing.T) {
	mm := NewMouseManager()

	// Test initial state
	if mm.IsDragging() {
		t.Error("Mouse should not be dragging initially")
	}

	// Create a mock mouse event
	screen := tcell.NewSimulationScreen("UTF-8")
	if err := screen.Init(); err != nil {
		t.Fatalf("Failed to init screen: %v", err)
	}
	defer screen.Fini()

	// Test click detection
	t.Run("Click Detection", func(t *testing.T) {
		// Simulate a button press
		ev := tcell.NewEventMouse(10, 20, tcell.Button1, 0)
		result := mm.ProcessEvent(ev)

		if result.Type != MouseEventClick {
			t.Errorf("Expected MouseEventClick, got %v", result.Type)
		}
		if result.X != 10 || result.Y != 20 {
			t.Errorf("Expected position (10,20), got (%d,%d)", result.X, result.Y)
		}
		if result.Button != MouseButtonLeft {
			t.Errorf("Expected MouseButtonLeft, got %v", result.Button)
		}
	})

	// Test double-click detection
	t.Run("Double Click Detection", func(t *testing.T) {
		mm.Reset()
		mm.SetDoubleClickTime(500 * time.Millisecond)

		// First click
		ev1 := tcell.NewEventMouse(10, 20, tcell.Button1, 0)
		result1 := mm.ProcessEvent(ev1)
		if result1.Type != MouseEventClick {
			t.Errorf("First click should be MouseEventClick, got %v", result1.Type)
		}

		// Need to simulate button release between clicks
		evRelease := tcell.NewEventMouse(10, 20, tcell.ButtonNone, 0)
		mm.ProcessEvent(evRelease)

		// Second click at same position within double-click time
		ev2 := tcell.NewEventMouse(10, 20, tcell.Button1, 0)
		result2 := mm.ProcessEvent(ev2)
		if result2.Type != MouseEventDoubleClick {
			t.Errorf("Second click should be MouseEventDoubleClick, got %v", result2.Type)
		}
	})

	// Test drag detection
	t.Run("Drag Detection", func(t *testing.T) {
		mm.Reset()
		mm.SetDragThreshold(3)

		// Initial click
		ev1 := tcell.NewEventMouse(10, 20, tcell.Button1, 0)
		mm.ProcessEvent(ev1)

		// Move while holding button (within threshold)
		ev2 := tcell.NewEventMouse(12, 20, tcell.Button1, 0)
		mm.ProcessEvent(ev2)
		if mm.IsDragging() {
			t.Error("Should not be dragging within threshold")
		}

		// Move beyond threshold
		ev3 := tcell.NewEventMouse(14, 20, tcell.Button1, 0)
		result3 := mm.ProcessEvent(ev3)
		if result3.Type != MouseEventDrag {
			t.Errorf("Expected MouseEventDrag, got %v", result3.Type)
		}
		if !mm.IsDragging() {
			t.Error("Should be dragging after threshold exceeded")
		}

		// Get drag delta
		dx, dy := mm.GetDragDelta()
		if dx != 4 || dy != 0 { // 14 - 10 = 4
			t.Errorf("Expected drag delta (4,0), got (%d,%d)", dx, dy)
		}
	})

	// Test scroll events
	t.Run("Scroll Events", func(t *testing.T) {
		mm.Reset()

		// Wheel up
		evUp := tcell.NewEventMouse(10, 20, tcell.WheelUp, 0)
		resultUp := mm.ProcessEvent(evUp)
		if resultUp.Type != MouseEventScroll {
			t.Errorf("Expected MouseEventScroll for wheel up, got %v", resultUp.Type)
		}
		if resultUp.Button != MouseWheelUp {
			t.Errorf("Expected MouseWheelUp, got %v", resultUp.Button)
		}

		// Wheel down
		evDown := tcell.NewEventMouse(10, 20, tcell.WheelDown, 0)
		resultDown := mm.ProcessEvent(evDown)
		if resultDown.Type != MouseEventScroll {
			t.Errorf("Expected MouseEventScroll for wheel down, got %v", resultDown.Type)
		}
		if resultDown.Button != MouseWheelDown {
			t.Errorf("Expected MouseWheelDown, got %v", resultDown.Button)
		}
	})

	// Test release events
	t.Run("Release Events", func(t *testing.T) {
		mm.Reset()

		// Click
		ev1 := tcell.NewEventMouse(10, 20, tcell.Button1, 0)
		mm.ProcessEvent(ev1)

		// Release
		ev2 := tcell.NewEventMouse(10, 20, tcell.ButtonNone, 0)
		result2 := mm.ProcessEvent(ev2)
		if result2.Type != MouseEventRelease {
			t.Errorf("Expected MouseEventRelease, got %v", result2.Type)
		}
	})
}

func TestComponentHitTest(t *testing.T) {
	// Create a component at position (10, 20) with size 30x40
	hitTest := NewComponentHitTest(10, 20, 30, 40)

	// Test cases
	tests := []struct {
		x, y     int
		expected bool
		desc     string
	}{
		{10, 20, true, "Top-left corner"},
		{39, 59, true, "Bottom-right corner"},
		{25, 40, true, "Center"},
		{9, 20, false, "Just left of component"},
		{40, 20, false, "Just right of component"},
		{10, 19, false, "Just above component"},
		{10, 60, false, "Just below component"},
		{0, 0, false, "Far away"},
	}

	for _, test := range tests {
		result := hitTest.Contains(test.x, test.y)
		if result != test.expected {
			t.Errorf("%s: expected %v, got %v for position (%d,%d)",
				test.desc, test.expected, result, test.x, test.y)
		}
	}

	// Test with MouseEvent
	event := &MouseEvent{
		Type:   MouseEventClick,
		Button: MouseButtonLeft,
		X:      25,
		Y:      40,
	}
	if !hitTest.ContainsEvent(event) {
		t.Error("Expected event to be within component bounds")
	}

	event.X = 100
	event.Y = 100
	if hitTest.ContainsEvent(event) {
		t.Error("Expected event to be outside component bounds")
	}
}

func TestIsWithinBounds(t *testing.T) {
	tests := []struct {
		x, y                         int
		areaX, areaY, width, height int
		expected                     bool
		desc                         string
	}{
		{5, 5, 0, 0, 10, 10, true, "Within bounds"},
		{0, 0, 0, 0, 10, 10, true, "Top-left corner"},
		{9, 9, 0, 0, 10, 10, true, "Bottom-right corner"},
		{10, 5, 0, 0, 10, 10, false, "Right edge"},
		{5, 10, 0, 0, 10, 10, false, "Bottom edge"},
		{-1, 5, 0, 0, 10, 10, false, "Left of area"},
		{5, -1, 0, 0, 10, 10, false, "Above area"},
	}

	for _, test := range tests {
		result := IsWithinBounds(test.x, test.y, test.areaX, test.areaY, test.width, test.height)
		if result != test.expected {
			t.Errorf("%s: expected %v, got %v", test.desc, test.expected, result)
		}
	}
}