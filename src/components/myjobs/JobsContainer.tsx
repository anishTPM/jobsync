"use client";
import { useState, useCallback } from "react";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Loader } from "lucide-react";
import {
  deleteJobById,
  getJobDetails,
  updateJobStatus,
  bulkUpdateJobs,
} from "@/actions/job.actions";
import { acceptDiscoveredJob, dismissDiscoveredJob } from "@/actions/automation.actions";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  Company,
  JobLocation,
  JobSource,
  JobStatus,
  JobTitle,
  Tag,
} from "@/models/job.model";
import Loading from "../Loading";
import { useRouter } from "next/navigation";
import MyJobsTable from "./MyJobsTable";
import MyJobsGrid from "./MyJobsGrid";
import { NoteDialog } from "./NoteDialog";
import { useJobFilters } from "./jobs-container/useJobFilters";
import { useJobsList } from "./jobs-container/useJobsList";
import { downloadJobsList } from "./jobs-container/downloadJobsCsv";
import { JobsToolbar } from "./jobs-container/JobsToolbar";
import { BulkActionsBar } from "./BulkActionsBar";

type MyJobsProps = {
  statuses: JobStatus[];
  companies: Company[];
  titles: JobTitle[];
  locations: JobLocation[];
  sources: JobSource[];
  tags: Tag[];
};

type SelectionState = {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
};

function JobsContainer({
  statuses,
  companies,
  titles,
  locations,
  sources,
  tags,
}: MyJobsProps) {
  const router = useRouter();
  const [editJob, setEditJob] = useState(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteJobId, setNoteJobId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const {
    queryParams,
    companyFilter,
    titleFilter,
    locationFilter,
    sourceFilter,
    appliedFilter,
    companyLabel,
    titleLabel,
    locationLabel,
    sourceLabel,
    clearCompanyFilter,
    clearTitleFilter,
    clearLocationFilter,
    clearSourceFilter,
  } = useJobFilters({ companies, titles, locations, sources });

  const {
    jobs,
    viewMode,
    onChangeViewMode,
    totalJobs,
    filterKey,
    searchTerm,
    setSearchTerm,
    initialLoading,
    loadingMore,
    loadJobs,
    reloadJobs,
    onFilterChange,
    sentinelRef,
  } = useJobsList({
    companyFilter,
    appliedFilter,
    titleFilter,
    locationFilter,
    sourceFilter,
  });

  const onToggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const onSelectAll = useCallback(() => {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  }, [jobs, selectedIds.size]);

  const onClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const hasSelection = selectedIds.size > 0;
  const selectionState: SelectionState = {
    selectedIds,
    onToggle: onToggleSelection,
    onSelectAll,
    onClear: onClearSelection,
  };

  const onDeleteJob = async (jobId: string) => {
    const { res, success, message } = await deleteJobById(jobId);
    if (success) {
      toastSuccess(`Job has been deleted successfully`);
    } else {
      toastError(message);
    }
    reloadJobs();
  };

  const onEditJob = async (jobId: string) => {
    const { job, success, message } = await getJobDetails(jobId);
    if (!success) {
      toastError(message);
      return;
    }
    setEditJob(job);
  };

  const onChangeJobStatus = async (jobId: string, jobStatus: JobStatus) => {
    const { success, message } = await updateJobStatus(jobId, jobStatus);
    if (success) {
      router.refresh();
      toastSuccess(`Job has been updated successfully`);
    } else {
      toastError(message);
    }
    reloadJobs();
  };

  const onBulkStatusChange = async (status: JobStatus) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await bulkUpdateJobs(
        Array.from(selectedIds),
        { kind: "jobStatus", status },
      );
      if (result.success) {
        toastSuccess(`${result.updated} job(s) updated`);
        onClearSelection();
        router.refresh();
      } else {
        toastError(result.message);
      }
    } catch {
      toastError("Failed to bulk update jobs");
    } finally {
      setBulkLoading(false);
    }
    reloadJobs();
  };

  const onBulkDiscoveryStatusChange = async (value: "accepted" | "dismissed") => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await bulkUpdateJobs(
        Array.from(selectedIds),
        { kind: "discoveryStatus", value },
      );
      if (result.success) {
        toastSuccess(`${result.updated} job(s) updated`);
        onClearSelection();
        router.refresh();
      } else {
        toastError(result.message);
      }
    } catch {
      toastError("Failed to bulk update discovery status");
    } finally {
      setBulkLoading(false);
    }
    reloadJobs();
  };

  const resetEditJob = () => {
    setEditJob(null);
  };

  const onAddNote = (jobId: string) => {
    setNoteJobId(jobId);
    setNoteDialogOpen(true);
  };

  return (
    <>
      <Card x-chunk="dashboard-06-chunk-0">
        <JobsToolbar
          jobsCount={jobs.length}
          totalJobs={totalJobs}
          initialLoading={initialLoading}
          viewMode={viewMode}
          onChangeViewMode={onChangeViewMode}
          companyLabel={companyLabel}
          onClearCompanyFilter={clearCompanyFilter}
          titleLabel={titleLabel}
          onClearTitleFilter={clearTitleFilter}
          locationLabel={locationLabel}
          onClearLocationFilter={clearLocationFilter}
          sourceLabel={sourceLabel}
          onClearSourceFilter={clearSourceFilter}
          onReload={() => loadJobs(1, filterKey, searchTerm || undefined)}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          filterKey={filterKey}
          onFilterChange={onFilterChange}
          onDownload={downloadJobsList}
          statuses={statuses}
          companies={companies}
          titles={titles}
          locations={locations}
          sources={sources}
          tags={tags}
          editJob={editJob}
          resetEditJob={resetEditJob}
          addJobInitialOpen={queryParams.get("add-job") === "true"}
        />
        {hasSelection && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            jobStatuses={statuses}
            onStatusChange={onBulkStatusChange}
            onDiscoveryStatusChange={onBulkDiscoveryStatusChange}
            onClear={onClearSelection}
            isLoading={bulkLoading}
          />
        )}
        <CardContent>
          {initialLoading && <Loading />}
          {jobs.length > 0 &&
            (viewMode === "cards" ? (
              <MyJobsGrid
                jobs={jobs}
                jobStatuses={statuses}
                deleteJob={onDeleteJob}
                editJob={onEditJob}
                onChangeJobStatus={onChangeJobStatus}
                onAddNote={onAddNote}
                selection={selectionState}
              />
            ) : (
              <MyJobsTable
                jobs={jobs}
                jobStatuses={statuses}
                deleteJob={onDeleteJob}
                editJob={onEditJob}
                onChangeJobStatus={onChangeJobStatus}
                onAddNote={onAddNote}
                selection={selectionState}
              />
            ))}
          {jobs.length < totalJobs && (
            <div ref={sentinelRef} className="flex justify-center p-4">
              {loadingMore && (
                <Loader className="h-5 w-5 animate-spin text-blue-500" />
              )}
            </div>
          )}
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        jobId={noteJobId}
        onSaved={() => reloadJobs()}
      />
    </>
  );
}

export default JobsContainer;
