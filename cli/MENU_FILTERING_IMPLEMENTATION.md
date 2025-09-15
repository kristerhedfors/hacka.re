# Smart Menu Filtering Implementation

## Overview
The hacka.re CLI now features a unified smart menu filtering system that intelligently distinguishes between numeric selection and text filtering across all menus.

## Key Features

### 1. Smart Input Detection
- **Pure Digits** (e.g., "1", "10", "123") → Direct item selection by number
- **Text or Mixed** (e.g., "gpt", "chat", "gpt4") → Filter items by text match

### 2. Unified Menu Component
Created a reusable `FilterableMenu` component in `internal/ui/menu.go` that provides:
- Automatic input mode detection
- Visual feedback for current mode (yellow for numbers, green for text)
- Information panel showing details about selected item
- Consistent behavior across all menus

### 3. Visual Indicators
- **Number Mode**: Shows `[#123]` in yellow when typing numbers
- **Filter Mode**: Shows `[Filter: text]` in green when filtering
- **Result Count**: Displays `(X/Y)` showing filtered vs total items
- **Side Panel**: Shows detailed information about the highlighted item

## Implementation Details

### Files Modified
1. **`internal/ui/menu.go`** (NEW)
   - Core `FilterableMenu` struct and logic
   - `MenuItem` interface for menu items
   - Smart filtering algorithm

2. **`internal/ui/settings.go`**
   - Updated model selection to use `FilterableMenu`
   - Removed old dropdown implementation
   - Added `ModelMenuItem` adapter

3. **`internal/ui/main_menu.go`**
   - Converted main menu to use `FilterableMenu`
   - Added `MainMenuItem` adapter
   - Enhanced with info panels for each option

### Key Algorithm
```go
func (m *FilterableMenu) checkNumberMode() {
    // If input contains only digits, enable number mode
    for _, r := range m.filterText {
        if r < '0' || r > '9' {
            m.isNumberMode = false
            return
        }
    }
    m.isNumberMode = true
}
```

### Usage Example
```go
// Create menu items
items := []MenuItem{
    &ModelMenuItem{model: modelData, number: 0},
    // ... more items
}

// Create and configure menu
menu := NewFilterableMenu(screen, "Select Model", items)
menu.SetDimensions(80, 20)
menu.SetPosition(10, 5)
menu.SetInfoPanel(true, 40)

// Handle input
selected, escaped := menu.HandleInput(keyEvent)
if selected != nil {
    // Process selection
}
```

## User Experience

### For Number Selection
1. User types: `1` → Item #1 is highlighted
2. User types: `12` → Shows items #12, #120, #121, etc.
3. Press Enter → Selects the highlighted item

### For Text Filtering
1. User types: `gpt` → Shows all items containing "gpt"
2. User types: `turbo` → Shows all items containing "turbo"
3. Matching text is highlighted in yellow
4. Use arrow keys to navigate filtered results

### Navigation
- **↑↓**: Navigate through items
- **Enter**: Select current item
- **ESC**: Clear filter or exit menu
- **Backspace**: Delete last character
- **Any character**: Add to filter/selection

## Benefits
1. **Consistency**: All menus behave identically
2. **Efficiency**: Quick number selection for power users
3. **Discoverability**: Text filtering for finding items
4. **Information**: Side panel provides context
5. **Reusability**: Single component for all menu needs

## Testing
Run the demo program to see the implementation in action:
```bash
cd /Users/user/dev/hacka.re/cli
go run test_menu_demo.go
```

Or test with the actual CLI:
```bash
./hacka.re chat
# Then navigate to settings to see the model selection menu
```

## Future Enhancements
- Add fuzzy matching for text filtering
- Support for keyboard shortcuts (e.g., Ctrl+U to clear)
- Configurable filtering behavior per menu
- History of recent selections