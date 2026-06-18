# ArtVault — Agent Guide

Private digital catalog for family art collection. Track artworks, photos, documents, tags, edition, insurance, financial values. Export PDF/XLS/ZIP. Share read-only gallery via private link. PWA installable. Bilingual FR/EN, multi-currency EUR/USD/CNY, 16 themes.

GitHub: https://github.com/iesta/ArtVault

---

## Stack

| Layer | Library |
|-------|---------|
| UI | React 19, react-dom 19 |
| Bundler | Vite 6 |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Charts | recharts 3 |
| Icons | lucide-react |
| PDF | jspdf + html2canvas |
| ZIP | jszip |
| XLS | xlsx |
| PWA | vite-plugin-pwa (Workbox) |

No external state lib. No CSS framework. No React Router.

---

## Architecture

### State Management
All state in `App.jsx` root component. Pure React: `useState`, `useRef`, `useCallback`, `useEffect`. Derived/computed values inline: `filtered`, `totalCurrent`, `insuredCount`, `prevWork`, `nextWork`.

### Routing
Manual `screen` state (`"gallery"`|`"form"`|`"detail"`|`"charts"`). URL sync via `window.history.replaceState()` (not pushState). `popstate` listener reconstructs screen. Paths: `/item/{id}`, `/charts`, `/share/{token}`.

### i18n
`I18nContext` provides `{ t, lang, setLang, currency, setCurrency, fmt }`. JSON files (`fr.json` source of truth, `en.json` mirror). `t(key, vars?)` falls back to French, then raw key. `formatCurrency()` standalone (works in non-React contexts like PDF/ShareView).

### Theming
`ThemeContext` provides `T` object with all colors. 16 themes (10 dark, 6 light). Tokyo Night default. Persisted to localStorage.

### Auth
Supabase Auth email/password. `getSession()` on mount + `onAuthStateChange` subscription. `<Auth />` shown when no session (also wrapped in ThemeContext + I18nContext).

### Data Flow
```
Supabase DB → works state → filtered (search + sort) → Gallery/Detail/Charts render
                                                 ↓
                    Edit → form state → handleSave → upsert Supabase → update works state
```

---

## File Map

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root component. All UI, state, handlers, keyboard shortcuts, modals (~2150 lines) |
| `src/Auth.jsx` | Login/signup screen |
| `src/ChartsPage.jsx` | Charts dashboard (5 recharts charts) |
| `src/ShareView.jsx` | Public read-only gallery via share link |
| `src/exportPDF.js` | PDF catalog generator (sync i18n) |
| `src/supabase.js` | Supabase client, `photoURL()`, `docURL()` |
| `src/themes.js` | 16 theme definitions, ThemeContext, useTheme |
| `src/i18n/index.js` | I18nContext, useI18n, formatCurrency, lang/currency persistence |
| `src/i18n/fr.json` | French strings (~240 keys, source of truth) |
| `src/i18n/en.json` | English translations (~240 keys) |
| `src/main.jsx` | Entry point |
| `supabase-schema.sql` | DB schema, RLS, RPC, storage buckets |
| `vite.config.js` | Vite + PWA plugin config |
| `nginx.conf` | SPA fallback, immutable cache, sw.js no-cache |
| `Dockerfile` | Multi-stage build (node → nginx) |

---

## Conventions

### Code
- Functional components only, hooks at top
- Inline styles exclusively, colors from theme object `T`
- State: `[thing, setThing]`. Helpers: `camelCase`. Components: `PascalCase.jsx`. Utilities: `camelCase.js`
- Small reusable UI components defined at module level in App.jsx: `Btn`, `Label`, `Field`, `Input`, `Select`, `Textarea`
- CSS classes sparingly: `.art-card`, `.tab-btn`, `.ghost-btn`, `.menu-item`, `.desk-only`, `.mob-only`, `.tb-hide`, `.resp-cols`, `.menu-hamburger`

### i18n Keys
Dot-separated namespaced: `auth.login_title`, `form.artist_label`, `menu.export_pdf`, `detail.finance_current_value`, `charts.value_by_technique`, `crop.confirm`, `sort.value_purchase`, `xls.col_edition`, `stats.total_value`.

### Form ↔ DB Mapping
DB columns: `snake_case` (`date_work`, `location_storage`, `is_insured`, `value_purchase`). Form state: `camelCase`. Mapped via `formToDB()` and `dbToForm()` constants.

