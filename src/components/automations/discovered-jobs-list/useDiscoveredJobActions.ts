"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toastSuccess, toastError } from "@/lib/toast";
import type { DiscoveredJob } from "@/models/automation.model";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  acceptDiscoveredJob,
  dismissDiscoveredJob,
  analyzeDiscoveredJob,
} from "@/actions/automation.actions";

export type BulkAnalyzeProgress = {
  total: number;
  done: number;
  failed: number;
  currentId: string | null;
};

export type BulkAnalyzeResult = {
  succeeded: number;
  failed: number;
  cancelled: boolean;
};

// Per-job analyze/accept/dismiss, serialized through a single loading id so the
// parent can also block starting a run while one is in flight.
// Bulk analyze reuses the same single-job action sequentially with a fixed
// delay between calls, keeping timing predictable for hosted providers and
// local Ollama.
export function useDiscoveredJobActions(
  onRefresh: () => void,
  onBusyChange?: (busy: boolean) => void,
) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkAnalyzeProgress | null>(
    null,
  );
  const bulkCancelledRef = useRef(false);

  useEffect(() => {
    onBusyChange?.(loadingAction !== null || bulkAnalyzing);
  }, [loadingAction, bulkAnalyzing, onBusyChange]);

  const handleAnalyze = async (jobId: string) => {
    setLoadingAction(jobId);
    try {
      const result = await analyzeDiscoveredJob(jobId);
      if (result.success) {
        toastSuccess("AI match score is ready.", "Match analyzed");
        onRefresh();
      } else {
        toastError(result.message);
      }
    } catch {
      toastError("Failed to analyze job");
    } finally {
      setLoadingAction(null);
    }
  };

  const cancelBulkAnalyze = useCallback(() => {
    bulkCancelledRef.current = true;
  }, []);

  const handleAnalyzeAll = useCallback(
    async (jobIds: string[]): Promise<BulkAnalyzeResult> => {
      if (jobIds.length === 0) {
        return { succeeded: 0, failed: 0, cancelled: false };
      }
      bulkCancelledRef.current = false;
      setBulkAnalyzing(true);
      setBulkProgress({
        total: jobIds.length,
        done: 0,
        failed: 0,
        currentId: jobIds[0] ?? null,
      });

      let succeeded = 0;
      let failed = 0;
      let cancelled = false;

      for (let i = 0; i < jobIds.length; i++) {
        if (bulkCancelledRef.current) {
          cancelled = true;
          break;
        }
        const jobId = jobIds[i]!;
        setLoadingAction(jobId);
        setBulkProgress((prev) =>
          prev ? { ...prev, currentId: jobId } : prev,
        );
        try {
          const result = await analyzeDiscoveredJob(jobId);
          if (result.success) succeeded++;
          else failed++;
        } catch {
          failed++;
        } finally {
          setLoadingAction(null);
        }
        setBulkProgress((prev) =>
          prev
            ? {
                ...prev,
                done: i + 1,
                failed,
                currentId: i + 1 < jobIds.length ? jobIds[i + 1]! : null,
              }
            : prev,
        );
        if (i < jobIds.length - 1) {
          if (bulkCancelledRef.current) {
            cancelled = true;
            break;
          }
          await new Promise<void>((resolve) =>
            setTimeout(resolve, APP_CONSTANTS.AUTOMATION_BULK_ANALYZE_DELAY_MS),
          );
          if (bulkCancelledRef.current) {
            cancelled = true;
            break;
          }
        }
      }

      setBulkAnalyzing(false);
      setLoadingAction(null);
      setBulkProgress(null);
      onRefresh();
      if (cancelled) {
        toastSuccess(
          `Analyzed ${succeeded} of ${jobIds.length} job(s) — cancelled.`,
          "Analyze cancelled",
        );
      } else if (failed === 0) {
        toastSuccess(`Analyzed ${succeeded} job(s).`, "Analyze all complete");
      } else {
        toastSuccess(
          `Analyzed ${succeeded} job(s), ${failed} failed.`,
          "Analyze all complete",
        );
      }
      return { succeeded, failed, cancelled };
    },
    [onRefresh],
  );

  const handleAccept = async (job: DiscoveredJob) => {
    setLoadingAction(job.id);
    try {
      const result = await acceptDiscoveredJob(job.id);
      if (result.success) {
        toastSuccess("The job has been added to your tracked jobs.", "Job accepted");
        onRefresh();
      } else {
        toastError(result.message);
      }
    } catch {
      toastError("Failed to accept job");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDismiss = async (jobId: string) => {
    setLoadingAction(jobId);
    try {
      const result = await dismissDiscoveredJob(jobId);
      if (result.success) {
        toastSuccess("Job dismissed");
        onRefresh();
      } else {
        toastError(result.message);
      }
    } catch {
      toastError("Failed to dismiss job");
    } finally {
      setLoadingAction(null);
    }
  };

  return {
    loadingAction,
    bulkAnalyzing,
    bulkProgress,
    handleAnalyze,
    handleAnalyzeAll,
    cancelBulkAnalyze,
    handleAccept,
    handleDismiss,
  };
}
