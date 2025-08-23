#!/usr/bin/env python3
"""
Test Python file for drag and drop functionality
"""

def hello_world():
    """Print a greeting message."""
    print("Hello, World!")
    return "Success"

def add_numbers(a, b):
    """Add two numbers together."""
    return a + b

if __name__ == "__main__":
    hello_world()
    result = add_numbers(5, 3)
    print(f"5 + 3 = {result}")