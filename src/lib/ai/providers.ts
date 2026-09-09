import { resolveApiKey } from "@/lib/api-key-resolver";
import { PROVIDER_REGISTRY } from "@/lib/ai/provider-registry";
import { COMPATIBLE_FACTORY, PROVIDER_FACTORIES } from "@/lib/ai/provider-registry.server";

export type ProviderType = "openai" | "ollama" | "deepseek" | "openrouter" | "gemini" | "openai-compatible";

export async function getModel(
  provider: ProviderType,
  modelName: string,
  userId?: string,
) {
  const entry = PROVIDER_REGISTRY[provider];
  if (!entry) throw new Error(`Unknown AI provider: ${provider}`);

  if (provider === "openai-compatible") {
    const { resolveOpenAiCompatibleConfig } = await import("@/lib/ai/openai-compatible");
    const { apiKey, baseUrl } = await resolveOpenAiCompatibleConfig(userId);
    if (!apiKey || !baseUrl)
      throw new Error(
        "OpenAI Compatible not configured: set both Base URL and API Key in Settings → API Keys.",
      );
    return COMPATIBLE_FACTORY(apiKey, modelName, baseUrl);
  }

  const factory = PROVIDER_FACTORIES[provider];
  if (!factory) throw new Error(`No factory for provider: ${provider}`);

  const credential = await resolveApiKey(userId, provider);
  if (!credential)
    throw new Error(`${entry.displayName} credential not configured`);

  return factory(credential, modelName);
}
