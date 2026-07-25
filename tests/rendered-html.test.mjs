import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";
import Database from "better-sqlite3";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const port = 3187;
let server;
let databaseDirectory;
let databasePath;
const webSessionToken = "test_browser_session";
const testUserId = "11111111-1111-4111-8111-111111111111";

before(async () => {
  databaseDirectory = await mkdtemp(join(tmpdir(), "cofounder-exchange-test-"));
  databasePath = join(databaseDirectory, "test.sqlite");
  server = spawn(process.execPath, [".next/standalone/server.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_PATH: databasePath,
      BASE_URL: `http://127.0.0.1:${port}`,
      OIDC_ISSUER_URL: "",
      OIDC_CLIENT_ID: "",
      OIDC_CLIENT_SECRET: "",
    },
    stdio: "pipe",
  });

  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!ready || !server || !databasePath) {
    throw new Error("The standalone Next.js server did not become ready.");
  }

  const bootstrapResponse = await fetch(`http://127.0.0.1:${port}/mcp`);
  if (bootstrapResponse.status !== 401) {
    throw new Error(
      `MCP schema bootstrap returned ${bootstrapResponse.status}: ${await bootstrapResponse.text()}`,
    );
  }
  const database = new Database(databasePath);
  database
    .prepare(
      `INSERT INTO users (id, provider, external_id, email, full_name, location, timezone, bio, skills, links)
       VALUES (?, 'test', ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      testUserId,
      testUserId,
      "founder@example.com",
      "Test Founder",
      "Oakland, CA",
      "Pacific Time",
      "A product-minded founder building careful tools for ambitious teams.",
      JSON.stringify(["Product"]),
      JSON.stringify([]),
    );
  database
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(
      createHash("sha256").update(webSessionToken).digest("base64url"),
      testUserId,
      new Date(Date.now() + 86400000).toISOString(),
    );
  database.close();
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

test("uses the public base URL for authentication redirects", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/auth/login`, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), `http://127.0.0.1:${port}/?auth=unavailable`);
});

test("renders MCP token controls for an authenticated member", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/dashboard`, {
    headers: { cookie: `cofounder_exchange_session=${webSessionToken}` },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /AI access \/ MCP/);
  assert.match(html, /Create access token/);
  assert.match(html, /https:\/\/cofounder\.exchange\/mcp/);
  assert.match(html, /href="\/dashboard#mcp">MCP<\/a>/);
  assert.match(html, /<section id="mcp" class="mcp-panel"/);
});

test("requires a bearer token for the remote MCP endpoint", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "unauthorized-test", version: "1.0.0" },
      },
    }),
  });
  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate") ?? "", /^Bearer /);
});

test("serves authenticated MCP tools and creates an owned project draft", async () => {
  const tokenResponse = await fetch(`http://127.0.0.1:${port}/api/mcp-tokens`, {
    method: "POST",
    headers: {
      cookie: `cofounder_exchange_session=${webSessionToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name: "Protocol test" }),
  });
  assert.equal(tokenResponse.status, 201);
  const tokenResult = await tokenResponse.json();
  assert.match(tokenResult.token, /^cfx_[A-Za-z0-9_-]+$/);

  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${port}/mcp`),
    { requestInit: { headers: { authorization: `Bearer ${tokenResult.token}` } } },
  );
  const client = new Client({ name: "cofounder-exchange-test", version: "1.0.0" });
  await client.connect(transport);
  try {
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((tool) => tool.name).sort(),
      [
        "archive_project",
        "create_project",
        "get_founder_profile",
        "get_project",
        "list_projects",
        "submit_project",
        "update_founder_profile",
        "update_project",
      ],
    );

    const profile = await client.callTool({ name: "get_founder_profile", arguments: {} });
    assert.equal(profile.structuredContent?.profile?.email, "founder@example.com");

    const created = await client.callTool({
      name: "create_project",
      arguments: {
        title: "Protocol-native founder matching",
        oneLiner: "Help serious builders develop and publish better cofounder invitations.",
      },
    });
    assert.equal(created.isError, undefined);
    assert.equal(created.structuredContent?.project?.status, "draft");

    const projects = await client.callTool({ name: "list_projects", arguments: {} });
    assert.equal(projects.structuredContent?.projects?.length, 1);
    assert.equal(
      projects.structuredContent?.projects?.[0]?.title,
      "Protocol-native founder matching",
    );
  } finally {
    await client.close();
  }

  const revokeResponse = await fetch(
    `http://127.0.0.1:${port}/api/mcp-tokens/${tokenResult.record.id}`,
    {
      method: "DELETE",
      headers: { cookie: `cofounder_exchange_session=${webSessionToken}` },
    },
  );
  assert.equal(revokeResponse.status, 200);
  const tokensResponse = await fetch(`http://127.0.0.1:${port}/api/mcp-tokens`, {
    headers: { cookie: `cofounder_exchange_session=${webSessionToken}` },
  });
  const tokensResult = await tokensResponse.json();
  assert.deepEqual(tokensResult.tokens, []);
});
