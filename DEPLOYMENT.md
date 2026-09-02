# Deployment — Ubuntu VPS

Command-by-command deployment of the supply chain **web dashboard** to the same Ubuntu
server that already runs the API, in Docker behind nginx with TLS.

Written for **Ubuntu 22.04 or 24.04**. Every command runs on the VPS unless it says
otherwise. Anything in `ANGLE_BRACKETS` is yours to substitute.

**This guide assumes the API is already deployed.** If it is not, do `backend/DEPLOYMENT.md`
first — this dashboard is useless without it, and section 5 attaches to a Docker network
the API creates.

> **TLS is not optional here.** The session cookie is marked `Secure`, so a browser
> silently discards it over plain HTTP and every login bounces straight back to the login
> screen with no error message. Section 7 is load-bearing. See
> [section 12](#13-troubleshooting) if you meet it anyway.

---

## Contents

1. [What you need first](#1-what-you-need-first)
2. [How this fits next to the API](#2-how-this-fits-next-to-the-api)
3. [Get the code onto the server](#3-get-the-code-onto-the-server)
4. [Find the API's Docker network](#4-find-the-apis-docker-network)
5. [Write `.env`](#5-write-env)
6. [Start the dashboard](#6-start-the-dashboard)
7. [nginx and TLS](#7-nginx-and-tls)
8. [Create the admin accounts](#8-create-the-admin-accounts)
9. [Smoke test](#9-smoke-test)
10. [Day-two operations](#10-day-two-operations)
11. [Shipping a new version](#11-shipping-a-new-version)
12. [Troubleshooting](#12-troubleshooting)
13. [Known gaps to decide on before real users](#13-known-gaps-to-decide-on-before-real-users)

---

## 1. What you need first

- **The API already deployed and healthy** on this machine, per `backend/DEPLOYMENT.md`.
  Confirm before you start:

  ```bash
  curl http://127.0.0.1:8000/health
  # {"status":"ok"}
  ```

- **A second DNS name with an A record pointing at this VPS.** The API already owns the
  first one. A subdomain is the least disruptive choice — `dashboard.<YOUR_DOMAIN>` —
  because the API's nginx block already claims `<YOUR_DOMAIN>` and serves everything under
  it. TLS issuance in section 7 fails until DNS resolves, and propagation takes time, so
  set this up before anything else.
- Docker, the `deploy` user, ufw and nginx — all installed while deploying the API.
  Nothing new to install.
- Roughly 1 GB of free RAM during the build. The image build is the heaviest thing this
  dashboard ever does; at runtime it sits near 150 MB.

There are **no new secrets**. The dashboard holds none of its own — it has no database, no
signing key and no service credential. Every secret in the system stays in the API's
`.env`.

---

## 2. How this fits next to the API

```
                      ┌──────────────────────────────────────────────┐
  browser ──TLS──▶    │  nginx                                       │
                      │    dashboard.<domain>  ─▶ 127.0.0.1:3000     │
                      │    <domain>            ─▶ 127.0.0.1:8000     │
                      └───────────┬──────────────────┬───────────────┘
                                  │                  │
                      ┌───────────▼───────┐   ┌──────▼──────────┐
                      │  fwa_dashboard    │   │  fwa_sales_api  │
                      │  (Next.js)        │──▶│  (FastAPI)      │──▶ postgres
                      └───────────────────┘   └─────────────────┘
                         server-to-server on the API's Docker network,
                         never over the public internet
```

**The dashboard calls the API by container name, not by domain.** `API_BASE_URL` is read
only by server-side route handlers — it never reaches the browser — so it can point at an
address that only this machine can resolve. That is the whole idea behind putting them on
one box: a dashboard request for a PO list should not leave the machine, re-enter through
the public IP, terminate TLS a second time and pass through nginx to reach a neighbour
sitting in the next container.

You might expect `http://127.0.0.1:8000/v1` for that, and if you ran the dashboard
directly on the host that is exactly what you would use. It does **not** work from inside a
container: `127.0.0.1` there is the container itself. Nor does `host.docker.internal` —
the API publishes on `127.0.0.1:8000` only, so it is not listening on the address a
container would reach the host by. Joining the API's own Docker network and addressing
`http://fwa_sales_api:8000/v1` is the arrangement that actually works, and it keeps the
API's port unpublished, which is what you want.

**Why the browser still cannot call the API directly.** It has no CORS headers — an
`OPTIONS` preflight returns 405. That is not an oversight to work around: the dashboard
routes every call through its own `/api/upstream` handler, which attaches the bearer token
server-side so the token lives in an `httpOnly` cookie and never in JavaScript.

---

## 3. Get the code onto the server

The API lives in `/srv/fwa/backend`. Put this beside it:

```bash
cd /srv/fwa
```

**From git:**

```bash
git clone <YOUR_REPO_URL> webapp
cd webapp
```

**Or copy from your machine** (run this on your laptop, not the VPS):

```bash
rsync -avz \
  --exclude 'node_modules' --exclude '.next' --exclude '.env' --exclude '.env.local' \
  D:/FWA_sales/webapp/ deploy@<SERVER_IP>:/srv/fwa/webapp/
```

Never copy `.env.local` up from your development machine — it points at a `localhost` API
that does not exist from inside a container.

---

## 4. Find the API's Docker network

The dashboard joins the network Compose created for the API stack. Its name comes from the
API's project directory, so check rather than assume:

```bash
docker network ls | grep -i default
```

You are looking for something like `backend_default`. Confirm the API container is
actually on it:

```bash
docker network inspect backend_default \
  --format '{{range .Containers}}{{.Name}} {{end}}'
# fwa_sales_db fwa_sales_api
```

If `fwa_sales_api` is not listed, you have the wrong network — try the other candidates
from `docker network ls`.

> **Why join an existing network rather than create a shared one.** You could
> `docker network create` a network and `docker network connect` both containers to it,
> and it would work — until the next API deploy. `up -d --build` recreates the API
> container, the manual connection is not part of its Compose definition, and it is
> silently dropped. The dashboard then cannot reach the API and nobody changed anything in
> this repository. Attaching to the API's own network avoids that: its containers always
> rejoin it.

---

## 5. Write `.env`

```bash
cd /srv/fwa/webapp
cp .env.example .env
nano .env
```

Two values, and nothing else:

```bash
# The API, reachable by container name on the shared network. `fwa_sales_api` is
# the API's container_name, pinned in its docker-compose.prod.yml.
API_BASE_URL=http://fwa_sales_api:8000/v1

# The network you confirmed in section 4.
BACKEND_NETWORK=backend_default
```

`chmod 600` is unnecessary — there is nothing secret in this file. That is worth noticing
rather than glossing over: if this dashboard is ever compromised, an attacker gets the
ability to *reach* the API, not the ability to forge a token for it.

---

## 6. Start the dashboard

```bash
cd /srv/fwa/webapp
docker compose -f docker-compose.prod.yml up -d --build
```

The first build takes several minutes — it installs dependencies, compiles the app, and
runs the type checker and linter along the way. A type error fails the build here rather
than shipping a broken dashboard, which is why the build runs on the server rather than
being uploaded pre-built.

Watch it come up:

```bash
docker compose -f docker-compose.prod.yml logs -f web
```

You are looking for `✓ Ready in …`. `Ctrl+C` stops tailing without stopping the container.

Check it is healthy and reaching the API:

```bash
docker compose -f docker-compose.prod.yml ps
# STATUS should read "Up … (healthy)" within about 30 seconds

curl http://127.0.0.1:3000/api/health
# {"status":"ok","service":"fwa-dashboard"}

# The real test — this proves the container can resolve and reach the API:
docker compose -f docker-compose.prod.yml exec web \
  node -e "fetch('http://fwa_sales_api:8000/health').then(r=>r.text()).then(console.log)"
# {"status":"ok"}
```

If that last command fails, the network binding is wrong. See
[section 12](#12-troubleshooting).

> `/api/health` reports the dashboard process only and deliberately does not call the API.
> A health check that fails when its upstream is down turns one outage into two, and Docker
> would restart a healthy container in a loop while the real problem sat elsewhere.

---

## 7. nginx and TLS

The API already has a server block. Add a second one for the dashboard — do **not** edit
the API's file.

```bash
sudo nano /etc/nginx/sites-available/fwa-dashboard
```

```nginx
server {
    listen 80;
    server_name dashboard.<YOUR_DOMAIN>;

    # Bulk imports post parsed spreadsheet rows as JSON. A 100 000-row supply
    # batch is a few megabytes of digits; the default 1 MB would reject it with
    # a 413 the operator cannot interpret.
    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        # Without this the app believes it is on plain HTTP and will not set the
        # Secure session cookie correctly behind TLS.
        proxy_set_header X-Forwarded-Proto $scheme;

        # A 400-row validate-then-submit import is two round trips through the
        # API and the database. 60s is generous; the default 60s is also fine,
        # but state it rather than inherit it.
        proxy_read_timeout 120s;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/fwa-dashboard /etc/nginx/sites-enabled/fwa-dashboard
sudo nginx -t
sudo systemctl reload nginx
```

Issue the certificate. The A record for `dashboard.<YOUR_DOMAIN>` must already resolve
here:

```bash
sudo certbot --nginx -d dashboard.<YOUR_DOMAIN>
```

Choose the redirect-HTTP-to-HTTPS option. Certbot rewrites the config, adds the TLS block
and installs a renewal timer alongside the API's.

```bash
sudo certbot renew --dry-run
```

> **Do not skip this and "add TLS later".** The dashboard sets `Secure` on its session
> cookies whenever `NODE_ENV=production`, which the image sets permanently. Over plain
> HTTP a browser accepts the login response, discards both cookies, and redirects to the
> dashboard — which finds no session and sends the user back to the login screen. No error
> appears anywhere: not in the browser console, not in the container logs. It simply
> refuses to log anyone in, forever.

---

## 8. Create the admin accounts

**The migrations seed organisations and products, but never people.** An admin account is a
credential, and credentials are not committed to a repository. Until you create them the
dashboard has no users at all and nobody can log in.

They are created with the **API's** CLI, not this repository's — the dashboard has no
database of its own:

```bash
cd /srv/fwa/backend
docker compose -f docker-compose.prod.yml exec api \
  python -m app.scripts.create_admin \
    --username dp.advan \
    --full-name "Atha Marcella" \
    --role DP_ADMIN \
    --org-code ADVAN
```

| Role | `--org-code` | Sees |
|---|---|---|
| `DP_ADMIN` | a `device_partner.code` — `ADVAN`, `RABIT`, `ZTE`, `HKM`, `HUAWEI`, `BANGGA` | only its own POs |
| `MPX_ADMIN` | an `mpx.code` — `MPX-BKL-01`, `MPX-SDA-02` | only its own stock and AEs |
| `IOH_ADMIN` | omit it entirely | all Device Partners, read-only |

`--full-name` is not cosmetic. The dashboard renders it verbatim into every attestation
checkbox — *"Saya, Atha Marcella, mengonfirmasi bahwa…"* — and the API records it as the
`oleh` column of each status-history row, which all three companies read. Use the person's
real name.

The generated password prints **once**. Copy it before closing the terminal; only an
argon2id hash is stored.

You need at least one of each role to walk the chain end to end. Full detail is in
`backend/DEPLOYMENT.md` §7.

---

## 9. Smoke test

From your own machine, not the server:

```bash
curl https://dashboard.<YOUR_DOMAIN>/api/health
# {"status":"ok","service":"fwa-dashboard"}
```

Then open `https://dashboard.<YOUR_DOMAIN>/login` in a browser and sign in as each admin
you created. What you are checking, in order:

1. **Login succeeds and stays succeeded.** Landing back on `/login` means the cookie was
   rejected — you are on HTTP, not HTTPS.
2. **The sidebar matches the role.** A `DP_ADMIN` sees *Purchase Order MSISDN*, a
   `MPX_ADMIN` sees *Stok* and *Account Executive*. It is built from `GET /admin/me`, so a
   correct sidebar proves the dashboard is really talking to the API.
3. **The role guard holds.** As a `DP_ADMIN`, type `dashboard.<YOUR_DOMAIN>/mpx/stock`.
   You should get the 403 page, not a broken screen.
4. **A list loads.** Any populated table proves the whole path: browser → nginx →
   dashboard → `/api/upstream` → API → PostgreSQL.

To exercise the entire supply chain rather than the login screen, run the API's Postman
collection against the API's own domain — it walks a unit from an IOH-issued number to a
salesman's phone and asserts at every hop. See `backend/DEPLOYMENT.md` §9.

---

## 10. Day-two operations

All commands run from `/srv/fwa/webapp`. `-f docker-compose.prod.yml` is required every
time.

| Task | Command |
|---|---|
| Follow the logs | `docker compose -f docker-compose.prod.yml logs -f web` |
| Last 100 log lines | `docker compose -f docker-compose.prod.yml logs --tail 100 web` |
| Service status | `docker compose -f docker-compose.prod.yml ps` |
| Restart | `docker compose -f docker-compose.prod.yml restart web` |
| Stop | `docker compose -f docker-compose.prod.yml down` |
| Start again | `docker compose -f docker-compose.prod.yml up -d` |
| Shell inside the container | `docker compose -f docker-compose.prod.yml exec web sh` |
| Disk reclaimed after a few deploys | `docker image prune -f` |

**There is nothing here to back up.** The dashboard is stateless: no database, no volume,
no uploaded files. Every byte it displays lives in the API's PostgreSQL, which the API's
backup script already covers. If this server burned down, restoring the dashboard is
`git clone` and `up -d --build`.

`docker compose down -v` is harmless here for the same reason — unlike on the API, where
it destroys the database. Do not build the habit.

The container restarts automatically after a reboot (`restart: unless-stopped`).

---

## 11. Shipping a new version

```bash
cd /srv/fwa/webapp
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f web
```

There are no migrations and no state, so there is no rollback dance and no ordering
problem with the API. Rolling back is:

```bash
git checkout <PREVIOUS_TAG>
docker compose -f docker-compose.prod.yml up -d --build
```

Expect a few seconds of downtime while the container restarts. Anyone mid-form loses what
they typed, so prefer a quiet hour — but nothing is corrupted by it: every write is a
single atomic API call carrying an `Idempotency-Key`, so a submission either landed before
the restart or did not happen at all.

**When the API ships a contract change**, regenerate the types before deploying the
dashboard, on your machine:

```bash
npm run api:types      # rewrites src/lib/api/schema.d.ts from references/openapi.yaml
npm run typecheck
```

If a field the dashboard reads was removed or renamed, `typecheck` fails here rather than
the screen rendering `undefined` in production. Commit the regenerated file with the
change.

---

## 12. Troubleshooting

**Login returns to the login screen with no error.** The cookie is `Secure` and you are on
plain HTTP. Confirm with:

```bash
curl -i https://dashboard.<YOUR_DOMAIN>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"<USER>","password":"<PASS>"}' | grep -i set-cookie
```

A `Set-Cookie` carrying `Secure` on an `http://` origin is discarded by every browser and
reported by none. Finish [section 7](#7-nginx-and-tls).

**Every page shows empty tables; the sidebar and your name are correct.** The dashboard
reached the API for `GET /admin/me` during server rendering but the browser's calls are
failing. Check the container logs and the browser's network tab for `/api/upstream/…`
responses.

**`getaddrinfo ENOTFOUND fwa_sales_api` in the logs.** The container is not on the API's
network, or the API container is not running.

```bash
docker network inspect "$(grep BACKEND_NETWORK /srv/fwa/webapp/.env | cut -d= -f2)" \
  --format '{{range .Containers}}{{.Name}} {{end}}'
```

Both `fwa_dashboard` and `fwa_sales_api` must appear. If the dashboard is missing,
`up -d` it again after fixing `BACKEND_NETWORK`; if the API is missing, start the API
stack.

**`network … declared as external, but could not be found`.** `BACKEND_NETWORK` in `.env`
does not match a real network. Redo [section 4](#4-find-the-apis-docker-network).

**502 Bad Gateway from nginx.** The dashboard is not answering on `127.0.0.1:3000`. Check
`curl http://127.0.0.1:3000/api/health` on the server, then the container logs.

**The build fails on `npm run build` with a type error.** The generated API types no longer
match the code — usually because the API's contract changed. Regenerate them on your
machine (`npm run api:types`), fix what breaks, and commit. Do not skip the type check to
get a deploy out; it is the only thing standing between a renamed field and a screen full
of blanks.

**The build runs out of memory on a 1 GB VPS.** Add swap, or build the image elsewhere and
push it to a registry:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Logos or icons are missing, everything else renders.** The image is missing `public/`.
That means a partial build; rebuild with `--no-cache`.

---

## 13. Known gaps to decide on before real users

These are unresolved by design, not oversights. The full list is in the README.

**There is no password-change screen.** The API reports `mustChangePassword` at login and
the dashboard displays a notice, but no endpoint accepts a new password, so nobody can act
on it. Password resets are an out-of-band HQ task: delete the admin and create it again.
Do not create accounts with `--must-change-password`.

**There is no admin user-management screen.** Every account is created with the API's
`create_admin` CLI. That is deliberate for v1 — there is no mockup for one, and no
endpoint behind it.

**Brand and product artwork are placeholders.** The IM3 and 3ID marks are dashed
placeholder boxes and every device image is a generic line drawing, because the real
trademarked assets were never supplied. They are visible to three external companies on
the *Buat PO* screen. Find them before a launch anyone will see:

```bash
grep -rl PLACEHOLDER /srv/fwa/webapp/public/assets/
```

**The "indosat" wordmark in the logo is set in Poppins, not the corporate logotype.**
Fine internally, wrong for anything printed or public.

**No monitoring.** Nothing tells you the dashboard is down except somebody saying so. An
uptime check against `https://dashboard.<YOUR_DOMAIN>/api/health` is the cheapest first
step, and it costs nothing to add alongside the one you should already have on the API.

**Sessions last 30 days.** The refresh-token cookie has a 30-day lifetime and there is no
idle timeout and no server-side session list, so a stolen laptop keeps a working dashboard
session for a month. Whether that is acceptable is a business decision — these accounts
can move stock between three companies.
