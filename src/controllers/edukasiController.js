const supabase = require('../config/supabase');
const { formatToJakartaDateTime } = require('../utils/dateTime');

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

const getStatusCandidates = (status) => {
  const normalized = normalizeStatusLabel(status);

  if (normalized === "beresiko") {
    return ["beresiko", "perlu perhatian", "normal"];
  }
  if (normalized === "perlu perhatian") {
    return ["perlu perhatian", "normal"];
  }
  if (normalized === "normal") {
    return ["normal"];
  }

  return [normalized];
};

const buildRecommendationSignals = (status, interpretasi = null) => {
  const tekananDarah = normalizeStatusLabel(interpretasi?.tekanan_darah);
  const gula = normalizeStatusLabel(interpretasi?.gula_darah);
  const kolesterol = normalizeStatusLabel(interpretasi?.kolesterol);
  const hdl = normalizeStatusLabel(interpretasi?.hdl_status);
  const ldl = normalizeStatusLabel(interpretasi?.ldl_status);
  const trigliserida = normalizeStatusLabel(interpretasi?.trigliserida_status);
  const asamUrat = normalizeStatusLabel(interpretasi?.asam_urat);
  const bmiStatus = normalizeStatusLabel(interpretasi?.bmi_status);

  const signals = [];

  if (tekananDarah) {
    signals.push({
      isTopic: true,
      weight: 40,
      keywords: ["hipertensi", "tekanan darah", "darah tinggi", "sistolik", "diastolik"]
    });
  }

  if (gula) {
    signals.push({
      isTopic: true,
      weight: 35,
      keywords: ["gula darah", "diabetes", "prediabetes", "glukosa"]
    });
  }

  if (kolesterol || hdl || ldl || trigliserida) {
    signals.push({
      isTopic: true,
      weight: 30,
      keywords: ["kolesterol", "lemak darah", "ldl", "hdl", "trigliserida"]
    });
  }

  if (asamUrat) {
    signals.push({
      isTopic: true,
      weight: 30,
      keywords: ["asam urat", "purin", "sendi"]
    });
  }

  if (bmiStatus) {
    signals.push({
      isTopic: true,
      weight: 25,
      keywords: ["bmi", "berat badan", "obesitas", "kelebihan bb", "aktivitas fisik"]
    });
  }

  if (signals.length === 0) return [];

  const normalizedStatus = normalizeStatusLabel(status);
  if (normalizedStatus === "beresiko") {
    signals.push({
      isTopic: false,
      weight: 35,
      keywords: ["segera", "lanjutan", "tenaga medis", "dokter", "rujukan"]
    });
  } else if (normalizedStatus === "perlu perhatian") {
    signals.push({
      isTopic: false,
      weight: 20,
      keywords: ["konsultasi", "perbaikan", "kendalikan", "monitoring"]
    });
  } else if (normalizedStatus === "waspada") {
    signals.push({
      isTopic: false,
      weight: 15,
      keywords: ["waspada", "pantau", "jaga", "kontrol rutin"]
    });
  }

  return signals;
};

const getRecommendedEdukasi = (status, interpretasi, edukasiList = [], limit = 5) => {
  const candidates = getStatusCandidates(status);
  const signals = buildRecommendationSignals(status, interpretasi);

  if (!candidates[0] || signals.length === 0) return [];

  return edukasiList
    .map((item) => {
      const targetStatus = normalizeStatusLabel(item.target_status);
      const rankIndex = candidates.indexOf(targetStatus);
      if (rankIndex < 0) return { item, score: 0 };

      let score = 120 - (rankIndex * 15);
      let totalHit = 0;
      let topicHit = 0;
      const searchable = normalizeText(
        `${item.kategori || ""} ${item.judul || ""} ${item.deskripsi || ""}`
      );

      signals.forEach((signal) => {
        let hit = 0;
        signal.keywords.forEach((keyword) => {
          if (searchable.includes(normalizeText(keyword))) hit += 1;
        });

        if (hit > 0) {
          totalHit += hit;
          if (signal.isTopic) topicHit += hit;
          score += signal.weight + (hit * 4);
        }
      });

      return { item, score: topicHit > 0 && totalHit > 0 ? score : 0 };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.item.created_at || 0) - new Date(a.item.created_at || 0);
    })
    .map((entry) => entry.item)
    .slice(0, limit);
};

