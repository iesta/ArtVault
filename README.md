# ArtVault

Catalogue de collection d'art familial — React SPA avec Supabase (Auth + DB + Storage).

## Stack

- **Frontend** : React 19, Vite, lucide-react
- **Backend** : Supabase (PostgreSQL, Auth email/password, Storage)
- **Déploiement** : Docker / Nginx / Caddy

---

## 🚀 Développement

```bash
# Installer les dépendances
npm install

# Lancer le serveur de dev (http://localhost:5173)
npm run dev

# Build de production
npm run build
```

### Variables d'environnement

Copier le fichier `.env.example` et le renseigner :

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_votre_cle
```

---

## 🗄️ Supabase — Configuration initiale

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans le **SQL Editor**, exécuter `supabase-schema.sql` (crée la table `artworks`, les buckets Storage et les règles RLS)
3. **Authentication → Settings** → désactiver `Enable email confirmation`
4. **Authentication → Providers → Email** → activé (par défaut)
5. Récupérer les credentials dans **Settings → API** (`Project URL` et `anon public key`)

---

## 🐳 Plan A — Déploiement Docker (recommandé)

### Architecture

```
Caddy (HTTPS) → reverse proxy → Nginx (fichiers statiques)
```

### Build de l'image

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=sb_publishable_xxx \
  -t artvault:latest .
```

### docker-compose.yml

```yaml
services:
  artvault:
    build:
      context: ./artvault
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

### Caddyfile

```caddy
artvault.ordiman.com {
    reverse_proxy artvault:80
}
```

---

## 📦 Plan B — Build local + push dist/

Alternative sans Docker : builder localement et copier le dossier `dist/` sur le serveur.

### 1. Builder

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co \
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx \
npm run build
```

### 2. Copier sur le serveur

```bash
# Avec rsync (recommandé)
rsync -avz --delete dist/ user@vps:/srv/artvault/

# Ou avec scp
scp -r dist/* user@vps:/srv/artvault/
```

### 3. Serveur — Caddyfile

Caddy sert directement les fichiers statiques :

```caddy
artvault.ordiman.com {
    root * /srv/artvault
    file_server
    try_files {path} /index.html
}
```

Redémarrer Caddy : `docker compose restart caddy`

---

## 📁 Structure du projet

```
artvault/
├── .env.development       # Variables Supabase (dev, ignoré par git)
├── .env.production        # Variables Supabase (prod, ignoré par git)
├── .env.example           # Template des variables
├── .gitignore
├── Dockerfile             # Multi-stage build
├── nginx.conf             # Config Nginx (SPA fallback + cache)
├── supabase-schema.sql    # SQL à exécuter dans Supabase
├── vite.config.js
├── package.json
├── index.html
└── src/
    ├── main.jsx           # Point d'entrée React
    ├── App.jsx            # Composant principal
    ├── Auth.jsx           # Écran login/signup
    └── supabase.js        # Client Supabase
```

---

## 📤 Export ZIP

Dans la galerie, cliquer sur l'icône Archive dans la barre de navigation pour télécharger un ZIP contenant :

- `collection.json` — toutes les métadonnées
- `photos/{id}/` — les photos de chaque œuvre
- `documents/{id}/` — les PDFs d'expertise et certificats

---

## 🔐 Sécurité

- Les buckets Storage sont en mode **public** (lecture sans auth, écriture réservée aux utilisateurs authentifiés)
- La RLS (Row Level Security) restreint chaque utilisateur à ses propres données
- La clé `anon public` est destinée au client — ne **jamais** exposer la `service_role` key
- Les emails de confirmation peuvent être désactivés en dev (Auth → Settings)
