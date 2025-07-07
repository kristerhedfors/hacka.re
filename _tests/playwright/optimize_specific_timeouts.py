#!/usr/bin/env python3
"""
Script to optimize specific timeout patterns for different operation types.
Page loads get realistic timeouts, UI operations get fast timeouts.
"""

import os
import re
import glob

def optimize_timeouts_in_file(filepath):
    """Optimize timeouts for different operation types in a file."""
    changes_made = 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Different timeout strategies for different operations
    timeout_optimizations = [
        # UI interactions should be fast (clicks, fills, etc)
        (r'\.click\([^)]*timeout=(\d{4,})', lambda m: f'.click({m.group().replace(f"timeout={m.group(1)}", "timeout=2000")}'),
        (r'\.fill\([^)]*timeout=(\d{4,})', lambda m: f'.fill({m.group().replace(f"timeout={m.group(1)}", "timeout=2000")}'),
        (r'\.select_option\([^)]*timeout=(\d{4,})', lambda m: f'.select_option({m.group().replace(f"timeout={m.group(1)}", "timeout=2000")}'),
        
        # Element visibility checks should be fast
        (r'to_be_visible\(timeout=(\d{4,})\)', lambda m: f'to_be_visible(timeout={min(int(m.group(1)), 3000)})'),
        (r'to_be_hidden\(timeout=(\d{4,})\)', lambda m: f'to_be_hidden(timeout={min(int(m.group(1)), 3000)})'),
        
        # Wait for selector should be reasonable but not too long
        (r'wait_for_selector\([^,]+,\s*[^,]*timeout=(\d{4,})', lambda m: f'{m.group()[:-len(m.group(1))]}{min(int(m.group(1)), 4000)}'),
        
        # Keep page.goto timeouts reasonable (don't change them here - handled in conftest)
        # Keep API waits reasonable (for actual network calls)
    ]
    
    for pattern, replacement in timeout_optimizations:
        if callable(replacement):
            new_content, count = re.subn(pattern, replacement, content)
        else:
            new_content, count = re.subn(pattern, replacement, content)
        
        if count > 0:
            changes_made += count
            content = new_content
            print(f"  Optimized {count} instances of pattern: {pattern}")
    
    # Write back if changes were made
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Updated {filepath} ({changes_made} timeout optimizations)")
        return True
    
    return False

def main():
    """Optimize timeouts by operation type in all test files."""
    test_dir = "/Users/user/dev/hacka.re/_tests/playwright"
    
    print("🔧 Optimizing timeouts by operation type...")
    print("Strategy: Page loads=10s, UI interactions=2s, visibility=3s, selectors=4s")
    print()
    
    # Find all Python test files
    python_files = []
    for pattern in ['test_*.py']:
        python_files.extend(glob.glob(os.path.join(test_dir, pattern), recursive=False))
    
    # Remove duplicates and sort
    python_files = sorted(list(set(python_files)))
    
    total_files_updated = 0
    
    for filepath in python_files:
        print(f"Checking: {os.path.basename(filepath)}")
        if optimize_timeouts_in_file(filepath):
            total_files_updated += 1
    
    print()
    print(f"✅ Timeout optimization by operation type complete!")
    print(f"📊 Updated {total_files_updated} files")
    print("🚀 Tests should now have balanced timeouts for different operations")

if __name__ == "__main__":
    main()