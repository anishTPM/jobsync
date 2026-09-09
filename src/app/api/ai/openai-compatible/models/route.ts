import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { log } from "@/lib/telemetry";
import { resolveOpenAiCompatibleConfig } from "@/lib/ai/openai-compatible";
import { normalizeOpenAiCompatibleBaseUrl } from "@/lib/ai/openai-compatible";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const { apiKey, baseUrl } = await resolveOpenAiCompatibleConfig(userId);

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI Compatible API key not configured" },
        { status: 500 },
      );
    }
    if (!baseUrl) {
      return NextResponse.json(
        { error: "OpenAI Compatible base URL not configured" },
        { status: 500 },
      );
    }

    let normalized: string;
    try {
      normalized = normalizeOpenAiCompatibleBaseUrl(baseUrl);
    } catch {
      return NextResponse.json({ error: "Invalid base URL" }, { status: 500 });
    }

    const response = await fetch(`${normalized}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch OpenAI Compatible models" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    log.error("Error fetching models", {
      provider: "openai-compatible",
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch OpenAI Compatible models" },
      { status: 500 },
    );
  }
}