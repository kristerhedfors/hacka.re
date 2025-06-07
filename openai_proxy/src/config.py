"""
Configuration settings for OpenAI Proxy
"""

import os
from dotenv import load_dotenv

# Load environment variables from the main repo's .env file
env_path = os.path.join(os.path.dirname(__file__), '../../../_tests/playwright/.env')
load_dotenv(env_path)

# OpenAI API configuration - throw hard errors if missing
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is required but not found in environment variables")

OPENAI_API_MODEL = os.getenv('OPENAI_API_MODEL')
if not OPENAI_API_MODEL:
    raise ValueError("OPENAI_API_MODEL is required but not found in environment variables")

OPENAI_API_BASE = os.getenv('OPENAI_API_BASE')
if not OPENAI_API_BASE:
    raise ValueError("OPENAI_API_BASE is required but not found in environment variables")

# Test configuration
DEFAULT_MAX_TOKENS = 50
DEFAULT_TIMEOUT = 30
