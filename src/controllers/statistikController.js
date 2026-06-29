const supabase = require('../config/supabase');
const { formatToJakartaDateTime } = require('../utils/dateTime');
const {
  _helpers: {
    buildPengecekan,
    normalizeInterpretasiRelation
  }
} = require('./pemeriksaanController');

const buildPengecekanByStatus = (latestRow) => {
  if (!latestRow) return null;

  return buildPengecekan({
    ...latestRow,
    interpretasi: normalizeInterpretasiRelation(latestRow.interpretasi)
  });
};

exports.getStatistik = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('pemeriksaan')
      .select(`
        tanggal_pemeriksaan,
        created_at,
        sistolik,
        diastolik,
        gula_darah,
        kolesterol,
        asam_urat,
        bmi,
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
      .order('tanggal_pemeriksaan', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const rows = Array.isArray(data) ? data : [];
    const latestRow = rows.length > 0 ? rows[rows.length - 1] : null;

    // Format untuk grafik
    const labels = rows.map(item =>
      formatToJakartaDateTime(item.created_at || item.tanggal_pemeriksaan)
    );
    const sistolik = rows.map(item => item.sistolik);
    const diastolik = rows.map(item => item.diastolik);
    const gula_darah = rows.map(item => item.gula_darah);
    const kolesterol = rows.map(item => item.kolesterol);
    const asam_urat = rows.map(item => item.asam_urat);
    const bmi = rows.map(item => item.bmi);

    const pengecekan = buildPengecekanByStatus(latestRow);

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
