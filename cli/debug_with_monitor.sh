#!/bin/bash

echo "════════════════════════════════════════════════════════"
echo "  HACKA.RE CLI WITH REAL-TIME MONITORING"
echo "════════════════════════════════════════════════════════"
echo ""
echo "This will open TWO terminal windows/panes:"
echo "1. The monitor (shows real-time analysis)"
echo "2. The hacka.re CLI"
echo ""
echo "Options:"
echo "  1. Run in split terminal (if using tmux/screen)"
echo "  2. Open two separate terminals manually"
echo "  3. Use the Python monitor (more detailed)"
echo ""
echo "Which option? (1/2/3): "
read -r option

export HACKARE_LOG_LEVEL=DEBUG

case $option in
    1)
        # Try to use tmux if available
        if command -v tmux &> /dev/null; then
            echo "Starting in tmux split panes..."
            tmux new-session -d -s hacka_debug './monitor_realtime.py'
            tmux split-window -h './hacka.re'
            tmux attach-session -t hacka_debug
        else
            echo "tmux not found. Please install tmux or use option 2."
        fi
        ;;

    2)
        echo ""
        echo "Instructions:"
        echo "─────────────────────────────────────────"
        echo "1. Open a NEW terminal window/tab"
        echo "2. Navigate to: $(pwd)"
        echo "3. Run: ./monitor_realtime.py"
        echo ""
        echo "4. Come back to THIS terminal"
        echo "5. Press Enter to start hacka.re"
        echo ""
        echo "Press Enter when monitor is running..."
        read

        echo "Starting hacka.re..."
        ./hacka.re
        ;;

    3)
        echo ""
        echo "Starting Python monitor in background..."
        echo "The monitor output will appear below the CLI"
        echo "Press Ctrl+C to stop both when done"
        echo ""
        echo "Press Enter to start..."
        read

        # Start monitor in background, redirecting to a file
        MONITOR_LOG="/tmp/monitor_output.log"
        ./monitor_realtime.py > "$MONITOR_LOG" 2>&1 &
        MONITOR_PID=$!

        echo "Monitor started (PID: $MONITOR_PID)"
        echo "Monitor output: $MONITOR_LOG"
        echo ""
        sleep 2

        # Run CLI
        ./hacka.re

        # When CLI exits, show monitor output
        echo ""
        echo "════════════════════════════════════════════════════════"
        echo "  MONITOR OUTPUT:"
        echo "════════════════════════════════════════════════════════"
        cat "$MONITOR_LOG"

        # Kill monitor
        kill $MONITOR_PID 2>/dev/null
        ;;

    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "Debug session complete!"