import { afterAll, describe, expect, it } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

/** A copy of the migrations folder that stops before the migration with this tag. */
function migrationsBefore(tag: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "migrations-"));
  cpSync(path.join(process.cwd(), "drizzle"), dir, { recursive: true });
  const journalPath = path.join(dir, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: Array<{ tag: string }> };
  const stop = journal.entries.findIndex((e) => e.tag === tag);
  expect(stop).toBeGreaterThan(0);
  writeFileSync(journalPath, JSON.stringify({ ...journal, entries: journal.entries.slice(0, stop) }));
  return dir;
}

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("upgrading an existing database", () => {
  it("moves earlier diagnoses to 수와 연산 and keeps diagnoses in progress", async () => {
    const old = migrationsBefore("0002_domains");
    dirs.push(old);
    const client = new PGlite();
    const db = drizzle({ client });
    await migrate(db, { migrationsFolder: old });

    const guardian = "00000000-0000-4000-8000-000000000001";
    const diagnosed = "00000000-0000-4000-8000-000000000002";
    const fresh = "00000000-0000-4000-8000-000000000003";
    await client.exec(`
      INSERT INTO guardians (id, email, password_hash) VALUES ('${guardian}', 'old@example.com', 'x');
      INSERT INTO students (id, guardian_id, nickname, grade, semester, diagnosed_at) VALUES
        ('${diagnosed}', '${guardian}', '옛날', 4, 2, '2026-09-01T00:00:00Z'),
        ('${fresh}', '${guardian}', '새싹', 2, 1, NULL);
      INSERT INTO learning_sessions (student_id, kind, state) VALUES ('${fresh}', 'diagnosis', '{}'), ('${diagnosed}', 'learning', '{}');
    `);

    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

    const diagnoses = await client.query<{ student_id: string; domain: string; diagnosed_at: Date }>("SELECT student_id, domain, diagnosed_at FROM diagnoses");
    expect(diagnoses.rows).toHaveLength(1);
    expect(diagnoses.rows[0]).toMatchObject({ student_id: diagnosed, domain: "NUM_OPS" });
    expect(diagnoses.rows[0].diagnosed_at.toISOString()).toBe("2026-09-01T00:00:00.000Z");

    const sessions = await client.query<{ kind: string; domain: string | null }>("SELECT kind, domain FROM learning_sessions ORDER BY kind");
    expect(sessions.rows).toEqual([
      { kind: "diagnosis", domain: "NUM_OPS" },
      { kind: "learning", domain: null },
    ]);

    const columns = await client.query<{ column_name: string }>("SELECT column_name FROM information_schema.columns WHERE table_name = 'students'");
    expect(columns.rows.map((c) => c.column_name)).not.toContain("diagnosed_at");
    await client.close();
  }, 60_000);
});
