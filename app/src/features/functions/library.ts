import type { FunctionDraft, FunctionState } from "../../types/app";

function uniq(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

export function createEmptyFunctionState(): FunctionState {
  return {
    userFunctions: {},
    functionCollections: {},
    selectedDefaultFunctionIds: [],
    selectedDefaultFunctionCollectionIds: [],
  };
}

export function isFunctionDraft(value: unknown): value is FunctionDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === "string" && typeof candidate.code === "string";
}

export function isFunctionState(value: unknown): value is FunctionState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const userFunctions = candidate.userFunctions as Record<string, unknown> | undefined;
  const functionCollections = candidate.functionCollections as Record<string, unknown> | undefined;

  return !!userFunctions &&
    Object.entries(userFunctions).every(([name, entry]) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const draft = entry as Record<string, unknown>;
      return typeof name === "string" && typeof draft.name === "string" && typeof draft.code === "string";
    }) &&
    !!functionCollections &&
    Object.values(functionCollections).every((value) => typeof value === "string") &&
    Array.isArray(candidate.selectedDefaultFunctionIds) &&
    candidate.selectedDefaultFunctionIds.every((id) => typeof id === "string") &&
    Array.isArray(candidate.selectedDefaultFunctionCollectionIds) &&
    candidate.selectedDefaultFunctionCollectionIds.every((id) => typeof id === "string");
}

export function normalizeFunctionState(state: FunctionState): FunctionState {
  const userFunctions = Object.fromEntries(
    Object.entries(state.userFunctions).filter(([name, draft]) => {
      return Boolean(name) && typeof draft?.code === "string";
    }),
  );

  const functionCollections = Object.fromEntries(
    Object.entries(state.functionCollections).filter(([name, value]) => {
      return typeof userFunctions[name] !== "undefined" && typeof value === "string";
    }),
  );

  return {
    userFunctions,
    functionCollections,
    selectedDefaultFunctionIds: uniq(state.selectedDefaultFunctionIds),
    selectedDefaultFunctionCollectionIds: uniq(state.selectedDefaultFunctionCollectionIds),
  };
}

export function getOrderedFunctions(state: FunctionState): FunctionDraft[] {
  return Object.values(state.userFunctions).sort((left, right) => left.name.localeCompare(right.name));
}
