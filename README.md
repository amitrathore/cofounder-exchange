# Cofounder.Exchange

> Find the person who changes the build.

The first marketplace surface for the Cofounder community: founders list what
they are building, the cofounder they need, and what they are ready to offer in
exchange.

## Product surfaces

- Public editorial landing page
- Log in with Intergraph through the shared Clerk OIDC tenant
- Guided founder and project listing flow
- Private owner dashboard with drafts and review status
- Trust-and-completeness moderation queue
- Explore Projects preview for the next release

## Local development

Copy `.env.example` to `.env.local`, provide the shared Clerk OAuth client
values, then run:

```bash
npm install
npm run dev
```

The OAuth client must register both local and production callbacks:

- `http://localhost:3000/auth/callback` (or the local port in use)
- `https://cofounder.exchange/auth/callback`

## Data

Structured product data and application sessions use SQLite. Local development
defaults to `./data/cofounder-exchange.sqlite`; Fly mounts the production
database at `/data/cofounder-exchange.sqlite`.

Generate schema migrations after changes with:

```bash
npm run db:generate
```

## Fly deployment

The production image uses Next.js standalone output, listens on
`0.0.0.0:8080`, and mounts the `cofounder_exchange_data` volume at `/data`.

```bash
fly deploy
```

## Remote MCP API

Signed-in members can create and revoke personal MCP access tokens from their
dashboard. Tokens are shown once, stored as SHA-256 hashes, and authorize only
that member's founder profile and projects.

The production Streamable HTTP endpoint is:

```text
https://cofounder.exchange/mcp
```

It exposes tools to read and update the founder profile; list, read, create,
and update project drafts; explicitly submit a complete project for review;
and archive a project. Configure clients to send the dashboard token as an
`Authorization: Bearer …` header.

Codex configuration:

```toml
[mcp_servers.cofounder_exchange]
url = "https://cofounder.exchange/mcp"
bearer_token_env_var = "COFOUNDER_EXCHANGE_TOKEN"
```

Claude Code project configuration:

```json
{
  "mcpServers": {
    "cofounder-exchange": {
      "type": "http",
      "url": "https://cofounder.exchange/mcp",
      "headers": {
        "Authorization": "Bearer ${COFOUNDER_EXCHANGE_TOKEN}"
      }
    }
  }
}
```
