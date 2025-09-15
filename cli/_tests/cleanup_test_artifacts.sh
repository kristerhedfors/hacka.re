#!/bin/bash

# Clean up old test artifacts while preserving important data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Test Artifacts Cleanup ===${NC}"

# Function to archive old test results
archive_old_results() {
    local days_old=${1:-7}
    echo -e "${YELLOW}Archiving test results older than $days_old days...${NC}"
    
    # Find and archive old daily results
    if [ -d "test_results/daily" ]; then
        find test_results/daily -name "*.json" -mtime +$days_old -exec gzip {} \; 2>/dev/null || true
        find test_results/daily -name "*.log" -mtime +$days_old -exec gzip {} \; 2>/dev/null || true
        echo "Archived old test results"
    fi
}

# Function to clean up screenshots
cleanup_screenshots() {
    local days_old=${1:-3}
    echo -e "${YELLOW}Cleaning screenshots older than $days_old days...${NC}"
    
    if [ -d "screenshots" ]; then
        local count=$(find screenshots -name "*.png" -mtime +$days_old 2>/dev/null | wc -l)
        if [ $count -gt 0 ]; then
            find screenshots -name "*.png" -mtime +$days_old -delete
            echo "Removed $count old screenshots"
        else
            echo "No old screenshots to remove"
        fi
    fi
    
    # Clean up orphaned metadata files
    if [ -d "screenshots_data" ]; then
        for md_file in screenshots_data/*.md; do
            if [ -f "$md_file" ]; then
                # Extract screenshot filename from metadata
                png_name=$(basename "$md_file" .md).png
                if [ ! -f "screenshots/$png_name" ]; then
                    rm "$md_file"
                    echo "Removed orphaned metadata: $(basename $md_file)"
                fi
            fi
        done
    fi
}

# Function to organize loose .md files
organize_md_files() {
    echo -e "${YELLOW}Organizing loose .md files...${NC}"
    
    # Move any remaining loose .md files to docs
    for md_file in *.md; do
        if [ -f "$md_file" ] && [ "$md_file" != "README.md" ]; then
            if [[ "$md_file" == *"TEST"* ]] || [[ "$md_file" == *"test"* ]]; then
                mv "$md_file" test_results/reports/
                echo "Moved $md_file to test_results/reports/"
            else
                mv "$md_file" docs/
                echo "Moved $md_file to docs/"
            fi
        fi
    done
}

# Function to show disk usage
show_disk_usage() {
    echo -e "${GREEN}=== Disk Usage ===${NC}"
    
    echo "Test results:"
    du -sh test_results/* 2>/dev/null | sort -rh | head -5
    
    echo ""
    echo "Screenshots:"
    if [ -d "screenshots" ]; then
        local screenshot_size=$(du -sh screenshots 2>/dev/null | cut -f1)
        local screenshot_count=$(find screenshots -name "*.png" 2>/dev/null | wc -l)
        echo "  Size: $screenshot_size"
        echo "  Count: $screenshot_count files"
    fi
    
    echo ""
    echo "Total test directory:"
    du -sh . 2>/dev/null
}

# Parse arguments
ARCHIVE_DAYS=7
SCREENSHOT_DAYS=3
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --archive-days)
            ARCHIVE_DAYS="$2"
            shift 2
            ;;
        --screenshot-days)
            SCREENSHOT_DAYS="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --archive-days N     Archive test results older than N days (default: 7)"
            echo "  --screenshot-days N  Delete screenshots older than N days (default: 3)"
            echo "  --dry-run           Show what would be done without doing it"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# Show current disk usage
show_disk_usage
echo ""

# Perform cleanup
if [ "$DRY_RUN" = false ]; then
    archive_old_results $ARCHIVE_DAYS
    cleanup_screenshots $SCREENSHOT_DAYS
    organize_md_files
    echo ""
    echo -e "${GREEN}=== After Cleanup ===${NC}"
    show_disk_usage
else
    echo -e "${YELLOW}Would archive results older than $ARCHIVE_DAYS days${NC}"
    echo -e "${YELLOW}Would delete screenshots older than $SCREENSHOT_DAYS days${NC}"
    echo -e "${YELLOW}Would organize loose .md files${NC}"
fi

echo ""
echo -e "${GREEN}Cleanup complete!${NC}"