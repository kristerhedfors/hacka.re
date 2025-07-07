#!/usr/bin/env python3
"""
Script to fix timeouts throughout the test suite for fast client-side LLM testing.
Reduces all timeouts to reasonable values under 3 seconds total.
"""

import os
import re
import glob

def fix_timeouts_in_file(filepath):
    """Fix timeouts in a single Python test file."""
    changes_made = 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Fix various timeout patterns
    timeout_patterns = [
        # timeout=NNNN patterns
        (r'timeout=([5-9]\d{3}|\d{5,})', lambda m: f'timeout={min(int(m.group(1)), 2000)}'),
        # timeout NNNN patterns  
        (r'timeout\s+([5-9]\d{3}|\d{5,})', lambda m: f'timeout {min(int(m.group(1)), 2000)}'),
        # wait_for_timeout patterns
        (r'wait_for_timeout\((\d{4,})\)', lambda m: f'wait_for_timeout({min(int(m.group(1)), 1000)})'),
        # time.sleep patterns over 1 second
        (r'time\.sleep\(([1-9]\d*\.?\d*)\)', lambda m: f'time.sleep({min(float(m.group(1)), 0.5)})'),
        # Specific high timeout values
        (r'timeout=15000', 'timeout=2000'),
        (r'timeout=10000', 'timeout=2000'),
        (r'timeout=8000', 'timeout=2000'),
        (r'timeout=7000', 'timeout=2000'),
        (r'timeout=6000', 'timeout=2000'),
        (r'timeout=5000', 'timeout=2000'),
    ]
    
    for pattern, replacement in timeout_patterns:
        if callable(replacement):
            new_content, count = re.subn(pattern, replacement, content)
        else:
            new_content, count = re.subn(pattern, replacement, content)
        
        if count > 0:
            changes_made += count
            content = new_content
            print(f"  Fixed {count} instances of pattern: {pattern}")
    
    # Write back if changes were made
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Updated {filepath} ({changes_made} timeout fixes)")
        return True
    
    return False

def main():
    """Fix timeouts in all Python test files."""
    test_dir = "/Users/user/dev/hacka.re/_tests/playwright"
    
    print("🔧 Fixing timeouts for fast client-side LLM testing...")
    print("Target: All operations under 3 seconds, most under 1 second")
    print()
    
    # Find all Python test files
    python_files = []
    for pattern in ['test_*.py', '**/*test*.py', 'conftest*.py']:
        python_files.extend(glob.glob(os.path.join(test_dir, pattern), recursive=True))
    
    # Remove duplicates and sort
    python_files = sorted(list(set(python_files)))
    
    total_files_updated = 0
    
    for filepath in python_files:
        print(f"Checking: {os.path.basename(filepath)}")
        if fix_timeouts_in_file(filepath):
            total_files_updated += 1
    
    print()
    print(f"✅ Timeout optimization complete!")
    print(f"📊 Updated {total_files_updated} files")
    print("🚀 Tests should now run much faster for client-side operations")

if __name__ == "__main__":
    main()