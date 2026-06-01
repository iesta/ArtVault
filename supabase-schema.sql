-- ═══════════════════════════════════════════════════════════════════
-- ArtVault — Schéma Supabase
-- À exécuter dans Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════

-- 1. Table artworks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  technique TEXT DEFAULT '',
  date_work TEXT DEFAULT '',
  date_purchase TEXT DEFAULT '',
  location_purchase TEXT DEFAULT '',
  value_purchase TEXT DEFAULT '',
  value_current TEXT DEFAULT '',
  location_storage TEXT DEFAULT '',
  width TEXT DEFAULT '',
  height TEXT DEFAULT '',
  depth TEXT DEFAULT '',
  dimension_unit TEXT DEFAULT 'cm',
  is_insured BOOLEAN DEFAULT false,
  notes TEXT DEFAULT '',
  photos JSONB DEFAULT '[]'::jsonb,
  expertise JSONB DEFAULT NULL,
  certificate JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Row Level Security ───────────────────────────────────────────
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own artworks"
  ON artworks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own artworks"
  ON artworks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artworks"
  ON artworks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own artworks"
  ON artworks FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Storage buckets (public) ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('artwork-photos', 'artwork-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('artwork-documents', 'artwork-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies ─────────────────────────────────────────────
CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artwork-photos');

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'artwork-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'artwork-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artwork-documents');

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'artwork-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'artwork-documents' AND auth.role() = 'authenticated');

-- 5. Share links ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  show_values BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view share links"
  ON share_links FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own share links"
  ON share_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own share links"
  ON share_links FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RPC function for shared collection (bypass RLS, called by anon) ─
CREATE OR REPLACE FUNCTION get_shared_collection(token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  share_user_id uuid;
  share_show_vals boolean;
  result jsonb;
BEGIN
  SELECT sl.user_id, sl.show_values INTO share_user_id, share_show_vals
  FROM share_links sl WHERE sl.token = get_shared_collection.token;

  IF share_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  SELECT jsonb_build_object(
    'show_values', share_show_vals,
    'artworks', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'artist', a.artist,
        'title', a.title,
        'technique', a.technique,
        'date_work', a.date_work,
        'location_storage', a.location_storage,
        'width', a.width,
        'height', a.height,
        'depth', a.depth,
        'dimension_unit', a.dimension_unit,
        'photos', a.photos,
        'is_insured', a.is_insured,
        'notes', a.notes,
        'value_purchase', a.value_purchase,
        'value_current', a.value_current,
        'date_purchase', a.date_purchase,
        'location_purchase', a.location_purchase,
        'created_at', a.created_at
      )
      ORDER BY a.created_at
    ), '[]'::jsonb)
  ) INTO result
  FROM artworks a
  WHERE a.user_id = share_user_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_collection TO anon;

-- 7. Tags ──────────────────────────────────────────────────────────
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
