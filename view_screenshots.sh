#!/bin/bash

# Script to generate an HTML file from PNG and MD files in the _tests/playwright/videos directory
# This script creates an HTML file that displays screenshots and their associated markdown content
# horizontally, allowing users to scroll through them.

# Directory containing screenshots and markdown files
SCREENSHOTS_DIR="_tests/playwright/videos"
# Output HTML file
OUTPUT_HTML="screenshot_viewer.html"

# Check if the screenshots directory exists
if [ ! -d "$SCREENSHOTS_DIR" ]; then
    echo "Error: Screenshots directory '$SCREENSHOTS_DIR' not found."
    exit 1
fi

# Create the HTML file header
cat > "$OUTPUT_HTML" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hacka.re Test Screenshots Viewer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .screenshot-container {
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            gap: 20px;
            padding: 20px 0;
            scroll-behavior: smooth;
        }
        .screenshot-item {
            flex: 0 0 auto;
            width: 800px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-bottom: 20px;
        }
        .screenshot-item h2 {
            margin-top: 0;
            color: #444;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .screenshot-item h3 {
            color: #666;
        }
        .screenshot {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            margin-bottom: 15px;
        }
        .markdown-content {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-top: 15px;
            white-space: pre-wrap;
            font-family: monospace;
        }
        .navigation {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
        }
        .nav-button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 0 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        .nav-button:hover {
            background-color: #45a049;
        }
        .no-screenshots {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 50px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .timestamp {
            color: #888;
            font-size: 0.9em;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h1>Hacka.re Test Screenshots Viewer</h1>
    <div class="navigation">
        <button class="nav-button" id="prev-btn">Previous</button>
        <button class="nav-button" id="next-btn">Next</button>
    </div>
EOF

# Find all PNG files in the screenshots directory
PNG_FILES=$(find "$SCREENSHOTS_DIR" -name "*.png" | sort)

# Check if any PNG files were found
if [ -z "$PNG_FILES" ]; then
    # No screenshots found, add a message to the HTML
    cat >> "$OUTPUT_HTML" << EOF
    <div class="no-screenshots">
        <p>No screenshots found in '$SCREENSHOTS_DIR'.</p>
        <p>Run your tests with the screenshot_with_markdown function to generate screenshots.</p>
    </div>
EOF
else
    # Start the screenshots container
    echo '    <div class="screenshot-container" id="screenshots">' >> "$OUTPUT_HTML"
    
    # Process each PNG file
    for PNG_FILE in $PNG_FILES; do
        # Get the base name without extension
        BASE_NAME="${PNG_FILE%.png}"
        # Corresponding markdown file
        MD_FILE="${BASE_NAME}.md"
        
        # Get the file name without path
        FILE_NAME=$(basename "$PNG_FILE")
        
        # Start the screenshot item
        cat >> "$OUTPUT_HTML" << EOF
        <div class="screenshot-item">
            <h2>Screenshot: $FILE_NAME</h2>
            <img src="$PNG_FILE" alt="$FILE_NAME" class="screenshot">
EOF
        
        # Check if the markdown file exists
        if [ -f "$MD_FILE" ]; then
            # Add the markdown content
            echo '            <div class="markdown-content">' >> "$OUTPUT_HTML"
            # Convert markdown to HTML (basic conversion)
            awk '{
                if (/^# /) {
                    sub(/^# /, "<h2>");
                    print $0 "</h2>";
                } else if (/^## /) {
                    sub(/^## /, "<h3>");
                    print $0 "</h3>";
                } else if (/^\- /) {
                    sub(/^\- /, "<li>");
                    print $0 "</li>";
                } else if (/^$/) {
                    print "<br>";
                } else {
                    print $0;
                }
            }' "$MD_FILE" >> "$OUTPUT_HTML"
            echo '            </div>' >> "$OUTPUT_HTML"
        else
            # No markdown file found
            echo '            <div class="markdown-content">No markdown file found for this screenshot.</div>' >> "$OUTPUT_HTML"
        fi
        
        # Add timestamp
        TIMESTAMP=$(date -r "$PNG_FILE" "+%Y-%m-%d %H:%M:%S")
        echo "            <div class=\"timestamp\">Created: $TIMESTAMP</div>" >> "$OUTPUT_HTML"
        
        # End the screenshot item
        echo '        </div>' >> "$OUTPUT_HTML"
    done
    
    # End the screenshots container
    echo '    </div>' >> "$OUTPUT_HTML"
fi

# Add JavaScript for navigation
cat >> "$OUTPUT_HTML" << EOF
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const container = document.getElementById('screenshots');
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            
            if (!container) return;
            
            const items = container.querySelectorAll('.screenshot-item');
            if (items.length === 0) {
                prevBtn.disabled = true;
                nextBtn.disabled = true;
                return;
            }
            
            let currentIndex = 0;
            
            // Function to scroll to a specific item
            function scrollToItem(index) {
                if (index < 0) index = 0;
                if (index >= items.length) index = items.length - 1;
                
                currentIndex = index;
                items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            }
            
            // Event listeners for navigation buttons
            prevBtn.addEventListener('click', function() {
                scrollToItem(currentIndex - 1);
            });
            
            nextBtn.addEventListener('click', function() {
                scrollToItem(currentIndex + 1);
            });
            
            // Keyboard navigation
            document.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowLeft') {
                    scrollToItem(currentIndex - 1);
                } else if (e.key === 'ArrowRight') {
                    scrollToItem(currentIndex + 1);
                }
            });
        });
    </script>
</body>
</html>
EOF

# Make the script executable
chmod +x "$0"

echo "HTML file generated: $OUTPUT_HTML"
echo "Open this file in a browser to view the screenshots."

# Try to open the HTML file in the default browser
if command -v open &> /dev/null; then
    open "$OUTPUT_HTML"  # macOS
elif command -v xdg-open &> /dev/null; then
    xdg-open "$OUTPUT_HTML"  # Linux
elif command -v start &> /dev/null; then
    start "$OUTPUT_HTML"  # Windows
else
    echo "Please open the file manually in your browser."
fi
