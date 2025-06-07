from starlette.applications import Starlette
from starlette.routing import Route
from starlette.responses import Response
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import httpx, uvicorn

client = httpx.AsyncClient(base_url='https://api.openai.com', timeout=60.0)

async def proxy_chat(request):
    if request.method == 'OPTIONS':
        return Response(status_code=204)
    body = await request.body()
    hdrs = {k:v for k,v in request.headers.items() if k.lower() not in ('host','content-length','accept-encoding','connection')}
    resp = await client.post('/v1/chat/completions', headers=hdrs, content=body)
    content = await resp.aread()
    out_hdrs = {k:v for k,v in resp.headers.items() if k.lower() not in ('content-length','transfer-encoding','connection','host','content-encoding')}
    return Response(content, status_code=resp.status_code, headers=out_hdrs)

async def health(request):
    return Response('{status:ok}', media_type='application/json')

mw = [Middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['GET','POST','OPTIONS'], allow_headers=['*'], expose_headers=['*'])]
app = Starlette(routes=[Route('/v1/chat/completions', proxy_chat, methods=['POST','OPTIONS']), Route('/health', health)], middleware=mw)

if __name__=='__main__':
    uvicorn.run(app, host='0.0.0.0', port=8013)
