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

const normalizeStatusLabel = (value) => {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace("resiko", "risiko");
};

const normalizeText = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

const formatToWibDateTime = (value) => {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
};

const getStatusCandidates = (status) => {
  const normalized = normalizeStatusLabel(status);

  if (normalized === "risiko tinggi") {
    return ["risiko tinggi", "risiko", "waspada", "normal"];
  }
  if (normalized === "risiko") {
    return ["risiko", "waspada", "normal"];
  }
  if (normalized === "waspada") {
    return ["waspada", "normal"];
  }
  if (normalized === "normal") {
    return ["normal"];
  }

  return [normalized];
};

const buildRecommendationSignals = (status, interpretasi = null) => {
  const tekananDarah = normalizeStatusLabel(
    interpretasi?.tekanan_darah ?? interpretasi?.tekananDarah
  );
  const gula = normalizeStatusLabel(
    interpretasi?.gula_darah ?? interpretasi?.gula
  );
  const kolesterol = normalizeStatusLabel(
    interpretasi?.kolesterol ?? interpretasi?.kol
  );
  const asamUrat = normalizeStatusLabel(
    interpretasi?.asam_urat ?? interpretasi?.asam
  );
  const bmiStatus = normalizeStatusLabel(
    interpretasi?.bmi_status ?? interpretasi?.bmiStatus
  );

  const signals = [];

  if (tekananDarah && !["optimal", "normal"].includes(tekananDarah)) {
    signals.push({
      weight: 40,
      keywords: ["hipertensi", "tekanan darah", "darah tinggi", "sistolik", "diastolik"]
    });
  }

  if (gula && gula !== "normal") {
    signals.push({
      weight: 35,
      keywords: ["gula darah", "diabetes", "prediabetes", "glukosa"]
    });
  }

  if (kolesterol && kolesterol !== "normal") {
    signals.push({
      weight: 30,
      keywords: ["kolesterol", "lemak darah", "ldl", "hdl", "trigliserida"]
    });
  }

  if (asamUrat && asamUrat !== "normal") {
    signals.push({
      weight: 30,
      keywords: ["asam urat", "purin", "sendi"]
    });
  }

  if (bmiStatus && bmiStatus !== "normal") {
    signals.push({
      weight: 25,
      keywords: ["bmi", "berat badan", "obesitas", "overweight", "aktivitas fisik"]
    });
  }

  if (signals.length === 0) {
    signals.push({
      weight: 20,
      keywords: ["pola hidup sehat", "pencegahan", "olahraga", "nutrisi", "gaya hidup"]
    });
  }

  const normalizedStatus = normalizeStatusLabel(status);
  if (normalizedStatus === "risiko tinggi") {
    signals.push({
      weight: 35,
      keywords: ["segera", "lanjutan", "tenaga medis", "dokter", "rujukan"]
    });
  } else if (normalizedStatus === "risiko") {
    signals.push({
      weight: 20,
      keywords: ["konsultasi", "perbaikan", "kendalikan", "monitoring"]
    });
  } else if (normalizedStatus === "waspada") {
    signals.push({
      weight: 15,
      keywords: ["waspada", "pantau", "jaga", "kontrol rutin"]
    });
  }

  return signals;
};

const getRecommendedEdukasi = async (status, interpretasi = null, edukasiList = null) => {
  const candidates = getStatusCandidates(status);
  if (!candidates[0]) return [];

  let data = edukasiList;
  if (!data) {
    const { data: fetchedData, error } = await supabase
      .from('edukasi')
      .select('*');

    if (error || !fetchedData) return [];
    data = fetchedData;
  }

  const byStatus = new Map();
  data.forEach((item) => {
    const key = normalizeStatusLabel(item.target_status);
    if (!byStatus.has(key)) byStatus.set(key, []);
    byStatus.get(key).push(item);
  });

  const signals = buildRecommendationSignals(status, interpretasi);
  const ranked = data
    .map((item) => {
      const targetStatus = normalizeStatusLabel(item.target_status);
      const rankIndex = candidates.indexOf(targetStatus);
      let score = rankIndex >= 0 ? 120 - (rankIndex * 15) : 0;

      const searchable = normalizeText(
        `${item.kategori || ""} ${item.judul || ""} ${item.deskripsi || ""}`
      );

      signals.forEach((signal) => {
        let hit = 0;
        signal.keywords.forEach((keyword) => {
          if (searchable.includes(normalizeText(keyword))) hit += 1;
        });

        if (hit > 0) {
          score += signal.weight + (hit * 4);
        }
      });

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.item.created_at || 0) - new Date(a.item.created_at || 0);
    })
    .map((entry) => entry.item);

  if (ranked.length > 0) {
    return ranked.slice(0, 5);
  }

  for (const candidate of candidates) {
    const matched = byStatus.get(candidate) || [];
    if (matched.length > 0) return matched;
  }

  return [];
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
    const penjelasan = getPenjelasan(status);

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
    const recommended = await getRecommendedEdukasi(status, {
      tekanan_darah: tekananDarah,
      gula_darah: gula,
      kolesterol: kol,
      asam_urat: asam,
      bmi_status: bmiStatus
    });

    // ======================
    // RESPONSE FINAL
    // ======================
    res.status(201).json({
      message: "Berhasil",
      status,
      penjelasan,
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
          status_kesehatan,
          tekanan_darah,
          gula_darah,
          kolesterol,
          asam_urat,
          bmi_status
        )
      `)
      .eq('id_user', userId)
      .order('tanggal_pemeriksaan', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const { data: edukasiList, error: edukasiError } = await supabase
      .from('edukasi')
      .select('*');

    if (edukasiError) {
      return res.status(400).json({ error: edukasiError.message });
    }

    // 2️⃣ Loop setiap pemeriksaan dan tambahkan edukasi
    const result = await Promise.all(
      pemeriksaan.map(async (item) => {
        const status = item.interpretasi?.status_kesehatan;

        // Ambil recommended
        const recommended = await getRecommendedEdukasi(
          status,
          item.interpretasi,
          edukasiList || []
        );

        return {
          ...item,
          created_at: formatToWibDateTime(item.created_at),
          penjelasan: getPenjelasan(status),
          detail: {
            tekananDarah: item.interpretasi?.tekanan_darah || "Tidak diketahui",
            gula: item.interpretasi?.gula_darah || "Tidak diketahui",
            kol: item.interpretasi?.kolesterol || "Tidak diketahui",
            asam: item.interpretasi?.asam_urat || "Tidak diketahui",
            bmiStatus: item.interpretasi?.bmi_status || "Tidak diketahui"
          },
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
          status_kesehatan,
          tekanan_darah,
          gula_darah,
          kolesterol,
          asam_urat,
          bmi_status
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
      recommended = await getRecommendedEdukasi(status, pemeriksaan.interpretasi);
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
