#!/bin/bash
# Visual Test Runner for hacka.re CLI
# Shows terminal UI activity during testing

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [[ ! -f "../hacka.re" ]]; then
    echo -e "${RED}Error: CLI binary not found!${NC}"
    echo "Please run from cli/_tests directory"
    exit 1
fi

# Check binary size
SIZE=$(ls -lh ../hacka.re | awk '{print $5}')
echo -e "${CYAN}CLI Binary: ../hacka.re (${SIZE})${NC}"

# Check Python environment
if [[ ! -d ".venv" ]]; then
    echo -e "${YELLOW}Setting up Python environment...${NC}"
    ./setup_test_env.sh
fi

# Activate virtual environment
source .venv/bin/activate

# Install required packages if needed
pip install -q rich pexpect 2>/dev/null || true

# Menu
echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     hacka.re CLI Visual Test Runner       ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Select test visualization mode:"
echo ""
echo "  1) 🏃 Speedrun Mode - Parallel tests with ncurses UI"
echo "  2) 🎬 Terminal Recorder - Record tests as asciinema"
echo "  3) 📊 Visual Runner - Rich terminal UI with progress"
echo "  4) 🔍 Debug Mode - Step through tests interactively"
echo "  5) 📺 All Modes - Run all visualizations"
echo ""
echo -n "Enter choice [1-5]: "
read choice

case $choice in
    1)
        echo -e "\n${GREEN}Starting Speedrun Mode...${NC}"
        echo "This will show all tests running in parallel!"
        sleep 1
        python speedrun_tests.py
        ;;

    2)
        echo -e "\n${GREEN}Starting Terminal Recorder...${NC}"
        echo "This will record terminal sessions for playback."
        sleep 1
        python terminal_recorder.py
        ;;

    3)
        echo -e "\n${GREEN}Starting Visual Runner...${NC}"
        echo "This will show detailed progress with Rich UI."
        sleep 1
        python visual_test_runner.py
        ;;

    4)
        echo -e "\n${GREEN}Starting Debug Mode...${NC}"
        echo "This will run tests one by one with pauses."
        sleep 1

        # Simple debug mode
        echo "Testing help command..."
        ../hacka.re --help
        echo -e "\n${CYAN}Press Enter to continue...${NC}"
        read

        echo "Testing browse --help..."
        ../hacka.re browse --help
        echo -e "\n${CYAN}Press Enter to continue...${NC}"
        read

        echo "Testing serve with verbose..."
        timeout 2 ../hacka.re serve -v -p 9999 || true
        echo -e "\n${CYAN}Press Enter to continue...${NC}"
        read

        echo "Testing chat --help..."
        ../hacka.re chat --help
        echo -e "\n${GREEN}Debug mode complete!${NC}"
        ;;

    5)
        echo -e "\n${GREEN}Running all visualization modes...${NC}"

        echo -e "\n${YELLOW}1. Visual Runner${NC}"
        python visual_test_runner.py

        echo -e "\n${YELLOW}2. Terminal Recorder${NC}"
        python terminal_recorder.py

        echo -e "\n${YELLOW}3. Speedrun Mode${NC}"
        python speedrun_tests.py

        echo -e "\n${GREEN}All modes complete!${NC}"
        ;;

    *)
        echo -e "${RED}Invalid choice!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Visual testing complete!${NC}"
echo ""

# Show results if any
if ls visual_test_results_*.json 2>/dev/null; then
    echo "Test results saved:"
    ls -la visual_test_results_*.json | tail -5
fi

if ls recordings/*.cast 2>/dev/null; then
    echo ""
    echo "Terminal recordings saved:"
    ls -la recordings/*.cast | tail -5
    echo ""
    echo "To play a recording: python terminal_recorder.py"
fi

if ls speedrun_results_*.json 2>/dev/null; then
    echo ""
    echo "Speedrun results saved:"
    ls -la speedrun_results_*.json | tail -5
fi