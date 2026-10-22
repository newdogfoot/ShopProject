import { describe, expect, it } from "vitest";
import { clearFailures, isLockedOut, MAX_FAILURES, recordFailure, WINDOW_MS } from "./attempts";

describe("password attempt limit", () => {
  it("locks an account after repeated wrong passwords and unlocks after the window", () => {
    const key = "login:kid-parent@example.com";
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_FAILURES - 1; i++) recordFailure(key, t0 + i);
    expect(isLockedOut(key, t0 + 10)).toBe(false);
    recordFailure(key, t0 + 10);
    expect(isLockedOut(key, t0 + 11)).toBe(true);
    expect(isLockedOut("login:someone-else@example.com", t0 + 11)).toBe(false);
    expect(isLockedOut(key, t0 + 10 + WINDOW_MS)).toBe(false);
  });

  it("forgets failures after a correct password", () => {
    const key = "delete:guardian-1";
    for (let i = 0; i < MAX_FAILURES; i++) recordFailure(key, 5_000 + i);
    expect(isLockedOut(key, 5_010)).toBe(true);
    clearFailures(key);
    expect(isLockedOut(key, 5_011)).toBe(false);
  });
});
