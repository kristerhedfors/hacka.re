"""
This file is kept for backward compatibility.
It imports and re-exports all the tests from the refactored modules.
"""

# Import all tests from the refactored modules
from test_api import test_api_key_configuration, test_model_selection
from test_chat import test_chat_message_send_receive
from test_sharing import test_model_sharing_link_creation, test_model_sharing_link_loading

# Re-export all tests
__all__ = [
    'test_api_key_configuration',
    'test_model_selection',
    'test_chat_message_send_receive',
    'test_model_sharing_link_creation',
    'test_model_sharing_link_loading'
]
