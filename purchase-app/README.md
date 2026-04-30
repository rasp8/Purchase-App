# Purchase-App

Empty Nuxt 4 scaffold with the same high-level architecture as Finance-App:

- nested Nuxt app under `purchase-app`
- root wrapper scripts for local development and builds
- Nuxt UI, Pinia, and static-generation support
- Supabase client/auth wiring kept in place for later project integration

## Setup

From the repository root:

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Supabase

Supabase is intentionally scaffolded but not connected yet. When you are ready, set:

```bash
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Until those variables are set, the app stays usable as a blank shell and the auth flow remains disabled.
