const supabase = require('../config/supabase');

/* =========================
   VALIDATION
========================= */
const toPositiveNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const toMetricNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

/* =========================
   BMI
========================= */
const calculateBmi = (bb, tb) => {
  const meter = tb / 100;
  return bb / (meter * meter);
};

const getBMIStatus = (bmi) => {
  if (bmi < 18.5) return "Kurus";
  if (bmi <= 22.9) return "Normal";
  if (bmi <= 24.9) return "Overweight";
  if (bmi <= 29.9) return "Obesitas 1";
  return "Obesitas 2";
};

/* =========================
   TEKANAN DARAH
========================= */
const getTekananDarah = (s, d) => {
  if (s < 120 && d < 80) return "Optimal";
  if (s <= 129 && d <= 84) return "Normal";
  if (s <= 139 && d <= 89) return "Normal Tinggi";
  if (s <= 159 && d <= 99) return "Hipertensi 1";
  if (s <= 179 && d <= 109) return "Hipertensi 2";
  return "Hipertensi 3";
};

/* =========================
   GULA DARAH
========================= */
const getGulaDarah = (gds) => {
  if (gds >= 200) return "Diabetes";
  if (gds >= 140) return "Prediabetes";
  return "Normal";
};

/* =========================
   KOLESTEROL
========================= */
const getKolesterol = (val) => {
  if (val >= 240) return "Tinggi";
  if (val >= 200) return "Waspada";
  return "Normal";
};

/* =========================
   ASAM URAT
========================= */
const getAsamUrat = (val, gender = "pria") => {
  if (gender === "pria") {
    if (val >= 9) return "Bahaya";
    if (val > 8) return "Tinggi";
    if (val >= 7) return "Waspada";
    return "Normal";
  } else {
    if (val >= 8) return "Bahaya";
    if (val > 7) return "Tinggi";
    if (val >= 6) return "Waspada";
    return "Normal";
  }
};

/* =========================
   STATUS FINAL
========================= */
const calculateStatusFinal = (data) => {
  const hasil = [
    data.tekananDarah,
    data.gulaDarah,
    data.kolesterol,
    data.asamUrat,
    data.bmi
  ];

  if (
    hasil.includes("Hipertensi 3") ||
    hasil.includes("Bahaya") ||
    hasil.includes("Diabetes")
  ) return "Risiko Tinggi";

  if (
    hasil.includes("Hipertensi 2") ||
    hasil.includes("Tinggi") ||
    hasil.includes("Prediabetes") ||
    hasil.includes("Obesitas 2") ||
    hasil.includes("Obesitas 1")
  ) return "Risiko";

  if (
    hasil.includes("Normal Tinggi") ||
    hasil.includes("Hipertensi 1") ||
    hasil.includes("Waspada") ||
    hasil.includes("Overweight")
  ) return "Waspada";

  return "Normal";
};

/* =========================
   PENJELASAN
========================= */
const getPenjelasan = (status) => {
  switch (status) {
    case "Normal":
      return "Kondisi kesehatan Anda dalam batas normal. Pertahankan pola hidup sehat.";
    case "Waspada":
      return "Terdapat beberapa indikator yang perlu diperhatikan. Disarankan mulai menjaga pola makan dan gaya hidup.";
    case "Risiko":
      return "Beberapa indikator menunjukkan risiko kesehatan. Disarankan konsultasi dan perbaikan gaya hidup.";
    case "Risiko Tinggi":
      return "Kondisi kesehatan berisiko tinggi. Segera lakukan pemeriksaan lanjutan ke tenaga medis.";
    default:
      return "Status tidak diketahui";
  }
};

