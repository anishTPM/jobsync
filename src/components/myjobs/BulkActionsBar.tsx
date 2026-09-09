"use client";
import { X, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { JobStatus } from "@/models/job.model";

const DISCOVERY_STATUS_OPTIONS = [
  { value: "accepted" as const, label: "Accepted (discovered)" },
  { value: "dismissed" as const, label: "Dismissed (discovered)" },
] as const;

type BulkActionsBarProps = {
  selectedCount: number;
  jobStatuses: JobStatus[];
  onStatusChange: (status: JobStatus) => void;
  onDiscoveryStatusChange: (value: "accepted" | "dismissed") => void;
  onClear: () => void;
  isLoading: boolean;
};

export function BulkActionsBar({
  selectedCount,
  jobStatuses,
  onStatusChange,
  onDiscoveryStatusChange,
  onClear,
  isLoading,
}: BulkActionsBarProps) {
  const statusById = new Map(jobStatuses.map((s) => [s.id, s]));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedCount} job{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <Select
          value=""
          onValueChange={(value) => {
            if (value) {
              const status = statusById.get(value);
              if (status) onStatusChange(status);
            }
          }}
        >
          <SelectTrigger className="w-[180px] h-8" disabled={isLoading}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Change status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Job Status</SelectLabel>
              <SelectSeparator />
              {jobStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value=""
          onValueChange={(value) => value && onDiscoveryStatusChange(value as "accepted" | "dismissed")}
        >
          <SelectTrigger className="w-[180px] h-8" disabled={isLoading}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Change discovery" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Discovery Status</SelectLabel>
              <SelectSeparator />
              {DISCOVERY_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="gap-1"
        disabled={isLoading}
        onClick={onClear}
      >
        <X className="h-3.5 w-3.5" />
        <span>Clear</span>
      </Button>
    </div>
  );
}