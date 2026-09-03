# Deployment — Ubuntu VPS

Command-by-command deployment of the supply chain **web dashboard** to the same Ubuntu
server that already runs the API, as a systemd service behind nginx with TLS.

Written for **Ubuntu 22.04 or 24.04**. Every command runs on the VPS unless it says
otherwise. Anything in `ANGLE_BRACKETS` is yours to substitute.

**This guide assumes the API is already deployed.** If it is not, do `backend/DEPLOYMENT.md`
first — this dashboard is useless without it, and it talks to the API over loopback.

> **No Docker here, deliberately.** `next build` peaks at about **1.6 GB of RAM**, and
> building inside Docker adds the daemon and a build container on top. On a small VPS that
> is enough to trigger the kernel's OOM killer, which does not politely fail the build —
> it picks a victim, and the victim may well be PostgreSQL. [Section 5](#5-build-it)
> handles the memory problem head-on. Read it before you build.

> **TLS is not optional.** The session cookie is marked `Secure`, so a browser silently
> discards it over plain HTTP and every login bounces straight back to the login screen
> with no error anywhere. [Section 7](#7-nginx-and-tls) is load-bearing.

---

## Contents

1. [What you need first](#1-what-you-need-first)
2. [How this fits next to the API](#2-how-this-fits-next-to-the-api)
3. [Install Node](#3-install-node)
4. [Get the code onto the server](#4-get-the-code-onto-the-server)
5. [Build it](#5-build-it)
6. [Run it as a service](#6-run-it-as-a-service)
7. [nginx and TLS](#7-nginx-and-tls)
8. [Create the admin accounts](#8-create-the-admin-accounts)
9. [Smoke test](#9-smoke-test)
10. [Day-two operations](#10-day-two-operations)
11. [Shipping a new version](#11-shipping-a-new-version)
12. [Troubleshooting](#12-troubleshooting)
13. [Known gaps to decide on before real users](#13-known-gaps-to-decide-on-before-real-users)

---

## 1. What you need first

- **The API already deployed and healthy** on this machine. Confirm before you start:

  ```bash
  curl http://127.0.0.1:8000/health
  # {"status":"ok"}
  ```

- **A second DNS name with an A record pointing at this VPS.** The API already owns the
  first one. A subdomain is the least disruptive choice — `dashboard.<YOUR_DOMAIN>` —
  because the API's nginx block already claims `<YOUR_DOMAIN>` and serves everything under
  it. TLS issuance in section 7 fails until DNS resolves, and propagation takes time, so
  set this up first.
- **A login account, ufw and nginx**, all set up while deploying the API. This guide
  uses `anakingfaiqal`, the account the API was deployed with.
- **Swap, or 2 GB of genuinely free RAM.** See [section 5](#5-build-it). This is the step
  that bites.

There are **no new secrets**. The dashboard has no database, no signing key and no service
credential of its own. Every secret in the system stays in the API's `.env`.

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
                      │  fwa-dashboard    │   │  fwa_sales_api  │
                      │  systemd, Node    │──▶│  Docker         │──▶ postgres
                      └───────────────────┘   └─────────────────┘
                              over loopback, never the public internet
```

**The dashboard calls the API at `http://127.0.0.1:8000/v1`.** `API_BASE_URL` is read only
by server-side route handlers — it never reaches the browser — so it can be an address
only this machine can resolve. That is the whole point of putting them on one box: a
request for a PO list should not leave the machine, re-enter through the public IP,
terminate TLS a second time and pass through nginx to reach a neighbour.

Running on the host rather than in a container is what makes that literal `127.0.0.1`
work. The API publishes on `127.0.0.1:8000`, which a container cannot reach without
joining its network; a plain systemd process on the host reaches it directly.

**Why the browser still cannot call the API itself.** It has no CORS headers — an
`OPTIONS` preflight returns 405. That is not an oversight to work around: the dashboard
routes every call through its own `/api/upstream` handler, which attaches the bearer token
server-side, so the token lives in an `httpOnly` cookie and never in JavaScript.

---

## 3. Install Node

Next 16 needs **Node 20.9 or newer**. Ubuntu's own packages are older than that, so use
NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Confirm:

```bash
node --version    # v22.x
npm --version
```

---

## 4. Get the code onto the server

The API lives in `/srv/fwa/backend`. Put this beside it. `/srv` belongs to `root`, so
creating the directory takes `sudo` — and then handing it to your own account, or nothing
you do afterwards can write to it:

```bash
sudo mkdir -p /srv/fwa/webapp
sudo chown "$(id -un):$(id -gn)" /srv/fwa/webapp
cd /srv/fwa
```

**From git:**

```bash
git clone <YOUR_REPO_URL> webapp
cd webapp
```

Clone as `anakingfaiqal`, not with `sudo`. A tree owned by `root` cannot be built or
served by the service account.

**Or copy from your machine** (run this on your laptop, not the VPS):

```bash
rsync -avz \
  --exclude 'node_modules' --exclude '.next' --exclude '.env' --exclude '.env.local' \
  D:/FWA_sales/webapp/ anakingfaiqal@<SERVER_IP>:/srv/fwa/webapp/
```

Never copy `node_modules` up. It contains binaries compiled for your laptop's platform,
and `npm ci` on the server takes a minute anyway.

Write the config:

```bash
cd /srv/fwa/webapp
cp .env.example .env
```

The default is already correct for this deployment — the API is on loopback:

```bash
API_BASE_URL=http://127.0.0.1:8000/v1
```

Nothing in this file is secret, so it needs no `chmod`. Worth noticing rather than
glossing over: if the dashboard is ever compromised, an attacker gains the ability to
*reach* the API, not to forge a token for it.

---

## 5. Build it

**This is the step that took the server down, so do the memory work first.**

`next build` peaked at **1.6 GB** in measurement. Add the API and PostgreSQL already
resident and a 2 GB box has nothing left. When Linux runs out of memory it does not fail
the build politely — the OOM killer chooses a process by score and kills it, and a
PostgreSQL backend is a fat, attractive target. That is why the whole machine appeared to
crash rather than just the build.

### Give it swap

Swap is the fix. It is slow, and slow is exactly what you want here: a build that takes
four minutes instead of two beats an outage.

```bash
free -h                    # look at the "Swap" row first — you may already have some
```

If swap is `0B`:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h                    # Swap should now show 4.0Gi
```

The `fstab` line makes it survive a reboot. 4 GB costs nothing but disk and leaves room to
spare; 2 GB is the minimum worth bothering with.

### Cap the heap as well

Swap keeps the machine alive; capping the heap keeps Node from reaching for the swap in
the first place, because V8 collects garbage more aggressively as it approaches its
ceiling.

```bash
cd /srv/fwa/webapp
npm ci
NODE_OPTIONS=--max-old-space-size=1536 npm run build
```

The build runs the type checker and the linter on the way through, so a type error stops
it here rather than shipping a broken dashboard.

Watch it from a second SSH session if you want to see the headroom:

```bash
watch -n1 free -h
```

### If it still will not build

The machine is too small to build on. Build somewhere else and copy the result:

```bash
# On a machine with more RAM, running the same Ubuntu release:
cd /path/to/webapp
npm ci && npm run build
rsync -avz --delete \
  --exclude 'dev' --exclude 'cache' \
  .next/ anakingfaiqal@<SERVER_IP>:/srv/fwa/webapp/.next/
```

The server still needs `npm ci` for the runtime dependencies, but never runs a build.
Match the Ubuntu release and the Node major version: `.next` is portable between
machines, `node_modules` is not, which is why only `.next` is copied.

The two exclusions matter. On a machine that has also run `npm run dev`, `.next` is
mostly Turbopack's development cache — measured here at 1.2 GB of `dev/` and 207 MB of
`cache/` wrapped around about **27 MB** of actual production output. Neither is any use
on a server that only serves, and copying them turns a quick transfer into a long one.

**Disk to allow for:** roughly 640 MB of `node_modules` plus the built output. `npm ci`
is by far the larger half.

---

## 6. Run it as a service

### First, the user and the ownership

The unit ships with `User=anakingfaiqal` — the account the API was deployed with. Confirm
it is yours, and find the group, which is not always the same word:

```bash
id -un && id -gn        # expect: anakingfaiqal  anakingfaiqal
```

If `id -gn` prints something else, edit `Group=` in the unit to match it before copying.

The account has to **own the code directory**. The server writes `.next` while running, so
a tree cloned as `root` is read-only to the service and it will not start:

```bash
sudo chown -R anakingfaiqal:"$(id -gn)" /srv/fwa/webapp
ls -ld /srv/fwa/webapp        # confirm the owner column reads anakingfaiqal
```

`/srv` is owned by `root`, so creating `/srv/fwa/webapp` in [section 4](#4-get-the-code-onto-the-server)
needed `sudo` — which is exactly how a directory ends up owned by the wrong account.
Run the `chown` even if you think you do not need it.

> **If the code lives under `/home` instead** — `/home/anakingfaiqal/webapp`, say — you
> must also delete the `ProtectHome=true` line from the unit. It hides `/home` from the
> service, including the service's own working directory, and the start fails with
> `status=200/CHDIR`, which looks exactly like a permissions problem and is not one. Change
> `WorkingDirectory=`, `EnvironmentFile=` and `ReadWritePaths=` to match the real path too.

### Install it

```bash
sudo cp /srv/fwa/webapp/deploy/fwa-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now fwa-dashboard
```

**Build before you start it.** `ReadWritePaths` names `.next`, and systemd cannot build the
mount namespace for a directory that does not exist — it fails with `status=226/NAMESPACE`,
which also reads like a permissions problem and also is not one.

It runs as `anakingfaiqal` from `/srv/fwa/webapp`, reads `.env`, restarts on failure, and comes
back after a reboot. Check it:

```bash
systemctl status fwa-dashboard
journalctl -u fwa-dashboard -f
```

You are looking for `✓ Ready in …`. `Ctrl+C` stops tailing without stopping the service.

Then prove it is actually serving and can reach the API:

```bash
curl http://127.0.0.1:3000/api/health
# {"status":"ok","service":"fwa-dashboard"}

# The real test — a login round-trips through the dashboard to the API and back:
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"<AN_ADMIN>","password":"<THE_PASSWORD>"}' | head -c 200
```

A `profile` object means the whole path works. If you have not created an admin yet, do
[section 8](#8-create-the-admin-accounts) first — a `401` here with no admin accounts is
expected, not a fault.

> `/api/health` reports the dashboard process only and deliberately does not call the API.
> A health check that fails when its upstream is down turns one outage into two, and
> systemd would restart a perfectly healthy service in a loop while the real problem sat
> elsewhere.

---

## 7. nginx and TLS

The API already has a server block. Add a second one — do **not** edit the API's file.

```bash
sudo nano /etc/nginx/sites-available/fwa-dashboard
```

```nginx
server {
    listen 80;
    server_name dashboard.<YOUR_DOMAIN>;

    # Bulk imports post parsed spreadsheet rows as JSON. A large supply batch is
    # a few megabytes of digits; the default 1 MB would reject it with a 413 the
    # operator cannot interpret.
    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        # Without this the app believes it is on plain HTTP behind the proxy.
        proxy_set_header X-Forwarded-Proto $scheme;

        # A validate-then-submit import is two round trips through the API and
        # the database. State the timeout rather than inheriting it.
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
sudo certbot renew --dry-run
```

Choose the redirect-HTTP-to-HTTPS option. Certbot rewrites the config, adds the TLS block,
and installs a renewal timer alongside the API's.

> **Do not skip this and "add TLS later".** The dashboard sets `Secure` on its session
> cookies whenever `NODE_ENV=production`, which the service sets permanently. Over plain
> HTTP a browser accepts the login response, discards both cookies, and redirects to the
> dashboard — which finds no session and sends the user back to the login screen. Nothing
> appears in the browser console or in the journal. It simply refuses to log anyone in,
> forever.

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
2. **The sidebar matches the role.** A `DP_ADMIN` sees *Purchase Order MSISDN*; an
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

| Task | Command |
|---|---|
| Follow the logs | `journalctl -u fwa-dashboard -f` |
| Last 100 log lines | `journalctl -u fwa-dashboard -n 100 --no-pager` |
| Logs since an hour ago | `journalctl -u fwa-dashboard --since '1 hour ago'` |
| Service status | `systemctl status fwa-dashboard` |
| Restart | `sudo systemctl restart fwa-dashboard` |
| Stop | `sudo systemctl stop fwa-dashboard` |
| Start | `sudo systemctl start fwa-dashboard` |
| Stop it starting at boot | `sudo systemctl disable fwa-dashboard` |
| Memory and swap in use | `free -h` |

**There is nothing here to back up.** The dashboard is stateless: no database, no uploads,
no volume. Every byte it displays lives in the API's PostgreSQL, which the API's backup
script already covers. If this server were lost, restoring the dashboard is `git clone`,
`npm ci`, `npm run build`.

---

## 11. Shipping a new version

```bash
cd /srv/fwa/webapp
git pull
npm ci
NODE_OPTIONS=--max-old-space-size=1536 npm run build
sudo systemctl restart fwa-dashboard
journalctl -u fwa-dashboard -n 30 --no-pager
```

`npm ci` is not optional after a `git pull` that changed `package-lock.json`; skipping it
builds against the previous dependency tree.

There are no migrations and no state, so there is no rollback dance and no ordering
problem with the API. Rolling back is:

```bash
git checkout <PREVIOUS_TAG>
npm ci && NODE_OPTIONS=--max-old-space-size=1536 npm run build
sudo systemctl restart fwa-dashboard
```

> **The build happens in place, while the old version is still serving.** For the couple of
> minutes `npm run build` is running, `.next` is being rewritten underneath a live server,
> which can produce odd errors for anyone using the dashboard at that moment. It recovers
> on restart. Deploy during a quiet window; there are three companies on this thing, not
> three thousand, so this is a real constraint rather than a theoretical one.

Anyone mid-form loses what they typed on restart, but nothing is corrupted: every write is
a single atomic API call carrying an `Idempotency-Key`, so a submission either landed
before the restart or did not happen at all.

**When the API ships a contract change**, regenerate the types before deploying, on your
machine:

```bash
npm run api:types      # rewrites src/lib/api/schema.d.ts from references/openapi.yaml
npm run typecheck
```

If a field the dashboard reads was removed or renamed, `typecheck` fails there rather than
the screen rendering blanks in production. Commit the regenerated file with the change.

---

## 12. Troubleshooting

**The server froze or rebooted during `npm run build`.** Out of memory. Do the swap work in
[section 5](#5-build-it), then check what the kernel killed:

```bash
sudo dmesg -T | grep -i 'killed process'
```

If it names a `postgres` process, restart the API stack and check the database is healthy
before doing anything else.

**Login returns to the login screen with no error.** The cookie is `Secure` and you are on
plain HTTP. Confirm:

```bash
curl -i https://dashboard.<YOUR_DOMAIN>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"<USER>","password":"<PASS>"}' | grep -i set-cookie
```

A `Set-Cookie` carrying `Secure` on an `http://` origin is discarded by every browser and
reported by none. Finish [section 7](#7-nginx-and-tls).

**`ECONNREFUSED 127.0.0.1:8000` in the journal.** The API is not running, or is not
publishing on loopback:

```bash
curl http://127.0.0.1:8000/health
cd /srv/fwa/backend && docker compose -f docker-compose.prod.yml ps
```

**Every page shows empty tables; the sidebar and your name are correct.** The dashboard
reached the API for `GET /admin/me` during server rendering, but the browser's calls are
failing. Check the journal and the browser's network tab for `/api/upstream/…` responses.

**502 Bad Gateway from nginx.** The dashboard is not answering on `127.0.0.1:3000`:

```bash
systemctl status fwa-dashboard
curl http://127.0.0.1:3000/api/health
```

**`Could not find a production build`.** `next start` ran without `.next` present, usually
because the build failed and you restarted the service anyway. Build, then restart.

**The service will not start.** systemd reports these as numeric status codes that all
look alike. Get the real one first:

```bash
systemctl status fwa-dashboard --no-pager -l
journalctl -u fwa-dashboard -n 50 --no-pager
```

| Status | Cause | Fix |
|---|---|---|
| `217/USER` | The `User=` or `Group=` in the unit does not exist — the group often differs from the username | `id -un && id -gn`, then correct the unit |
| `200/CHDIR` | `WorkingDirectory=` is wrong, or it is under `/home` while `ProtectHome=true` | Fix the path, or delete `ProtectHome=true` |
| `226/NAMESPACE` | `ReadWritePaths=` names a directory that does not exist — usually `.next`, because nothing has been built yet | Build first, then start |
| `203/EXEC` | Node is not at `/usr/bin/node` | `which node`, correct `ExecStart` |
| `EACCES` / `EROFS` in the journal | `anakingfaiqal` does not own the code directory | `sudo chown -R anakingfaiqal:"$(id -gn)" /srv/fwa/webapp` |
| `Failed to load environment files` | `EnvironmentFile=` path is wrong, or `.env` is unreadable by the service user | Check the path; `chmod 644 .env` |

After editing the unit file, `sudo systemctl daemon-reload` before restarting — systemd
otherwise keeps running the version it loaded.

**The build fails on a type error.** The generated API types no longer match the code —
usually because the API's contract changed. Regenerate them on your machine
(`npm run api:types`), fix what breaks, and commit. Do not reach for a flag to skip the
type check; it is the only thing standing between a renamed field and a screen full of
blanks.

**Logos or icons are missing, everything else renders.** `public/` did not come across.
Re-run the `rsync` from section 4 without excluding it.

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
the *Buat PO* screen. Find them all before a launch anyone will see:

```bash
grep -rl PLACEHOLDER /srv/fwa/webapp/public/assets/
```

**The "indosat" wordmark in the logo is set in Poppins, not the corporate logotype.** Fine
internally, wrong for anything printed or public-facing.

**No monitoring.** Nothing tells you the dashboard is down except somebody saying so. An
uptime check against `https://dashboard.<YOUR_DOMAIN>/api/health` is the cheapest first
step, and it costs nothing to add alongside the one you should already have on the API.

**Sessions last 30 days.** The refresh-token cookie has a 30-day lifetime, with no idle
timeout and no server-side session list, so a stolen laptop keeps a working dashboard
session for a month. Whether that is acceptable is a business decision — these accounts
can move stock between three companies.
