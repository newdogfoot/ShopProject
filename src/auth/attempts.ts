/**
 * Limits password guessing: after 5 wrong passwords for the same account within
 * 15 minutes, further tries are refused until the window passes.
 * Kept in memory, so it covers one server process; a multi-server deployment
 * should move this to a shared store (for example the database or Redis).
 */
export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60_000;

const store = globalThis as unknown as { __passwordFailures?: Map<string, number[]> };

function recent(key: string, now: number): number[] {
  const map = (store.__passwordFailures ??= new Map<string, number[]>());
  const list = (map.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length > 0) map.set(key, list);
  else map.delete(key);
  return list;
}

export function isLockedOut(key: string, now = Date.now()): boolean {
  return recent(key, now).length >= MAX_FAILURES;
}

export function recordFailure(key: string, now = Date.now()): void {
  const list = recent(key, now);
  store.__passwordFailures!.set(key, [...list, now]);
}

export function clearFailures(key: string): void {
  store.__passwordFailures?.delete(key);
}

export const LOCKED_OUT_MESSAGE = "비밀번호를 여러 번 틀려서 잠시 막아 두었어요. 15분 뒤에 다시 시도해 주세요.";
