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
