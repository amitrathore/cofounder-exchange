import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";

const port = 3187;
let server;
let databaseDirectory;

before(async () => {
  databaseDirectory = await mkdtemp(join(tmpdir(), "cofounder-exchange-test-"));
  server = spawn(process.execPath, [".next/standalone/server.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_PATH: join(databaseDirectory, "test.sqlite"),
      BASE_URL: `http://127.0.0.1:${port}`,
    },
    stdio: "pipe",
  });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("The standalone Next.js server did not become ready.");
});

after(async () => {
  server?.kill("SIGTERM");
  if (databaseDirectory) await rm(databaseDirectory, { recursive: true, force: true });
});

test("server-renders the Cofounder Exchange landing page", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Cofounder\.Exchange/);
  assert.match(html, /Find the person who changes the build/);
  assert.match(html, /List your project/);
  assert.match(html, /Log in with Intergraph/);
  assert.match(html, /Explore is coming next/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/);
});

test("renders the Explore coming-next surface without authentication", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/explore`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Explore projects is coming next/);
  assert.match(html, /Private contact by design/);
});

test("redirects protected listing routes to Intergraph login", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/list-project`, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") ?? "", /^\/auth\/login\?return_to=/);
});