### Git Commits
Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`.

---

## Critical Gotchas

### Currency Fields Are TEXT
`value_purchase` and `value_current` are `TEXT` columns. Sorting requires numeric coercion:
```js
if (sortField === "value_current" || sortField === "value_purchase") {
  return sortDir === "asc" ? (+va || 0) - (+vb || 0) : (+vb || 0) - (+va || 0);
}
```

### Photos as JSONB Array
`photos` column: `[{name, path}]`. Path used with `photoURL(path)` → Supabase Storage public URL. Expertise/certificate are JSONB `{name, path}` or null.

### Crop Canvas Taint
Crop tool fetches image as blob, creates `URL.createObjectURL(blob)`, draws to canvas. Avoids CORS taint from `<img crossOrigin>`.

### URL Uses replaceState
`window.history.replaceState()` everywhere (not pushState). Single back-button-press from detail/charts to gallery.

### Keyboard Shortcut Refs
Handlers use refs (`screenRef`, `handleSaveRef`, etc.) updated every render to avoid stale closures in `useEffect`:
```js
const screenRef = useRef(screen);
screenRef.current = screen;
```

### Stale Closure Risk in Native Event Handlers
Document-level event handlers (crop drag) use `useRef` not `useState` for flags that change during events. State updates from native events may not be committed before next user interaction.

### PDF Export Uses Sync i18n
`exportPDF.js` imports JSON directly, uses `loadLang()`/`loadCurrency()` at module scope. Not connected to React context — uses persisted values only.

### French Is Source of Truth
App defaults to French. `t()` falls back to French if key missing in current language. All new i18n keys added to `fr.json` first, then `en.json`.

### Photo Limit
Max 5 photos per artwork (`fPhotos.length < 5`).

---

## DB Schema

### `artworks` table

| Column | Type | Default |
|--------|------|---------|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID NOT NULL | → auth.users(id) ON DELETE CASCADE |
| artist | TEXT NOT NULL | '' |
| title | TEXT NOT NULL | '' |
| technique | TEXT | '' |
| edition | TEXT | '' |
| date_work | TEXT | '' |
| date_purchase | TEXT | '' |
| location_purchase | TEXT | '' |
| value_purchase | TEXT | '' |
| value_current | TEXT | '' |
| location_storage | TEXT | '' |
| width | TEXT | '' |
| height | TEXT | '' |
| depth | TEXT | '' |
| dimension_unit | TEXT | 'cm' |
| is_insured | BOOLEAN | false |
| notes | TEXT | '' |
| photos | JSONB | '[]' |
| expertise | JSONB | NULL |
| certificate | JSONB | NULL |
| tags | TEXT[] | '{}' |
| created_at | TIMESTAMPTZ | now() |
| updated_at | TIMESTAMPTZ | now() |

### `share_links` table
`id` UUID PK, `user_id` UUID FK, `token` TEXT UNIQUE, `show_values` BOOLEAN, `created_at` TIMESTAMPTZ.

### RPC: `get_shared_collection(token)`
SECURITY DEFINER, bypasses RLS. Returns `{show_values, artworks}`. GRANT EXECUTE TO anon.

### Storage Buckets
`artwork-photos` (public), `artwork-documents` (public).

### RLS
- artworks: all operations check `auth.uid() = user_id`
- share_links: SELECT true (anyone), INSERT/DELETE auth.uid() = user_id
- storage objects: SELECT public, INSERT/DELETE authenticated

---

## Key App.jsx State

### Auth/Loading
- `session` (object|null, null) — Supabase session
- `authLoading` (bool, true) — auth check in progress
- `loading` (bool, true) — artworks loading

### Data
- `works` (array, []) — all artworks
- `thumbs` (object, {}) — `{id: thumbnailURL}` map

### Screen
- `screen` (string, "gallery") — `gallery`|`form`|`detail`|`charts`

### Gallery
- `gridMode` (bool, true) — grid/list toggle
- `search` (string, "")
- `selectedTags` (array, []) — active tag filters (AND)
- `showTagFilter` (bool, false)
- `sortField` (string, "artist")
- `sortDir` (string, "asc")

### Form
- `editWork` (object|null, null) — null = add new
- `form` (object, BLANK) — current field values
- `formTab` (string, "info")
- `fPhotos` (array, []) — with `_saved` flag
- `fExp`/`fAtt` (object|null, null)
- `fTags` (array, [])
- `saving` (bool, false)
- `fileErr` (string, "")

### Detail
- `detWork` (object|null, null)
- `dPhotos` (array, [])
- `pIdx` (number, 0) — photo index
- `delModal` (bool, false)

### Fullscreen/Crop
- `fullscreenPhoto` (string|null, null)
- `cropMode` (bool, false)
- `cropRect` (object|null, null) — `{x, y, w, h}` in natural coords
- `dragRef` (useRef, false)
- `cropRectRef` (useRef, null)
- `cropActionRef` (useRef, null) — `"create"`|`"move"`
- `cropOffRef` (useRef, `{dx:0, dy:0}`)
- `cropImgRef` (useRef, null)

### Misc
- `menuOpen`/`prefPanel`/`shareDialog`/`iosInstallModal`/`delModal` (bool, false)
- `exporting`/`pdfLoading`/`xlsLoading` (bool, false)
- `deferredPrompt` (object|null, null) — PWA install prompt
- `cameraOpen` (bool, false)

---

## Commands

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # → dist/
npm run preview          # serve dist/

docker build -t artvault --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL --build-arg VITE_SUPABASE_ANON_KEY=... .
docker run -p 8080:80 artvault
```

Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

---

## Patterns for Common Tasks

### Add a new screen
1. Add screen value to `screen` state type (comment)
2. Add nav bar subtitle in right-nav area
3. Add menu items in hamburger (gallery/detail/charts sections)
4. Add routing in URL sync effect + popstate handler + direct navigation effect
5. Render component conditionally `{screen === "newScreen" && <Component />}`
6. Add i18n keys to both JSON files

### Add i18n keys
1. Add to `fr.json` first
2. Mirror in `en.json`
3. Use `t("key")` in JSX, `t("key", {var})` for interpolation

### Add a theme
1. Add object to `themes` export in `src/themes.js`
2. Add entry to `themeLabels` and `themeGroups`
3. Follow existing structure: `{ mode, bg, s1, s2, s3, border, accent, cream, dim, dim2, green, red, cyan, blue }`
