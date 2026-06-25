# Purchase-App

Nuxt 4 purchase tracker with the same Supabase auth boundary as Finance-App:

- server-owned OTP send flow
- client OTP verification
- bearer-token protected Nitro APIs
- user-scoped Supabase access under RLS
- repo-owned Supabase migrations + seed data

## Setup

From the repository root:

```bash
npm install
```

## Development

```bash
npm run dev
```

`npm run dev` is the hosted/default path and reads Supabase values from `.env`. It now binds to `0.0.0.0`, so developers on the same network should use `http://192.168.1.59:3000` instead of `localhost:3000`.

For a single app runner entrypoint, you can also use:

```powershell
.\run-app.ps1 -Mode cloud
```

## Build

```bash
npm run build
```

## Development modes

| Mode | Command | Supabase target | Config source |
| --- | --- | --- | --- |
| Hosted/default | `npm run app:cloud` or `.\run-app.ps1 -Mode cloud` | Hosted Purchase-App project | `.env` |
| Local Docker | `npm run app:local` or `.\run-app.ps1 -Mode local` | Local Supabase | generated `.env.docker` |

`npm run dev` still works for the hosted/default path. `.\dev.ps1` is still available as a backward-compatible alias for local mode.

After local mode has generated `.env.docker`, you can also run `docker compose up --build` directly to restart just the app container against the same local Supabase stack.

## Environment variables

Purchase-App now needs both public browser keys and the server-only service role key:

```bash
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_ANON_KEY=...
NUXT_SUPABASE_SERVICE_ROLE_KEY=...
```

`NUXT_SUPABASE_SERVICE_ROLE_KEY` is required for the `/api/auth/send-code` route and must never be exposed in the browser.

`.env` is intended to hold the hosted/default values. The local Docker path does not require editing `.env`; it writes a Docker-only `.env.docker` file that is already ignored by git.

## Local Supabase workflow

The repo includes Purchase-App migrations plus `supabase/seed.sql` for a local OTP test account.

For the local Docker path:

```powershell
npm run app:local
```

You can also run:

```powershell
.\run-app.ps1 -Mode local
```

That runner:

1. starts the local Supabase stack
2. reads the local API URL and keys from `npx supabase status -o env`
3. rewrites the local API URL to `http://192.168.1.59:54321` so both the browser and the app container use the same LAN-reachable Supabase endpoint
4. writes `.env.docker`
5. starts `docker compose up --build`

If another local Supabase project is already using the default local ports, stop it before running local mode.

Local Supabase uses a custom `auth.email.template.magic_link` template in `supabase/config.toml` so passwordless sign-in emails show only the 6-digit code and do not include a clickable magic link.

For the seeded local user to work, the local Docker env must point at the local Supabase API rather than a hosted project:

```bash
NUXT_PUBLIC_SUPABASE_URL=http://192.168.1.59:54321
NUXT_PUBLIC_SUPABASE_ANON_KEY=<local publishable/anon key>
NUXT_SUPABASE_SERVICE_ROLE_KEY=<local secret/service-role key>
```

If a developer is on a different machine or your LAN IP changes, both `run-app.ps1` and `dev.ps1` accept `-PublicHost <ip>` to override the default `192.168.1.59`.

If `NUXT_PUBLIC_SUPABASE_URL` still looks like `https://<project-ref>.supabase.co`, the app is still using a hosted project and the local seeded account (`test@app.local`) will not exist there unless you created it separately.

Useful Supabase CLI commands:

```bash
npx supabase db reset
npx supabase db diff --linked
```

After a local reset, use the seeded email from `supabase/seed.sql` and read the OTP code from the local Inbucket UI.

For phone testing on the same network, open:

- app: `http://192.168.1.59:3000`
- local Inbucket: `http://192.168.1.59:54324`

Local Supabase must keep email auth enabled for OTP login to work. Purchase-App still gates access in `/api/auth/send-code`, and that route uses `shouldCreateUser: false`, so normal app logins remain limited to provisioned users.

## Hosted Supabase workflow

Purchase-App is intended to use its own hosted Supabase project.

For the hosted/default path, keep `.env` pointed at the hosted project and run:

```bash
npm run app:cloud
```

You can also use `npm run dev` or `.\run-app.ps1 -Mode cloud`.

1. Link the project:

   ```bash
   npx supabase link --project-ref <project-ref>
   ```

2. Pull the current hosted schema before reconciling changes:

   ```bash
   npx supabase db pull
   ```

3. **Before any `db push`, take a backup or otherwise verify the project state.**

4. Apply repo migrations:

   ```bash
   npx supabase db push
   ```

If you want the hosted project to send code-only passwordless emails too, update the hosted **Authentication > Templates > Magic Link** template so it uses `{{ .Token }}` without `{{ .ConfirmationURL }}`. The repo `supabase/config.toml` only controls local development.

5. If you need fresh generated DB types from the hosted project:

   ```bash
   npx supabase gen types typescript --linked
   ```

## Auth model notes

- `/api/auth/send-code` only sends OTP codes to emails that already exist in `auth.users`.
- The login flow uses `shouldCreateUser: false`, so hosted user access must be provisioned ahead of time.
- Purchase-App also expects a matching `public.Profile` row for the signed-in user.
