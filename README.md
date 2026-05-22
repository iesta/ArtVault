# ArtVault

Family art collection catalog — React SPA backed by Supabase (Auth + DB + Storage).

## Stack

- **Frontend**: React 19, Vite, lucide-react
- **Backend**: Supabase (PostgreSQL, Auth email/password, Storage)
- **Deployment**: Docker / Nginx / Caddy

---

## 🚀 Development

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # Production build → dist/
```

### Environment variables

Copy `.env.example` and fill it in:

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_key
```

---

## 🗄️ Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. **SQL Editor** → paste `supabase-schema.sql` → **Run** (creates the `artworks` table, Storage buckets, and RLS policies)
3. **Authentication → Settings** → disable `Enable email confirmation`
4. **Authentication → Providers → Email** → should be **Enabled** (default)
5. Get credentials from **Settings → API** (`Project URL` + `anon public key`)

---

## 🐳 Plan A — Docker Deployment (recommended)

### Architecture

```
Caddy (HTTPS) → reverse proxy → Nginx (static files)
```

### Service definition

Add the `artvault` service to your existing `docker-compose.yml`:

```yaml
services:
  artvault:
    build:
      context: https://github.com/iesta/ArtVault.git
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
    expose:
      - 80

  caddy:
    image: caddy:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - artvault

volumes:
  caddy_data:
```

Docker supports **remote build contexts** — it clones the repo from GitHub and runs the Dockerfile inside.

### Caddyfile

```caddy
artvault.ordiman.com {
    reverse_proxy artvault:80
}
```

### .env file (alongside docker-compose.yml)

```
VITE_SUPABASE_URL=https://hlugdicajtbzvqpfrqcv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_EKFfShOBSXF1Xeeq0y64kg_8nI4io5I
```

### Manual Docker build (alternative)

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=sb_publishable_xxx \
  -t artvault:latest .
```

---

## 📦 Plan B — Local build + push dist/

No Docker required. Build locally and upload the `dist/` folder.

### 1. Build

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co \
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx \
npm run build
```

### 2. Upload to server

```bash
rsync -avz --delete dist/ user@vps:/srv/artvault/
# or
scp -r dist/* user@vps:/srv/artvault/
```

### 3. Caddyfile (serves static files directly)

```caddy
artvault.ordiman.com {
    root * /srv/artvault
    file_server
    try_files {path} /index.html
}
```

Restart Caddy: `docker compose restart caddy`

---

## 📁 Project structure

```
artvault/
├── .env.development       # Supabase creds (dev, gitignored)
├── .env.production        # Supabase creds (prod, gitignored)
├── .env.example           # Credentials template for git
├── .gitignore
├── Dockerfile             # Multi-stage build (Node → Nginx)
├── nginx.conf             # Nginx config (SPA fallback + cache)
├── supabase-schema.sql    # SQL to run in Supabase dashboard
├── vite.config.js
├── package.json
├── index.html
└── src/
    ├── main.jsx           # React entry point
    ├── App.jsx            # Main app component
    ├── Auth.jsx           # Login / signup screen
    └── supabase.js        # Supabase client init
```

---

## 📤 Export ZIP

In the gallery, click the Archive icon in the nav bar to download a ZIP containing:

- `collection.json` — all artwork metadata
- `photos/{id}/` — photos per artwork
- `documents/{id}/` — expertise PDFs and certificates

---

## 🔐 Security notes

- Storage buckets are **public** (anyone with the URL can read; only authenticated users can write)
- RLS (Row Level Security) restricts each user to their own records
- The `anon public` key is safe for client-side use — **never** expose the `service_role` key
- Disable email confirmation in Supabase Auth settings for dev/testing
