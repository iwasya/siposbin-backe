-- Add field from updated pemeriksaan form
ALTER TABLE pemeriksaan
  ADD COLUMN IF NOT EXISTS lingkar_perut NUMERIC;

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
