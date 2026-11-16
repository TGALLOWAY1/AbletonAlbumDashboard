# Session Starters browser checks

These checks run real Next.js pages and server actions against a local,
in-memory PostgREST/Storage **test double**. They do not touch a Supabase project,
validate SQL/RLS, or prove TikTok availability. Unit tests cover validation;
the migration requires separate PostgreSQL verification.

Start the isolated API in one terminal:

```sh
node tests/support/starter-supabase-server.mjs
```

Start Next in another terminal with fake credentials:

```sh
NEXT_DIST_DIR=.next-qa \
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=qa-anon-key \
SUPABASE_SERVICE_ROLE_KEY=qa-service-key \
node node_modules/next/dist/bin/next dev --port 3100
```

With Playwright and Chromium available, run:

```sh
node tests/session-starters-browser.mjs
```

Optional variables: `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `QA_APP_URL`,
`QA_SUPABASE_URL`, `QA_ARTIFACT_DIR`. Screenshots/results default to
`/tmp/finish-five-qa`. Restart the test-double server before each fresh run.
Do not expose it publicly; its `/__qa/*` endpoints intentionally expose test state.
