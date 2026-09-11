import db from "@/lib/db";
import { getUnanalyzedDiscoveredJobIds } from "@/actions/automation.actions";
import { getCurrentUser } from "@/utils/user.utils";

vi.mock("@/lib/db", () => ({
  default: {
    automation: { findFirst: vi.fn() },
    job: { findMany: vi.fn() },
  },
}));

vi.mock("@/utils/user.utils", () => ({
  getCurrentUser: vi.fn(),
}));

const mockDb = db as unknown as {
  automation: { findFirst: ReturnType<typeof vi.fn> };
  job: { findMany: ReturnType<typeof vi.fn> };
};

function matchData(analyzed: boolean | null) {
  return analyzed === null ? null : JSON.stringify({ analyzed });
}

describe("getUnanalyzedDiscoveredJobIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as any).mockResolvedValue({ id: "user-1" });
    mockDb.automation.findFirst.mockResolvedValue({ id: "automation-1" });
  });

  it("scopes the query to new discovery status only", async () => {
    mockDb.job.findMany.mockResolvedValue([]);

    await getUnanalyzedDiscoveredJobIds("automation-1");

    const where = mockDb.job.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      userId: "user-1",
      automationId: "automation-1",
      discoveryStatus: "new",
    });
  });

  it("returns only ids whose matchData marks analyzed:false", async () => {
    mockDb.job.findMany.mockResolvedValue([
      { id: "new-unanalyzed", matchData: matchData(false) },
      { id: "new-analyzed", matchData: matchData(true) },
      { id: "new-legacy", matchData: matchData(null) },
    ]);

    const result = await getUnanalyzedDiscoveredJobIds("automation-1");

    expect(result).toEqual({ success: true, ids: ["new-unanalyzed"] });
  });

  it("treats malformed matchData as analyzed rather than pending", async () => {
    mockDb.job.findMany.mockResolvedValue([
      { id: "corrupt", matchData: "{not json" },
    ]);

    const result = await getUnanalyzedDiscoveredJobIds("automation-1");

    expect(result).toEqual({ success: true, ids: [] });
  });

  it("refuses when the automation is not owned by the caller", async () => {
    mockDb.automation.findFirst.mockResolvedValue(null);

    const result = await getUnanalyzedDiscoveredJobIds("automation-1");

    expect(result).toEqual({ success: false, message: "Automation not found" });
    expect(mockDb.job.findMany).not.toHaveBeenCalled();
  });
});
