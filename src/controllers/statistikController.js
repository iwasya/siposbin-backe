const supabase = require('../config/supabase');
const { formatToJakartaDateTime } = require('../utils/dateTime');

const PEMANTAUAN_MESSAGE = "Lakukan pemeriksaan secara berkala untuk pemantauan kondisi kesehatan.";

const toMetricNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const getTekananDarahStatusDanPesan = (sistolik, diastolik) => {
  const s = toMetricNumber(sistolik);
  const d = toMetricNumber(diastolik);

  if (s === null || d === null) return null;

  let status = "Hipertensi 3";
  let keterangan = "Tekanan darah Anda berada di atas batas normal dan berisiko menyebabkan penyakit jantung atau stroke. Segera lakukan perubahan gaya hidup sehat dan konsultasikan ke tenaga kesehatan.";

  if (s < 90 || d < 60) {
    status = "Rendah";
    keterangan = "Tekanan darah Anda berada di bawah batas normal (kurang dari 90/60 mmHg). Kondisi ini dapat menyebabkan pusing, lemas, atau pingsan. Disarankan untuk mencukupi cairan, makan teratur, dan bangun perlahan dari posisi duduk atau berbaring.";
  } else if (s < 120 && d < 80) {
    status = "Optimal";
    keterangan = "Tekanan darah Anda berada dalam rentang normal, yang menunjukkan kondisi jantung dan pembuluh darah yang baik. Pertahankan pola hidup sehat seperti konsumsi makanan rendah garam, rutin berolahraga, serta mengelola stres dengan baik.";
  } else if (s <= 129 && d <= 84) {
    status = "Normal";
    keterangan = "Tekanan darah Anda berada dalam rentang normal, yang menunjukkan kondisi jantung dan pembuluh darah yang baik. Pertahankan pola hidup sehat seperti konsumsi makanan rendah garam, rutin berolahraga, serta mengelola stres dengan baik.";
  } else if (s <= 139 && d <= 89) {
    status = "Normal Tinggi";
    keterangan = "Tekanan darah Anda sedikit di atas normal dan berisiko berkembang menjadi hipertensi jika tidak dikontrol. Disarankan untuk mulai mengurangi konsumsi garam, menjaga berat badan, serta meningkatkan aktivitas fisik.";
  } else if (s <= 159 && d <= 99) {
    status = "Hipertensi 1";
  } else if (s <= 179 && d <= 109) {
    status = "Hipertensi 2";
  }

  return {
    kategori: "Tekanan Darah",
    nilai: `${s}/${d}`,
    satuan: "mmHg",
    status,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const getKolesterolStatusDanPesan = (kolesterol) => {
  const nilai = toMetricNumber(kolesterol);
  if (nilai === null) return null;

  let status = "Tinggi";
  let keterangan = "Kadar kolesterol yang tinggi dapat meningkatkan risiko penyakit jantung. Segera lakukan perubahan pola makan dan konsultasi dengan tenaga kesehatan.";

  if (nilai < 120) {
    status = "Rendah";
    keterangan = "Kadar kolesterol terlalu rendah dapat memengaruhi fungsi tubuh. Disarankan tetap konsumsi lemak sehat seperti ikan dan kacang-kacangan serta pola makan seimbang.";
  } else if (nilai < 200) {
    status = "Normal";
    keterangan = "Kadar kolesterol Anda masih dalam batas aman. Tetap jaga pola makan sehat dengan mengurangi lemak jenuh dan rutin berolahraga.";
  } else if (nilai < 240) {
    status = "Waspada";
    keterangan = "Kadar kolesterol Anda mendekati batas tinggi. Disarankan untuk mengurangi makanan berlemak, gorengan, serta meningkatkan aktivitas fisik.";
  }

  return {
    kategori: "Kolesterol",
    nilai,
    satuan: "mg/dL",
    status,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const getAsamUratStatusDanPesan = (asamUrat, jenisKelamin = "pria") => {
  const nilai = toMetricNumber(asamUrat);
  if (nilai === null) return null;

  const gender = String(jenisKelamin || "pria").toLowerCase();
  let status = "Normal";
  let keterangan = "Kadar asam urat Anda dalam batas normal. Pertahankan pola makan sehat dan cukup minum air putih.";

  if (nilai < 2) {
    status = "Rendah";
    keterangan = "Kadar asam urat rendah (<2 mg/dL) jarang terjadi namun perlu diperhatikan. Pastikan asupan nutrisi cukup dan lakukan pemeriksaan lanjutan bila perlu.";
  } else if (gender === "wanita") {
    if (nilai >= 8) {
      status = "Bahaya";
      keterangan = "Kadar asam urat yang tinggi dapat menyebabkan nyeri sendi. Hindari makanan tinggi purin seperti jeroan dan seafood, serta perbanyak konsumsi air putih.";
    } else if (nilai > 7) {
      status = "Tinggi";
      keterangan = "Kadar asam urat yang tinggi dapat menyebabkan nyeri sendi. Hindari makanan tinggi purin seperti jeroan dan seafood, serta perbanyak konsumsi air putih.";
    } else if (nilai >= 6) {
      status = "Waspada";
      keterangan = "Kadar asam urat yang tinggi dapat menyebabkan nyeri sendi. Hindari makanan tinggi purin seperti jeroan dan seafood, serta perbanyak konsumsi air putih.";
    }
  } else {
    if (nilai >= 9) {
      status = "Bahaya";
      keterangan = "Kadar asam urat yang tinggi dapat menyebabkan nyeri sendi. Hindari makanan tinggi purin seperti jeroan dan seafood, serta perbanyak konsumsi air putih.";
    } else if (nilai > 8) {
      status = "Tinggi";
      keterangan = "Kadar asam urat yang tinggi dapat menyebabkan nyeri sendi. Hindari makanan tinggi purin seperti jeroan dan seafood, serta perbanyak konsumsi air putih.";
    } else if (nilai >= 7) {
      status = "Waspada";
      keterangan = "Kadar asam urat yang tinggi dapat menyebabkan nyeri sendi. Hindari makanan tinggi purin seperti jeroan dan seafood, serta perbanyak konsumsi air putih.";
    }
  }

  return {
    kategori: "Asam Urat",
    nilai,
    satuan: "mg/dL",
    status,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const getGulaDarahStatusDanPesan = (gulaDarah) => {
  const nilai = toMetricNumber(gulaDarah);
  if (nilai === null) return null;

  let status = "Diabetes";
  let keterangan = "Kadar gula darah Anda tinggi dan menunjukkan risiko diabetes. Segera konsultasikan dengan tenaga kesehatan untuk penanganan lebih lanjut.";

  if (nilai < 70) {
    status = "Rendah";
    keterangan = "Kadar gula darah Anda berada di bawah normal (kurang dari 70 mg/dL). Dapat menyebabkan gemetar, lemas, dan pusing. Segera konsumsi makanan atau minuman manis dan jaga pola makan teratur.";
  } else if (nilai < 140) {
    status = "Normal";
    keterangan = "Kadar gula darah Anda berada dalam batas normal. Pertahankan pola makan seimbang dan aktivitas fisik secara rutin.";
  } else if (nilai < 200) {
    status = "Prediabetes";
    keterangan = "Kadar gula darah Anda sedikit di atas normal dan berisiko berkembang menjadi diabetes. Disarankan untuk mengurangi konsumsi gula dan menjaga berat badan.";
  }

  return {
    kategori: "Gula Darah",
    nilai,
    satuan: "mg/dL",
    status,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const getImtStatusDanPesan = (bmi) => {
  const nilai = toMetricNumber(bmi);
  if (nilai === null) return null;

  let status = "Obesitas 2";
  let keterangan = "Berat badan Anda berada pada kategori obesitas yang berisiko terhadap berbagai penyakit. Disarankan untuk melakukan perubahan gaya hidup dan konsultasi dengan tenaga kesehatan.";

  if (nilai < 18.5) {
    status = "Kurus";
    keterangan = "IMT di bawah 18,5 menunjukkan berat badan kurang. Disarankan meningkatkan asupan kalori dan nutrisi serta menjaga pola makan teratur.";
  } else if (nilai <= 22.9) {
    status = "Normal";
    keterangan = "Indeks massa tubuh Anda berada dalam kategori ideal. Pertahankan pola makan sehat dan aktivitas fisik yang cukup.";
  } else if (nilai <= 24.9) {
    status = "Overweight";
    keterangan = "Berat badan Anda melebihi batas normal. Disarankan untuk mulai mengatur pola makan dan meningkatkan aktivitas fisik.";
  } else if (nilai <= 29.9) {
    status = "Obesitas 1";
  }

  return {
    kategori: "Indeks Massa Tubuh (IMT)",
    nilai: Number(nilai.toFixed(1)),
    satuan: "kg/m2",
    status,
    keterangan,
    anjuran: PEMANTAUAN_MESSAGE
  };
};

const buildPengecekanByStatus = (latestRow, jenisKelamin) => {
  if (!latestRow) return null;

  const tekananDarah = getTekananDarahStatusDanPesan(latestRow.sistolik, latestRow.diastolik);
  const kolesterol = getKolesterolStatusDanPesan(latestRow.kolesterol);
  const asamUrat = getAsamUratStatusDanPesan(latestRow.asam_urat, jenisKelamin);
  const gulaDarah = getGulaDarahStatusDanPesan(latestRow.gula_darah);
  const bmiStatus = getImtStatusDanPesan(latestRow.bmi);

  return {
    tanggal_pemeriksaan: formatToJakartaDateTime(latestRow.tanggal_pemeriksaan),
    status: {
      tekanan_darah: tekananDarah?.status || null,
      kolesterol: kolesterol?.status || null,
      asam_urat: asamUrat?.status || null,
      gula_darah: gulaDarah?.status || null,
      bmi_status: bmiStatus?.status || null
    },
    detail: {
      tekanan_darah: tekananDarah,
      kolesterol,
      asam_urat: asamUrat,
      gula_darah: gulaDarah,
      bmi_status: bmiStatus
    }
  };
};

exports.getStatistik = async (req, res) => {
  try {
    const userId = req.user.id;

    const [{ data, error }, { data: userData, error: userError }] = await Promise.all([
      supabase
      .from('pemeriksaan')
      .select('tanggal_pemeriksaan, sistolik, diastolik, gula_darah, kolesterol, asam_urat, bmi')
      .eq('id_user', userId)
      .order('tanggal_pemeriksaan', { ascending: true }),
      supabase
        .from('users')
        .select('jenis_kelamin')
        .eq('id_user', userId)
        .maybeSingle()
    ]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    const rows = Array.isArray(data) ? data : [];
    const latestRow = rows.length > 0 ? rows[rows.length - 1] : null;
    const jenisKelamin = userData?.jenis_kelamin || "pria";

    // Format untuk grafik
    const labels = rows.map(item => formatToJakartaDateTime(item.tanggal_pemeriksaan));
    const sistolik = rows.map(item => item.sistolik);
    const diastolik = rows.map(item => item.diastolik);
    const gula_darah = rows.map(item => item.gula_darah);
    const kolesterol = rows.map(item => item.kolesterol);
    const asam_urat = rows.map(item => item.asam_urat);
    const bmi = rows.map(item => item.bmi);

    const pengecekan = buildPengecekanByStatus(latestRow, jenisKelamin);

    res.json({
      labels,
      sistolik,
      diastolik,
      gula_darah,
      kolesterol,
      asam_urat,
      bmi,
      pengecekan
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
