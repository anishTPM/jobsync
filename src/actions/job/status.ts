"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { JobStatus } from "@/models/job.model";
import { revalidatePath } from "next/cache";
import { requireUser } from "../shared";

function getStatusUpdateData(status: JobStatus) {
  switch (status.value) {
    case "applied":
      return {
        statusId: status.id,
        applied: true,
        appliedDate: new Date(),
      };
    case "interview":
      return {
        statusId: status.id,
        applied: true,
      };
    default:
      return {
        statusId: status.id,
      };
  }
}

export const updateJobStatus = async (
  jobId: string,
  status: JobStatus,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const job = await prisma.job.update({
      where: { id: jobId, userId: user.id },
      data: getStatusUpdateData(status),
    });
    revalidatePath("/dashboard");
    return { job, success: true };
  } catch (error) {
    const msg = "Failed to update job status.";
    return handleError(error, msg);
  }
};

export const bulkUpdateJobs = async (
  jobIds: string[],
  option: { kind: "jobStatus"; status: JobStatus } | { kind: "discoveryStatus"; value: "accepted" | "dismissed" },
): Promise<{ success: boolean; message?: string; updated?: number }> => {
  try {
    const user = await requireUser();
    if (option.kind === "jobStatus") {
      const data = getStatusUpdateData(option.status);
      const res = await prisma.job.updateMany({
        where: { id: { in: jobIds }, userId: user.id },
        data,
      });
      revalidatePath("/dashboard");
      return { success: true, updated: res.count };
    }
    const res = await prisma.job.updateMany({
      where: { id: { in: jobIds }, userId: user.id, automationId: { not: null } },
      data: { discoveryStatus: option.value },
    });
    revalidatePath("/dashboard");
    return { success: true, updated: res.count };
  } catch (error) {
    const msg = "Failed to bulk update jobs.";
    return handleError(error, msg);
  }
};

export const saveJobMatchResult = async (
  jobId: string,
  matchScore: number,
  matchData: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    await prisma.job.update({
      where: { id: jobId, userId: user.id },
      data: { matchScore, matchData },
    });

    return { success: true };
  } catch (error) {
    const msg = "Failed to save match result.";
    return handleError(error, msg);
  }
};
