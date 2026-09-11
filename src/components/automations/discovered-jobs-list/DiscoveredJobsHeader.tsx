"use client";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListFilter, Trash2, Sparkles, Loader2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DISCOVERY_STATUSES } from "@/lib/constants";
import { RecordsCount } from "@/components/RecordsCount";
import type { DiscoveryStatus } from "@/models/automation.model";
import type { BulkAnalyzeProgress } from "./useDiscoveredJobActions";

interface DiscoveredJobsHeaderProps {
  loadedCount: number;
  totalJobs: number;
  showClear: boolean;
  onClear: () => void;
  statusFilter: DiscoveryStatus[];
  onStatusFilterChange: (filter: DiscoveryStatus[]) => void;
  pendingAnalyzeCount: number;
  bulkAnalyzing: boolean;
  // True while the authoritative pending-id fetch is in flight, before the
  // bulk loop flips bulkAnalyzing. Disables the button so a second click
  // cannot start a concurrent run over the same jobs.
  preparingAnalyze: boolean;
  bulkProgress: BulkAnalyzeProgress | null;
  onAnalyzeAll: () => void;
  onCancelAnalyzeAll: () => void;
  runInProgress: boolean;
}

export function DiscoveredJobsHeader({
  loadedCount,
  totalJobs,
  showClear,
  onClear,
  statusFilter,
  onStatusFilterChange,
  pendingAnalyzeCount,
  bulkAnalyzing,
  preparingAnalyze,
  bulkProgress,
  onAnalyzeAll,
  onCancelAnalyzeAll,
  runInProgress,
}: DiscoveredJobsHeaderProps) {
  const toggleStatusFilter = (status: DiscoveryStatus, checked: boolean) => {
    onStatusFilterChange(
      checked
        ? [...statusFilter, status]
        : statusFilter.filter((s) => s !== status),
    );
  };

  const analyzeDisabled = runInProgress || bulkAnalyzing || preparingAnalyze;

  return (
    <CardHeader>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Discovered Jobs</CardTitle>
          {totalJobs > 0 && (
            <RecordsCount count={loadedCount} total={totalJobs} label="jobs" />
          )}
          {bulkAnalyzing && bulkProgress && (
            <p className="text-xs text-muted-foreground">
              Analyzing {bulkProgress.done + 1} of {bulkProgress.total}
              {bulkProgress.failed > 0 ? ` · ${bulkProgress.failed} failed` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bulkAnalyzing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelAnalyzeAll}
              title="Cancel remaining analyses"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
          ) : pendingAnalyzeCount > 0 ? (
            <Button
              variant="default"
              size="sm"
              onClick={onAnalyzeAll}
              disabled={analyzeDisabled}
              title={
                runInProgress
                  ? "A run is in progress. Wait until it completes."
                  : `Analyze ${pendingAnalyzeCount} remaining job(s) one by one`
              }
            >
              {preparingAnalyze ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              Analyze All
              <span className="ml-1.5 rounded bg-white/20 px-1.5 py-0.5 text-xs font-mono">
                {pendingAnalyzeCount}
              </span>
            </Button>
          ) : null}
          {bulkAnalyzing && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}` : "Starting…"}
            </span>
          )}
          {showClear && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={bulkAnalyzing || preparingAnalyze}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Clear
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={bulkAnalyzing || preparingAnalyze}
              >
                <ListFilter className="h-4 w-4 mr-1.5" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DISCOVERY_STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status.value}
                  checked={statusFilter.includes(status.value)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(checked) =>
                    toggleStatusFilter(status.value, checked)
                  }
                >
                  {status.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {bulkAnalyzing && bulkProgress && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%`,
            }}
          />
        </div>
      )}
    </CardHeader>
  );
}
