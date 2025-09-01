#!/usr/bin/env python3
"""
Fix malformed lines in test files where two statements are on the same line.
Specifically fixing: page.wait_for_timeout(1000)  # Wait for auto-save
 close_button.click()
"""

import os
import re
from pathlib import Path

def fix_malformed_lines(directory):
    """Fix malformed lines in all Python test files."""
    
    # Pattern to match the malformed line
    pattern = r'(\s*)page\.wait_for_timeout\(1000\)\s*#\s*Wait for auto-save\s+close_button\.click\((.*?)\)'
    
    # Replacement pattern (two separate lines)
    replacement = r'\1page.wait_for_timeout(1000)  # Wait for auto-save\n\1close_button.click(\2)'
    
    # Find all Python files
    test_files = list(Path(directory).glob("*.py"))
    
    fixed_files = []
    
    for file_path in test_files:
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Check if the file contains the malformed pattern
            if re.search(pattern, content):
                # Fix the malformed lines
                fixed_content = re.sub(pattern, replacement, content)
                
                # Write back the fixed content
                with open(file_path, 'w') as f:
                    f.write(fixed_content)
                
                fixed_files.append(file_path.name)
                print(f"Fixed: {file_path.name}")
        except Exception as e:
            print(f"Error processing {file_path.name}: {e}")
    
    return fixed_files

if __name__ == "__main__":
    directory = "/Users/user/dev/hacka.re/_tests/playwright"
    fixed = fix_malformed_lines(directory)
    
    print(f"\nFixed {len(fixed)} files:")
    for filename in fixed:
        print(f"  - {filename}")
    
    print("\nAll malformed lines have been fixed!")