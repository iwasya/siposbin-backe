const supabase = require('../config/supabase');
const { formatToJakartaDateTime } = require('../utils/dateTime');
const {
  _helpers: {
    createRiwayatPenyakitRecord,
    normalizeRiwayatPenyakitInput
  }
} = require('./riwayatController');

/* =========================
   VALIDATION
========================= */
const toRequiredPositiveMetricNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const toOptionalPositiveMetricNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return toRequiredPositiveMetricNumber(value);
};

const hasInputValue = (value) => value !== undefined && value !== null && value !== '';
const pickInputValue = (...values) => values.find(hasInputValue);
const pickRiwayatPenyakitInput = (body = {}) => {
  const raw = body.riwayat_penyakit ?? body.riwayat;

  if (Array.isArray(raw)) {
    // Filter incomplete/empty entries — frontend may send partial rows
    const valid = raw.filter(item => item?.nama_penyakit?.trim());
    return valid.length > 0 ? valid : null;
  }

  if (raw && typeof raw === 'object') return raw;

  return ['nama_penyakit', 'tanggal_diagnosis', 'status_penyakit', 'pengobatan'].some(key => body[key] !== undefined)
    ? body
    : null;
};

const parseOptionalPositiveMetricNumber = (value) => {
  if (!hasInputValue(value)) {
    return { value: null, provided: false, valid: true };
  }

  const parsed = toRequiredPositiveMetricNumber(value);
  return {
    value: parsed,
    provided: true,
    valid: parsed !== null
  };
};

const parseUpdatePositiveMetricNumber = (value, fallbackValue) => {
  return parseOptionalPositiveMetricNumber(
    value === undefined ? fallbackValue : value
  );
};

