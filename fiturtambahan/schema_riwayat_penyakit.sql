-- Add field from updated pemeriksaan form
ALTER TABLE pemeriksaan
  ADD COLUMN IF NOT EXISTS lingkar_perut NUMERIC;

-- Fix an earlier wrong attempt where id_user was created as UUID.
-- Safe only while the feature tables are empty; otherwise stop.
DO $$
DECLARE
  penyakit_rows INTEGER := 0;
  pengobatan_rows INTEGER := 0;
  id_user_type TEXT;
BEGIN
  SELECT data_type INTO id_user_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'riwayat_penyakit'
    AND column_name = 'id_user';

  IF id_user_type IS NOT NULL AND id_user_type <> 'integer' THEN
    EXECUTE 'SELECT count(*) FROM riwayat_penyakit' INTO penyakit_rows;
    EXECUTE 'SELECT count(*) FROM riwayat_pengobatan' INTO pengobatan_rows;

    IF penyakit_rows = 0 AND pengobatan_rows = 0 THEN
      DROP TABLE IF EXISTS riwayat_pengobatan;
      DROP TABLE IF EXISTS riwayat_penyakit;
    ELSE
      RAISE EXCEPTION 'riwayat_penyakit.id_user is %, expected integer; backup data before migrating', id_user_type;
    END IF;
  END IF;
END $$;

-- Create riwayat_penyakit with INTEGER id_user matching users table
CREATE TABLE IF NOT EXISTS riwayat_penyakit (
  id SERIAL PRIMARY KEY,
  id_user INTEGER NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  nama_penyakit TEXT NOT NULL,
  tanggal_diagnosis DATE,
  status_penyakit TEXT NOT NULL CHECK (status_penyakit IN ('Masih dalam pengobatan', 'Kontrol rutin', 'Sudah sembuh'))
);

CREATE INDEX IF NOT EXISTS idx_riwayat_penyakit_user ON riwayat_penyakit(id_user);

-- Create riwayat_pengobatan with INTEGER id_user and id_penyakit
CREATE TABLE IF NOT EXISTS riwayat_pengobatan (
  id SERIAL PRIMARY KEY,
  id_user INTEGER NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
  id_penyakit INTEGER NOT NULL REFERENCES riwayat_penyakit(id) ON DELETE CASCADE,
  nama_obat TEXT NOT NULL,
  masih_mengonsumsi_obat BOOLEAN NOT NULL DEFAULT false,
  tingkat_kepatuhan TEXT CHECK (tingkat_kepatuhan IN ('Patuh', 'Kadang lupa', 'Tidak patuh')),
  alasan_tidak_patuh TEXT
);

CREATE INDEX IF NOT EXISTS idx_riwayat_pengobatan_user ON riwayat_pengobatan(id_user);
CREATE INDEX IF NOT EXISTS idx_riwayat_pengobatan_penyakit ON riwayat_pengobatan(id_penyakit);

NOTIFY pgrst, 'reload schema';
