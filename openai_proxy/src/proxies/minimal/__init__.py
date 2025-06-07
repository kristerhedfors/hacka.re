"""
Minimal OpenAI Proxy implementations (no rate limiting)
"""

from .wsgi_proxy import application as wsgi_app
from .starlette_proxy import app as starlette_app
from .flask_proxy import app as flask_app
from .authenticated_proxy import app as authenticated_app
from .ed25519_proxy import app as ed25519_app

def get_proxy_app(proxy_type: str):
    """Get a proxy application by type"""
    apps = {
        'wsgi': wsgi_app,
        'starlette': starlette_app,
        'flask': flask_app,
        'authenticated': authenticated_app,
        'ed25519': ed25519_app
    }
    
    if proxy_type not in apps:
        raise ValueError(f"Unknown proxy type: {proxy_type}")
    
    return apps[proxy_type]

__all__ = ['get_proxy_app', 'wsgi_app', 'starlette_app', 'flask_app', 'authenticated_app', 'ed25519_app']
