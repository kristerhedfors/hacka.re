#!/bin/bash

# Real-time log monitor that outputs in a Claude-readable format

echo "════════════════════════════════════════════════════════"
echo "  REAL-TIME LOG MONITOR FOR CLAUDE GUIDANCE"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Starting real-time monitoring..."
echo "I will watch your actions and provide guidance."
echo ""

# Set up debug logging
export HACKARE_LOG_LEVEL=DEBUG
LOG_DIR="/tmp"

# Function to find the latest log
find_latest_log() {
    ls -t ${LOG_DIR}/debug_*.log 2>/dev/null | head -1
}

# Function to analyze log entries in real-time
analyze_log_entry() {
    local line="$1"

    # Extract timestamp, level, and message
    if [[ $line =~ \[([0-9:\.]+)\]\ ([A-Z]+)\ \[([^:]+):([0-9]+)\]\ (.+) ]]; then
        local timestamp="${BASH_REMATCH[1]}"
        local level="${BASH_REMATCH[2]}"
        local file="${BASH_REMATCH[3]}"
        local linenum="${BASH_REMATCH[4]}"
        local message="${BASH_REMATCH[5]}"

        # Analyze specific patterns and provide guidance
        case "$message" in
            *"[STATE] modelDropdown=false"*)
                if [[ $message =~ selected=([0-9]+) ]]; then
                    local selected="${BASH_REMATCH[1]}"
                    echo "[MONITOR] Currently on field #$selected in settings"
                fi
                ;;

            *"[ARROW-UP] No action"*)
                echo "[ISSUE] Arrow UP pressed but no movement - already at top (field 0)"
                ;;

            *"[ARROW-DOWN] No action"*)
                echo "[ISSUE] Arrow DOWN pressed but no movement - already at bottom"
                ;;

            *"[ARROW-UP] Moving selection:"*)
                if [[ $message =~ ([0-9]+)\ -\>\ ([0-9]+) ]]; then
                    echo "[GOOD] Moved up from field ${BASH_REMATCH[1]} to ${BASH_REMATCH[2]}"
                fi
                ;;

            *"[ARROW-DOWN] Moving selection:"*)
                if [[ $message =~ ([0-9]+)\ -\>\ ([0-9]+) ]]; then
                    echo "[GOOD] Moved down from field ${BASH_REMATCH[1]} to ${BASH_REMATCH[2]}"
                fi
                ;;

            *"Settings modal opened"*)
                echo "[STATUS] Settings modal is now open"
                echo "[GUIDE] Use arrow keys to navigate, Enter to edit, ESC to exit"
                ;;

            *"ESC pressed - return to main menu"*)
                echo "[STATUS] Returning to main menu"
                ;;

            *"Main menu opened"*)
                echo "[STATUS] Main menu is now open"
                echo "[GUIDE] Press number keys or use arrows to select options"
                ;;

            *"[MODEL-DROPDOWN] Active"*)
                echo "[WARNING] Model dropdown is intercepting keys"
                ;;

            *"editing=true"*)
                echo "[STATUS] Now in edit mode - arrow keys won't navigate"
                echo "[GUIDE] Press Enter or ESC to exit edit mode"
                ;;

            *"Key event handled=false"*)
                echo "[ISSUE] Key event was not handled - may indicate a problem"
                ;;

            *"[KEY] Key=257"*)
                echo "[INPUT] Arrow UP key pressed"
                ;;

            *"[KEY] Key=258"*)
                echo "[INPUT] Arrow DOWN key pressed"
                ;;

            *"[KEY] Key=27"*)
                echo "[INPUT] ESC key pressed"
                ;;

            *"[KEY] Key=13"*)
                echo "[INPUT] ENTER key pressed"
                ;;
        esac
    fi
}

echo "Waiting for hacka.re to start..."
echo "(Run './hacka.re' in another terminal)"
echo ""
echo "────────────────────────────────────────────────────────"
echo ""

# Wait for log file
while true; do
    LATEST_LOG=$(find_latest_log)
    if [ -n "$LATEST_LOG" ]; then
        echo "[FOUND] Log file: $LATEST_LOG"
        echo ""
        break
    fi
    sleep 0.5
done

# Monitor the log in real-time
echo "REAL-TIME EVENT STREAM:"
echo "────────────────────────────────────────────────────────"
tail -f "$LATEST_LOG" | while IFS= read -r line; do
    # Only process relevant lines
    if echo "$line" | grep -qE "\[STATE\]|\[ARROW|\[KEY\]|Moving selection:|modal opened|ESC pressed|\[MODEL-DROPDOWN\]|handled=|editing="; then
        # Show the raw log line for debugging
        echo "[LOG] $line"

        # Analyze and provide guidance
        analyze_log_entry "$line"
        echo ""
    fi
done