/* =========================
   BUILD INTERPRETASI
========================= */
const buildInterpretasi = ({
  sistolik,
  diastolik,
  gulaDarah,
  kolesterol,
  asamUrat,
  bmi,
  jenisKelamin = "pria"
}) => {
  const tekananDarah = getTekananDarah(sistolik, diastolik);
  const gula = getGulaDarah(gulaDarah);
  const kol = getKolesterol(kolesterol);
  const asam = getAsamUrat(asamUrat, jenisKelamin);
  const bmiStatus = getBMIStatus(bmi);

  const status = calculateStatusFinal({
    tekananDarah,
    gulaDarah: gula,
    kolesterol: kol,
    asamUrat: asam,
    bmi: bmiStatus
  });

  return {
    status,
    tekananDarah,
    gula,
    kol,
    asam,
    bmiStatus
  };
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
      tinggi_badan,
      jenis_kelamin = "pria"
    } = req.body;

    const id_user = req.user.id;

    const bb = toPositiveNumber(berat_badan);
    const tb = toPositiveNumber(tinggi_badan);

    const s = toMetricNumber(sistolik);
    const d = toMetricNumber(diastolik);
    const g = toMetricNumber(gula_darah);
    const k = toMetricNumber(kolesterol);
    const a = toMetricNumber(asam_urat);

    if (!bb || !tb) {
      return res.status(400).json({ message: "Berat & tinggi badan wajib valid" });
    }

    if (s === null || d === null || g === null || k === null || a === null) {
      return res.status(400).json({ message: "Data harus angka valid" });
    }

    // ======================
    // HITUNG
    // ======================
    const bmi = calculateBmi(bb, tb);

    const {
      status,
      tekananDarah,
      gula,
      kol,
      asam,
      bmiStatus
    } = buildInterpretasi({
      sistolik: s,
      diastolik: d,
      gulaDarah: g,
      kolesterol: k,
      asamUrat: a,
      bmi,
      jenisKelamin: jenis_kelamin
    });

    // ======================
    // SIMPAN PEMERIKSAAN
    // ======================
    const { data: pemeriksaan, error } = await supabase
      .from('pemeriksaan')
      .insert([{
        id_user,
        tanggal_pemeriksaan: new Date(),
        sistolik: s,
        diastolik: d,
        gula_darah: g,
        kolesterol: k,
        asam_urat: a,
        berat_badan: bb,
        tinggi_badan: tb,
        bmi,
        created_by: id_user
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // ======================
    // SIMPAN INTERPRETASI
    // ======================
    await supabase.from('interpretasi').insert([{
      id_pemeriksaan: pemeriksaan.id_pemeriksaan,
      status_kesehatan: status,
      tekanan_darah: tekananDarah,
      gula_darah: gula,
      kolesterol: kol,
      asam_urat: asam,
      bmi_status: bmiStatus
    }]);

    // ======================
    // AMBIL EDUKASI
    // ======================
    const { data: recommended } = await supabase
      .from('edukasi')
      .select('*')
      .ilike('target_status', status);

    // ======================
    // RESPONSE FINAL
    // ======================
    res.status(201).json({
      message: "Berhasil",
      status,
      penjelasan: getPenjelasan(status),
      detail: {
        tekananDarah,
        gula,
        kol,
        asam,
        bmiStatus
      },
      rekomendasi: recommended || [],
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
      tinggi_badan,
      jenis_kelamin = "pria"
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
    const {
      status,
      tekananDarah,
      gula,
      kol,
      asam,
      bmiStatus
    } = buildInterpretasi({
      sistolik: parsedSistolik,
      diastolik: parsedDiastolik,
      gulaDarah: parsedGulaDarah,
      kolesterol: parsedKolesterol,
      asamUrat: parsedAsamUrat,
      bmi,
      jenisKelamin: jenis_kelamin
    });

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

    const { error: pemeriksaanError } = await supabase
      .from('pemeriksaan')
      .update({
        status_kesehatan: status,
        tekanan_darah: tekananDarah,
        gula_darah: gula,
        kolesterol: kol,
        asam_urat: asam,
        bmi_status: bmiStatus
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
          status_kesehatan: status,
          tekanan_darah: tekananDarah,
          gula_darah: gula,
          kolesterol: kol,
          asam_urat: asam,
          bmi_status: bmiStatus
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
