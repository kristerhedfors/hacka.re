#!/usr/bin/env python3
"""
Simple script to check the DOM structure of the function list after adding functions.
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright

def check_function_list_dom():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto('http://localhost:8000')
        
        # Dismiss welcome modal
        try:
            welcome = page.locator('#welcome-modal')
            if welcome.is_visible():
                page.click('#welcome-modal .close-btn')
                print("Welcome modal dismissed")
        except:
            pass
        
        # Dismiss settings modal
        try:
            settings = page.locator('#settings-modal')
            if settings.is_visible():
                page.click('#close-settings')
                print("Settings modal dismissed")
        except:
            pass
        
        # Wait a moment
        page.wait_for_timeout(1000)
        
        # Open function modal
        function_btn = page.locator('#function-btn')
        function_btn.click()
        print("Function modal opened")
        
        # Submit default functions
        submit_btn = page.locator('#function-editor-form button[type="submit"]')
        submit_btn.click()
        print("Default functions submitted")
        
        # Wait and get function list HTML
        page.wait_for_timeout(3000)
        function_list = page.locator('#function-list')
        
        # Get the HTML structure
        html = function_list.inner_html()
        print("Function list HTML:")
        print("=" * 80)
        print(html)
        print("=" * 80)
        
        # Check for specific elements
        items = page.locator('#function-list .function-item')
        count = items.count()
        print(f"Found {count} function items")
        
        # Check for group headers
        headers = page.locator('#function-list .function-group-header')
        header_count = headers.count()
        print(f"Found {header_count} group headers")
        
        if header_count > 0:
            for i in range(header_count):
                header_text = headers.nth(i).text_content()
                print(f"Group header {i}: '{header_text}'")
        
        # Check for collection sections
        sections = page.locator('#function-list .function-collection-section')
        section_count = sections.count()
        print(f"Found {section_count} collection sections")
        
        if section_count > 0:
            for i in range(section_count):
                section_text = sections.nth(i).text_content()
                print(f"Collection section {i}: '{section_text}'")
        
        browser.close()

if __name__ == "__main__":
    check_function_list_dom()