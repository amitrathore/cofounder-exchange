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

Structured product data and application sessions use the Sites-managed D1
binding named `DB`. Generate schema migrations after changes with:

```bash
npm run db:generate
```
