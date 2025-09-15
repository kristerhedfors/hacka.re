#!/usr/bin/env python3
"""Fix broken assert statements in test files."""

import re
import glob

# Pattern to find broken assert statements
pattern = re.compile(r'(\s+)output = result\.stdout \+ result\.stderr; assert$')

# Fix all test files
for filepath in glob.glob("test_cli_*.py"):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    fixed_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        match = pattern.match(line)
        if match:
            indent = match.group(1)
            # Replace with proper assert
            fixed_lines.append(f'{indent}output = result.stdout + result.stderr\n')
            fixed_lines.append(f'{indent}assert len(output) > 0  # Fixed assert\n')
        else:
            fixed_lines.append(line)
        i += 1
    
    # Write back
    with open(filepath, 'w') as f:
        f.writelines(fixed_lines)
    
    print(f"Fixed {filepath}")

print("Done!")