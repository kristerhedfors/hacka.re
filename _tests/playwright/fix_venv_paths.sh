#!/bin/bash

# Fix all test scripts to use the correct .venv path

echo "Fixing venv paths in test scripts..."

for script in run_*.sh; do
    if grep -q "_venv" "$script"; then
        echo "  Updating $script"
        
        # Replace the old venv path logic with new one
        sed -i.bak '
            /PROJECT_ROOT=.*cd.*pwd/,/PYTHON_CMD=.*_venv/ {
                c\
# Check if virtual environment exists in the playwright tests directory\
VENV_PATH="$(pwd)/.venv"\
\
if [ ! -d "$VENV_PATH" ]; then\
    echo "Virtual environment not found at $VENV_PATH"\
    echo "Please run setup_environment.sh from project root first"\
    exit 1\
fi\
\
# Use the playwright test virtual environment Python directly\
PYTHON_CMD="$VENV_PATH/bin/python"
            }
        ' "$script"
        
        # Clean up backup files
        rm -f "${script}.bak"
    fi
done

echo "Done! All test scripts updated to use .venv instead of _venv"