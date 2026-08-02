# Portal Desa — PDF Worker (VPS)

Renders approved village letters to PDF via Puppeteer-core + system Chromium.
Triggered by the Vercel app via `POST /render` (shared secret auth).

## VPS setup (Ubuntu 22.04)

```bash
# 1. System deps for headless Chromium (Debian/Ubuntu)
sudo apt update
sudo apt install -y chromium-browser fonts-liberation \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2 libatspi2.0-0

# Chromium path check
which chromium || which chromium-browser   # usually /usr/bin/chromium

# 2. Node 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Deploy

```bash
cd worker
npm ci
npm run build        # outputs dist/
cp .env.example .env # then fill in real values (see below)
```

## Env vars (`worker/.env`)

| Var | Value |
|---|---|
| `PORT` | 8080 |
| `WORKER_SECRET` | long random string — same one set in Vercel env `WORKER_SECRET` |
| `SUPABASE_URL` | https://xxx.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `SUPABASE_DB_CONNECTION_STRING` | Supabase → Settings → Database → Connection string (URI) |
| `CHROMIUM_EXECUTABLE_PATH` | `/usr/bin/chromium` (or path from step 1) |

## Run with PM2 (keeps it alive & restarts)

```bash
npm install -g pm2
pm2 start dist/index.js --name portal-worker
pm2 save
pm2 startup   # follow the printed command to enable boot autostart
```

Check logs: `pm2 logs portal-worker` · Status: `pm2 status`

## Verify

```bash
curl http://localhost:8080/health
# → {"ok":true,"uptime":...}

# Trigger a render (from Vercel app, it's automatic). Manual test:
curl -X POST http://localhost:8080/render \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"permohonanId":"<uuid>"}'
```

## Security notes

- `/render` requires `Authorization: Bearer <WORKER_SECRET>`.
- Uses `SUPABASE_SERVICE_ROLE_KEY` + direct Postgres — **never expose** this
  port to the public internet. Put the VPS behind a firewall / reverse proxy
  and only allow the Vercel app's egress IPs, or use a private network.
