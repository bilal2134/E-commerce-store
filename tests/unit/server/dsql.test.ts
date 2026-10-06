import { describe, expect, it, vi } from "vitest";
import { dsqlRegionFromHost, isRetryableConflict, withConflictRetry } from "@/server/db/dsql";

const conflict = Object.assign(new Error("OC000 change conflicts with another transaction"), {
  code: "40001",
});

describe("dsqlRegionFromHost", () => {
  it("reads the Region from a cluster endpoint", () => {
    expect(dsqlRegionFromHost("abcdefghij0123456789abcd.dsql.ap-south-1.on.aws")).toBe("ap-south-1");
    expect(dsqlRegionFromHost("localhost")).toBeNull();
    expect(dsqlRegionFromHost("x.dsql.ap-south-1.on.aws.evil.com")).toBeNull();
  });
});

describe("isRetryableConflict", () => {
  it("matches SQLSTATE 40001, also when wrapped", () => {
    expect(isRetryableConflict(conflict)).toBe(true);
    expect(isRetryableConflict(new Error("wrapped", { cause: conflict }))).toBe(true);
    expect(isRetryableConflict(Object.assign(new Error("dup"), { code: "23505" }))).toBe(false);
    expect(isRetryableConflict(null)).toBe(false);
  });
});

describe("withConflictRetry", () => {
  const fast = { sleep: () => Promise.resolve(), random: () => 0.5 };

  it("retries conflicts and returns the eventual result", async () => {
    const work = vi
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(conflict)
      .mockResolvedValue("ok");
    await expect(withConflictRetry(work, fast)).resolves.toBe("ok");
    expect(work).toHaveBeenCalledTimes(3);
  });

  it("does not retry other errors", async () => {
    const work = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(withConflictRetry(work, fast)).rejects.toThrow("boom");
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("gives up after the attempt budget with backoff between tries", async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(() => Promise.resolve());
    const work = vi.fn().mockRejectedValue(conflict);
    await expect(
      withConflictRetry(work, { attempts: 3, baseDelayMs: 10, sleep, random: () => 0.5 }),
    ).rejects.toBe(conflict);
    expect(work).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([10, 20]);
  });
});
