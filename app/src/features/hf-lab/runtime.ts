import type { HfCapabilityCheckId, HfCapabilityStatus, HfLabState } from "../../types/app";

export interface HfCapabilityRunResult {
  status: HfCapabilityStatus;
  message: string;
}

function requireToken(hfLab: HfLabState): string {
  const token = hfLab.hfToken.trim();
  if (!token) {
    throw new Error("No Hugging Face token is configured in Settings.");
  }

  return token;
}

function getSpaceUrl(spaceId: string): string {
  const normalized = spaceId.trim();
  if (!normalized.includes("/")) {
    throw new Error("Space id must be in `owner/space` format.");
  }

  return `https://${normalized.replace("/", "-")}.hf.space`;
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.error || payload.message || `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

async function fetchJsonWithToken(url: string, token: string): Promise<Response> {
  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function probeRouterModels(hfLab: HfLabState): Promise<Response> {
  const token = requireToken(hfLab);
  return fetchJsonWithToken(`${hfLab.inferenceProviderRoute.replace(/\/$/, "")}/models`, token);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function runHfCapabilityTest(
  checkId: HfCapabilityCheckId,
  hfLab: HfLabState,
): Promise<HfCapabilityRunResult> {
  try {
    switch (checkId) {
      case "oauth-pkce": {
        const response = await fetch("/.well-known/oauth-cimd", { method: "GET" });
        if (!response.ok) {
          return {
            status: "blocked",
            message: `CIMD document missing or inaccessible (${response.status}).`,
          };
        }

        return {
          status: "validated",
          message:
            hfLab.authStrategy === "oauth-pkce"
              ? "CIMD document is reachable. PKCE browser setup can be wired on top of this."
              : "CIMD document is reachable, but the current profile still uses user-token mode.",
        };
      }
      case "router-cors": {
        const response = await probeRouterModels(hfLab);
        if (!response.ok) {
          return { status: "blocked", message: await parseError(response) };
        }

        const payload = (await response.json()) as { data?: Array<{ id?: string }> };
        return {
          status: "validated",
          message: `Router model listing worked in-browser. Received ${payload.data?.length ?? 0} models.`,
        };
      }
      case "router-retries": {
        let lastError = "Unknown retry failure.";

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            const response = await probeRouterModels(hfLab);
            if (!response.ok) {
              lastError = await parseError(response);
            } else {
              return {
                status: "validated",
                message: `Retry probe succeeded on attempt ${attempt}.`,
              };
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : "Opaque browser error.";
          }

          if (attempt < 3) {
            await delay(300 * attempt);
          }
        }

        return {
          status: "blocked",
          message: `Retry probe failed after 3 attempts. ${lastError}`,
        };
      }
      case "docker-space-cors": {
        const response = await fetch(getSpaceUrl(hfLab.executionSpaceId), { method: "GET" });
        return response.ok
          ? {
              status: "validated",
              message: `Execution Space responded to a browser request (${response.status}).`,
            }
          : {
              status: "blocked",
              message: await parseError(response),
            };
      }
      case "code-execution": {
        if (hfLab.executionBackend === "docker-space") {
          const response = await fetch(`${getSpaceUrl(hfLab.executionSpaceId)}/health`, { method: "GET" });
          return response.ok
            ? {
                status: "validated",
                message: "Execution backend health endpoint is reachable from the browser.",
              }
            : {
                status: "blocked",
                message:
                  response.status === 404
                    ? "Execution Space is reachable but `/health` is not implemented yet."
                    : await parseError(response),
              };
        }

        if (hfLab.executionBackend === "gradio-space") {
          const response = await fetch(`${getSpaceUrl(hfLab.gradioSpaceId)}/gradio_api/openapi.json`, {
            method: "GET",
          });
          return response.ok
            ? {
                status: "validated",
                message: "Configured Gradio execution target exposes an API schema.",
              }
            : {
                status: "blocked",
                message: await parseError(response),
              };
        }

        return {
          status: "validating",
          message: "E2B is selected, but this probe still needs a browser-side sandbox execution path.",
        };
      }
      case "hub-crud": {
        const token = requireToken(hfLab);
        const response = await fetchJsonWithToken("https://huggingface.co/api/whoami-v2", token);
        if (!response.ok) {
          return { status: "blocked", message: await parseError(response) };
        }

        const payload = (await response.json()) as { name?: string; auth?: { type?: string } };
        return {
          status: "validated",
          message: `Hub auth probe succeeded for ${payload.name ?? "unknown user"}. Write/create flows still need a live repo mutation test.`,
        };
      }
      case "gradio-client": {
        const response = await fetch(`${getSpaceUrl(hfLab.gradioSpaceId)}/gradio_api/openapi.json`, {
          method: "GET",
        });
        if (!response.ok) {
          return { status: "blocked", message: await parseError(response) };
        }

        return {
          status: "validated",
          message: "Gradio Space API schema is reachable from the browser.",
        };
      }
      case "mcp-browser-transport": {
        const response = await fetch("https://huggingface.co/mcp", { method: "GET" });
        return response.ok
          ? {
              status: "validated",
              message: "Direct browser request to the HF MCP endpoint completed.",
            }
          : {
              status: "blocked",
              message: await parseError(response),
            };
      }
      case "dynamic-spaces": {
        const response = await fetch("https://huggingface.co/api/spaces?search=gradio&limit=3", {
          method: "GET",
        });
        if (!response.ok) {
          return { status: "blocked", message: await parseError(response) };
        }

        const payload = (await response.json()) as Array<{ id?: string }>;
        return {
          status: "validated",
          message: `Public Space discovery returned ${payload.length} sample entries.`,
        };
      }
      case "file-mounting": {
        if (!hfLab.mountedRepoId.trim() || !hfLab.mountedPath.trim()) {
          return {
            status: "blocked",
            message: "Mounted repo id and mounted path must both be configured.",
          };
        }

        return {
          status: "validated",
          message: `Scope is configured as ${hfLab.mountStrategy} -> ${hfLab.mountedRepoId}:${hfLab.mountedPath} (${hfLab.scopeMode}).`,
        };
      }
      default:
        return {
          status: "blocked",
          message: "No runtime probe is implemented for this capability.",
        };
    }
  } catch (error) {
    return {
      status: "blocked",
      message: error instanceof Error ? error.message : "Unexpected browser test failure.",
    };
  }
}
