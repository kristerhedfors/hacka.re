#!/bin/bash

# User Story Video Recorder
# Record beautiful demo videos of hacka.re user stories
# Videos are saved to ./videos/user_stories/

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Default values
STORY=""
WIDTH=1280
HEIGHT=720
SLOWMO=100
HEADLESS=false
VISIBLE_FLAG=""
LIST_ONLY=false
OPEN_VIDEO=false

# Available stories
show_stories() {
    echo -e "${BLUE}${BOLD}📚 Available User Stories:${NC}\n"
    echo -e "  ${GREEN}rebel_mission${NC}    - Rebel mission to blow up the Death Star 🚀"
    echo -e "  ${GREEN}customer_support${NC} - Customer support bot with escalation 🤖"
    echo -e "  ${GREEN}code_review${NC}      - Code review assistant with analysis 👩‍💻"
    echo -e "  ${GREEN}data_analysis${NC}    - Data processing pipeline 📊"
    echo -e "  ${GREEN}security_audit${NC}   - Security scanning with MCP 🔒"
    echo ""
}

# Show help
show_help() {
    echo -e "${BOLD}hacka.re User Story Video Recorder${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Usage: $0 [story_name] [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -l, --list          List available stories"
    echo "  -v, --visible       Show browser while recording (default: hidden)"
    echo "  -w, --width WIDTH   Video width (default: 1280)"
    echo "  -h, --height HEIGHT Video height (default: 720)"
    echo "  -s, --slowmo MS     Slow motion delay in ms (default: 100)"
    echo "  -o, --open          Open video after recording"
    echo ""
    echo "Examples:"
    echo -e "  ${GREEN}$0 rebel_mission${NC}                    # Record rebel mission story"
    echo -e "  ${GREEN}$0 rebel_mission --visible${NC}          # Watch it happen!"
    echo -e "  ${GREEN}$0 rebel_mission -w 1920 -h 1080${NC}   # HD recording"
    echo -e "  ${GREEN}$0 rebel_mission --slowmo 200${NC}      # Slower for presentations"
    echo ""
    show_stories
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -l|--list)
            show_stories
            exit 0
            ;;
        -v|--visible)
            VISIBLE_FLAG="--visible"
            shift
            ;;
        -w|--width)
            WIDTH="$2"
            shift 2
            ;;
        --height)
            HEIGHT="$2"
            shift 2
            ;;
        -s|--slowmo)
            SLOWMO="$2"
            shift 2
            ;;
        -o|--open)
            OPEN_VIDEO=true
            shift
            ;;
        *)
            if [[ -z "$STORY" ]]; then
                STORY="$1"
            else
                echo -e "${RED}Unknown option: $1${NC}"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Check if story was provided
if [[ -z "$STORY" ]]; then
    echo -e "${RED}Error: No story specified${NC}"
    echo ""
    show_help
    exit 1
fi

# Validate story name
case "$STORY" in
    rebel_mission|customer_support|code_review|data_analysis|security_audit)
        ;;
    *)
        echo -e "${RED}Error: Unknown story '${STORY}'${NC}"
        echo ""
        show_stories
        exit 1
        ;;
esac

# Check if server is running
check_server() {
    curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 | grep -q "200"
}

# Start server if needed
if ! check_server; then
    echo -e "${YELLOW}📡 Starting local server...${NC}"
    ./scripts/start_server.sh
    sleep 2
fi

# Run the story
echo -e "${BLUE}${BOLD}🎬 Recording Story: ${STORY}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📹 Video: ${WIDTH}x${HEIGHT}"
echo -e "🐌 Speed: ${SLOWMO}ms delay"
if [[ -n "$VISIBLE_FLAG" ]]; then
    echo -e "👁️  Mode: Visible browser"
else
    echo -e "👻 Mode: Headless (hidden)"
fi
echo ""

# Run the Python script with proper environment
cd _tests/playwright
.venv/bin/python user_stories/record_user_story.py \
    --story "$STORY" \
    --width "$WIDTH" \
    --height "$HEIGHT" \
    --slowmo "$SLOWMO" \
    $VISIBLE_FLAG

# Check if recording was successful
if [[ $? -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}${BOLD}✅ Story recorded successfully!${NC}"

    # Find the latest video (prefer MP4 over WebM)
    VIDEO_FILE=$(ls -t ../../videos/user_stories/${STORY}_*_presentation.mp4 2>/dev/null | head -1)

    # Fallback to WebM if MP4 not found
    if [[ -z "$VIDEO_FILE" ]]; then
        VIDEO_FILE=$(ls -t ../../videos/user_stories/${STORY}_*.webm 2>/dev/null | head -1)
        if [[ -n "$VIDEO_FILE" ]]; then
            echo -e "${YELLOW}⚠️ MP4 conversion not available (install ffmpeg for optimized videos)${NC}"
        fi
    fi

    if [[ -n "$VIDEO_FILE" ]]; then
        echo -e "${GREEN}📹 Video saved: ${VIDEO_FILE}${NC}"

        # Get file size
        SIZE=$(du -h "$VIDEO_FILE" | cut -f1)
        echo -e "${BLUE}📦 Size: ${SIZE}${NC}"

        # Check if it's presentation-optimized
        if [[ "$VIDEO_FILE" == *"_presentation.mp4" ]]; then
            echo -e "${GREEN}✨ Presentation-optimized (H.264, 15fps, 854x666)${NC}"
        fi

        # Open video if requested
        if [[ "$OPEN_VIDEO" == true ]]; then
            echo -e "${BLUE}🎥 Opening video...${NC}"
            open "$VIDEO_FILE"
        fi
    fi
else
    echo -e "${RED}${BOLD}❌ Recording failed!${NC}"
    exit 1
fi