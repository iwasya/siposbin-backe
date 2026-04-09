const supabase = require('../config/supabase');

const toPositiveNumber = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const toMetricNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const calculateStatus = ({
  sistolik,
  diastolik,
  gula_darah,
  kolesterol
}) => {
  if (
    sistolik >= 140 ||
    diastolik >= 90 ||
    gula_darah >= 200 ||
    kolesterol >= 240
  ) {
    return "Risiko";
  }

  if (
    sistolik >= 120 ||
    diastolik >= 80 ||
    gula_darah >= 140 ||
    kolesterol >= 200
  ) {
    return "Waspada";
  }

  return "Normal";
};

const calculateBmi = (beratBadan, tinggiBadan) => {
  const tinggiMeter = tinggiBadan / 100;
  return beratBadan / (tinggiMeter * tinggiMeter);
};

/* =================================
   CREATE PEMERIKSAAN
================================= */
exports.createPemeriksaan = async (req, res) => {
  try {
    const {
      sistolik = 0,
      diastolik = 0,
      gula_darah = 0,
      kolesterol = 0,
      asam_urat = 0,
      berat_badan,
      tinggi_badan
    } = req.body;

    const id_user = req.user.id;

    const parsedBeratBadan = toPositiveNumber(berat_badan);
    const parsedTinggiBadan = toPositiveNumber(tinggi_badan);
    const parsedSistolik = toMetricNumber(sistolik);
    const parsedDiastolik = toMetricNumber(diastolik);
    const parsedGulaDarah = toMetricNumber(gula_darah);
    const parsedKolesterol = toMetricNumber(kolesterol);
    const parsedAsamUrat = toMetricNumber(asam_urat);

    if (!parsedBeratBadan || !parsedTinggiBadan) {
      return res.status(400).json({
        message: "Berat & tinggi badan wajib diisi dengan angka lebih dari 0"
      });
    }

    if (
      parsedSistolik === null ||
      parsedDiastolik === null ||
      parsedGulaDarah === null ||
      parsedKolesterol === null ||
      parsedAsamUrat === null
    ) {
      return res.status(400).json({
        message: "Data pemeriksaan harus berupa angka yang valid"
      });
    }

    // ==============================
    // Hitung BMI
    // ==============================
    const bmi = calculateBmi(parsedBeratBadan, parsedTinggiBadan);

    // ==============================
    // Tentukan Status
    // ==============================
    const status = calculateStatus({
      sistolik: parsedSistolik,
      diastolik: parsedDiastolik,
      gula_darah: parsedGulaDarah,
      kolesterol: parsedKolesterol
    });

    const cleanStatus = status.trim();

    // ==============================
    // Simpan Pemeriksaan
    // ==============================
    const { data: pemeriksaan, error: periksaError } = await supabase
      .from('pemeriksaan')
      .insert([{
        id_user,
        tanggal_pemeriksaan: new Date(),
        sistolik: parsedSistolik,
        diastolik: parsedDiastolik,
        gula_darah: parsedGulaDarah,
        kolesterol: parsedKolesterol,
        asam_urat: parsedAsamUrat,
        berat_badan: parsedBeratBadan,
        tinggi_badan: parsedTinggiBadan,
        bmi,
        created_by: id_user
      }])
      .select()
      .single();

    if (periksaError) {
      return res.status(400).json({
        error: periksaError.message
      });
    }

    // ==============================
    // Simpan Interpretasi
    // ==============================
    const { error: interpretasiError } = await supabase
      .from('interpretasi')
      .insert([{
        id_pemeriksaan: pemeriksaan.id_pemeriksaan,
        status_kesehatan: cleanStatus
      }]);

    if (interpretasiError) {
      return res.status(400).json({
        error: interpretasiError.message
      });
    }

    // ==============================
    // Ambil Edukasi Recommended
    // ==============================
    const { data: recommended, error: recError } = await supabase
      .from('edukasi')
      .select('*')
      .ilike('target_status', cleanStatus);

    if (recError) {
      return res.status(400).json({
        error: recError.message
      });
    }

    // ==============================
    // Ambil Edukasi Lainnya
    // ==============================
    const { data: allEdukasi, error: allError } = await supabase
      .from('edukasi')
      .select('*')
      .not('target_status', 'ilike', cleanStatus);

    if (allError) {
      return res.status(400).json({
        error: allError.message
      });
    }

    // ==============================
    // RESPONSE FINAL
    // ==============================
    res.status(201).json({
      message: "Pemeriksaan berhasil disimpan",
      status_user: cleanStatus,
      recommended: recommended || [],
      all_edukasi: allEdukasi || [],
      pemeriksaan
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};



/* =================================
   GET RIWAYAT PEMERIKSAAN
================================= */
exports.getPemeriksaan = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Ambil pemeriksaan + status
    const { data: pemeriksaan, error } = await supabase
      .from('pemeriksaan')
      .select(`
        *,
        interpretasi (
          status_kesehatan
        )
      `)
      .eq('id_user', userId)
      .order('tanggal_pemeriksaan', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // 2️⃣ Loop setiap pemeriksaan dan tambahkan edukasi
    const result = await Promise.all(
      pemeriksaan.map(async (item) => {
        const status = item.interpretasi?.status_kesehatan;

        // Ambil recommended
        const { data: recommended } = await supabase
          .from('edukasi')
          .select('*')
          .ilike('target_status', status);

        return {
          ...item,
          recommended: recommended || []
        };
      })
    );

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =================================
   GET DETAIL PEMERIKSAAN BY ID
================================= */
exports.getPemeriksaanById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // 1️⃣ Ambil pemeriksaan sesuai id DAN pastikan milik user
    const { data: pemeriksaan, error } = await supabase
      .from('pemeriksaan')
      .select(`
        *,
        interpretasi (
          status_kesehatan
        )
      `)
      .eq('id_pemeriksaan', id)
      .eq('id_user', userId) // 🔥 biar tidak bisa lihat punya orang lain
      .single();

    if (error || !pemeriksaan) {
      return res.status(404).json({ message: "Data pemeriksaan tidak ditemukan" });
    }

    const status = pemeriksaan.interpretasi?.status_kesehatan;

    // 2️⃣ Ambil edukasi sesuai status
    let recommended = [];

    if (status) {
      const { data } = await supabase
        .from('edukasi')
        .select('*')
        .ilike('target_status', status);

      recommended = data || [];
    }

    res.json({
      ...pemeriksaan,
      recommended
    });

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

    const { data: existingPemeriksaan, error: fetchError } = await supabase
      .from('pemeriksaan')
      .select(`
        id_pemeriksaan,
        id_user,
        sistolik,
        diastolik,
        gula_darah,
        kolesterol,
        asam_urat,
        berat_badan,
        tinggi_badan,
        interpretasi (
          status_kesehatan
        )
      `)
      .eq('id_pemeriksaan', id)
      .eq('id_user', req.user.id)
      .single();

    if (fetchError || !existingPemeriksaan) {
      return res.status(404).json({
        message: "Pemeriksaan tidak ditemukan"
      });
    }

    const parsedSistolik = toMetricNumber(sistolik, existingPemeriksaan.sistolik ?? 0);
    const parsedDiastolik = toMetricNumber(diastolik, existingPemeriksaan.diastolik ?? 0);
    const parsedGulaDarah = toMetricNumber(gula_darah, existingPemeriksaan.gula_darah ?? 0);
    const parsedKolesterol = toMetricNumber(kolesterol, existingPemeriksaan.kolesterol ?? 0);
    const parsedAsamUrat = toMetricNumber(asam_urat, existingPemeriksaan.asam_urat ?? 0);
    const parsedBeratBadan = berat_badan === undefined
      ? toPositiveNumber(existingPemeriksaan.berat_badan)
      : toPositiveNumber(berat_badan);
    const parsedTinggiBadan = tinggi_badan === undefined
      ? toPositiveNumber(existingPemeriksaan.tinggi_badan)
      : toPositiveNumber(tinggi_badan);

    if (
      parsedSistolik === null ||
      parsedDiastolik === null ||
      parsedGulaDarah === null ||
      parsedKolesterol === null ||
      parsedAsamUrat === null ||
      !parsedBeratBadan ||
      !parsedTinggiBadan
    ) {
      return res.status(400).json({
        message: "Data pemeriksaan harus berupa angka valid, dan berat/tinggi badan harus lebih dari 0"
      });
    }

    const bmi = calculateBmi(parsedBeratBadan, parsedTinggiBadan);
    const cleanStatus = calculateStatus({
      sistolik: parsedSistolik,
      diastolik: parsedDiastolik,
      gula_darah: parsedGulaDarah,
      kolesterol: parsedKolesterol
    }).trim();

    const { data, error } = await supabase
      .from('pemeriksaan')
      .update({
        sistolik: parsedSistolik,
        diastolik: parsedDiastolik,
        gula_darah: parsedGulaDarah,
        kolesterol: parsedKolesterol,
        asam_urat: parsedAsamUrat,
        berat_badan: parsedBeratBadan,
        tinggi_badan: parsedTinggiBadan,
        bmi
      })
      .eq('id_pemeriksaan', id)
      .eq('id_user', req.user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({
        message: "Pemeriksaan tidak ditemukan"
      });
    }

    const { error: interpretasiError } = await supabase
      .from('interpretasi')
      .update({
        status_kesehatan: cleanStatus
      })
      .eq('id_pemeriksaan', id);

    if (interpretasiError) {
      return res.status(400).json({
        error: interpretasiError.message
      });
    }

    res.json({
      message: "Pemeriksaan berhasil diupdate",
      data: {
        ...data,
        interpretasi: {
          status_kesehatan: cleanStatus
        }
      }
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
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
      return res.status(400).json({
        error: error.message
      });
    }

    res.json({
      message: "Pemeriksaan berhasil dihapus"
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};
