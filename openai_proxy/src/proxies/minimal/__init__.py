"""
Minimal OpenAI Proxy implementations (no rate limiting)
"""

from .starlette_proxy import app as starlette_app
from .flask_proxy import app as flask_app

def get_proxy_app(proxy_type: str):
    """Get a proxy application by type"""
    apps = {
        'starlette': starlette_app,
        'flask': flask_app,
    }
    
    if proxy_type not in apps:
        raise ValueError(f"Unknown proxy type: {proxy_type}")
    
    return apps[proxy_type]

__all__ = ['get_proxy_app', 'starlette_app', 'flask_app']
