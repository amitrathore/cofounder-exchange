import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: {
        prepare() {
          throw new Error("The anonymous landing page must not query D1.");
        },
      },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Cofounder Exchange landing page", async () => {
  const response = await render("/");
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
  const response = await render("/explore");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Explore projects is coming next/);
  assert.match(html, /Private contact by design/);
});