const normalizeJenisKelamin = (value) => {
  const normalized = String(value || "pria").toLowerCase().trim();

  if (['p', 'perempuan', 'wanita'].includes(normalized)) {
    return "perempuan";
  }

  return "pria";
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
  if (bmi <= 24.9) return "Normal";
  if (bmi <= 29.9) return "Kelebihan BB";
  return "Obesitas";
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

const getHdlStatus = (val, jenisKelamin = "pria") => {
  const normalizedGender = normalizeJenisKelamin(jenisKelamin);
  const minimumHdl = normalizedGender === "perempuan" ? 50 : 40;

  return val < minimumHdl ? "Waspada" : "Normal";
};

const getLdl = (val) => {
  if (val >= 190) return "Sangat Tinggi";
  if (val >= 160) return "Tinggi";
  if (val >= 130) return "Waspada";
  if (val >= 100) return "Mendekati Optimal";
  return "Optimal";
};

const getTrigliserida = (val) => {
  if (val >= 500) return "Sangat Tinggi";
  if (val >= 200) return "Tinggi";
  if (val >= 150) return "Waspada";
  return "Normal";
};

const lipidStatusSeverity = (status) => {
  const normalized = normalizeStatusLabel(status);

  if (["sangat tinggi", "bahaya"].includes(normalized)) return 4;
  if (normalized === "tinggi") return 3;
  if (normalized === "waspada") return 2;
  if (normalized === "mendekati optimal") return 1;
  return 0;
};

const getHighestLipidStatus = (...statuses) => {
  const validStatuses = statuses.filter(Boolean);
  if (validStatuses.length === 0) return null;

  return validStatuses.reduce((highest, current) => (
    lipidStatusSeverity(current) > lipidStatusSeverity(highest) ? current : highest
  ));
};

const getKolesterolKeseluruhan = ({
  kolesterol,
  jenisKelamin = "pria",
  hdl = null,
  ldl = null,
  trigliserida = null
}) => getHighestLipidStatus(
  kolesterol !== null ? getKolesterol(kolesterol) : null,
  hdl !== null ? getHdlStatus(hdl, jenisKelamin) : null,
  ldl !== null ? getLdl(ldl) : null,
  trigliserida !== null ? getTrigliserida(trigliserida) : null
);

/* =========================
   ASAM URAT
========================= */
const getAsamUrat = (val, gender = "pria") => {
  if (val >= 9) return "Bahaya";
  if (val > 8) return "Tinggi";

  const waspadaMin = gender === "pria" ? 7 : 6;
  if (val >= waspadaMin) return "Waspada";
  return "Normal";
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
  const kolesterolStatus = normalizeStatusLabel(data.kolesterol);

  if (
    hasil.includes("Hipertensi 1") ||
    hasil.includes("Hipertensi 2") ||
    hasil.includes("Hipertensi 3") ||
    hasil.includes("Bahaya") ||
    hasil.includes("Diabetes") ||
    hasil.includes("Obesitas") ||
    ["tinggi", "sangat tinggi", "bahaya"].includes(kolesterolStatus)
  ) return "Beresiko";

  if (
    hasil.includes("Tinggi") ||
    hasil.includes("Prediabetes") ||
    kolesterolStatus === "mendekati optimal"
  ) return "Perlu Perhatian";

  if (
    hasil.includes("Normal Tinggi") ||
    hasil.includes("Waspada") ||
    hasil.includes("Kelebihan BB")
  ) return "Perlu Perhatian";

  return "Normal";
};

const normalizeFinalStatus = (status) => {
  const normalized = normalizeStatusLabel(status);

  if (["normal"].includes(normalized)) return "Normal";
  if (["beresiko", "berisiko", "risiko tinggi", "risiko"].includes(normalized)) return "Beresiko";
  if (["perlu perhatian", "waspada"].includes(normalized)) return "Perlu Perhatian";

  return status || "Normal";
};

const calculateStatusFromInterpretasi = (interpretasi = {}, bmi = null) => {
  const hasDetail = [
    interpretasi?.tekanan_darah,
    interpretasi?.gula_darah,
    interpretasi?.kolesterol,
    interpretasi?.hdl_status,
    interpretasi?.ldl_status,
    interpretasi?.trigliserida_status,
    interpretasi?.asam_urat,
    interpretasi?.bmi_status
  ].some(hasInputValue);

  if (!hasDetail) {
    return normalizeFinalStatus(interpretasi?.status_kesehatan);
  }

  return calculateStatusFinal({
    tekananDarah: interpretasi.tekanan_darah,
    gulaDarah: interpretasi.gula_darah,
    kolesterol: getHighestLipidStatus(
      interpretasi.kolesterol,
      interpretasi.hdl_status,
      interpretasi.ldl_status,
      interpretasi.trigliserida_status
    ),
    asamUrat: interpretasi.asam_urat,
    bmi: getBmiStatusFromValue(bmi, interpretasi.bmi_status)
  });
};

const getBmiStatusFromValue = (bmi, fallbackStatus = null) => {
  const parsed = Number(bmi);
  if (Number.isFinite(parsed) && parsed > 0) {
    return getBMIStatus(parsed);
  }

  const normalized = normalizeStatusLabel(fallbackStatus);
  if (["obesitas 1", "overweight"].includes(normalized)) return "Kelebihan BB";
  if (normalized === "obesitas 2") return "Obesitas";
  return fallbackStatus || null;
};

/* =========================
   PENJELASAN
========================= */
const getPenjelasan = (status) => {
  switch (normalizeFinalStatus(status)) {
    case "Normal":
      return "Kondisi kesehatan Anda dalam batas normal. Pertahankan pola hidup sehat.";
    case "Perlu Perhatian":
      return "Beberapa indikator menunjukkan risiko kesehatan. Disarankan konsultasi dan perbaikan gaya hidup.";
    case "Beresiko":
      return "Kondisi kesehatan berisiko tinggi. Segera lakukan pemeriksaan lanjutan ke tenaga medis.";
    default:
      return "Status tidak diketahui";
  }
};

const normalizeStatusLabel = (value) => {
  const normalized = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  if (["beresiko", "berisiko"].includes(normalized)) {
    return "beresiko";
  }

  return normalized.replace("resiko", "risiko");
};

const normalizeText = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

const PEMANTAUAN_MESSAGE = "Lakukan pemeriksaan secara berkala untuk pemantauan kondisi kesehatan.";

const buildTekananDarahDetail = (status, sistolik, diastolik) => {
  const normalized = normalizeStatusLabel(status);
  let keterangan = "Tekanan darah Anda berada di atas batas normal dan berisiko menyebabkan penyakit jantung atau stroke. Segera lakukan perubahan gaya hidup sehat dan konsultasikan ke tenaga kesehatan.";

  if (normalized === "rendah") {
    keterangan = "Tekanan darah Anda berada di bawah batas normal (kurang dari 90/60 mmHg). Kondisi ini dapat menyebabkan pusing, lemas, atau pingsan. Disarankan untuk mencukupi cairan, makan teratur, dan bangun perlahan dari posisi duduk atau berbaring.";
  } else if (["optimal", "normal"].includes(normalized)) {
    keterangan = "Tekanan darah Anda berada dalam rentang normal, yang menunjukkan kondisi jantung dan pembuluh darah yang baik. Pertahankan pola hidup sehat seperti konsumsi makanan rendah garam, rutin berolahraga, serta mengelola stres dengan baik.";
  } else if (normalized === "normal tinggi") {
    keterangan = "Tekanan darah Anda sedikit di atas normal dan berisiko berkembang menjadi hipertensi jika tidak dikontrol. Disarankan untuk mulai mengurangi konsumsi garam, menjaga berat badan, serta meningkatkan aktivitas fisik.";
  }

  return {
    kategori: "Tekanan Darah",
    nilai: `${sistolik ?? 0}/${diastolik ?? 0}`,
    satuan: "mmHg",
    status: status || null,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const buildLipidDetail = (kategori, status, nilai) => {
  const normalized = normalizeStatusLabel(status);
  let keterangan = "Kadar kolesterol yang tinggi dapat meningkatkan risiko penyakit jantung. Segera lakukan perubahan pola makan dan konsultasi dengan tenaga kesehatan.";

  if (normalized === "rendah") {
    keterangan = "Kadar kolesterol terlalu rendah dapat memengaruhi fungsi tubuh. Disarankan tetap konsumsi lemak sehat seperti ikan dan kacang-kacangan serta pola makan seimbang.";
  } else if (["normal", "optimal"].includes(normalized)) {
    keterangan = "Kadar kolesterol Anda masih dalam batas aman. Tetap jaga pola makan sehat dengan mengurangi lemak jenuh dan rutin berolahraga.";
  } else if (normalized === "mendekati optimal") {
    keterangan = "Kadar LDL mendekati batas optimal. Pertahankan pola makan sehat dan pantau profil lipid secara berkala.";
  } else if (normalized === "waspada") {
    keterangan = "Kadar kolesterol Anda mendekati batas tinggi. Disarankan untuk mengurangi makanan berlemak, gorengan, serta meningkatkan aktivitas fisik.";
  } else if (normalized === "sangat tinggi") {
    keterangan = "Kadar lipid berada pada kategori sangat tinggi dan berbahaya. Segera konsultasikan ke tenaga kesehatan untuk evaluasi dan penanganan lanjutan.";
  }

  return {
    kategori,
    nilai,
    satuan: "mg/dL",
    status: status || null,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const buildKolesterolDetail = (status, nilai) => buildLipidDetail("Kolesterol Total", status, nilai);

const buildAsamUratDetail = (status, nilai) => {
  const normalized = normalizeStatusLabel(status);
  const keterangan = normalized === "rendah"
    ? "Kadar asam urat rendah (<2 mg/dL) jarang terjadi namun perlu diperhatikan. Pastikan asupan nutrisi cukup dan lakukan pemeriksaan lanjutan bila perlu."
    : normalized === "normal"
      ? "Kadar asam urat Anda dalam batas normal. Pertahankan pola makan sehat dan cukup minum air putih."
      : "Kadar asam urat yang tinggi dapat menyebabkan nyeri sendi. Hindari makanan tinggi purin seperti jeroan dan seafood, serta perbanyak konsumsi air putih.";

  return {
    kategori: "Asam Urat",
    nilai,
    satuan: "mg/dL",
    status: status || null,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const buildGulaDarahDetail = (status, nilai) => {
  const normalized = normalizeStatusLabel(status);
  let keterangan = "Kadar gula darah Anda tinggi dan menunjukkan risiko diabetes. Segera konsultasikan dengan tenaga kesehatan untuk penanganan lebih lanjut.";

  if (normalized === "rendah") {
    keterangan = "Kadar gula darah Anda berada di bawah normal (kurang dari 70 mg/dL). Dapat menyebabkan gemetar, lemas, dan pusing. Segera konsumsi makanan atau minuman manis dan jaga pola makan teratur.";
  } else if (normalized === "normal") {
    keterangan = "Kadar gula darah Anda berada dalam batas normal. Pertahankan pola makan seimbang dan aktivitas fisik secara rutin.";
  } else if (normalized === "prediabetes" || normalized === "pra-diabetes") {
    keterangan = "Kadar gula darah Anda sedikit di atas normal dan berisiko berkembang menjadi diabetes. Disarankan untuk mengurangi konsumsi gula dan menjaga berat badan.";
  }

  return {
    kategori: "Gula Darah",
    nilai,
    satuan: "mg/dL",
    status: status || null,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const buildBmiDetail = (status, nilai) => {
  const normalized = normalizeStatusLabel(status);
  let keterangan = "Berat badan Anda berada pada kategori obesitas yang berisiko terhadap berbagai penyakit. Disarankan untuk melakukan perubahan gaya hidup dan konsultasi dengan tenaga kesehatan.";

  if (normalized === "kurus") {
    keterangan = "IMT di bawah 18,5 menunjukkan berat badan kurang. Disarankan meningkatkan asupan kalori dan nutrisi serta menjaga pola makan teratur.";
  } else if (normalized === "normal") {
    keterangan = "Indeks massa tubuh Anda berada dalam kategori ideal. Pertahankan pola makan sehat dan aktivitas fisik yang cukup.";
  } else if (normalized === "kelebihan bb") {
    keterangan = "Berat badan Anda melebihi batas normal. Disarankan untuk mulai mengatur pola makan dan meningkatkan aktivitas fisik.";
  }

  return {
    kategori: "Indeks Massa Tubuh (IMT)",
    nilai: typeof nilai === "number" ? Number(nilai.toFixed(1)) : nilai,
    satuan: "kg/m2",
    status: status || null,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const normalizeInterpretasiRelation = (interpretasi) => {
  if (Array.isArray(interpretasi)) {
    return interpretasi[0] || {};
  }

  return interpretasi || {};
};

const buildPengecekan = (item) => {
  const interpretasi = normalizeInterpretasiRelation(item?.interpretasi);
  const status = {};
  const detail = {};
  const finalStatus = calculateStatusFromInterpretasi(interpretasi, item?.bmi);

  if (hasInputValue(item?.sistolik) && hasInputValue(item?.diastolik)) {
    status.tekanan_darah = interpretasi.tekanan_darah || null;
    detail.tekanan_darah = buildTekananDarahDetail(
      interpretasi.tekanan_darah,
      item?.sistolik,
      item?.diastolik
    );
  }

  const hasLipidInput = [
    item?.kolesterol,
    item?.hdl,
    item?.ldl,
    item?.trigliserida
  ].some(hasInputValue);

  if (hasLipidInput) {
    status.kolesterol = interpretasi.kolesterol || null;
  }

  if (hasInputValue(item?.kolesterol)) {
    detail.kolesterol = buildKolesterolDetail(getKolesterol(item?.kolesterol), item?.kolesterol);
  }

  if (hasInputValue(item?.hdl)) {
    status.hdl_status = interpretasi.hdl_status || null;
    detail.hdl = buildLipidDetail("HDL (Kolesterol Baik)", interpretasi.hdl_status, item?.hdl);
  }

  if (hasInputValue(item?.ldl)) {
    status.ldl_status = interpretasi.ldl_status || null;
    detail.ldl = buildLipidDetail("LDL (Kolesterol Jahat)", interpretasi.ldl_status, item?.ldl);
  }

  if (hasInputValue(item?.trigliserida)) {
    status.trigliserida_status = interpretasi.trigliserida_status || null;
    detail.trigliserida = buildLipidDetail(
      "Trigliserida",
      interpretasi.trigliserida_status,
      item?.trigliserida
    );
  }

  if (hasInputValue(item?.asam_urat)) {
    status.asam_urat = interpretasi.asam_urat || null;
    detail.asam_urat = buildAsamUratDetail(interpretasi.asam_urat, item?.asam_urat);
  }

  if (hasInputValue(item?.gula_darah)) {
    status.gula_darah = interpretasi.gula_darah || null;
    detail.gula_darah = buildGulaDarahDetail(interpretasi.gula_darah, item?.gula_darah);
  }

  if (hasInputValue(item?.bmi)) {
    const bmiStatus = getBmiStatusFromValue(item?.bmi, interpretasi.bmi_status);
    status.bmi_status = bmiStatus;
    detail.bmi_status = buildBmiDetail(bmiStatus, item?.bmi);
  }

  return {
    tanggal_pemeriksaan: formatToJakartaDateTime(item?.tanggal_pemeriksaan || item?.created_at),
    status_kesehatan: finalStatus,
    penjelasan: getPenjelasan(finalStatus),
    status,
    detail
  };
};

const buildStatusSummary = (item = {}) => {
  const interpretasi = normalizeInterpretasiRelation(item?.interpretasi || item);

  return {
    tekananDarah: interpretasi?.tekanan_darah || "Tidak diketahui",
    gula: interpretasi?.gula_darah || "Tidak diketahui",
    kol: interpretasi?.kolesterol || "Tidak diketahui",
    hdl: interpretasi?.hdl_status || "Tidak diketahui",
    ldl: interpretasi?.ldl_status || "Tidak diketahui",
    trigliserida: interpretasi?.trigliserida_status || "Tidak diketahui",
    asam: interpretasi?.asam_urat || "Tidak diketahui",
    bmiStatus: getBmiStatusFromValue(item?.bmi, interpretasi?.bmi_status) || "Tidak diketahui"
  };
};

const getStatusCandidates = (status) => {
  const normalized = normalizeStatusLabel(status);

  if (["beresiko", "berisiko", "risiko tinggi", "risiko"].includes(normalized)) {
    return ["beresiko", "berisiko", "risiko tinggi", "perlu perhatian", "risiko", "waspada", "normal"];
  }
  if (["perlu perhatian", "waspada"].includes(normalized)) {
    return ["perlu perhatian", "waspada", "normal"];
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

  if (kolesterol) {
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
  if (["beresiko", "berisiko", "risiko tinggi", "risiko"].includes(normalizedStatus)) {
    signals.push({
      isTopic: false,
      weight: 35,
      keywords: ["segera", "lanjutan", "tenaga medis", "dokter", "rujukan"]
    });
  } else if (["perlu perhatian", "waspada"].includes(normalizedStatus)) {
    signals.push({
      isTopic: false,
      weight: 20,
      keywords: ["konsultasi", "perbaikan", "kendalikan", "monitoring"]
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

  const signals = buildRecommendationSignals(status, interpretasi);
  if (signals.length === 0) return [];

  const ranked = data
    .map((item) => {
      const targetStatus = normalizeStatusLabel(item.target_status);
      const rankIndex = candidates.indexOf(targetStatus);
      if (rankIndex < 0) return { item, score: 0 };

      let score = 120 - (rankIndex * 15);

      const searchable = normalizeText(
        `${item.kategori || ""} ${item.judul || ""} ${item.deskripsi || ""}`
      );
      let totalHit = 0;
      let topicHit = 0;

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
    .map((entry) => entry.item);

  if (ranked.length > 0) {
    return ranked.slice(0, 5);
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
  hdl = null,
  ldl = null,
  trigliserida = null,
  jenisKelamin = "pria"
}) => {
  const normalizedJenisKelamin = normalizeJenisKelamin(jenisKelamin);
  const tekananDarah = sistolik !== null && diastolik !== null
    ? getTekananDarah(sistolik, diastolik)
    : null;
  const gula = gulaDarah !== null ? getGulaDarah(gulaDarah) : null;
  const hdlStatus = hdl !== null ? getHdlStatus(hdl, normalizedJenisKelamin) : null;
  const ldlStatus = ldl !== null ? getLdl(ldl) : null;
  const trigliseridaStatus = trigliserida !== null ? getTrigliserida(trigliserida) : null;
  const kol = getKolesterolKeseluruhan({
    kolesterol,
    jenisKelamin: normalizedJenisKelamin,
    hdl,
    ldl,
    trigliserida
  });
  const asam = asamUrat !== null ? getAsamUrat(asamUrat, normalizedJenisKelamin) : null;
  const bmiStatus = bmi !== null ? getBMIStatus(bmi) : null;

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
    hdlStatus,
    ldlStatus,
    trigliseridaStatus,
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
      kolesterol,
      jenis_kelamin = "pria",
      jenisKelamin
    } = req.body;
    const sistolik = pickInputValue(req.body.sistolik, req.body.sistole, req.body.tekanan_sistolik);
    const diastolik = pickInputValue(req.body.diastolik, req.body.diastole, req.body.tekanan_diastolik);
    const gula_darah = pickInputValue(req.body.gula_darah, req.body.gulaDarah);
    const hdl = pickInputValue(req.body.hdl, req.body.hdl_kolesterol, req.body.hdlKolesterol);
    const ldl = pickInputValue(req.body.ldl, req.body.ldl_kolesterol, req.body.ldlKolesterol);
    const trigliserida = pickInputValue(
      req.body.trigliserida,
      req.body.trigliserida_kolesterol,
      req.body.trigliseridaKolesterol,
      req.body.triglyceride,
      req.body.triglycerides
    );
    const asam_urat = pickInputValue(req.body.asam_urat, req.body.asamUrat);
    const berat_badan = pickInputValue(req.body.berat_badan, req.body.beratBadan);
    const tinggi_badan = pickInputValue(req.body.tinggi_badan, req.body.tinggiBadan);
    const lingkar_perut = pickInputValue(req.body.lingkar_perut, req.body.lingkarPerut);
    const riwayatPenyakitInput = pickRiwayatPenyakitInput(req.body);
    if (riwayatPenyakitInput) normalizeRiwayatPenyakitInput(riwayatPenyakitInput);

    const id_user = req.user.id;

    const parsedSistolik = parseOptionalPositiveMetricNumber(sistolik);
    const parsedDiastolik = parseOptionalPositiveMetricNumber(diastolik);
    const parsedGulaDarah = parseOptionalPositiveMetricNumber(gula_darah);
    const parsedKolesterol = parseOptionalPositiveMetricNumber(kolesterol);
    const parsedHdl = parseOptionalPositiveMetricNumber(hdl);
    const parsedLdl = parseOptionalPositiveMetricNumber(ldl);
    const parsedTrigliserida = parseOptionalPositiveMetricNumber(trigliserida);
    const parsedAsamUrat = parseOptionalPositiveMetricNumber(asam_urat);
    const parsedBeratBadan = parseOptionalPositiveMetricNumber(berat_badan);
    const parsedTinggiBadan = parseOptionalPositiveMetricNumber(tinggi_badan);
    const parsedLingkarPerut = parseOptionalPositiveMetricNumber(lingkar_perut);

    if (
      !parsedSistolik.valid ||
      !parsedDiastolik.valid ||
      !parsedGulaDarah.valid ||
      !parsedKolesterol.valid ||
      !parsedHdl.valid ||
      !parsedLdl.valid ||
      !parsedTrigliserida.valid ||
      !parsedAsamUrat.valid ||
      !parsedBeratBadan.valid ||
      !parsedTinggiBadan.valid ||
      !parsedLingkarPerut.valid
    ) {
      return res.status(400).json({ message: "Data harus angka valid dan lebih dari 0" });
    }

    const hasTekananDarah = parsedSistolik.provided || parsedDiastolik.provided;

    if (hasTekananDarah && (!parsedSistolik.provided || !parsedDiastolik.provided)) {
      return res.status(400).json({ message: "Sistolik dan diastolik wajib diisi bersamaan" });
    }

    const hasAnyMetric =
      hasTekananDarah ||
      parsedGulaDarah.provided ||
      parsedKolesterol.provided ||
      parsedHdl.provided ||
      parsedLdl.provided ||
      parsedTrigliserida.provided ||
      parsedAsamUrat.provided ||
      parsedBeratBadan.provided ||
      parsedTinggiBadan.provided ||
      parsedLingkarPerut.provided;

    if (!hasAnyMetric) {
      return res.status(400).json({ message: "Minimal satu data pemeriksaan wajib diisi" });
    }

    const bb = parsedBeratBadan.value;
    const tb = parsedTinggiBadan.value;
    const s = parsedSistolik.value;
    const d = parsedDiastolik.value;
    const g = parsedGulaDarah.value;
    const k = parsedKolesterol.value;
    const h = parsedHdl.value;
    const l = parsedLdl.value;
    const t = parsedTrigliserida.value;
    const a = parsedAsamUrat.value;
    const lp = parsedLingkarPerut.value;

    // ======================
    // HITUNG
    // ======================
    const bmi = bb !== null && tb !== null ? calculateBmi(bb, tb) : null;

    const {
      status,
      tekananDarah,
      gula,
      kol,
      hdlStatus,
      ldlStatus,
      trigliseridaStatus,
      asam,
      bmiStatus
    } = buildInterpretasi({
      sistolik: s,
      diastolik: d,
      gulaDarah: g,
      kolesterol: k,
      asamUrat: a,
      bmi,
      hdl: h,
      ldl: l,
      trigliserida: t,
      jenisKelamin: jenisKelamin || jenis_kelamin
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
        hdl: h,
        ldl: l,
        trigliserida: t,
        asam_urat: a,
        berat_badan: bb,
        tinggi_badan: tb,
        lingkar_perut: lp,
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
      hdl_status: hdlStatus,
      ldl_status: ldlStatus,
      trigliserida_status: trigliseridaStatus,
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
      hdl_status: hdlStatus,
      ldl_status: ldlStatus,
      trigliserida_status: trigliseridaStatus,
      asam_urat: asam,
      bmi_status: bmiStatus
    });
    const riwayat_penyakit = riwayatPenyakitInput
      ? Array.isArray(riwayatPenyakitInput)
        ? await Promise.all(riwayatPenyakitInput.map(item => createRiwayatPenyakitRecord(id_user, item)))
        : await createRiwayatPenyakitRecord(id_user, riwayatPenyakitInput)
      : null;

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
        hdlStatus,
        ldlStatus,
        trigliseridaStatus,
        asam,
        bmiStatus
      },
      rekomendasi: recommended || [],
      pemeriksaan,
      riwayat_penyakit
    });

  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json(status === 400 ? { message: err.message } : { error: err.message });
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
          hdl_status,
          ldl_status,
          trigliserida_status,
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
        const normalizedItem = {
          ...item,
          interpretasi: normalizeInterpretasiRelation(item.interpretasi)
        };
        const status = calculateStatusFromInterpretasi(normalizedItem.interpretasi, normalizedItem.bmi);

        // Ambil recommended
        const recommended = await getRecommendedEdukasi(
          status,
          normalizedItem.interpretasi,
          edukasiList || []
        );

        return {
          ...normalizedItem,
          created_at: formatToJakartaDateTime(normalizedItem.created_at),
          status_kesehatan: status,
          pengecekan: buildPengecekan(normalizedItem),
          penjelasan: getPenjelasan(status),
          detail: buildStatusSummary(normalizedItem),
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
          hdl_status,
          ldl_status,
          trigliserida_status,
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

    const normalizedPemeriksaan = {
      ...pemeriksaan,
      interpretasi: normalizeInterpretasiRelation(pemeriksaan.interpretasi)
    };
    const status = calculateStatusFromInterpretasi(
      normalizedPemeriksaan.interpretasi,
      normalizedPemeriksaan.bmi
    );

    // 2️⃣ Ambil edukasi sesuai status
    let recommended = [];

    if (status) {
      recommended = await getRecommendedEdukasi(status, normalizedPemeriksaan.interpretasi);
    }

    res.json({
      ...normalizedPemeriksaan,
      created_at: formatToJakartaDateTime(normalizedPemeriksaan.created_at),
      status_kesehatan: status,
      pengecekan: buildPengecekan(normalizedPemeriksaan),
      penjelasan: getPenjelasan(status),
      detail: buildStatusSummary(normalizedPemeriksaan),
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
      hdl,
      hdl_kolesterol,
      hdlKolesterol,
      ldl,
      ldl_kolesterol,
      ldlKolesterol,
      trigliserida,
      trigliserida_kolesterol,
      trigliseridaKolesterol,
      triglyceride,
      triglycerides,
      asam_urat,
      berat_badan,
      tinggi_badan,
      lingkar_perut,
      lingkarPerut,
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
        hdl,
        ldl,
        trigliserida,
        asam_urat,
        berat_badan,
        tinggi_badan,
        lingkar_perut,
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

    const parsedSistolik = parseUpdatePositiveMetricNumber(sistolik, existingPemeriksaan.sistolik);
    const parsedDiastolik = parseUpdatePositiveMetricNumber(diastolik, existingPemeriksaan.diastolik);
    const parsedGulaDarah = parseUpdatePositiveMetricNumber(gula_darah, existingPemeriksaan.gula_darah);
    const parsedKolesterol = parseUpdatePositiveMetricNumber(kolesterol, existingPemeriksaan.kolesterol);
    const hdlInput = pickInputValue(hdl, hdl_kolesterol, hdlKolesterol);
    const ldlInput = pickInputValue(ldl, ldl_kolesterol, ldlKolesterol);
    const trigliseridaInput = pickInputValue(
      trigliserida,
      trigliserida_kolesterol,
      trigliseridaKolesterol,
      triglyceride,
      triglycerides
    );
    const parsedHdl = parseUpdatePositiveMetricNumber(hdlInput, existingPemeriksaan.hdl);
    const parsedLdl = parseUpdatePositiveMetricNumber(ldlInput, existingPemeriksaan.ldl);
    const parsedTrigliserida = parseUpdatePositiveMetricNumber(
      trigliseridaInput,
      existingPemeriksaan.trigliserida
    );
    const parsedAsamUrat = parseUpdatePositiveMetricNumber(asam_urat, existingPemeriksaan.asam_urat);
    const parsedBeratBadan = parseUpdatePositiveMetricNumber(berat_badan, existingPemeriksaan.berat_badan);
    const parsedTinggiBadan = parseUpdatePositiveMetricNumber(tinggi_badan, existingPemeriksaan.tinggi_badan);
    const lingkarPerutInput = pickInputValue(lingkar_perut, lingkarPerut);
    const parsedLingkarPerut = parseUpdatePositiveMetricNumber(lingkarPerutInput, existingPemeriksaan.lingkar_perut);

    if (
      !parsedSistolik.valid ||
      !parsedDiastolik.valid ||
      !parsedGulaDarah.valid ||
      !parsedKolesterol.valid ||
      !parsedHdl.valid ||
      !parsedLdl.valid ||
      !parsedTrigliserida.valid ||
      !parsedAsamUrat.valid ||
      !parsedBeratBadan.valid ||
      !parsedTinggiBadan.valid ||
      !parsedLingkarPerut.valid
    ) {
      return res.status(400).json({
        message: "Data pemeriksaan harus berupa angka valid dan lebih dari 0"
      });
    }

    const hasTekananDarah = parsedSistolik.value !== null || parsedDiastolik.value !== null;

    if (hasTekananDarah && (parsedSistolik.value === null || parsedDiastolik.value === null)) {
      return res.status(400).json({ message: "Sistolik dan diastolik wajib diisi bersamaan" });
    }

    const bmi = parsedBeratBadan.value !== null && parsedTinggiBadan.value !== null
      ? calculateBmi(parsedBeratBadan.value, parsedTinggiBadan.value)
      : null;
    const {
      status,
      tekananDarah,
      gula,
      kol,
      hdlStatus,
      ldlStatus,
      trigliseridaStatus,
      asam,
      bmiStatus
    } = buildInterpretasi({
      sistolik: parsedSistolik.value,
      diastolik: parsedDiastolik.value,
      gulaDarah: parsedGulaDarah.value,
      kolesterol: parsedKolesterol.value,
      asamUrat: parsedAsamUrat.value,
      bmi,
      hdl: parsedHdl.value,
      ldl: parsedLdl.value,
      trigliserida: parsedTrigliserida.value,
      jenisKelamin: jenis_kelamin
    });

    const { data, error } = await supabase
      .from('pemeriksaan')
      .update({
        sistolik: parsedSistolik.value,
        diastolik: parsedDiastolik.value,
        gula_darah: parsedGulaDarah.value,
        kolesterol: parsedKolesterol.value,
        hdl: parsedHdl.value,
        ldl: parsedLdl.value,
        trigliserida: parsedTrigliserida.value,
        asam_urat: parsedAsamUrat.value,
        berat_badan: parsedBeratBadan.value,
        tinggi_badan: parsedTinggiBadan.value,
        lingkar_perut: parsedLingkarPerut.value,
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
        status_kesehatan: status,
        tekanan_darah: tekananDarah,
        gula_darah: gula,
        kolesterol: kol,
        hdl_status: hdlStatus,
        ldl_status: ldlStatus,
        trigliserida_status: trigliseridaStatus,
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
          hdl_status: hdlStatus,
          ldl_status: ldlStatus,
          trigliserida_status: trigliseridaStatus,
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

exports._helpers = {
  buildPengecekan,
  buildStatusSummary,
  calculateStatusFromInterpretasi,
  getPenjelasan,
  normalizeFinalStatus,
  normalizeInterpretasiRelation
};
