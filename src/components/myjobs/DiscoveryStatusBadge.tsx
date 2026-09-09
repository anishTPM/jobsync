"use client";
import { StatusBadge } from "../StatusBadge";
import { getDiscoveryStatusBadgeColor } from "@/lib/badge-colors";
import { cn } from "@/lib/utils";
import { JobResponse } from "@/models/job.model";

type DiscoveryStatusBadgeProps = {
  job: JobResponse;
  className?: string;
};

const DISCOVERY_LABELS: Record<string, string> = {
  new: "Discovered",
  accepted: "Accepted",
  dismissed: "Dismissed",
};

export function DiscoveryStatusBadge({ job, className }: DiscoveryStatusBadgeProps) {
  if (!job.discoveryStatus || job.discoveryStatus === "dismissed") {
    return null;
  }
  return (
    <StatusBadge
      label={DISCOVERY_LABELS[job.discoveryStatus] ?? job.discoveryStatus}
      color={getDiscoveryStatusBadgeColor(job.discoveryStatus as "new" | "accepted" | "dismissed")}
      className={cn("ml-1.5 text-xs", className)}
    />
  );
}