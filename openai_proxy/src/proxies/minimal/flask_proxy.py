"""
Flask OpenAI Proxy - Ecosystem implementation (20-25 lines)
Based on research: Flask with vast ecosystem support
"""

from flask import Flask, request, Response
import requests

app = Flask(__name__)

@app.route('/v1/chat/completions', methods=['POST'])
def proxy_chat_completions():
    """Proxy endpoint for OpenAI chat completions"""
    # Get request data
    data = request.get_data()
    headers = dict(request.headers)
    
    # Remove host header to avoid conflicts
    headers.pop('Host', None)
    
    # Forward request to OpenAI
    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        data=data,
        headers=headers,
        stream=True
    )
    
    # Return streaming response
    return Response(
        response.iter_content(chunk_size=1024),
        status=response.status_code,
        headers=dict(response.headers)
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
