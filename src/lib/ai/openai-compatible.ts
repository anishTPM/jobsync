// Shared helpers for the OpenAI Compatible provider.

export function normalizeOpenAiCompatibleBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("Base URL is empty");
  // Validate URL shape early so parse errors surface as typed errors.
  new URL(trimmed);
  // Preserve an existing /v1 suffix; otherwise append it — all OpenAI-compatible
  // servers expose .../v1/models and .../v1/chat/completions.
  if (trimmed.endsWith("/v1")) return trimmed;
  return `${trimmed}/v1`;
}

export async function resolveOpenAiCompatibleConfig(
  userId?: string,
): Promise<{ apiKey?: string; baseUrl?: string }> {
  let apiKey: string | undefined;
  let baseUrl: string | undefined;

  if (userId) {
    try {
      const { resolveApiKey } = await import("@/lib/api-key-resolver");
      apiKey = await resolveApiKey(userId, "openai-compatible");
    } catch {
      // fall through to env var
    }
  }

  if (!apiKey) {
    const envKey = process.env.OPENAI_COMPATIBLE_API_KEY;
    if (envKey) apiKey = envKey;
  }

  // Base URL lives in UserSettings JSON (per plan: UserSettings JSON).
  if (userId) {
    try {
      const db = (await import("@/lib/db")).default;
      const { defaultUserSettings } = await import("@/models/userSettings.model");
      const row = await db.userSettings.findUnique({ where: { userId } });
      if (row) {
        const parsed = JSON.parse(row.settings);
        const merged = { ...defaultUserSettings.ai, ...parsed?.ai };
        if (typeof merged.openaiCompatibleBaseUrl === "string" && merged.openaiCompatibleBaseUrl.trim()) {
          baseUrl = merged.openaiCompatibleBaseUrl.trim();
        }
      }
    } catch {
      // fall through to env var
    }
  }

  if (!baseUrl) {
    const envUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
    if (envUrl?.trim()) baseUrl = envUrl.trim();
  }

  return { apiKey, baseUrl };
}