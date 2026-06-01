# ArtVault

Family art collection catalog — React SPA backed by Supabase (Auth + DB + Storage).

## Stack

- **Frontend**: React 19, Vite, lucide-react, jsPDF + html2canvas, JSZip
- **Backend**: Supabase (PostgreSQL, Auth email/password, Storage)
- **Theme**: Dark mode with cyan accents, responsive

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
| **Gallery** | Grid / list view with search, multi-field sorting, stats bar |
| **Add / Edit** | Tabbed form (Info, Dimensions, Finance, Documents, Photos) |
| **Tags** | Free-form tags per artwork, add/remove inline, filter gallery by tag (AND logic) |
| **Photos** | Up to 5 per artwork, auto-compressed (1400px JPEG, 78% quality), camera capture (mobile + desktop webcam) |
| **Documents** | Upload expertise PDFs and certificates of authenticity (max 5 MB each) |
| **Auth** | Email/password login & signup, each user sees only their own collection |
| **Export ZIP** | Download all metadata + photos + documents as a single ZIP |
| **Export PDF** | Print-ready A4 catalog with recap table, one artwork per page with photo and metadata |
| **Export XLS** | Spreadsheet export of the full collection |
| **Sharing** | Generate a private link to share a read-only gallery, with optional value visibility |
| **PWA** | Installable on mobile/desktop, works offline (cached assets + Supabase API) |
| **Insurance tracking** | Flag artworks as insured, filterable in gallery |

---

## 📁 Project structure

```
artvault/
├── .env.example           # Credentials template
├── .gitignore
├── supabase-schema.sql    # SQL to run in Supabase dashboard
├── vite.config.js
├── package.json
├── index.html
└── src/
    ├── main.jsx           # React entry point
    ├── App.jsx            # Main app component
    ├── Auth.jsx           # Login / signup screen
    ├── ShareView.jsx      # Public read-only gallery (shared links)
    ├── exportPDF.js       # PDF catalog generator
    └── supabase.js        # Supabase client init
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
(photo, title, artist, metadata table, notes).

---

## 🔐 Security

- Storage buckets are **public** (anyone with the URL can read; only authenticated users can write)
- Row Level Security (RLS) restricts each user to their own records
- The `anon public` key is safe for client-side use — **never** expose the `service_role` key
- Disable email confirmation in Supabase Auth settings for dev/testing
