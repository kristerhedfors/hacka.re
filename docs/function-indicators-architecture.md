# Function Call & Result Indicators Architecture

## Overview

The function call and result indicators are the visual symbols that appear in chat messages when AI models use functions:
- **"ƒ"** - Function call indicator
- **"→"** - Function result indicator

## Architecture Components

### 1. Text Processing Pipeline

**Input**: Chat messages containing special markers
- Function call: `[FUNCTION_CALL:functionName:encodedArgs]`
- Function result: `[FUNCTION_RESULT:name:type:encodedValue:executionTime]`

**Processing**: `js/utils/function-markers.js`
- Parses markers using regex
- Tracks function call counts for color assignment
- Delegates rendering to `FunctionCallRenderer`

**Output**: HTML elements with styled indicators

### 2. Visual Rendering

**Function Call Renderer** (`js/utils/function-call-renderer.js`)
```javascript
// Creates the "ƒ" indicator
FunctionCallRenderer.createCallIndicator({
    functionName: "github_search_repositories",
    parameters: { q: "perkele", per_page: 10 },
    colorClass: "color-1"
});

// Creates the "→" indicator
FunctionCallRenderer.createResultIndicator({
    functionName: "github_search_repositories",
    resultType: "object",
    resultValue: { total_count: 41, ... },
    executionTime: 250,
    colorClass: "color-1"
});
```

### 3. Visual Styling

**CSS Implementation** (`css/function-indicators.css`)

#### "ƒ" Symbol (Function Call)
- Base: Italic "f" character in Times New Roman
- Enhancement: Animated gradient background
- Interaction: Scales on hover

```css
.function-call-icon {
    font-family: 'Times New Roman', serif;
    font-style: italic;
    /* Gradient animation for visual appeal */
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #ff6b6b);
    -webkit-background-clip: text;
}
```

#### "→" Arrow (Function Result)
- Pure CSS construction (no text content)
- Arrow shaft: `::after` pseudo-element (horizontal line)
- Arrow head: `::before` pseudo-element (triangle)

```css
.function-result-icon::after {
    /* Horizontal line */
    width: 14px;
    height: 2px;
    background: currentColor;
}

.function-result-icon::before {
    /* Triangle using borders */
    border-width: 6px 0 6px 8px;
    border-color: transparent transparent transparent currentColor;
}
```

### 4. Tooltip System

**Tooltip Behavior** (`js/utils/tooltip-utils.js`)
- Event delegation for performance
- Hover detection with delay
- Smooth opacity transitions

**Tooltip Content**
- Function calls: Name + formatted parameters
- Function results: Name + type + execution time + value preview

### 5. Color System

Five rotating colors for visual distinction:
1. `#ff6b6b` - Red
2. `#4ecdc4` - Teal
3. `#45b7d1` - Blue
4. `#f39c12` - Orange
5. `#9b59b6` - Purple

Functions with the same name maintain consistent colors within a conversation.

## Data Flow

1. **API Response** → Contains tool calls/results
2. **Stream Processor** → Inserts markers into message text
3. **Function Markers** → Parses markers and tracks state
4. **Function Call Renderer** → Creates DOM elements
5. **CSS Styling** → Applies visual appearance
6. **Tooltip Utils** → Handles interaction behavior

## Key Design Decisions

1. **Separation of Concerns**
   - Text processing separate from visual rendering
   - CSS handles all visual styling
   - JavaScript focuses on DOM manipulation

2. **Performance Optimization**
   - Event delegation for tooltips
   - Minimal DOM operations
   - CSS animations instead of JavaScript

3. **Accessibility**
   - High contrast mode support
   - Reduced motion preferences
   - Semantic HTML structure

4. **Maintainability**
   - Clear module boundaries
   - Well-documented CSS
   - Extensible color system

## Extension Points

To add new indicators or modify existing ones:

1. **New Symbol**: Update `FunctionCallRenderer.CONFIG`
2. **New Colors**: Add to CSS color classes
3. **New Tooltip Info**: Modify `formatCallTooltip` or `formatResultTooltip`
4. **New Animation**: Add keyframes to CSS

## Testing

The indicators can be tested by:
1. Triggering function calls in chat
2. Checking visual appearance across themes
3. Verifying tooltip behavior
4. Testing color rotation with multiple calls