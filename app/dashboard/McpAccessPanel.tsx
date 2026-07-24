"use client";

import { useState } from "react";

type TokenRecord = {
  id: string;
  name: string;
  token_hint: string;
  last_used_at: string | null;
  created_at: string;
};

const endpoint = "https://cofounder.exchange/mcp";
const codexConfig =
  `[mcp_servers.cofounder_exchange]\nurl = "${endpoint}"\nbearer_token_env_var = "COFOUNDER_EXCHANGE_TOKEN"`;
const claudeConfig =
  `{\n  "mcpServers": {\n    "cofounder-exchange": {\n      "type": "http",\n      "url": "${endpoint}",\n      "headers": {\n        "Authorization": "Bearer \${COFOUNDER_EXCHANGE_TOKEN}"\n      }\n    }\n  }\n}`;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function McpAccessPanel({ initialTokens }: { initialTokens: TokenRecord[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState("Codex / Claude");
  const [newToken, setNewToken] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setMessage(`${label} copied.`);
  }

  async function createToken() {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/mcp-tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = (await response.json()) as {
        token?: string;
        record?: TokenRecord;
        error?: string;
      };
      if (!response.ok || !result.token || !result.record) {
        setMessage(result.error ?? "Could not create the token.");
        return;
      }
      const record = result.record;
      setNewToken(result.token);
      setTokens((current) => [record, ...current]);
      setMessage("Token created. Copy it now—it will not be shown again.");
    } catch {
      setMessage("The connection was interrupted. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  async function revokeToken(token: TokenRecord) {
    if (!window.confirm(`Revoke “${token.name}”? Connected agents will lose access immediately.`)) return;
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/mcp-tokens/${token.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Could not revoke the token.");
        return;
      }
      setTokens((current) => current.filter((item) => item.id !== token.id));
      setMessage("Token revoked.");
      if (newToken.startsWith(token.token_hint.slice(0, 7))) setNewToken("");
    } catch {
      setMessage("The connection was interrupted. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="mcp-panel" aria-labelledby="mcp-heading">
      <div className="mcp-intro">
        <p className="eyebrow">AI access / MCP</p>
        <h2 id="mcp-heading">Let an agent help shape the invitation.</h2>
        <p>
          Connect Codex, Claude Code, or another MCP client to update your founder profile,
          develop project drafts, submit complete listings, and manage existing projects.
        </p>
        <div className="mcp-safety">
          <strong>Your token acts as you.</strong>
          <p>Keep it private. Tokens are stored hashed, shown once, and can be revoked at any time.</p>
        </div>
      </div>

      <div className="mcp-controls">
        <div className="token-create">
          <label>
            <span>Connection name</span>
            <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
          </label>
          <button className="button button-primary" type="button" disabled={working} onClick={createToken}>
            {working ? "Working…" : "Create access token"}
          </button>
        </div>

        {message && <p className="mcp-message" role="status">{message}</p>}

        {newToken && (
          <div className="new-token">
            <div>
              <strong>Copy this token now</strong>
              <small>It cannot be recovered after you leave this page.</small>
            </div>
            <code>{newToken}</code>
            <button type="button" onClick={() => copy(newToken, "Token")}>Copy token</button>
          </div>
        )}

        <div className="mcp-configs">
          <details>
            <summary>Connect Codex</summary>
            <p>Set the token in your shell, then add this to <code>~/.codex/config.toml</code>:</p>
            <pre><code>{codexConfig}</code></pre>
            <button type="button" onClick={() => copy(codexConfig, "Codex config")}>Copy config</button>
          </details>
          <details>
            <summary>Connect Claude Code</summary>
            <p>Set the same environment variable, then add this server to <code>.mcp.json</code>:</p>
            <pre><code>{claudeConfig}</code></pre>
            <button type="button" onClick={() => copy(claudeConfig, "Claude config")}>Copy config</button>
          </details>
        </div>

        <div className="token-list">
          <div className="token-list-heading">
            <strong>Active tokens</strong>
            <span>{tokens.length}</span>
          </div>
          {tokens.length ? tokens.map((token) => (
            <div className="token-row" key={token.id}>
              <div>
                <strong>{token.name}</strong>
                <code>{token.token_hint}</code>
                <small>
                  {token.last_used_at
                    ? `Last used ${formatDate(token.last_used_at)}`
                    : `Created ${formatDate(token.created_at)}`}
                </small>
              </div>
              <button type="button" disabled={working} onClick={() => revokeToken(token)}>Revoke</button>
            </div>
          )) : <p className="token-empty">No AI connections yet.</p>}
        </div>
      </div>
    </section>
  );
}
