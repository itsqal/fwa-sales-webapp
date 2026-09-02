# FWA Supply Chain Web Dashboard

The admin dashboard for the HiFi Air supply chain — the path a device takes from
a phone-number request to a salesman's hands. Three roles, three companies, one
application: **Device Partner**, **IOH**, and **MPX**.

It is upstream of the AE mobile app. Nothing here is visible to a salesman until
an MPX admin allocates a unit; that write sets `fwa_inventory.allocated_ae_id`,
and only then does the AE app's barcode scanner resolve the number.

See `CLAUDE.md` for the rules this codebase is built to, and
`references/openapi.yaml` for the contract of record.

---

## Running it

The dashboard talks to the supply-chain API. Point it at one:

```bash
cp .env.example .env           # API_BASE_URL=http://127.0.0.1:8000/v1
npm install
npm run dev                    # http://localhost:3000
```

To put it on a server, see `DEPLOYMENT.md` — systemd behind nginx, on the same
box as the API.

Seeded logins on a development backend — all with `DevPassword123!`:

| Username | Role | Lands on |
|---|---|---|
| `dp.advan` | `DP_ADMIN` | `/dp/msisdn-po` |
| `ioh.hq` | `IOH_ADMIN` | `/ioh/purchase-order` |
| `mpx.bkl` | `MPX_ADMIN` | `/mpx/purchase-order` |

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run api:types` | Regenerate `src/lib/api/schema.d.ts` from `references/openapi.yaml` |

`src/lib/api/schema.d.ts` is **generated**. Change `references/openapi.yaml` and
re-run `npm run api:types`; never edit it by hand.

---

## How a request reaches the API

The upstream service sends no CORS headers, so the browser cannot call it
directly. Everything goes through this app:

```
browser ──▶ /api/upstream/[...path] ──▶ API_BASE_URL
             attaches the bearer token from an httpOnly cookie,
             refreshes and retries once on a 401
```

- `src/proxy.ts` (Next 16's request interceptor, formerly `middleware.ts`)
  refreshes an expiring access token before a page renders, and sends a
  signed-out browser to `/login`.
- `src/app/api/auth/login` exchanges credentials for tokens and writes them into
  httpOnly cookies. **No token ever reaches JavaScript.**
- `src/lib/api/server.ts` is the only server-side read: `GET /admin/me`, which
  every role guard and the whole sidebar are built from.

Route groups (`/dp`, `/ioh`, `/mpx`) are *organisation*, not authorisation. The
guard is `requireRole()` in each group's `layout.tsx`, checked against the
session — a `DP_ADMIN` who types `/mpx/stock` gets `/403`, not a broken page.

---

## Layout

Sliced by **use case**, not by role. *MSISDN PO* is one feature that two roles
see from two sides — DP creates the request, IOH fulfils it — and they share the
status machine, the table columns and the detail view.

```
src/
  app/            routes only; every screen is a thin page over a feature
  features/       api/ · components/ · index.ts (the public surface)
  components/
    ui/           shadcn primitives — generated, do not edit by hand
    shell/        sidebar, topbar, session context
    domain/       DataTable, WizardModal, StatusBadge, … (see CLAUDE.md §6)
  lib/
    api/          generated types, the browser client, query keys
    status.ts     THE status label and variant maps
    format.ts     idr(), dateId(), truncateMiddle()
    msisdn.ts     62-form normalisation
```

Import from `features/<name>` — never reach into a feature's internals.

---

## Things worth knowing before you change something

- **Status values are API values.** One `statusLabel()` and one
  `statusVariant()`, both in `lib/status.ts`. If a screen needs a state the API
  does not send, that is a backend gap, not a client-side computation.
- **No optimistic status updates.** A PO becomes `DIKIRIM` because the server
  said so. These screens are records of custody between three companies.
- **Bulk import is always validate-then-submit.** The drop zone calls
  `…:validate`, renders the parsed rows, and only then does the confirm button
  call the real endpoint.
- **The attestation names a person.** `ConfirmationCheckbox` renders
  `me.fullName` from the session and gates submit; it is what the server records
  in the status history's *oleh* column.
- **`Idempotency-Key` is generated when a form mounts**, not when it submits, so
  a double-click and a retry share one key.
- Every list is server-paginated. The list endpoints take `page`, `perPage`,
  `status` and `q` — and no sort parameter, which is why column headers carry no
  sort control.

## Known gaps

Carried deliberately, each noted where it bites:

- **No password change.** `AdminAuthTokens.mustChangePassword` exists but no
  endpoint accepts a new password; the login form can only say so.
- **`q` matches the PO code only.** Some mockup placeholders promised more.
- **No sorting and no bulk actions**, because no endpoint supports either.
- **`.xls` is not read.** The only npm package that parses the pre-2007 binary
  format carries two unfixed high-severity advisories, so the drop zone takes
  `.xlsx` and `.csv`.
- **Placeholder artwork.** IM3/3ID logos and device renders are stand-ins;
  `grep -rl PLACEHOLDER public/assets/` finds every one.
