import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import { normalizeOpenAiCompatibleBaseUrl } from "@/lib/ai/openai-compatible";
import { createOllama } from "ollama-ai-provider-v2";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APP_CONSTANTS } from "@/lib/constants";

export type FactoryFn = (credential: string, modelName: string) => any;
export type CompatibleFactoryFn = (
  credential: string,
  modelName: string,
  baseUrl: string,
) => any;

export const PROVIDER_FACTORIES: Record<string, FactoryFn> = {
  openai: (apiKey, model) => createOpenAI({ apiKey })(model),
  openrouter: (apiKey, model) =>
    createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" })(model),
  deepseek: (apiKey, model) => createDeepSeek({ apiKey })(model),
  ollama: (baseURL, model) =>
    createOllama({ baseURL: baseURL + "/api" })(model),
  gemini: (apiKey, model) => createGoogleGenerativeAI({ apiKey })(model),
};

export const COMPATIBLE_FACTORY: CompatibleFactoryFn = (apiKey, model, baseUrl) =>
  createOpenAI({ apiKey, baseURL: normalizeOpenAiCompatibleBaseUrl(baseUrl) })(model);

export const PROVIDER_VERIFIERS: Record<
  string,
  (key: string, baseUrl?: string) => Promise<{ success: boolean; error?: string }>
> = {
  openai: async (key) => {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 401
            ? "Invalid API key"
            : `OpenAI returned ${res.status}`,
      };
    return { success: true };
  },

  openrouter: async (key) => {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 401
            ? "Invalid API key"
            : `OpenRouter returned ${res.status}`,
      };
    return { success: true };
  },

  deepseek: async (key) => {
    const res = await fetch("https://api.deepseek.com/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 401
            ? "Invalid API key"
            : `DeepSeek returned ${res.status}`,
      };
    return { success: true };
  },

  ollama: async (key) => {
    const baseUrl = key.replace(/\/+$/, "");
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(APP_CONSTANTS.AI_OLLAMA_LIST_TIMEOUT_MS),
      });
      if (!res.ok)
        return {
          success: false,
          error: `Cannot connect to Ollama at ${baseUrl}`,
        };
      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        return {
          success: false,
          error: `Ollama at ${baseUrl} did not respond in time. Please make sure Ollama is running.`,
        };
      }
      if (
        error instanceof TypeError &&
        /failed to parse url/i.test(error.message)
      ) {
        return {
          success: false,
          error: `Invalid Ollama URL: ${baseUrl}`,
        };
      }
      return {
        success: false,
        error: `Cannot connect to Ollama at ${baseUrl}. Please make sure Ollama is running.`,
      };
    }
  },

  gemini: async (key) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    );
    if (!res.ok)
      return {
        success: false,
        error:
          res.status === 400 || res.status === 403
            ? "Invalid API key"
            : `Gemini returned ${res.status}`,
      };
    return { success: true };
  },
  "openai-compatible": async (key, baseUrl) => {
    if (!key?.trim()) return { success: false, error: "API key is required" };
    if (!baseUrl?.trim()) return { success: false, error: "Base URL is required" };
    let normalized: string;
    try {
      normalized = normalizeOpenAiCompatibleBaseUrl(baseUrl);
    } catch {
      return { success: false, error: `Invalid Base URL: ${baseUrl}` };
    }
    try {
      const res = await fetch(`${normalized}/models`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(APP_CONSTANTS.AI_OLLAMA_LIST_TIMEOUT_MS),
      });
      if (!res.ok)
        return {
          success: false,
          error:
            res.status === 401
              ? "Invalid API key"
              : `Server returned ${res.status}`,
        };
      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        return { success: false, error: `Server at ${normalized} did not respond in time.` };
      }
      if (error instanceof TypeError && /failed to parse url/i.test(error.message)) {
        return { success: false, error: `Invalid Base URL: ${baseUrl}` };
      }
      return { success: false, error: `Cannot connect to ${normalized}.` };
    }
  },
};
