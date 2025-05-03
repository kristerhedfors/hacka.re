"""
This file is kept for backward compatibility.
It imports and re-exports all the tests from the refactored modules.
"""

# Import all tests from the refactored modules
from test_page import test_page_loads, test_chat_interface_elements
from test_modals import test_settings_modal, test_prompts_modal, test_share_modal

# Re-export all tests
__all__ = [
    'test_page_loads',
    'test_chat_interface_elements',
    'test_settings_modal',
    'test_prompts_modal',
    'test_share_modal'
]
