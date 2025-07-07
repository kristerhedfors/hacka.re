#!/usr/bin/env python3
"""Fix malformed click statements caused by regex replacement."""

import os
import glob

def fix_click_syntax_in_file(filepath):
    """Fix malformed .click(.click( statements."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Fix the malformed click statements
    content = content.replace('.click(.click(', '.click(')
    content = content.replace('.first.click(.click(', '.first().click(')
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Fixed click syntax in {filepath}")
        return True
    
    return False

def main():
    """Fix click syntax in all Python test files."""
    test_dir = "/Users/user/dev/hacka.re/_tests/playwright"
    
    print("🔧 Fixing malformed click syntax...")
    
    # Find all Python test files
    python_files = glob.glob(os.path.join(test_dir, "test_*.py"))
    
    fixed_files = 0
    for filepath in python_files:
        if fix_click_syntax_in_file(filepath):
            fixed_files += 1
    
    print(f"✅ Fixed click syntax in {fixed_files} files")

if __name__ == "__main__":
    main()