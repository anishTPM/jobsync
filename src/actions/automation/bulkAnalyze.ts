"use server";

import db from "@/lib/db";
import { requireUser } from "../shared";
import { formatError } from "./shared";

// Returns ids of discovered jobs for this automation that are still
// un-analyzed AND in "new" discovery status. The analyzed flag lives inside a
// JSON matchData string, so we fetch the rows and filter in JS.
// Analyze All is scoped to "new" only: accepted jobs are already tracked and
// dismissed jobs are intentionally left un-analyzed (they were rejected
// pre-match and shouldn't consume AI credits).
export async function getUnanalyzedDiscoveredJobIds(
  automationId: string,
): Promise<{ success: boolean; ids?: string[]; message?: string }> {
  try {
    const user = await requireUser();

    const automation = await db.automation.findFirst({
      where: { id: automationId, userId: user.id },
      select: { id: true },
    });

    if (!automation) {
      return { success: false, message: "Automation not found" };
    }

    const jobs = await db.job.findMany({
      where: {
        userId: user.id,
        automationId,
        discoveryStatus: "new",
      },
      select: { id: true, matchData: true },
    });

    const ids: string[] = [];
    for (const j of jobs) {
      try {
        const data = JSON.parse((j as { matchData: string | null }).matchData ?? "{}");
        if (data.analyzed === false) ids.push(j.id);
      } catch {
        // corrupt/legacy row: treat as analyzed (existing isAnalyzed does the same)
      }
    }

    return { success: true, ids };
  } catch (error) {
    return formatError(error, "Failed to get pending jobs");
  }
}
