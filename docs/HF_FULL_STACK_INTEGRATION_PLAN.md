# Hugging Face Full-Stack Integration Plan

This document turns the current research into an implementation and validation plan for `hacka.re` 2.0.

## Goal

Build a browser-first Hugging Face integration layer inside the `app/` rewrite so a user can:

- authenticate with Hugging Face
- switch inference models quickly
- change execution backends without rewriting the UI
- control mounted files and scope explicitly
- invoke Gradio Spaces and MCP-backed capabilities from one surface

## Target Architecture

### 1. Browser auth

- Serve `/.well-known/oauth-cimd` from `hacka.re`
- Use Hugging Face OAuth with PKCE in the browser
- Store session state locally and avoid shipping a static HF token

Fallback:

- allow user-supplied token entry for development and emergency access

### 2. Inference layer

- Treat `https://router.huggingface.co/v1` as an OpenAI-compatible route
- Keep model selection in app state so switching models remains a UI action
- Add retry logic for cold-start or opaque failures

### 3. Tool execution layer

- Default to a Docker Space running FastAPI for tool execution
- Expose explicit CORS headers for `hacka.re`
- Route execution through a single browser dispatcher so the backend can later be swapped to E2B or Gradio-only flows

### 4. Files and scope

- Expose repo id, mount path, mount strategy, and scope mode as first-class UI fields
- Support three file paths:
  - Hub repo mount
  - direct browser upload
  - session-only scratch files

### 5. Space integrations

- Use `@gradio/client` for Gradio Spaces
- Support named endpoints and streaming
- Add a registry for saved Spaces and optional duplicate-on-demand flows

### 6. MCP strategy

- First validate whether `https://huggingface.co/mcp` is usable directly from the browser
- If browser transport is blocked or inconsistent, proxy via a Docker Space or fall back to a client-side agent loop using direct HF JS libraries

## Validation Matrix

The in-app Hugging Face lab should track the following assumptions:

1. OAuth PKCE works from `hacka.re`
2. HF router inference calls succeed from browsers
3. cold-start retry behavior is good enough for chat UX
4. Docker Space CORS works reliably for tool APIs
5. code execution can be switched between Docker Space, Gradio-first, and E2B paths
6. Hub CRUD works from the browser with user credentials
7. Gradio client invocation works with files and streaming
8. MCP browser transport works directly or needs a proxy
9. dynamic Space discovery can be represented safely in the UI
10. file scope is clear and controllable for users

Each assumption should move through:

- `planned`
- `validating`
- `validated`
- `blocked`

## Delivery Phases

### Phase 1

- ship the Hugging Face lab in the `app/` shell
- add router preset switching
- add OAuth state model and UI
- validate direct browser inference

### Phase 2

- deploy a Docker Space executor
- wire execution backend switching
- add mounted repo and upload scope controls
- validate CORS and execution flow end to end

### Phase 3

- add Gradio Space registry and invocation
- validate direct HF MCP browser transport
- add proxy fallback if required
- add dynamic Space registration and labeling in the UI

## Test Strategy

### Local automated tests

- React tests for state persistence and modal flows
- Playwright tests for the Hugging Face lab UI and router preset behavior
- mocked network tests for inference and model switching

### Live validation runs

- real browser tests against HF OAuth, router inference, Gradio Spaces, and the execution Space
- record findings in the lab notes field
- mark each assumption with an explicit status after every run

## Practical Constraints

- client-side token handling remains a development fallback, not the preferred production path
- Dedicated Inference Endpoints are not part of the browser-first design because they lack CORS support
- subprocess sandboxes in a Docker Space are operationally useful but not strong isolation for hostile code
- ZeroGPU is a Gradio-only path and should not be assumed for Docker execution workloads

## Immediate Next Steps

1. Add Hugging Face OAuth UI and local session restore.
2. Add a Hugging Face router chat provider preset and retry wrapper.
3. Build the first Docker Space executor and validate CORS from the app.
4. Add Gradio Space connect-and-run flows.
5. Decide direct HF MCP vs Space proxy based on live browser evidence.
