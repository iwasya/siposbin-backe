const supabase = require('../config/supabase');

exports.createPemeriksaan = async (req, res) => {
  try {
    const {
      id_user,
      sistolik,
      diastolik,
      gula_darah,
      kolesterol,
      asam_urat,
      berat_badan,
      tinggi_badan
    } = req.body;

    if (!id_user) {
      return res.status(400).json({ message: "ID user wajib diisi" });
    }

    // Hitung BMI
    const tinggiMeter = tinggi_badan / 100;
    const bmi = berat_badan / (tinggiMeter * tinggiMeter);

    // 1️⃣ Simpan pemeriksaan
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
      console.log(periksaError);
      return res.status(400).json({ error: periksaError.message });
    }

    // 2️⃣ Tentukan Status Otomatis
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

    // 3️⃣ Simpan interpretasi
    const { error: interpretasiError } = await supabase
      .from('interpretasi')
      .insert([{
        id_pemeriksaan: pemeriksaan.id_pemeriksaan,
        status_kesehatan: status,
        penjelasan,
        rekomendasi
      }]);

    if (interpretasiError) {
      console.log(interpretasiError);
      return res.status(400).json({ error: interpretasiError.message });
    }

    res.status(201).json({
      message: "Pemeriksaan berhasil disimpan",
      status,
      pemeriksaan
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getRiwayatPemeriksaan = async (req, res) => {
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
      .order('created_at', { ascending: false });

    if (error) {
      console.log(error);
      return res.status(400).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
