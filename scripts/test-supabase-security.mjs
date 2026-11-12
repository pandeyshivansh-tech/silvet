/**
 * Real PostgreSQL migration/RLS tests in a disposable local cluster.
 * Requires PostgreSQL 15+ tools on PATH. Never uses project DB URLs or secrets.
 * Supabase Auth/Storage HTTP services are not simulated; see supabase/README.md.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join, resolve } from "node:path";

const root = mkdtempSync(join(tmpdir(), "silvet-sql-"));
const data = join(root, "data");
const socket = join(root, "socket");
const log = join(root, "postgres.log");
const port = String(40000 + Math.floor(Math.random() * 20000));
let started = false;
const run = (tool, args) => execFileSync(tool, args, { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] });
try {
  mkdirSync(socket, { mode: 0o700 });
  run("initdb", ["-D", data, "--auth=trust", "--no-locale", "--encoding=UTF8"]);
  run("pg_ctl", ["-D", data, "-l", log, "-o", `-F -k ${socket} -p ${port} -c listen_addresses=''`, "-w", "start"]);
  started = true;
  const psql = ["-X", "-h", socket, "-p", port, "-U", userInfo().username, "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
  run("psql", [...psql, "-f", resolve("supabase/tests/bootstrap.sql")]);
  const migrations = readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql")).sort();
  for (const migration of migrations) {
    run("psql", [...psql, "-f", resolve("supabase/migrations", migration)]);
    console.log(`APPLIED locally: ${migration}`);
  }
  let total = 0;
  for (const testFile of ["rls.sql", "atomic_outfits.sql"]) {
  const output = spawnSync("psql", [...psql, "-f", resolve("supabase/tests", testFile)], {
    encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"],
  });
  if (output.error || output.status !== 0) throw output.error ?? new Error(output.stderr);
  const assertions = output.stderr.split("\n").filter((line) => line.includes("NOTICE:  PASS:"));
  assertions.forEach((line) => console.log(line.slice(line.indexOf("PASS:"))));
  const assertionCount = assertions.length;
  const expected = (readFileSync(resolve("supabase/tests", testFile), "utf8").match(/select tests\.(?:ok|denied)\(/g) ?? []).length;
  if (assertionCount !== expected) throw new Error(`Expected ${expected} SQL assertions, observed ${assertionCount}.`);
  total += assertionCount;
  }
  console.log(`PASS: ${migrations.length} migrations and ${total} SQL security/schema assertions in isolated PostgreSQL.`);
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  if (started) console.error(readFileSync(log, "utf8").split("\n").slice(-8).join("\n"));
  process.exitCode = 1;
} finally {
  if (started) {
    try { run("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"]); }
    catch { console.error("Failed to stop the local test PostgreSQL process."); process.exitCode = 1; }
  }
  rmSync(root, { recursive: true, force: true });
}
