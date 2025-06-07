"""
Configuration settings for OpenAI Proxy
"""

import os
from dotenv import load_dotenv

# Load environment variables from local .env file
local_env_path = os.path.join(os.path.dirname(__file__), '../.env')
if os.path.exists(local_env_path):
    load_dotenv(local_env_path)
    print(f"Loaded environment from: {local_env_path}")
else:
    print(f"Local .env file not found at: {local_env_path}")
    # Fallback to main repo
    fallback_env_path = os.path.join(os.path.dirname(__file__), '../../../_tests/playwright/.env')
    if os.path.exists(fallback_env_path):
        load_dotenv(fallback_env_path)
        print(f"Loaded environment from fallback: {fallback_env_path}")
    else:
        print("No .env file found, using system environment variables")

# OpenAI API configuration - use defaults if missing
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_API_MODEL = os.getenv('OPENAI_API_MODEL', 'gpt-4o-mini')
OPENAI_API_BASE = os.getenv('OPENAI_API_BASE', 'https://api.openai.com/v1')

# Validation helper for runtime checks
def validate_config():
    """Validate that required configuration is present"""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is required but not found in environment variables")
    return True

# Test configuration
DEFAULT_MAX_TOKENS = 50
DEFAULT_TIMEOUT = 5
