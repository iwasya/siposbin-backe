const supabase = require('../config/supabase');

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

exports.getStatistik = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('pemeriksaan')
      .select('tanggal_pemeriksaan, sistolik, diastolik, gula_darah, kolesterol, asam_urat, bmi')
      .eq('id_user', userId)
      .order('tanggal_pemeriksaan', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const rows = Array.isArray(data) ? data : [];

    // Format untuk grafik
    const labels = rows.map(item => formatToWibDateTime(item.tanggal_pemeriksaan));
    const sistolik = rows.map(item => item.sistolik);
    const diastolik = rows.map(item => item.diastolik);
    const gula_darah = rows.map(item => item.gula_darah);
    const kolesterol = rows.map(item => item.kolesterol);
    const asam_urat = rows.map(item => item.asam_urat);
    const bmi = rows.map(item => item.bmi);

    res.json({
      labels,
      sistolik,
      diastolik,
      gula_darah,
      kolesterol,
      asam_urat,
      bmi
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
