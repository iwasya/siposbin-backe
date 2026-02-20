const supabase = require('../config/supabase');


/* =================================
   CREATE PEMERIKSAAN
================================= */
exports.createPemeriksaan = async (req, res) => {
  try {
    const {
      sistolik,
      diastolik,
      gula_darah,
      kolesterol,
      asam_urat,
      berat_badan,
      tinggi_badan
    } = req.body;

    const id_user = req.user.id;

    if (!berat_badan || !tinggi_badan) {
      return res.status(400).json({ message: "Berat & tinggi badan wajib diisi" });
    }

    // Hitung BMI
    const tinggiMeter = tinggi_badan / 100;
    const bmi = berat_badan / (tinggiMeter * tinggiMeter);

    // Simpan pemeriksaan
    const { data: pemeriksaan, error: periksaError } = await supabase
      .from('pemeriksaan')
      .insert([{
        id_user,
        tanggal_pemeriksaan: new Date(),
        sistolik,
        diastolik,
        gula_darah,
        kolesterol,
        asam_urat,
        berat_badan,
        tinggi_badan,
        bmi,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (periksaError) {
      return res.status(400).json({ error: periksaError.message });
    }

    // Interpretasi otomatis
    let status = "Normal";
    let penjelasan = "Semua indikator dalam batas normal.";
    let rekomendasi = "Pertahankan pola hidup sehat.";

    if (
      sistolik >= 140 ||
      diastolik >= 90 ||
      gula_darah >= 200 ||
      kolesterol >= 240
    ) {
      status = "Risiko";
      penjelasan = "Beberapa indikator berada pada tingkat berbahaya.";
      rekomendasi = "Segera konsultasi ke tenaga medis.";
    } else if (
      sistolik >= 120 ||
      diastolik >= 80 ||
      gula_darah >= 140 ||
      kolesterol >= 200
    ) {
      status = "Waspada";
      penjelasan = "Beberapa indikator mulai meningkat.";
      rekomendasi = "Perbaiki pola makan dan aktivitas fisik.";
    }

    await supabase.from('interpretasi').insert([{
      id_pemeriksaan: pemeriksaan.id_pemeriksaan,
      status_kesehatan: status,
      penjelasan,
      rekomendasi
    }]);

    res.status(201).json({
      message: "Pemeriksaan berhasil disimpan",
      status,
      pemeriksaan
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* =================================
   GET RIWAYAT PEMERIKSAAN
================================= */
exports.getPemeriksaan = async (req, res) => {
  try {

    const userId = req.user.id;

    const { data, error } = await supabase
      .from('pemeriksaan')
      .select(`
        *,
        interpretasi (
          status_kesehatan,
          penjelasan,
          rekomendasi
        )
      `)
      .eq('id_user', userId)
      .order('tanggal_pemeriksaan', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* =================================
   UPDATE PEMERIKSAAN
================================= */
exports.updatePemeriksaan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sistolik,
      diastolik,
      gula_darah,
      kolesterol,
      asam_urat,
      berat_badan,
      tinggi_badan
    } = req.body;

    const { data, error } = await supabase
      .from('pemeriksaan')
      .update({
        sistolik,
        diastolik,
        gula_darah,
        kolesterol,
        asam_urat,
        berat_badan,
        tinggi_badan
      })
      .eq('id_pemeriksaan', id)
      .eq('id_user', req.user.id) // hanya boleh edit miliknya
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({ message: "Pemeriksaan tidak ditemukan" });
    }

    res.json({
      message: "Pemeriksaan berhasil diupdate",
      data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* =================================
   DELETE PEMERIKSAAN
================================= */
exports.deletePemeriksaan = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('pemeriksaan')
      .delete()
      .eq('id_pemeriksaan', id)
      .eq('id_user', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Pemeriksaan berhasil dihapus" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};