import { describe, expect, it } from "vitest";
import { initialAppState } from "../app/state";
import {
  createLegacyShareLink,
  decryptLegacyShareFragment,
  mapLegacyPayloadToPartialState,
} from "../services/share";

describe("legacy share links", () => {
  it("round-trips a legacy-compatible payload with functions and passthrough fields", async () => {
    const state = {
      ...initialAppState,
      theme: "paper" as const,
      settings: {
        ...initialAppState.settings,
        provider: "custom" as const,
        customBaseUrl: "https://proxy.example/v1",
        apiKey: "sk-share-test",
        model: "gpt-4o",
        systemPrompt: "Act like the legacy app.",
      },
      prompts: {
        customPrompts: [
          {
            id: "prompt-1",
            name: "Share Prompt",
            content: "Use the preserved prompt library.",
          },
        ],
        selectedCustomPromptIds: ["prompt-1"],
        selectedDefaultPromptIds: ["legacy-default-prompt"],
      },
      functions: {
        userFunctions: {
          ping: {
            name: "ping",
            code: "function ping() { return 'pong'; }",
          },
        },
        functionCollections: {
          ping: "Utilities",
        },
        selectedDefaultFunctionIds: ["math:sum"],
        selectedDefaultFunctionCollectionIds: ["math"],
      },
      messages: [
        ...initialAppState.messages,
        {
          id: "user-2",
          role: "user" as const,
          content: "hello",
        },
        {
          id: "assistant-2",
          role: "assistant" as const,
          content: "world",
        },
      ],
      legacyShare: {
        welcomeMessage: "Welcome back",
        rawPayload: {
          mcpConnections: {
            github: "ghp_123",
          },
          ragEnabled: true,
        },
      },
    };

    const link = await createLegacyShareLink(state, "secret123");
    const fragment = new URL(link).hash.replace(/^#gpt=/, "");
    const decrypted = await decryptLegacyShareFragment("secret123", fragment);

    expect(decrypted?.payload.functions?.ping.code).toContain("pong");
    expect(decrypted?.payload.selectedDefaultFunctionIds).toContain("math:sum");
    expect(decrypted?.payload.mcpConnections?.github).toBe("ghp_123");
    expect(decrypted?.payload.welcomeMessage).toBe("Welcome back");

    const mapped = mapLegacyPayloadToPartialState(decrypted!.payload);
    expect(mapped.settings?.systemPrompt).toBe("Act like the legacy app.");
    expect(mapped.functions?.userFunctions.ping.code).toContain("pong");
    expect(mapped.legacyShare?.rawPayload.ragEnabled).toBe(true);
  });
});
