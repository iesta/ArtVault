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
