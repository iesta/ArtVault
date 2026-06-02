# 🖼️ ArtVault

Track, value, and share your family's art collection — a private digital catalog.
Add photos, documents, tags, and edition info; export catalog as PDF/XLS/ZIP;
share a read-only gallery with relatives via a private link.

Built with React + Supabase, installable as a PWA, with i18n (FR/EN),
multi-currency (EUR/USD/CNY), and 16 themes.

## Stack

- **Frontend**: React 19, Vite, lucide-react, jsPDF + html2canvas, JSZip, xlsx
- **Backend**: Supabase (PostgreSQL, Auth email/password, Storage)
- **i18n**: French (default) / English, JSON files, runtime switchable
- **Currency**: EUR (default) / USD / CNY, locale-aware formatting
- **Theme**: 16 themes (dark & light), runtime switchable, persisted in localStorage
- **PWA**: Installable on mobile/desktop, offline caching via Workbox

---

## 🚀 Getting Started

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

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Gallery** | Grid / list view with search, multi-field sorting, stats bar, thumbnail column |
| **Add / Edit** | Tabbed form (Infos, Photos, Finance, Dimensions, Documents) |
| **Tags** | Free-form tags per artwork, add/remove inline, filter gallery by tag (AND logic) |
| **Edition** | Track edition number (2/50, EA, HC, etc.) per artwork |
| **URL routing** | Each artwork has a direct URL (`/item/{id}`), browser back/forward works |
| **Prev / Next** | Navigate between artworks in the detail view with `<` `>` arrows (follows current sort/filter) |
| **Photos** | Up to 5 per artwork, auto-compressed (1400px JPEG, 78% quality), camera capture (mobile + desktop webcam) |
| **Documents** | Upload expertise PDFs and certificates of authenticity (max 5 MB each) |
| **Auth** | Email/password login & signup, each user sees only their own collection |
| **i18n** | French & English, switchable via Preferences panel |
| **Multi-currency** | EUR (€), USD ($), CNY (¥) — locale-aware formatting |
| **16 Themes** | Tokyo Night, Nord, Dracula, Gruvbox, Rose Pine, Solarized Light, One Light, GitHub Light, Carbon, and more |
| **Keyboard shortcuts** | `Cmd/Ctrl+S` save, `E` edit, `ESC` return from edit/detail |
| **Export ZIP** | Download all metadata + photos + documents as a single ZIP |
| **Export PDF** | Print-ready A4 catalog with recap table, one artwork per page with photo and metadata |
| **Export XLS** | Spreadsheet export of the full collection (translated headers) |
| **Sharing** | Generate a private link to share a read-only gallery, with optional value visibility |
| **PWA** | Installable on mobile/desktop, works offline (cached assets + Supabase API) |
| **Insurance tracking** | Flag artworks as insured, filterable in gallery |

---

## 📁 Project structure

```
artvault/
├── .env.example                 # Credentials template
├── .gitignore
├── supabase-schema.sql          # SQL to run in Supabase dashboard
├── vite.config.js               # PWA plugin config
├── nginx.conf                   # SPA fallback, no-cache on sw.js
├── package.json
├── index.html                   # PWA meta tags
├── public/
│   ├── icon.svg
│   ├── icon-192x192.png
│   └── icon-512x512.png
└── src/
    ├── main.jsx                 # React entry point
    ├── App.jsx                  # Main app component (all UI, state, keyboard shortcuts)
    ├── Auth.jsx                 # Login / signup screen
    ├── ShareView.jsx            # Public read-only gallery (shared links)
    ├── exportPDF.js             # PDF catalog generator
    ├── supabase.js              # Supabase client init
    ├── themes.js                # 16 theme definitions, ThemeContext, useTheme
    └── i18n/
        ├── index.js             # I18nContext, useI18n, formatCurrency, lang/currency persistence
        ├── fr.json              # French strings (source of truth, ~150 keys)
        └── en.json              # English translations
```

---

## 📤 Export

### ZIP Export

Click the Archive icon in the nav bar to download a ZIP containing:

- `collection.json` — all artwork metadata
- `photos/{id}/` — photos per artwork
- `documents/{id}/` — expertise PDFs and certificates

### PDF Catalog

Click the PDF icon to generate a print-ready A4 catalog with one artwork per page
(photo, title, artist, metadata table, notes) plus a recap table as the first page.

### XLS Spreadsheet

Click the Spreadsheet icon to export the full collection as an `.xlsx` file
with translated column headers and currency-aware date formatting.

---

## 🔐 Security

- Storage buckets are **public** (anyone with the URL can read; only authenticated users can write)
- Row Level Security (RLS) restricts each user to their own records
- The `anon public` key is safe for client-side use — **never** expose the `service_role` key
- Disable email confirmation in Supabase Auth settings for dev/testing
- Shared galleries use a SECURITY DEFINER RPC function (`get_shared_collection`) that bypasses RLS for anonymous users with a valid share token