exports.getEdukasi = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Cek apakah user pernah pemeriksaan
    const { data: lastCheck, error: checkError } = await supabase
      .from('pemeriksaan')
      .select(`
        interpretasi (
          status_kesehatan,
          tekanan_darah,
          gula_darah,
          kolesterol,
          hdl_status,
          ldl_status,
          trigliserida_status,
          asam_urat,
          bmi_status
        )
      `)
      .eq('id_user', userId)
      .order('tanggal_pemeriksaan', { ascending: false })
      .limit(1)
      .maybeSingle(); // 🔥 pakai maybeSingle biar tidak error kalau kosong

    if (checkError) {
      return res.status(400).json({ error: checkError.message });
    }

    // ===============================
    // 🔥 KALAU BELUM ADA PEMERIKSAAN
    // ===============================
    if (!lastCheck || !lastCheck.interpretasi) {

      const { data: allEdukasi, error } = await supabase
        .from('edukasi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({
        status_user: null,
        recommended: [],
        all_edukasi: (allEdukasi || []).map((item) => ({
          ...item,
          created_at: formatToJakartaDateTime(item.created_at)
        }))
      });
    }

    // ===============================
    // 🔥 KALAU SUDAH ADA PEMERIKSAAN
    // ===============================
    const status = lastCheck.interpretasi.status_kesehatan;

    const { data: edukasiList, error: edukasiError } = await supabase
      .from('edukasi')
      .select('*')
      .order('created_at', { ascending: false });

    if (edukasiError) {
      return res.status(400).json({ error: edukasiError.message });
    }

    const relatedEdukasi = getRecommendedEdukasi(
      status,
      lastCheck.interpretasi,
      edukasiList || [],
      Number.POSITIVE_INFINITY
    );
    const recommended = relatedEdukasi.slice(0, 5);
    const recommendedIds = recommended.map(item => item.id_edukasi);
    const allEdukasi = relatedEdukasi.filter(
      (item) => !recommendedIds.includes(item.id_edukasi)
    );

    res.json({
      status_user: status,
      recommended: (recommended || []).map((item) => ({
        ...item,
        created_at: formatToJakartaDateTime(item.created_at)
      })),
      all_edukasi: (allEdukasi || []).map((item) => ({
        ...item,
        created_at: formatToJakartaDateTime(item.created_at)
      }))
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEdukasi = async (req, res) => {
  try {

    const {
      kategori,
      judul,
      deskripsi,
      target_status
    } = req.body;

    const { data, error } = await supabase
      .from('edukasi')
      .insert([
        {
          kategori: kategori,
          judul: judul,
          deskripsi: deskripsi,
          target_status: target_status
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Edukasi berhasil ditambahkan",
      data: data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ===============================
// UPDATE EDUKASI
// ===============================
exports.updateEdukasi = async (req, res) => {
  try {

    const id = req.params.id;

    const {
      kategori,
      judul,
      deskripsi,
      target_status
    } = req.body;

    const { data, error } = await supabase
      .from('edukasi')
      .update({
        kategori,
        judul,
        deskripsi,
        target_status
      })
      .eq('id_edukasi', id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Edukasi berhasil diperbarui",
      data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ===============================
// DELETE EDUKASI
// ===============================
exports.deleteEdukasi = async (req, res) => {
  try {

    const id = req.params.id;

    const { error } = await supabase
      .from('edukasi')
      .delete()
      .eq('id_edukasi', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Edukasi berhasil dihapus"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

