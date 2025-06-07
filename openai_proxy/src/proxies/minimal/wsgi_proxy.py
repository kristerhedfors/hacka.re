"""
Pure WSGI OpenAI Proxy - Minimal implementation (12-15 lines)
Based on research: The most minimal working OpenAI proxy using Python's built-in WSGI
"""

import json
from urllib.request import urlopen, Request

def application(environ, start_response):
    """WSGI application for OpenAI API proxy"""
    if environ['REQUEST_METHOD'] == 'POST':
        content_length = int(environ.get('CONTENT_LENGTH', 0))
        post_data = environ['wsgi.input'].read(content_length)
        
        req = Request('https://api.openai.com' + environ['PATH_INFO'], 
                     data=post_data, 
                     headers={'Authorization': environ.get('HTTP_AUTHORIZATION', ''),
                             'Content-Type': 'application/json'})
        
        response = urlopen(req)
        start_response('200 OK', [('Content-Type', 'application/json')])
        return [response.read()]
    
    # Handle non-POST requests
    start_response('405 Method Not Allowed', [('Content-Type', 'application/json')])
    return [b'{"error": "Method not allowed"}']
